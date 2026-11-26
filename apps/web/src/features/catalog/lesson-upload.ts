import 'server-only';
import { and, eq, schema as s, withUser } from '@gutta/db';
import { keys } from '@gutta/storage';
import { conflict, notFound } from '@/lib/api';
import type { CurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { audit } from '@/lib/events';
import { forget } from '@/lib/memo';
import { requireStorage, storage } from '@/lib/storage';
import { inlineGoogleFonts, type FetchLike } from './lesson-fonts';

/*
  Aula pronta (HTML) num módulo do catálogo. O arquivo chega pelo envio de arquivos (antivírus
  no worker), as fontes do Google entram no próprio HTML, e a aula fica no bucket, fora da pasta
  de quem enviou. O aluno a abre pelo endereço abaixo, com a política isolada (proxy.ts): sandbox
  sem mesma origem e sem rede. Trocar a aula só com o módulo em rascunho: o conteúdo novo passa
  pela revisão de outra pessoa antes de chegar ao aluno.
*/

export const catalogLessonPath = (moduleId: string) => `/api/v1/catalog/lessons/${moduleId}`;
const lessonKey = (moduleId: string) => `c/lessons/${moduleId}.html`;
const MAX_LESSON_BYTES = 15 * 1024 * 1024;

export async function attachLessonHtml(
  user: CurrentUser,
  moduleId: string,
  fileId: string,
  fetchImpl?: FetchLike,
): Promise<{ fonts: number; warning: string | null }> {
  const store = requireStorage();
  const file = await withUser(db(), user.id, async (tx) => {
    const mod = await tx.query.modules.findFirst({ where: eq(s.modules.id, moduleId) });
    if (!mod) throw notFound('Módulo');
    if (mod.status !== 'draft')
      throw conflict('Volte o módulo para rascunho para trocar a aula: ela passa pela revisão.');
    const f = await tx.query.files.findFirst({
      where: and(eq(s.files.id, fileId), eq(s.files.ownerId, user.id)),
    });
    if (!f) throw notFound('Arquivo');
    if (f.status === 'quarantined') throw conflict('O antivírus bloqueou este arquivo.');
    if (f.status === 'failed' || (f.status === 'ready' && f.kind !== 'html'))
      throw conflict(f.error ?? 'Envie a aula como um arquivo .html.');
    if (f.status !== 'ready')
      throw conflict('O arquivo ainda está sendo verificado. Tente de novo.');
    return f;
  });

  const original = (await store.get(keys.original(user.id, file.id))).toString('utf8');
  const { html, fonts, warning } = await inlineGoogleFonts(original, fetchImpl);
  const body = Buffer.from(html, 'utf8');
  if (body.length > MAX_LESSON_BYTES) throw conflict('A aula passa de 15 MB.');
  await store.put(lessonKey(moduleId), body, 'text/html; charset=utf-8');

  await withUser(db(), user.id, async (tx) => {
    const [row] = await tx
      .update(s.modules)
      .set({ lessonUrl: catalogLessonPath(moduleId) })
      .where(and(eq(s.modules.id, moduleId), eq(s.modules.status, 'draft')))
      .returning({ id: s.modules.id });
    if (!row) throw conflict('O módulo saiu do rascunho enquanto a aula subia. Tente de novo.');
    await audit(
      tx,
      user.id,
      'module.lesson_uploaded',
      { type: 'module', id: moduleId },
      { fileId: file.id, name: file.originalName, bytes: body.length, fonts },
    );
  });
  forget('painel:catalogo:');
  return { fonts, warning };
}

/**
 * A aula do módulo, para o iframe. O RLS decide quem vê o módulo: o aluno só o publicado; a
 * equipe editorial também o rascunho e o em revisão (prévia para revisar).
 */
export async function catalogLessonHtml(userId: string, moduleId: string): Promise<string> {
  const store = storage();
  if (!store) throw notFound('Armazenamento');
  const mod = await withUser(db(), userId, (tx) =>
    tx.query.modules.findFirst({ where: eq(s.modules.id, moduleId) }),
  );
  if (!mod || mod.lessonUrl !== catalogLessonPath(moduleId)) throw notFound('Aula');
  try {
    return (await store.get(lessonKey(moduleId))).toString('utf8');
  } catch {
    throw notFound('Aula');
  }
}

import 'server-only';
import {
  isPortfolioKind,
  isPortfolioRole,
  parseHours,
  summarizeHours,
  validPortfolioDates,
  type PortfolioKind,
} from '@gutta/core';
import { and, asc, desc, eq, inArray, schema as s, sql, withUser, type Tx } from '@gutta/db';
import type { portfolio as contract } from '@gutta/contracts';
import { emit } from '@gutta/jobs';
import { keys } from '@gutta/storage';
import type { z } from 'zod';
import { assertFeature } from '@/features/flags/service';
import { ApiError, badRequest, conflict, notFound } from '@/lib/api';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';

// Cognuss Competências, Meus Certificados (docs/competencias/ESPECIFICACAO.md, K1). Tudo do
// próprio aluno, sob withUser e RLS de dono. A leitura com IA só propõe: o item entra na soma
// de horas e no currículo quando o aluno confirma.

type ItemRow = typeof s.portfolioItems.$inferSelect;
type FolderRow = typeof s.portfolioFolders.$inferSelect;

const READ_TTL = 60 * 30;

const pgCode = (err: unknown) => {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
};

async function withFeature<T>(fn: () => Promise<T>) {
  await assertFeature('competencias');
  return fn();
}

function itemDto(
  i: ItemRow,
  file: { originalName: string } | null,
  thumb: string | null,
): contract.ItemDto {
  return {
    id: i.id,
    folderId: i.folderId,
    fileId: i.fileId,
    fileName: file?.originalName ?? null,
    thumbnailUrl: thumb,
    status: i.status,
    kind: isPortfolioKind(i.kind) ? i.kind : 'outro',
    title: i.title,
    issuer: i.issuer,
    role: isPortfolioRole(i.role) ? i.role : null,
    startedOn: i.startedOn,
    endedOn: i.endedOn,
    minutes: i.minutes,
    holderName: i.holderName,
    link: i.link,
    notes: i.notes,
    readNote: i.readNote,
    readByAi: i.extracted !== null && i.status !== 'confirmed',
    confirmedAt: i.confirmedAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
  };
}

/** Miniaturas da primeira página, numa consulta só. */
async function thumbnails(tx: Tx, userId: string, items: ItemRow[]) {
  const store = storage();
  const fileIds = items.map((i) => i.fileId).filter((x): x is string => Boolean(x));
  const out = new Map<string, string>();
  if (!store || !fileIds.length) return out;
  const pages = await tx
    .select({ fileId: s.filePages.fileId })
    .from(s.filePages)
    .where(
      and(
        inArray(s.filePages.fileId, fileIds),
        eq(s.filePages.page, 1),
        eq(s.filePages.hasThumbnail, true),
      ),
    );
  for (const p of pages)
    out.set(
      p.fileId,
      await store.getUrl(keys.thumbnail(userId, p.fileId, 1), {
        contentType: 'image/jpeg',
        disposition: 'inline',
        expiresIn: READ_TTL,
      }),
    );
  return out;
}

async function filesOf(tx: Tx, items: ItemRow[]) {
  const ids = items.map((i) => i.fileId).filter((x): x is string => Boolean(x));
  if (!ids.length) return new Map<string, { originalName: string }>();
  const rows = await tx
    .select({ id: s.files.id, originalName: s.files.originalName })
    .from(s.files)
    .where(inArray(s.files.id, ids));
  return new Map(rows.map((r) => [r.id, r]));
}

function folderDtos(folders: FolderRow[], items: ItemRow[]): contract.FolderDto[] {
  const sum = summarizeHours(
    items.map((i) => ({
      kind: (isPortfolioKind(i.kind) ? i.kind : 'outro') as PortfolioKind,
      folderId: i.folderId,
      minutes: i.minutes,
      confirmed: i.status === 'confirmed',
    })),
  );
  return folders.map((f) => ({
    id: f.id,
    name: f.name,
    items: items.filter((i) => i.folderId === f.id).length,
    minutes: sum.byFolder[f.id] ?? 0,
  }));
}

export async function listPortfolio(
  userId: string,
  q: z.output<typeof contract.listPortfolioQuery>,
) {
  return withFeature(() =>
    withUser(db(), userId, async (tx) => {
      const folders = await tx
        .select()
        .from(s.portfolioFolders)
        .orderBy(asc(s.portfolioFolders.position), asc(s.portfolioFolders.name));
      const all = await tx
        .select()
        .from(s.portfolioItems)
        .orderBy(desc(s.portfolioItems.createdAt));
      const needle = q.q?.toLowerCase();
      const shown = all.filter(
        (i) =>
          (!q.pasta || (q.pasta === 'sem-pasta' ? i.folderId === null : i.folderId === q.pasta)) &&
          (!q.tipo || i.kind === q.tipo) &&
          (!q.situacao ||
            (q.situacao === 'conferidos' ? i.status === 'confirmed' : i.status !== 'confirmed')) &&
          (!needle || [i.title, i.issuer, i.notes].some((t) => t?.toLowerCase().includes(needle))),
      );
      const [files, thumbs] = await Promise.all([
        filesOf(tx, shown),
        thumbnails(tx, userId, shown),
      ]);
      const sum = summarizeHours(
        all.map((i) => ({
          kind: (isPortfolioKind(i.kind) ? i.kind : 'outro') as PortfolioKind,
          folderId: i.folderId,
          minutes: i.minutes,
          confirmed: i.status === 'confirmed',
        })),
      );
      return {
        folders: folderDtos(folders, all),
        items: shown.map((i) =>
          itemDto(
            i,
            i.fileId ? (files.get(i.fileId) ?? null) : null,
            i.fileId ? (thumbs.get(i.fileId) ?? null) : null,
          ),
        ),
        summary: {
          totalMinutes: sum.totalMinutes,
          byKind: sum.byKind as Record<string, number>,
          confirmedItems: sum.confirmedItems,
          pendingItems: sum.pendingItems,
        },
      };
    }),
  );
}

async function folderDto(tx: Tx, f: FolderRow) {
  const items = await tx.select().from(s.portfolioItems).where(eq(s.portfolioItems.folderId, f.id));
  return folderDtos([f], items)[0]!;
}

export async function createFolder(userId: string, name: string) {
  return withFeature(async () => {
    try {
      return await withUser(db(), userId, async (tx) => {
        const [max] = await tx
          .select({ n: sql<number>`coalesce(max(${s.portfolioFolders.position}), -1)::int` })
          .from(s.portfolioFolders);
        const [f] = await tx
          .insert(s.portfolioFolders)
          .values({ ownerId: userId, name, position: (max?.n ?? -1) + 1 })
          .returning();
        return { folder: await folderDto(tx, f!) };
      });
    } catch (err) {
      if (pgCode(err) === '23505') throw conflict('Já existe uma pasta com esse nome.');
      throw err;
    }
  });
}

export async function renameFolder(userId: string, id: string, name: string) {
  return withFeature(async () => {
    try {
      return await withUser(db(), userId, async (tx) => {
        const [f] = await tx
          .update(s.portfolioFolders)
          .set({ name })
          .where(eq(s.portfolioFolders.id, id))
          .returning();
        if (!f) throw notFound('Pasta');
        return { folder: await folderDto(tx, f) };
      });
    } catch (err) {
      if (pgCode(err) === '23505') throw conflict('Já existe uma pasta com esse nome.');
      throw err;
    }
  });
}

export async function deleteFolder(userId: string, id: string) {
  return withFeature(() =>
    withUser(db(), userId, async (tx) => {
      const [f] = await tx
        .delete(s.portfolioFolders)
        .where(eq(s.portfolioFolders.id, id))
        .returning({ id: s.portfolioFolders.id });
      if (!f) throw notFound('Pasta');
      return { ok: true as const };
    }),
  );
}

async function ownFolder(tx: Tx, folderId: string | null | undefined) {
  if (!folderId) return;
  const f = await tx.query.portfolioFolders.findFirst({
    where: eq(s.portfolioFolders.id, folderId),
  });
  if (!f) throw notFound('Pasta');
}

/**
 * Registra um certificado. Com arquivo pronto, a leitura vai para a fila agora; com arquivo
 * ainda no antivírus, o worker manda ler quando ele terminar. Sem arquivo, o aluno preenche.
 */
export async function createItem(userId: string, body: z.output<typeof contract.createItem.body>) {
  return withFeature(() =>
    withUser(db(), userId, async (tx) => {
      await ownFolder(tx, body.folderId);
      let file: typeof s.files.$inferSelect | undefined;
      if (body.fileId) {
        file = await tx.query.files.findFirst({
          where: and(eq(s.files.id, body.fileId), eq(s.files.ownerId, userId)),
        });
        if (!file) throw notFound('Arquivo');
      }
      const [item] = await tx
        .insert(s.portfolioItems)
        .values({
          ownerId: userId,
          folderId: body.folderId ?? null,
          fileId: file?.id ?? null,
          status: file ? 'reading' : 'to_confirm',
        })
        .returning();
      if (
        file &&
        (file.status === 'ready' || file.status === 'failed' || file.status === 'quarantined')
      )
        await emit(tx, 'ai.read_certificate', { itemId: item!.id, userId });
      return { item: itemDto(item!, file ?? null, null) };
    }),
  );
}

export async function getItem(userId: string, id: string) {
  return withFeature(async () => {
    const store = storage();
    const data = await withUser(db(), userId, async (tx) => {
      const item = await tx.query.portfolioItems.findFirst({
        where: eq(s.portfolioItems.id, id),
      });
      if (!item) throw notFound('Certificado');
      const file = item.fileId
        ? await tx.query.files.findFirst({ where: eq(s.files.id, item.fileId) })
        : undefined;
      const thumbs = await thumbnails(tx, userId, [item]);
      return { item, file, thumb: item.fileId ? (thumbs.get(item.fileId) ?? null) : null };
    });
    const { item, file } = data;
    // O comprovante só depois do antivírus; nada de arquivo em quarentena.
    const fileUrl =
      file && store && file.scannedAt && file.status === 'ready'
        ? await store.getUrl(keys.original(userId, file.id), {
            filename: file.originalName,
            contentType: file.mime,
            disposition: 'inline',
            expiresIn: READ_TTL,
          })
        : null;
    return { item: itemDto(item, file ?? null, data.thumb), fileUrl };
  });
}

export async function updateItem(
  userId: string,
  id: string,
  body: Partial<z.output<typeof contract.updateItemBody>>,
) {
  return withFeature(() =>
    withUser(db(), userId, async (tx) => {
      const item = await tx.query.portfolioItems.findFirst({
        where: eq(s.portfolioItems.id, id),
      });
      if (!item) throw notFound('Certificado');
      if (body.folderId !== undefined) await ownFolder(tx, body.folderId);
      const patch: Partial<typeof s.portfolioItems.$inferInsert> = {};
      if (body.folderId !== undefined) patch.folderId = body.folderId;
      if (body.kind !== undefined) patch.kind = body.kind;
      if (body.title !== undefined) patch.title = body.title;
      if (body.issuer !== undefined) patch.issuer = body.issuer;
      if (body.role !== undefined) patch.role = body.role;
      if (body.startedOn !== undefined) patch.startedOn = body.startedOn;
      if (body.endedOn !== undefined) patch.endedOn = body.endedOn;
      if (body.holderName !== undefined) patch.holderName = body.holderName;
      if (body.link !== undefined) patch.link = body.link;
      if (body.notes !== undefined) patch.notes = body.notes;
      if (body.hours !== undefined) {
        const minutes = body.hours === null ? null : parseHours(body.hours);
        if (body.hours !== null && minutes === null)
          throw badRequest('Carga horária inválida. Use, por exemplo, "20", "4h30" ou "90 min".');
        patch.minutes = minutes;
      }
      const startedOn = patch.startedOn !== undefined ? patch.startedOn : item.startedOn;
      const endedOn = patch.endedOn !== undefined ? patch.endedOn : item.endedOn;
      const dateError = validPortfolioDates(startedOn ?? null, endedOn ?? null);
      if (dateError) throw badRequest(dateError);
      if (body.confirm) {
        if (item.status === 'reading')
          throw new ApiError(
            409,
            'conflict',
            'O certificado ainda está sendo lido. Espere um pouco.',
          );
        const title = (patch.title ?? item.title).trim();
        if (title.length < 3) throw badRequest('Informe o nome da atividade antes de confirmar.');
        patch.status = 'confirmed';
        patch.confirmedAt = new Date();
      }
      // Corrigir um item já conferido não o tira da soma: continua conferido.
      const [updated] = await tx
        .update(s.portfolioItems)
        .set(patch)
        .where(eq(s.portfolioItems.id, id))
        .returning();
      const file = updated!.fileId
        ? await tx.query.files.findFirst({ where: eq(s.files.id, updated!.fileId) })
        : undefined;
      return { item: itemDto(updated!, file ?? null, null) };
    }),
  );
}

export async function deleteItem(userId: string, id: string) {
  return withFeature(() =>
    withUser(db(), userId, async (tx) => {
      const [i] = await tx
        .delete(s.portfolioItems)
        .where(eq(s.portfolioItems.id, id))
        .returning({ id: s.portfolioItems.id });
      if (!i) throw notFound('Certificado');
      return { ok: true as const };
    }),
  );
}

/** Para o Meu Espaço: certificados esperando conferência. */
export async function pendingCertificates(userId: string) {
  return withUser(db(), userId, async (tx) => {
    const [r] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(s.portfolioItems)
      .where(eq(s.portfolioItems.status, 'to_confirm'));
    return r?.n ?? 0;
  });
}

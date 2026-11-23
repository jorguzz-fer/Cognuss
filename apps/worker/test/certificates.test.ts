import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { FakeCertificateReader } from '@gutta/ai';
import { and, eq, schema as s, sql } from '@gutta/db';
import { keys, MemoryStorage } from '@gutta/storage';
import { connect, makeUser } from '../../../packages/db/test/helpers';
import {
  CERTIFICATE_MESSAGES,
  readCertificate,
  releasePortfolioItems,
} from '../src/handlers/certificates';
import type { JobContext } from '../src/handlers/types';
import { logger } from '../src/logger';

// Leitura dos certificados (Competências, K1): a IA propõe, o aluno confere. Sem autorização,
// sem leitor ou com o recurso desligado, o item fica para preencher à mão, com o motivo.
const { app, owner, appPool, ownerPool } = connect();
const store = new MemoryStorage();
const ctx = (): JobContext => ({ db: app, log: logger, jobId: 'teste', attempt: 1 });
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

beforeAll(() => {
  vi.spyOn(logger, 'info').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
});
afterAll(async () => {
  await owner.delete(s.appSettings).where(eq(s.appSettings.key, 'ai'));
  await appPool.end();
  await ownerPool.end();
});

const CERT = `CERTIFICADO
Título: XXI Congresso Brasileiro de Clínica Médica
Instituição: Sociedade Brasileira de Clínica Médica
Nome: Maria Eduarda dos Santos
Tipo: evento
Início: 2026-08-10
Fim: 2026-08-12
Carga horária: 20 horas
Verificação: https://even3.com.br/verificar/ABC123`;

async function student(opts: { consent?: boolean; name?: string } = {}) {
  const id = await makeUser(owner);
  await owner
    .update(s.authUsers)
    .set({ name: opts.name ?? 'Maria Eduarda Santos' })
    .where(eq(s.authUsers.id, id));
  if (opts.consent !== false)
    await owner
      .insert(s.consentRecords)
      .values({ userId: id, purpose: 'ai_materials', granted: true, policyVersion: '2026-11-14' });
  return id;
}

async function upload(ownerId: string, opts: { text?: string; image?: Buffer; status?: string }) {
  const body = opts.image ?? Buffer.from(opts.text ?? '');
  const [f] = await owner
    .insert(s.files)
    .values({
      ownerId,
      originalName: opts.image ? 'certificado.jpg' : 'certificado.pdf',
      mime: opts.image ? 'image/jpeg' : 'application/pdf',
      sizeBytes: body.length,
      sha256: sha(Buffer.concat([body, Buffer.from(Math.random().toString())])),
      status: (opts.status ?? 'ready') as 'ready',
      kind: opts.image ? 'image' : 'pdf',
      pageCount: opts.image ? 0 : 1,
    })
    .returning();
  if (opts.image) await store.put(keys.original(ownerId, f!.id), opts.image, 'image/jpeg');
  if (opts.text)
    await owner.insert(s.filePages).values({ fileId: f!.id, ownerId, page: 1, text: opts.text });
  const [item] = await owner
    .insert(s.portfolioItems)
    .values({ ownerId, fileId: f!.id })
    .returning();
  return { fileId: f!.id, itemId: item!.id };
}

const item = async (id: string) =>
  (await owner.query.portfolioItems.findFirst({ where: eq(s.portfolioItems.id, id) }))!;

describe('leitura do certificado', () => {
  it('propõe os campos para conferir, sem confirmar, e avisa o aluno', async () => {
    const userId = await student();
    const { itemId } = await upload(userId, { text: CERT });
    const reader = new FakeCertificateReader();
    await readCertificate({ storage: store, reader }).run({ itemId, userId }, ctx());
    const it = await item(itemId);
    expect(it).toMatchObject({
      status: 'to_confirm',
      kind: 'evento',
      title: 'XXI Congresso Brasileiro de Clínica Médica',
      issuer: 'Sociedade Brasileira de Clínica Médica',
      holderName: 'Maria Eduarda dos Santos',
      startedOn: '2026-08-10',
      endedOn: '2026-08-12',
      minutes: 1200,
      link: 'https://even3.com.br/verificar/ABC123',
      readNote: null,
      confirmedAt: null,
    });
    const usage = await owner
      .select()
      .from(s.aiUsage)
      .where(and(eq(s.aiUsage.ownerId, userId), eq(s.aiUsage.feature, 'certificado_leitura')));
    expect(usage).toHaveLength(1);
    const notes = await owner
      .select()
      .from(s.notifications)
      .where(eq(s.notifications.ownerId, userId));
    expect(notes.map((n) => n.link)).toEqual([`/app/competencias/${itemId}`]);
    // Repetir o trabalho não lê de novo.
    await readCertificate({ storage: store, reader }).run({ itemId, userId }, ctx());
    expect(reader.calls).toHaveLength(1);
  });

  it('nome de outra pessoa no certificado vira aviso para conferir', async () => {
    const userId = await student({ name: 'Joana Prado Lima' });
    const { itemId } = await upload(userId, { text: CERT });
    await readCertificate({ storage: store, reader: new FakeCertificateReader() }).run(
      { itemId, userId },
      ctx(),
    );
    expect((await item(itemId)).readNote).toBe(
      CERTIFICATE_MESSAGES.otherHolder('Maria Eduarda dos Santos'),
    );
  });

  it('foto do certificado vai como imagem para a IA', async () => {
    const userId = await student();
    const { itemId } = await upload(userId, { image: Buffer.from('jpeg-de-teste') });
    const reader = new FakeCertificateReader();
    await readCertificate({ storage: store, reader }).run({ itemId, userId }, ctx());
    expect(reader.calls[0]!.image?.mime).toBe('image/jpeg');
    expect((await item(itemId)).status).toBe('to_confirm');
  });

  it('sem autorização, sem leitor ou com o recurso desligado: preencher à mão, com o motivo', async () => {
    const noConsent = await student({ consent: false });
    const a = await upload(noConsent, { text: CERT });
    await readCertificate({ storage: store, reader: new FakeCertificateReader() }).run(
      { itemId: a.itemId, userId: noConsent },
      ctx(),
    );
    expect(await item(a.itemId)).toMatchObject({
      status: 'to_confirm',
      title: '',
      readNote: CERTIFICATE_MESSAGES.noConsent,
    });

    const userId = await student();
    const b = await upload(userId, { text: CERT });
    await readCertificate({ storage: store, reader: null }).run(
      { itemId: b.itemId, userId },
      ctx(),
    );
    expect((await item(b.itemId)).readNote).toBe(CERTIFICATE_MESSAGES.unavailable);

    await owner
      .insert(s.appSettings)
      .values({ key: 'ai', value: { disabled: ['certificados'] } })
      .onConflictDoUpdate({
        target: s.appSettings.key,
        set: { value: { disabled: ['certificados'] } },
      });
    const c = await upload(userId, { text: CERT });
    await readCertificate({ storage: store, reader: new FakeCertificateReader() }).run(
      { itemId: c.itemId, userId },
      ctx(),
    );
    expect((await item(c.itemId)).readNote).toBe(CERTIFICATE_MESSAGES.paused);
    await owner.delete(s.appSettings).where(eq(s.appSettings.key, 'ai'));
  });

  it('arquivo ainda no antivírus espera; ao terminar, o item volta para a fila', async () => {
    const userId = await student();
    const { itemId, fileId } = await upload(userId, { text: CERT, status: 'scanning' });
    const reader = new FakeCertificateReader();
    await readCertificate({ storage: store, reader }).run({ itemId, userId }, ctx());
    expect((await item(itemId)).status).toBe('reading');
    expect(reader.calls).toHaveLength(0);
    await owner.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
      await releasePortfolioItems(tx, fileId, userId);
    });
    const [ev] = await owner
      .select()
      .from(s.outbox)
      .where(
        and(
          eq(s.outbox.topic, 'ai.read_certificate'),
          sql`${s.outbox.payload}->>'itemId' = ${itemId}`,
        ),
      );
    expect(ev).toBeTruthy();
  });

  it('arquivo recusado pelo antivírus: o motivo aparece no item', async () => {
    const userId = await student();
    const { itemId, fileId } = await upload(userId, { text: CERT });
    await owner
      .update(s.files)
      .set({ status: 'quarantined', error: 'Ameaça encontrada.' })
      .where(eq(s.files.id, fileId));
    await readCertificate({ storage: store, reader: new FakeCertificateReader() }).run(
      { itemId, userId },
      ctx(),
    );
    expect((await item(itemId)).readNote).toBe(CERTIFICATE_MESSAGES.rejected('Ameaça encontrada.'));
  });
});

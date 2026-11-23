import { randomBytes, randomUUID } from 'node:crypto';
import { PORTFOLIO_KINDS, PORTFOLIO_ROLES } from '@gutta/core';
import { portfolio } from '@gutta/contracts';
import { and, createDb, createPool, eq, schema as s, sql } from '@gutta/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { forget } from '@/lib/memo';
import * as svc from './service';

// Meus Certificados (Competências, K1) contra o banco de teste: pastas, registro com e sem
// arquivo, conferência pelo aluno, soma só do que foi conferido, filtros e isolamento.
const ownerPool = createPool(
  process.env.TEST_DATABASE_OWNER_URL ??
    'postgres://gutta_owner:gutta_owner_dev@localhost:5432/gutta_test',
  2,
);
const owner = createDb(ownerPool);

async function student() {
  const id = randomUUID();
  await owner
    .insert(s.authUsers)
    .values({ id, name: 'Maria Santos', email: `${id}@teste.gutta`, emailVerified: true });
  await owner.insert(s.profiles).values({ userId: id, displayName: 'Maria' });
  return id;
}

async function readyFile(ownerId: string) {
  const [f] = await owner
    .insert(s.files)
    .values({
      ownerId,
      originalName: 'certificado.pdf',
      mime: 'application/pdf',
      sizeBytes: 100,
      sha256: randomBytes(32).toString('hex'),
      status: 'ready',
      kind: 'pdf',
      scannedAt: new Date(),
    })
    .returning();
  return f!.id;
}

async function setFeatures(value: Record<string, boolean>) {
  await owner
    .insert(s.appSettings)
    .values({ key: 'features', value })
    .onConflictDoUpdate({ target: s.appSettings.key, set: { value } });
  forget('flags:');
}

beforeAll(() => setFeatures({ competencias: true }));
afterAll(async () => {
  await owner.delete(s.appSettings).where(eq(s.appSettings.key, 'features'));
  forget('flags:');
  await ownerPool.end();
});

describe('Meus Certificados', () => {
  it('tipos e papéis do contrato são os mesmos do domínio', () => {
    expect(portfolio.PortfolioKind.options).toEqual([...PORTFOLIO_KINDS]);
    expect(portfolio.PortfolioRole.options).toEqual([...PORTFOLIO_ROLES]);
  });

  it('pastas: cria, recusa nome repetido, renomeia e exclui sem perder o certificado', async () => {
    const userId = await student();
    const { folder } = await svc.createFolder(userId, 'Congressos');
    await expect(svc.createFolder(userId, 'congressos')).rejects.toMatchObject({ status: 409 });
    const { item } = await svc.createItem(userId, { folderId: folder.id });
    await svc.renameFolder(userId, folder.id, 'Congressos e jornadas');
    await svc.deleteFolder(userId, folder.id);
    const { items, folders } = await svc.listPortfolio(userId, {});
    expect(folders).toEqual([]);
    expect(items.find((i) => i.id === item.id)!.folderId).toBeNull();
  });

  it('com arquivo pronto, a leitura vai para a fila; sem arquivo, o aluno preenche', async () => {
    const userId = await student();
    const fileId = await readyFile(userId);
    const { item } = await svc.createItem(userId, { fileId });
    expect(item.status).toBe('reading');
    const events = await owner
      .select()
      .from(s.outbox)
      .where(
        and(
          eq(s.outbox.topic, 'ai.read_certificate'),
          sql`${s.outbox.payload}->>'itemId' = ${item.id}`,
        ),
      );
    expect(events).toHaveLength(1);
    const manual = await svc.createItem(userId, {});
    expect(manual.item.status).toBe('to_confirm');
  });

  it('só entra na soma o que o aluno conferiu; horas no formato dele', async () => {
    const userId = await student();
    const a = (await svc.createItem(userId, {})).item;
    const b = (await svc.createItem(userId, {})).item;
    await svc.updateItem(userId, a.id, {
      kind: 'evento',
      title: 'Congresso de Clínica Médica',
      hours: '20h',
      startedOn: '2026-08-10',
      endedOn: '2026-08-12',
      confirm: true,
    });
    await svc.updateItem(userId, b.id, { kind: 'curso', title: 'Curso de ECG', hours: '4h30' });
    let { summary } = await svc.listPortfolio(userId, {});
    expect(summary).toMatchObject({ totalMinutes: 1200, confirmedItems: 1, pendingItems: 1 });
    expect(summary.byKind).toEqual({ evento: 1200 });
    await svc.updateItem(userId, b.id, { confirm: true });
    ({ summary } = await svc.listPortfolio(userId, {}));
    expect(summary.totalMinutes).toBe(1470);

    const conferidos = await svc.listPortfolio(userId, { situacao: 'conferidos', tipo: 'curso' });
    expect(conferidos.items.map((i) => i.title)).toEqual(['Curso de ECG']);
    const busca = await svc.listPortfolio(userId, { q: 'clínica' });
    expect(busca.items.map((i) => i.id)).toEqual([a.id]);
  });

  it('recusa carga horária e datas que não fazem sentido, e confirmar sem nome', async () => {
    const userId = await student();
    const { item } = await svc.createItem(userId, {});
    await expect(svc.updateItem(userId, item.id, { hours: 'vinte' })).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      svc.updateItem(userId, item.id, { startedOn: '2026-05-10', endedOn: '2026-05-01' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(svc.updateItem(userId, item.id, { confirm: true })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('certificado sendo lido não pode ser confirmado', async () => {
    const userId = await student();
    const fileId = await readyFile(userId);
    const { item } = await svc.createItem(userId, { fileId });
    await expect(
      svc.updateItem(userId, item.id, { title: 'Algo', confirm: true }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('outro aluno não vê, não altera e não usa a pasta de ninguém', async () => {
    const ana = await student();
    const bia = await student();
    const { folder } = await svc.createFolder(ana, 'Minha');
    const { item } = await svc.createItem(ana, {});
    await expect(svc.getItem(bia, item.id)).rejects.toMatchObject({ status: 404 });
    await expect(svc.updateItem(bia, item.id, { title: 'x' })).rejects.toMatchObject({
      status: 404,
    });
    await expect(svc.createItem(bia, { folderId: folder.id })).rejects.toMatchObject({
      status: 404,
    });
    expect((await svc.listPortfolio(bia, {})).items).toEqual([]);
  });

  it('módulo desligado: a API responde que não está disponível', async () => {
    const userId = await student();
    await setFeatures({ competencias: false });
    await expect(svc.listPortfolio(userId, {})).rejects.toMatchObject({ status: 404 });
    await setFeatures({ competencias: true });
  });
});

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withUser } from '../src/client';
import * as s from '../src/schema';
import { connect, makeUser } from './helpers';

// Meus Certificados (docs/competencias, K1): pastas e certificados só do dono; o item só aponta
// para pasta e arquivo do próprio aluno.
const { app, owner, appPool, ownerPool } = connect();

let ana: string;
let bia: string;
let anaFolder: string;
let anaFile: string;
let anaItem: string;

const file = (ownerId: string) =>
  owner
    .insert(s.files)
    .values({
      ownerId,
      originalName: 'certificado.pdf',
      mime: 'application/pdf',
      sizeBytes: 10,
      sha256: randomUUID().replace(/-/g, '').padEnd(64, '0'),
      status: 'ready',
    })
    .returning()
    .then((r) => r[0]!.id);

beforeAll(async () => {
  ana = await makeUser(owner);
  bia = await makeUser(owner);
  anaFile = await file(ana);
  const [f] = await withUser(app, ana, (tx) =>
    tx.insert(s.portfolioFolders).values({ ownerId: ana, name: 'Congressos' }).returning(),
  );
  anaFolder = f!.id;
  const [i] = await withUser(app, ana, (tx) =>
    tx
      .insert(s.portfolioItems)
      .values({ ownerId: ana, folderId: anaFolder, fileId: anaFile, title: 'Congresso X' })
      .returning(),
  );
  anaItem = i!.id;
});

afterAll(async () => {
  await appPool.end();
  await ownerPool.end();
});

describe('Meus Certificados: acesso', () => {
  it('outro aluno não vê nem altera as pastas e os certificados', async () => {
    const rows = await withUser(app, bia, async (tx) => ({
      folders: await tx.select().from(s.portfolioFolders),
      items: await tx.select().from(s.portfolioItems),
    }));
    expect(rows).toEqual({ folders: [], items: [] });
    const changed = await withUser(app, bia, (tx) =>
      tx
        .update(s.portfolioItems)
        .set({ title: 'invadido' })
        .where(eq(s.portfolioItems.id, anaItem))
        .returning(),
    );
    expect(changed).toEqual([]);
  });

  it('não dá para pôr o certificado na pasta ou no arquivo de outro aluno', async () => {
    await expect(
      withUser(app, bia, (tx) =>
        tx.insert(s.portfolioItems).values({ ownerId: bia, folderId: anaFolder, title: 'x' }),
      ),
    ).rejects.toThrow();
    await expect(
      withUser(app, bia, (tx) =>
        tx.insert(s.portfolioItems).values({ ownerId: bia, fileId: anaFile, title: 'x' }),
      ),
    ).rejects.toThrow();
    await expect(
      withUser(app, bia, (tx) =>
        tx.insert(s.portfolioItems).values({ ownerId: ana, title: 'em nome de outro' }),
      ),
    ).rejects.toThrow();
  });

  it('nome de pasta repetido (sem diferenciar maiúsculas) é recusado', async () => {
    await expect(
      withUser(app, ana, (tx) =>
        tx.insert(s.portfolioFolders).values({ ownerId: ana, name: 'congressos' }),
      ),
    ).rejects.toThrow();
  });

  it('apagar a pasta mantém o certificado, sem pasta', async () => {
    const [f] = await withUser(app, ana, (tx) =>
      tx.insert(s.portfolioFolders).values({ ownerId: ana, name: 'Temporária' }).returning(),
    );
    const [i] = await withUser(app, ana, (tx) =>
      tx
        .insert(s.portfolioItems)
        .values({ ownerId: ana, folderId: f!.id, title: 'Curso Y' })
        .returning(),
    );
    await withUser(app, ana, (tx) =>
      tx.delete(s.portfolioFolders).where(eq(s.portfolioFolders.id, f!.id)),
    );
    const [after] = await withUser(app, ana, (tx) =>
      tx.select().from(s.portfolioItems).where(eq(s.portfolioItems.id, i!.id)),
    );
    expect(after!.folderId).toBeNull();
  });
});

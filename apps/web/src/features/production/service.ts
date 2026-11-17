import 'server-only';
import { PIECE_CREDITS, estimateCredits, isPieceType, type PieceType } from '@gutta/core';
import { and, asc, desc, eq, schema as s, withUser, type Tx } from '@gutta/db';
import type { production as contract } from '@gutta/contracts';
import { emit } from '@gutta/jobs';
import { keys } from '@gutta/storage';
import type { z } from 'zod';
import { conflict, notFound } from '@/lib/api';
import { db } from '@/lib/db';
import { audit } from '@/lib/events';
import { storage } from '@/lib/storage';

// Produção de aulas interativas, Fase 1 (docs/producao/ESPECIFICACAO.md; ADR 0021): lote a
// partir do arquivo do professor, slides e tarefas para o admin aprovar. A RLS só deixa admin
// ler e escrever; quem chama confere o papel antes (requireRole ou requireApiRole).

type BatchRow = typeof s.productionBatches.$inferSelect;
type TaskRow = typeof s.productionTasks.$inferSelect;

/** Imagens dos slides: URL assinada que vale o tempo de a tela ser usada. */
const IMAGE_TTL = 60 * 60;

const pieceOf = (v: string | null): PieceType | null => (v && isPieceType(v) ? v : null);

function taskDto(t: TaskRow): contract.TaskDto {
  const pieceType = pieceOf(t.pieceType);
  return {
    id: t.id,
    position: t.position,
    origin: t.origin === 'proposed' ? 'proposed' : 'instruction',
    sourceSlides: t.sourceSlides,
    targetSlides: t.targetSlides,
    targetAssumed: t.targetAssumed,
    instruction: t.instruction,
    priority: t.priority,
    pieceType,
    title: t.title,
    plan: t.plan ?? null,
    status: t.status,
    credits: pieceType && t.status !== 'discarded' ? PIECE_CREDITS[pieceType] : 0,
  };
}

async function batchDto(tx: Tx, b: BatchRow): Promise<contract.BatchDto> {
  const [discipline, topic, file] = await Promise.all([
    tx.query.disciplines.findFirst({ where: eq(s.disciplines.id, b.disciplineId) }),
    tx.query.topics.findFirst({ where: eq(s.topics.id, b.topicId) }),
    tx.query.files.findFirst({ where: eq(s.files.id, b.fileId) }),
  ]);
  return {
    id: b.id,
    title: b.title,
    disciplineId: b.disciplineId,
    disciplineName: discipline?.name ?? '',
    topicId: b.topicId,
    topicName: topic?.name ?? '',
    position: b.position,
    status: b.status,
    mode: b.mode === 'instructions' || b.mode === 'content' ? b.mode : null,
    // O arquivo pode falhar antes de o lote andar: o motivo aparece já na lista.
    error:
      b.error ?? (file?.status === 'failed' || file?.status === 'quarantined' ? file.error : null),
    warnings: b.warnings,
    // Arquivo de outro admin não aparece pela RLS de arquivos: o lote segue legível.
    fileName: file?.originalName ?? 'arquivo da aula',
    estimatedCredits: b.estimatedCredits,
    planCostMicros: b.planCostMicros,
    createdAt: b.createdAt.toISOString(),
  };
}

/** Disciplinas do catálogo com as aulas (assuntos), para o formulário de novo lote. */
export async function productionOptions(userId: string) {
  return withUser(db(), userId, async (tx) => {
    const disciplines = await tx
      .select({ id: s.disciplines.id, name: s.disciplines.name })
      .from(s.disciplines)
      .orderBy(asc(s.disciplines.name));
    const topics = await tx
      .select({ id: s.topics.id, name: s.topics.name, disciplineId: s.topics.disciplineId })
      .from(s.topics)
      .orderBy(asc(s.topics.orderIndex), asc(s.topics.name));
    return disciplines
      .map((d) => ({ ...d, topics: topics.filter((t) => t.disciplineId === d.id) }))
      .filter((d) => d.topics.length > 0);
  });
}

export async function listBatches(userId: string) {
  return withUser(db(), userId, async (tx) => {
    const rows = await tx
      .select()
      .from(s.productionBatches)
      .orderBy(desc(s.productionBatches.createdAt))
      .limit(100);
    return Promise.all(rows.map((b) => batchDto(tx, b)));
  });
}

export async function createBatch(
  userId: string,
  body: z.output<typeof contract.createBatchBody>,
): Promise<{ batch: contract.BatchDto }> {
  return withUser(db(), userId, async (tx) => {
    const topic = await tx.query.topics.findFirst({ where: eq(s.topics.id, body.topicId) });
    if (!topic) throw notFound('Aula');
    // Trava o arquivo: se o worker terminar agora, ele espera este lote existir para liberá-lo.
    const [file] = await tx
      .select()
      .from(s.files)
      .where(and(eq(s.files.id, body.fileId), eq(s.files.ownerId, userId)))
      .for('update');
    if (!file) throw notFound('Arquivo');
    if (file.status === 'failed' || file.status === 'quarantined')
      throw conflict(file.error ?? 'O arquivo não pôde ser processado. Envie de novo.');
    if (file.kind === 'sheet' || file.kind === 'image' || file.mime.startsWith('image/'))
      throw conflict('Envie a aula em PPT, PPTX, PDF ou DOCX.');
    const ready = file.status === 'ready';
    const [batch] = await tx
      .insert(s.productionBatches)
      .values({
        disciplineId: topic.disciplineId,
        topicId: topic.id,
        title: body.title,
        position: body.position,
        fileId: file.id,
        createdBy: userId,
        status: ready ? 'extracting' : 'waiting_file',
      })
      .returning();
    if (ready) await emit(tx, 'production.extract', { batchId: batch!.id, userId });
    await audit(tx, userId, 'production.batch_created', {
      type: 'production_batch',
      id: batch!.id,
    });
    return { batch: await batchDto(tx, batch!) };
  });
}

export async function getBatch(userId: string, id: string) {
  const store = storage();
  const data = await withUser(db(), userId, async (tx) => {
    const b = await tx.query.productionBatches.findFirst({
      where: eq(s.productionBatches.id, id),
    });
    if (!b) throw notFound('Lote');
    const slides = await tx
      .select()
      .from(s.productionSlides)
      .where(eq(s.productionSlides.batchId, id))
      .orderBy(asc(s.productionSlides.number));
    const tasks = await tx
      .select()
      .from(s.productionTasks)
      .where(eq(s.productionTasks.batchId, id))
      .orderBy(asc(s.productionTasks.position));
    return { batch: await batchDto(tx, b), slides, tasks };
  });
  const slides: contract.SlideDto[] = await Promise.all(
    data.slides.map(async (x) => ({
      number: x.number,
      kind: x.kind,
      text: x.text,
      notes: x.notes,
      hidden: x.hidden,
      imageUrl:
        x.hasImage && store
          ? await store.getUrl(keys.productionSlide(id, x.number), {
              contentType: 'image/jpeg',
              disposition: 'inline',
              expiresIn: IMAGE_TTL,
            })
          : null,
    })),
  );
  return { batch: data.batch, slides, tasks: data.tasks.map(taskDto) };
}

export async function updateTask(
  userId: string,
  id: string,
  body: z.output<typeof contract.updateTaskBody>,
): Promise<{ task: contract.TaskDto; estimatedCredits: number }> {
  return withUser(db(), userId, async (tx) => {
    const task = await tx.query.productionTasks.findFirst({
      where: eq(s.productionTasks.id, id),
    });
    if (!task) throw notFound('Tarefa');
    const batch = await tx.query.productionBatches.findFirst({
      where: eq(s.productionBatches.id, task.batchId),
    });
    if (batch?.status !== 'ready')
      throw conflict('O plano deste lote ainda não está pronto para aprovação.');
    const patch: Partial<typeof s.productionTasks.$inferInsert> = {};
    if (body.title !== undefined) patch.title = body.title;
    if (body.pieceType !== undefined) patch.pieceType = body.pieceType;
    if (body.status !== undefined && body.status !== task.status) {
      patch.status = body.status;
      patch.decidedBy = body.status === 'proposed' ? null : userId;
      patch.decidedAt = body.status === 'proposed' ? null : new Date();
    }
    const [updated] = await tx
      .update(s.productionTasks)
      .set(patch)
      .where(eq(s.productionTasks.id, id))
      .returning();
    const all = await tx
      .select({ pieceType: s.productionTasks.pieceType, status: s.productionTasks.status })
      .from(s.productionTasks)
      .where(eq(s.productionTasks.batchId, task.batchId));
    const estimatedCredits = estimateCredits(
      all.map((t) => ({ pieceType: pieceOf(t.pieceType), discarded: t.status === 'discarded' })),
    );
    await tx
      .update(s.productionBatches)
      .set({ estimatedCredits })
      .where(eq(s.productionBatches.id, task.batchId));
    await audit(tx, userId, 'production.task_updated', { type: 'production_task', id }, body);
    return { task: taskDto(updated!), estimatedCredits };
  });
}

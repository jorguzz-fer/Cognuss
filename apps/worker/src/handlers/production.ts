import type { LessonPlanner, PlanSlide } from '@gutta/ai';
import { slidesForImages } from '@gutta/ai';
import {
  detectTasks,
  estimateCredits,
  isPieceType,
  provisionalTitle,
  tidyText,
  type SlideInput,
} from '@gutta/core';
import { and, asc, eq, schema as s, withUser, type Tx } from '@gutta/db';
import { emit } from '@gutta/jobs';
import { keys, type ObjectStorage } from '@gutta/storage';
import {
  pageToSlide,
  PRESENTATION_EXT,
  readPptx,
  toPptx,
  type PresentationSlide,
} from '../files/presentation';
import { pdfImages, pdfPageCount } from '../files/tools';
import type { Handler } from './types';

// Produção de aulas (docs/producao/ESPECIFICACAO.md, etapas 2 e 3; ADR 0021). O lote é do
// admin que o criou: tudo roda sob withUser(dele), e a RLS só deixa admin ver as tabelas.

export type ProductionDeps = {
  storage: ObjectStorage | null;
  /** Null: sem chave do Claude. As tarefas saem só da detecção, sem plano, com aviso. */
  planner: LessonPlanner | null;
};

export const PRODUCTION_MESSAGES = {
  fileFailed: 'O arquivo da aula não pôde ser processado.',
  noSlides: 'Não encontramos slides nem páginas neste arquivo.',
  noImages:
    'Não deu para ligar as páginas do PDF aos slides: as imagens dos slides não vão aparecer.',
  noPlanner:
    'O plano por IA não está disponível (falta a chave do Claude). As tarefas vieram só da detecção dos pedidos.',
  noPlannerContent:
    'Esta aula não tem pedidos do professor e o plano por IA não está disponível: não há tarefas para propor.',
  dead: 'Não foi possível preparar este lote agora. Tente enviar de novo em alguns minutos.',
  partial: (n: number) =>
    n === 1 ? '1 tarefa ficou sem plano da IA.' : `${n} tarefas ficaram sem plano da IA.`,
} as const;

/**
 * Arquivo terminou de processar (pronto, falhou ou em quarentena): os lotes que esperavam por
 * ele seguem para a extração, que confere o estado. Roda na mesma transação que muda o arquivo.
 */
export async function releaseProductionBatches(tx: Tx, fileId: string, userId: string) {
  const waiting = await tx
    .update(s.productionBatches)
    .set({ status: 'extracting' })
    .where(
      and(
        eq(s.productionBatches.fileId, fileId),
        eq(s.productionBatches.createdBy, userId),
        eq(s.productionBatches.status, 'waiting_file'),
      ),
    )
    .returning({ id: s.productionBatches.id });
  for (const { id } of waiting) await emit(tx, 'production.extract', { batchId: id, userId });
}

const failWith = (tx: Tx, batchId: string, from: 'extracting' | 'planning', error: string) =>
  tx
    .update(s.productionBatches)
    .set({ status: 'failed', error })
    .where(and(eq(s.productionBatches.id, batchId), eq(s.productionBatches.status, from)));

/** Etapa 2: slides com texto, notas e imagem; detecção dos pedidos; segue para o plano. */
export function productionExtract(deps: ProductionDeps): Handler<'production.extract'> {
  return {
    run: async ({ batchId, userId }, ctx) => {
      const inTx = <T>(fn: (tx: Tx) => Promise<T>) => withUser(ctx.db, userId, fn);
      const batch = await inTx((tx) =>
        tx.query.productionBatches.findFirst({ where: eq(s.productionBatches.id, batchId) }),
      );
      if (!batch || batch.status !== 'extracting') return;
      const file = await inTx((tx) =>
        tx.query.files.findFirst({ where: eq(s.files.id, batch.fileId) }),
      );
      if (!file || file.status === 'failed' || file.status === 'quarantined')
        return void (await inTx((tx) =>
          failWith(tx, batchId, 'extracting', file?.error ?? PRODUCTION_MESSAGES.fileFailed),
        ));
      if (file.status !== 'ready') {
        // Ainda processando (trabalho repetido antes da hora): volta a esperar.
        await inTx((tx) =>
          tx
            .update(s.productionBatches)
            .set({ status: 'waiting_file' })
            .where(
              and(
                eq(s.productionBatches.id, batchId),
                eq(s.productionBatches.status, 'extracting'),
              ),
            ),
        );
        return;
      }
      if (!deps.storage) throw new Error('armazenamento não configurado');
      const storage = deps.storage;

      // Slides: pelo XML da apresentação, ou uma página do documento por slide.
      let slides: PresentationSlide[];
      const ext = PRESENTATION_EXT[file.mime];
      if (ext) {
        const original = await storage.get(keys.original(file.ownerId, file.id));
        slides = await readPptx(ext === 'pptx' ? original : await toPptx(original, ext));
      } else {
        const pages = await inTx((tx) =>
          tx
            .select({ page: s.filePages.page, text: s.filePages.text })
            .from(s.filePages)
            .where(eq(s.filePages.fileId, file.id))
            .orderBy(asc(s.filePages.page)),
        );
        slides = pages.map((p) => ({ number: p.page, text: p.text, notes: null, hidden: false }));
      }
      if (!slides.length)
        return void (await inTx((tx) =>
          failWith(tx, batchId, 'extracting', PRODUCTION_MESSAGES.noSlides),
        ));

      // Imagens a 1024 px, a partir do PDF (o próprio ou o convertido do Office).
      const warnings: string[] = [];
      const withImage = new Set<number>();
      const pdfKey =
        file.kind === 'pdf'
          ? keys.original(file.ownerId, file.id)
          : file.hasPdf
            ? keys.pdf(file.ownerId, file.id)
            : null;
      if (pdfKey) {
        const pdf = await storage.get(pdfKey);
        const pages = await pdfPageCount(pdf);
        const map = ext
          ? pageToSlide(slides, pages)
          : new Map(slides.map((x) => [x.number, x.number]));
        if (!map) warnings.push(PRODUCTION_MESSAGES.noImages);
        else {
          for (const [page, jpg] of await pdfImages(pdf, 1024)) {
            const slide = map.get(page);
            if (slide === undefined) continue;
            await storage.put(keys.productionSlide(batchId, slide), jpg, 'image/jpeg');
            withImage.add(slide);
          }
        }
      }

      const detection = detectTasks(slides.map((x) => ({ number: x.number, text: x.text })));
      const kindOf = new Map(detection.slides.map((x) => [x.number, x.kind]));
      await inTx(async (tx) => {
        // Repetir o trabalho não duplica: os slides do lote são regravados.
        await tx.delete(s.productionSlides).where(eq(s.productionSlides.batchId, batchId));
        await tx.insert(s.productionSlides).values(
          slides.map((x) => ({
            batchId,
            number: x.number,
            kind: kindOf.get(x.number) ?? 'content',
            text: tidyText(x.text),
            notes: x.notes ? tidyText(x.notes) : null,
            hidden: x.hidden,
            hasImage: withImage.has(x.number),
          })),
        );
        const [moved] = await tx
          .update(s.productionBatches)
          .set({
            status: 'planning',
            mode: detection.mode,
            bibliography: detection.bibliography,
            warnings,
            error: null,
          })
          .where(
            and(eq(s.productionBatches.id, batchId), eq(s.productionBatches.status, 'extracting')),
          )
          .returning({ id: s.productionBatches.id });
        if (moved) await emit(tx, 'production.plan', { batchId, userId });
      });
      ctx.log.info('production.extracted', {
        batchId,
        slides: slides.length,
        hidden: slides.filter((x) => x.hidden).length,
        images: withImage.size,
        tasks: detection.tasks.length,
      });
    },
    onDead: async ({ batchId, userId }, ctx) => {
      await withUser(ctx.db, userId, (tx) =>
        failWith(tx, batchId, 'extracting', PRODUCTION_MESSAGES.dead),
      );
    },
  };
}

/** Etapa 3: plano por IA de cada pedido (ou propostas, numa aula sem pedidos). */
export function productionPlan(deps: ProductionDeps): Handler<'production.plan'> {
  return {
    run: async ({ batchId, userId }, ctx) => {
      const inTx = <T>(fn: (tx: Tx) => Promise<T>) => withUser(ctx.db, userId, fn);
      const loaded = await inTx(async (tx) => {
        const batch = await tx.query.productionBatches.findFirst({
          where: eq(s.productionBatches.id, batchId),
        });
        if (!batch || batch.status !== 'planning') return null;
        const slides = await tx
          .select()
          .from(s.productionSlides)
          .where(eq(s.productionSlides.batchId, batchId))
          .orderBy(asc(s.productionSlides.number));
        const discipline = await tx.query.disciplines.findFirst({
          where: eq(s.disciplines.id, batch.disciplineId),
        });
        return { batch, slides, discipline };
      });
      if (!loaded) return;
      const { batch, slides } = loaded;
      const input: SlideInput[] = slides.map((x) => ({ number: x.number, text: x.text }));
      const detection = detectTasks(input);
      const warnings = [...batch.warnings];

      let planned: { ref: number; targetSlides: number[]; reason: string; plan: unknown }[];
      let usage: Awaited<ReturnType<LessonPlanner['plan']>> | null = null;
      if (!deps.planner) {
        warnings.push(
          detection.mode === 'content'
            ? PRODUCTION_MESSAGES.noPlannerContent
            : PRODUCTION_MESSAGES.noPlanner,
        );
        planned = detection.tasks.map((t) => ({
          ref: t.position,
          targetSlides: t.targetSlides,
          reason: '',
          plan: null,
        }));
      } else {
        const wanted = new Set(
          slidesForImages({
            mode: detection.mode,
            tasks: detection.tasks,
            slides: slides.map((x) => ({ ...x, image: null })),
          }),
        );
        const planSlides: PlanSlide[] = [];
        for (const x of slides) {
          const image =
            wanted.has(x.number) && x.hasImage && deps.storage
              ? await deps.storage.get(keys.productionSlide(batchId, x.number))
              : null;
          planSlides.push({ number: x.number, kind: x.kind, text: x.text, notes: x.notes, image });
        }
        usage = await deps.planner.plan({
          discipline: loaded.discipline?.name ?? 'Disciplina',
          lesson: batch.title,
          bibliography: batch.bibliography,
          mode: detection.mode,
          slides: planSlides,
          tasks: detection.tasks,
        });
        planned = usage.tasks;
        warnings.push(...usage.warnings);
        const missing = usage.tasks.filter((t) => !t.plan).length;
        if (missing && !usage.refused && usage.tasks.length)
          warnings.push(PRODUCTION_MESSAGES.partial(missing));
      }

      const detected = new Map(detection.tasks.map((t) => [t.position, t]));
      const rows = planned.map((p, i) => {
        const plan = p.plan as { pieceType?: string; title?: string } | null;
        const d = detection.mode === 'instructions' ? detected.get(p.ref) : undefined;
        const pieceType = plan?.pieceType ?? d?.hint ?? null;
        return {
          batchId,
          position: i + 1,
          origin: d ? 'instruction' : 'proposed',
          sourceSlides: d?.sourceSlides ?? p.targetSlides,
          targetSlides: d?.targetSlides ?? p.targetSlides,
          targetAssumed: d?.targetAssumed ?? false,
          instruction: d?.instruction ?? p.reason,
          priority: d?.priority ?? false,
          pieceType: pieceType && isPieceType(pieceType) ? pieceType : null,
          title: plan?.title || (d ? provisionalTitle(d.instruction) : `Proposta ${i + 1}`),
          plan: (p.plan as Record<string, unknown> | null) ?? null,
        };
      });

      await inTx(async (tx) => {
        if (usage)
          await tx.insert(s.aiUsage).values({
            ownerId: userId,
            feature: 'producao_plano',
            model: usage.model,
            inputTokens: usage.usage.input,
            outputTokens: usage.usage.output,
            cacheReadTokens: usage.usage.cacheRead,
            cacheWriteTokens: usage.usage.cacheWrite,
            costMicros: usage.costMicros,
            refused: usage.refused,
          });
        const [moved] = await tx
          .update(s.productionBatches)
          .set({
            status: 'ready',
            warnings,
            planModel: usage?.model ?? null,
            planCostMicros: (batch.planCostMicros ?? 0) + (usage?.costMicros ?? 0),
            plannedAt: new Date(),
            estimatedCredits: estimateCredits(
              rows.map((r) => ({
                pieceType: r.pieceType && isPieceType(r.pieceType) ? r.pieceType : null,
              })),
            ),
          })
          .where(
            and(eq(s.productionBatches.id, batchId), eq(s.productionBatches.status, 'planning')),
          )
          .returning({ id: s.productionBatches.id });
        if (!moved) return;
        await tx.delete(s.productionTasks).where(eq(s.productionTasks.batchId, batchId));
        if (rows.length) await tx.insert(s.productionTasks).values(rows);
      });
      ctx.log.info('production.planned', {
        batchId,
        mode: detection.mode,
        tasks: rows.length,
        model: usage?.model ?? null,
        costMicros: usage?.costMicros ?? 0,
      });
    },
    onDead: async ({ batchId, userId }, ctx) => {
      await withUser(ctx.db, userId, (tx) =>
        failWith(tx, batchId, 'planning', PRODUCTION_MESSAGES.dead),
      );
    },
  };
}

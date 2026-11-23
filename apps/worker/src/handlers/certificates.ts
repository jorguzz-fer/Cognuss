import type { CertificateInput, CertificateReader } from '@gutta/ai';
import { parseHours, sameHolder, validPortfolioDates } from '@gutta/core';
import { aiFeatureOn, and, asc, desc, eq, schema as s, withUser, type Tx } from '@gutta/db';
import { emit } from '@gutta/jobs';
import { keys, type ObjectStorage } from '@gutta/storage';
import type { Handler } from './types';

// Leitura dos certificados (Cognuss Competências, K1; docs/competencias/ESPECIFICACAO.md, 3.1).
// O Claude propõe os campos e o aluno confere. Qualquer motivo para não ler (sem chave, sem
// autorização, recurso desligado, arquivo recusado) deixa o item para o aluno preencher à mão,
// com o motivo na tela: a leitura ajuda, mas nunca é obrigatória.

export const CERTIFICATE_MESSAGES = {
  unavailable: 'A leitura automática não está disponível agora. Preencha os campos à mão.',
  paused: 'A leitura automática está pausada pela equipe. Preencha os campos à mão.',
  noConsent:
    'Para o Cognuss ler o certificado com IA, autorize a leitura dos seus materiais em Privacidade. Enquanto isso, preencha os campos à mão.',
  refused: 'A leitura automática não foi possível. Preencha os campos à mão.',
  notCertificate:
    'Não parece um certificado ou comprovante. Confira o arquivo e preencha os campos à mão.',
  otherHolder: (name: string) =>
    `O nome no certificado (${name}) não é o do seu cadastro. Confira antes de confirmar.`,
  rejected: (why: string) => `O arquivo foi recusado: ${why}`,
  dead: 'Não deu para ler o certificado agora. Preencha os campos à mão.',
} as const;

/** Menos letras que isso nas páginas: PDF digitalizado, vai como documento. */
const MIN_TEXT = 40;
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Arquivo terminou de processar: os certificados que esperavam por ele vão para a leitura.
 * Roda na mesma transação que muda o arquivo (como o cronograma e a produção de aulas).
 */
export async function releasePortfolioItems(tx: Tx, fileId: string, userId: string) {
  const waiting = await tx
    .select({ id: s.portfolioItems.id })
    .from(s.portfolioItems)
    .where(
      and(
        eq(s.portfolioItems.fileId, fileId),
        eq(s.portfolioItems.ownerId, userId),
        eq(s.portfolioItems.status, 'reading'),
      ),
    );
  for (const { id } of waiting) await emit(tx, 'ai.read_certificate', { itemId: id, userId });
}

export type CertificateDeps = {
  storage: ObjectStorage | null;
  reader: CertificateReader | null;
};

export function readCertificate(deps: CertificateDeps): Handler<'ai.read_certificate'> {
  return {
    run: async ({ itemId, userId }, ctx) => {
      const inTx = <T>(fn: (tx: Tx) => Promise<T>) => withUser(ctx.db, userId, fn);
      const item = await inTx((tx) =>
        tx.query.portfolioItems.findFirst({
          where: and(eq(s.portfolioItems.id, itemId), eq(s.portfolioItems.ownerId, userId)),
        }),
      );
      // Apagado ou já lido numa execução anterior: nada a fazer.
      if (!item || item.status !== 'reading') return;

      const manual = (note: string) =>
        inTx((tx) =>
          tx
            .update(s.portfolioItems)
            .set({ status: 'to_confirm', readNote: note })
            .where(and(eq(s.portfolioItems.id, itemId), eq(s.portfolioItems.status, 'reading'))),
        );

      const file = item.fileId
        ? await inTx((tx) =>
            tx.query.files.findFirst({
              where: and(eq(s.files.id, item.fileId!), eq(s.files.ownerId, userId)),
            }),
          )
        : null;
      if (!file) return void (await manual(CERTIFICATE_MESSAGES.refused));
      if (file.status === 'failed' || file.status === 'quarantined')
        return void (await manual(
          CERTIFICATE_MESSAGES.rejected(file.error ?? 'não foi possível processar.'),
        ));
      // Ainda no antivírus ou na conversão: o fim do processamento chama de novo.
      if (file.status !== 'ready') return;

      if (!deps.reader) return void (await manual(CERTIFICATE_MESSAGES.unavailable));
      if (!(await inTx((tx) => aiFeatureOn(tx, 'certificados'))))
        return void (await manual(CERTIFICATE_MESSAGES.paused));
      const [consent] = await inTx((tx) =>
        tx
          .select({ granted: s.consentRecords.granted })
          .from(s.consentRecords)
          .where(
            and(eq(s.consentRecords.userId, userId), eq(s.consentRecords.purpose, 'ai_materials')),
          )
          .orderBy(desc(s.consentRecords.recordedAt))
          .limit(1),
      );
      if (consent?.granted !== true) return void (await manual(CERTIFICATE_MESSAGES.noConsent));

      // Imagem vai como imagem; PDF com texto vai como texto; digitalizado, como documento.
      const input: CertificateInput = { fileName: file.originalName };
      if (IMAGE_MIMES.has(file.mime)) {
        if (!deps.storage) throw new Error('armazenamento não configurado');
        input.image = {
          data: await deps.storage.get(keys.original(userId, file.id)),
          mime: file.mime as 'image/jpeg' | 'image/png' | 'image/webp',
        };
      } else {
        const pages = await inTx((tx) =>
          tx
            .select({ page: s.filePages.page, text: s.filePages.text })
            .from(s.filePages)
            .where(eq(s.filePages.fileId, file.id))
            .orderBy(asc(s.filePages.page)),
        );
        input.text = pages.map((p) => p.text).join('\n\n');
        const letters = input.text.replace(/\s/g, '').length;
        if (letters < MIN_TEXT && deps.storage && (file.kind === 'pdf' || file.hasPdf))
          input.pdf = await deps.storage.get(
            file.hasPdf ? keys.pdf(userId, file.id) : keys.original(userId, file.id),
          );
      }

      const res = await deps.reader.read(input);
      const user = await inTx((tx) =>
        tx.query.authUsers.findFirst({ where: eq(s.authUsers.id, userId) }),
      );
      await inTx(async (tx) => {
        await tx.insert(s.aiUsage).values({
          ownerId: userId,
          feature: 'certificado_leitura',
          model: res.model,
          inputTokens: res.usage.input,
          outputTokens: res.usage.output,
          cacheReadTokens: res.usage.cacheRead,
          cacheWriteTokens: res.usage.cacheWrite,
          costMicros: res.costMicros,
          refused: res.refused,
        });
        const d = res.data;
        if (res.refused || !d) {
          await tx
            .update(s.portfolioItems)
            .set({ status: 'to_confirm', readNote: CERTIFICATE_MESSAGES.refused })
            .where(and(eq(s.portfolioItems.id, itemId), eq(s.portfolioItems.status, 'reading')));
          return;
        }
        // Datas que não fazem sentido não entram: o aluno preenche.
        const datesOk = !validPortfolioDates(d.startedOn, d.endedOn);
        const notes = [...d.notes];
        if (!d.isCertificate) notes.unshift(CERTIFICATE_MESSAGES.notCertificate);
        if (d.holderName && sameHolder(d.holderName, user?.name) === false)
          notes.unshift(CERTIFICATE_MESSAGES.otherHolder(d.holderName));
        if (!datesOk) notes.push('As datas lidas não fazem sentido. Preencha à mão.');
        await tx
          .update(s.portfolioItems)
          .set({
            status: 'to_confirm',
            kind: d.kind,
            title: d.title.slice(0, 300),
            issuer: d.issuer?.slice(0, 200) ?? null,
            holderName: d.holderName?.slice(0, 200) ?? null,
            role: d.role,
            startedOn: datesOk ? d.startedOn : null,
            endedOn: datesOk ? d.endedOn : null,
            minutes: parseHours(d.hours),
            link: d.verificationUrl?.slice(0, 500) ?? null,
            extracted: d as unknown as Record<string, unknown>,
            readNote: notes.length ? notes.join('\n') : null,
          })
          .where(and(eq(s.portfolioItems.id, itemId), eq(s.portfolioItems.status, 'reading')));
        await tx
          .insert(s.notifications)
          .values({
            ownerId: userId,
            dedupeKey: `certificado:${itemId}`,
            type: 'certificate_ready',
            title: 'Certificado lido',
            body: 'Confira os campos antes de o certificado entrar no seu currículo.',
            link: `/app/competencias/${itemId}`,
            scheduledFor: new Date(),
          })
          .onConflictDoNothing();
      });
      ctx.log.info('certificate.read', {
        itemId,
        model: res.model,
        costMicros: res.costMicros,
        refused: res.refused,
      });
    },
    onDead: async ({ itemId, userId }, ctx) => {
      await withUser(ctx.db, userId, (tx) =>
        tx
          .update(s.portfolioItems)
          .set({ status: 'to_confirm', readNote: CERTIFICATE_MESSAGES.dead })
          .where(and(eq(s.portfolioItems.id, itemId), eq(s.portfolioItems.status, 'reading'))),
      );
    },
  };
}

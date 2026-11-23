import 'server-only';
import { asc, desc, eq, schema, sql, type Tx } from '@gutta/db-kids';

// Leituras das avaliações do aluno (AVA-03 a AVA-08). Tudo pelo RLS ou pelas funções attempt_*.

export type ViewRow = {
  pos: number;
  kind: 'multiple_choice' | 'true_false' | 'short_answer';
  stem: string;
  options: string[] | null;
  answer: { choice?: number; value?: boolean; text?: string } | null;
  is_correct: boolean | null;
  explanation: string | null;
  model_answer: string | null;
  correct: { correct?: number; value?: boolean } | null;
};

export async function attemptView(tx: Tx, attemptId: string): Promise<ViewRow[]> {
  const r = await tx.execute<ViewRow>(sql`select * from attempt_view(${attemptId})`);
  return r.rows;
}

/** Avaliações que o aluno vê (planos publicados do ano dele) e as tentativas dele em cada uma. */
export async function studentAssessments(tx: Tx, userId: string) {
  const list = await tx
    .select({
      id: schema.assessments.id,
      kind: schema.assessments.kind,
      title: schema.assessments.title,
      questionCount: schema.assessments.questionCount,
      passingScore: schema.assessments.passingScore,
      maxAttempts: schema.assessments.maxAttempts,
      maxRetakes: schema.assessments.maxRetakes,
      opensAt: schema.assessments.opensAt,
      closesAt: schema.assessments.closesAt,
      subject: schema.subjects.name,
      open: sql<boolean>`(${schema.assessments.opensAt} is null or ${schema.assessments.opensAt} <= now())
        and (${schema.assessments.closesAt} is null or ${schema.assessments.closesAt} >= now())`,
    })
    .from(schema.assessments)
    .innerJoin(schema.studyPlans, eq(schema.studyPlans.id, schema.assessments.planId))
    .innerJoin(schema.subjects, eq(schema.subjects.id, schema.studyPlans.subjectId))
    .orderBy(asc(schema.subjects.name), asc(schema.assessments.createdAt));
  const attempts = await tx
    .select()
    .from(schema.assessmentAttempts)
    .where(eq(schema.assessmentAttempts.userId, userId))
    .orderBy(desc(schema.assessmentAttempts.startedAt));
  return list.map((a) => ({ ...a, attempts: attempts.filter((t) => t.assessmentId === a.id) }));
}

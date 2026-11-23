'use server';
import {
  and,
  eq,
  generateJoinCode,
  isNull,
  schema,
  STAGE_GRADES,
  SUGGESTED_SUBJECTS,
  sql,
  withTenantUser,
} from '@gutta/db-kids';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { classForm, formObject, isUniqueViolation, staffInvite } from '@/lib/forms';
import { createInvitation, sendInvitation } from '@/lib/invitations';
import { logger } from '@/lib/logger';

// Ações da gestão (EST, USR). Todas rodam com withTenantUser: o RLS confere o papel de gestor.

const back = (path: string, aviso: string): never => redirect(`${path}?aviso=${aviso}`);

const stage = z.enum(['fundamental', 'medio']);

/** EST-01: ativa ou desativa uma etapa. Ao ativar, cria os anos dela (inativos). */
export async function setStage(fd: FormData) {
  const ctx = await requireTenant(['manager'], '/escola/estrutura');
  const parsed = z
    .object({ stage, active: z.enum(['on', 'off']), confirm: z.string().optional() })
    .safeParse(formObject(fd));
  if (!parsed.success) back('/escola/estrutura', 'dados-invalidos');
  const { stage: st, active, confirm } = parsed.data!;
  if (active === 'off' && confirm !== 'on') back('/escola/estrutura', 'confirmar');
  await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    await tx
      .insert(schema.tenantStages)
      .values({ tenantId: ctx.tenantId, stage: st, active: active === 'on' })
      .onConflictDoUpdate({
        target: [schema.tenantStages.tenantId, schema.tenantStages.stage],
        set: { active: active === 'on' },
      });
    if (active === 'on') {
      for (const number of STAGE_GRADES[st]) {
        await tx
          .insert(schema.grades)
          .values({ tenantId: ctx.tenantId, stage: st, number, active: false })
          .onConflictDoNothing();
      }
    } else {
      await tx
        .update(schema.grades)
        .set({ active: false })
        .where(and(eq(schema.grades.tenantId, ctx.tenantId), eq(schema.grades.stage, st)));
    }
    await tx.insert(schema.auditLogs).values({
      tenantId: ctx.tenantId,
      actorId: ctx.user.id,
      action: active === 'on' ? 'stage.activated' : 'stage.deactivated',
      entityType: 'stage',
      entityId: st,
    });
  });
  revalidatePath('/escola', 'layout');
  back('/escola/estrutura', 'estrutura-salva');
}

/** EST-02 e EST-07: ativa ou desativa um ano. Desativar pede confirmação e não apaga nada. */
export async function setGrade(fd: FormData) {
  const ctx = await requireTenant(['manager'], '/escola/estrutura');
  const parsed = z
    .object({ gradeId: z.uuid(), active: z.enum(['on', 'off']), confirm: z.string().optional() })
    .safeParse(formObject(fd));
  if (!parsed.success) back('/escola/estrutura', 'dados-invalidos');
  const { gradeId, active, confirm } = parsed.data!;
  if (active === 'off' && confirm !== 'on') back('/escola/estrutura', 'confirmar');
  await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    await tx
      .update(schema.grades)
      .set({ active: active === 'on' })
      .where(and(eq(schema.grades.id, gradeId), eq(schema.grades.tenantId, ctx.tenantId)));
    await tx.insert(schema.auditLogs).values({
      tenantId: ctx.tenantId,
      actorId: ctx.user.id,
      action: active === 'on' ? 'grade.activated' : 'grade.deactivated',
      entityType: 'grade',
      entityId: gradeId,
    });
  });
  revalidatePath('/escola', 'layout');
  back('/escola/estrutura', 'estrutura-salva');
}

/** EST-06: nova matéria. */
export async function addSubject(fd: FormData) {
  const ctx = await requireTenant(['manager'], '/escola/materias');
  const parsed = z.object({ name: z.string().trim().min(2).max(60) }).safeParse(formObject(fd));
  if (!parsed.success) back('/escola/materias', 'dados-invalidos');
  try {
    await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
      tx.insert(schema.subjects).values({ tenantId: ctx.tenantId, name: parsed.data!.name }),
    );
  } catch (err) {
    if (isUniqueViolation(err)) back('/escola/materias', 'nome-usado');
    throw err;
  }
  revalidatePath('/escola/materias');
  back('/escola/materias', 'materia-criada');
}

/** EST-06 [ENG]: adiciona a lista sugerida da BNCC das etapas ativas (sem repetir). */
export async function addSuggestedSubjects() {
  const ctx = await requireTenant(['manager'], '/escola/materias');
  await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    const stages = await tx
      .select({ stage: schema.tenantStages.stage })
      .from(schema.tenantStages)
      .where(eq(schema.tenantStages.active, true));
    const names = new Set(stages.flatMap((s) => SUGGESTED_SUBJECTS[s.stage]));
    for (const name of names) {
      await tx.execute(sql`
        insert into subjects (tenant_id, name) values (${ctx.tenantId}, ${name})
        on conflict (tenant_id, lower(name)) do nothing`);
    }
  });
  revalidatePath('/escola/materias');
  back('/escola/materias', 'materias-sugeridas');
}

export async function archiveSubject(fd: FormData) {
  const ctx = await requireTenant(['manager'], '/escola/materias');
  const parsed = z.object({ subjectId: z.uuid() }).safeParse(formObject(fd));
  if (!parsed.success) back('/escola/materias', 'dados-invalidos');
  await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
    tx
      .update(schema.subjects)
      .set({ archivedAt: new Date() })
      .where(eq(schema.subjects.id, parsed.data!.subjectId)),
  );
  revalidatePath('/escola/materias');
  back('/escola/materias', 'materia-arquivada');
}

/** EST-05: nova turma, com código de entrada único (tenta de novo se o sorteio repetir). */
export async function createClass(fd: FormData) {
  const ctx = await requireTenant(['manager'], '/escola/turmas');
  const parsed = classForm.safeParse(formObject(fd));
  if (!parsed.success) back('/escola/turmas', 'dados-invalidos');
  const f = parsed.data!;
  let classId: string | undefined;
  for (let attempt = 0; attempt < 5 && !classId; attempt++) {
    try {
      classId = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
        const [c] = await tx
          .insert(schema.classes)
          .values({ tenantId: ctx.tenantId, ...f, joinCode: generateJoinCode() })
          .returning({ id: schema.classes.id });
        return c!.id;
      });
    } catch (err) {
      const msg = String((err as { cause?: { constraint?: string } })?.cause?.constraint ?? '');
      if (isUniqueViolation(err) && msg === 'classes_join_code_key') continue;
      if (isUniqueViolation(err)) back('/escola/turmas', 'nome-usado');
      throw err;
    }
  }
  if (!classId) throw new Error('não foi possível gerar um código de turma único');
  revalidatePath('/escola/turmas');
  redirect(`/escola/turmas/${classId}?aviso=turma-criada`);
}

/** USR-04: liga professor à turma × matéria. */
export async function assignTeacher(fd: FormData) {
  const ctx = await requireTenant(['manager']);
  const parsed = z
    .object({ classId: z.uuid(), subjectId: z.uuid(), userId: z.string().min(1) })
    .safeParse(formObject(fd));
  if (!parsed.success) back('/escola/turmas', 'dados-invalidos');
  const f = parsed.data!;
  const path = `/escola/turmas/${f.classId}`;
  await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    // Só quem é professor ativo desta escola.
    const teacher = await tx.query.memberships.findFirst({
      where: and(
        eq(schema.memberships.userId, f.userId),
        eq(schema.memberships.role, 'teacher'),
        eq(schema.memberships.status, 'active'),
      ),
    });
    if (!teacher) back(path, 'dados-invalidos');
    await tx
      .insert(schema.teacherAssignments)
      .values({ tenantId: ctx.tenantId, ...f })
      .onConflictDoNothing();
  });
  revalidatePath(path);
  back(path, 'professor-ligado');
}

export async function unassignTeacher(fd: FormData) {
  const ctx = await requireTenant(['manager']);
  const parsed = z.object({ assignmentId: z.uuid(), classId: z.uuid() }).safeParse(formObject(fd));
  if (!parsed.success) back('/escola/turmas', 'dados-invalidos');
  const path = `/escola/turmas/${parsed.data!.classId}`;
  await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
    tx
      .delete(schema.teacherAssignments)
      .where(eq(schema.teacherAssignments.id, parsed.data!.assignmentId)),
  );
  revalidatePath(path);
  back(path, 'professor-desligado');
}

/** Tira o aluno da turma (left_at). O histórico fica. */
export async function removeFromClass(fd: FormData) {
  const ctx = await requireTenant(['manager']);
  const parsed = z.object({ memberId: z.uuid(), classId: z.uuid() }).safeParse(formObject(fd));
  if (!parsed.success) back('/escola/turmas', 'dados-invalidos');
  const path = `/escola/turmas/${parsed.data!.classId}`;
  await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
    tx
      .update(schema.classMembers)
      .set({ leftAt: new Date() })
      .where(
        and(eq(schema.classMembers.id, parsed.data!.memberId), isNull(schema.classMembers.leftAt)),
      ),
  );
  revalidatePath(path);
  back(path, 'aluno-removido');
}

/** USR-01: convite de professor ou gestão. */
export async function inviteStaff(fd: FormData) {
  const ctx = await requireTenant(['manager'], '/escola/pessoas');
  const parsed = staffInvite.safeParse(formObject(fd));
  if (!parsed.success) back('/escola/pessoas', 'dados-invalidos');
  const { email, role } = parsed.data!;
  const token = await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
    createInvitation(tx, { tenantId: ctx.tenantId, email, role, invitedBy: ctx.user.id }),
  );
  await sendInvitation(email, ctx.tenantName, role, token).catch((err) =>
    logger.error('kids.invite_mail_failed', { tenantId: ctx.tenantId, err: String(err) }),
  );
  revalidatePath('/escola/pessoas');
  back('/escola/pessoas', 'convite-enviado');
}

export async function cancelInvitation(fd: FormData) {
  const ctx = await requireTenant(['manager'], '/escola/pessoas');
  const parsed = z.object({ invitationId: z.uuid() }).safeParse(formObject(fd));
  if (!parsed.success) back('/escola/pessoas', 'dados-invalidos');
  await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
    tx
      .delete(schema.invitations)
      .where(
        and(
          eq(schema.invitations.id, parsed.data!.invitationId),
          isNull(schema.invitations.acceptedAt),
        ),
      ),
  );
  revalidatePath('/escola/pessoas');
  back('/escola/pessoas', 'convite-cancelado');
}

/**
 * USR-06: remove o acesso de alguém à escola e encerra as sessões da pessoa. O histórico de
 * tentativas do aluno fica com a escola até o prazo de retenção.
 */
export async function removeMember(fd: FormData) {
  const ctx = await requireTenant(['manager'], '/escola/pessoas');
  const parsed = z.object({ membershipId: z.uuid() }).safeParse(formObject(fd));
  if (!parsed.success) back('/escola/pessoas', 'dados-invalidos');
  const removedUser = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    const m = await tx.query.memberships.findFirst({
      where: eq(schema.memberships.id, parsed.data!.membershipId),
    });
    if (!m) return null;
    if (m.userId === ctx.user.id) back('/escola/pessoas', 'nao-remove-a-si');
    await tx
      .update(schema.memberships)
      .set({ status: 'removed' })
      .where(eq(schema.memberships.id, m.id));
    // Sessões: tabela do Better Auth, sem RLS (ADR 0003). Encerra todas as da pessoa.
    await tx.delete(schema.authSessions).where(eq(schema.authSessions.userId, m.userId));
    await tx.insert(schema.auditLogs).values({
      tenantId: ctx.tenantId,
      actorId: ctx.user.id,
      action: 'membership.removed',
      entityType: 'user',
      entityId: m.userId,
      metadata: { role: m.role },
    });
    return m.userId;
  });
  if (!removedUser) back('/escola/pessoas', 'dados-invalidos');
  revalidatePath('/escola/pessoas');
  back('/escola/pessoas', 'membro-removido');
}

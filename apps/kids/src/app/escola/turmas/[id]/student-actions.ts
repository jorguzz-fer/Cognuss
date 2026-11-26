'use server';
import {
  and,
  eq,
  NicknameTakenError,
  normalizeNickname,
  schema,
  simplePassword,
  withTenantUser,
  createStudent,
  hashPassword,
} from '@gutta/db-kids';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { formObject, studentForm } from '@/lib/forms';
import type { Credential, StudentActionState } from '@/lib/students';

// USR-02 e USR-03: alunos criados pela gestão, com login "<código>.<apelido>" e senha simples.
// As credenciais voltam só no estado do formulário (mostradas uma vez), nunca na URL nem no log.

async function classOf(tenantId: string, userId: string, classId: string) {
  return withTenantUser(db(), tenantId, userId, (tx) =>
    tx.query.classes.findFirst({ where: eq(schema.classes.id, classId) }),
  );
}

export async function addStudent(
  _prev: StudentActionState,
  fd: FormData,
): Promise<StudentActionState> {
  const ctx = await requireTenant(['manager']);
  const parsed = studentForm.extend({ classId: z.uuid() }).safeParse(formObject(fd));
  if (!parsed.success) return { error: 'Preencha o nome e o apelido.' };
  const nickname = normalizeNickname(parsed.data.nickname);
  if (!nickname) return { error: 'O apelido precisa ter de 3 a 20 letras ou números.' };
  const klass = await classOf(ctx.tenantId, ctx.user.id, parsed.data.classId);
  if (!klass) return { error: 'Turma não encontrada.' };
  const password = simplePassword();
  try {
    const r = await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
      createStudent(tx, {
        tenantId: ctx.tenantId,
        classId: klass.id,
        joinCode: klass.joinCode,
        name: parsed.data.name,
        nickname,
        password,
        actorId: ctx.user.id,
      }),
    );
    revalidatePath(`/escola/turmas/${klass.id}`);
    return { credentials: [{ name: parsed.data.name, username: r.username, password }] };
  } catch (err) {
    if (err instanceof NicknameTakenError) return { error: 'Esse apelido já existe na turma.' };
    throw err;
  }
}

/**
 * Importação em lote: uma linha por aluno, "Nome completo; apelido" (o apelido é opcional e
 * sai do primeiro nome). Linhas com problema são puladas e listadas; o resto é criado.
 */
export async function importStudents(
  _prev: StudentActionState,
  fd: FormData,
): Promise<StudentActionState> {
  const ctx = await requireTenant(['manager']);
  const parsed = z
    .object({ classId: z.uuid(), lines: z.string().max(20_000) })
    .safeParse(formObject(fd));
  if (!parsed.success) return { error: 'Cole uma lista com até 200 alunos.' };
  const rows = parsed.data.lines
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (rows.length === 0 || rows.length > 200) return { error: 'Cole de 1 a 200 linhas.' };
  const klass = await classOf(ctx.tenantId, ctx.user.id, parsed.data.classId);
  if (!klass) return { error: 'Turma não encontrada.' };
  const credentials: Credential[] = [];
  const skipped: { line: string; reason: string }[] = [];
  for (const line of rows) {
    const [rawName = '', rawNick] = line.split(/[;,\t]/).map((p) => p.trim());
    if (rawName.length < 2) {
      skipped.push({ line, reason: 'nome muito curto' });
      continue;
    }
    const nickname = normalizeNickname(rawNick || rawName.split(/\s+/)[0]!);
    if (!nickname) {
      skipped.push({ line, reason: 'apelido inválido' });
      continue;
    }
    const password = simplePassword();
    try {
      const r = await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
        createStudent(tx, {
          tenantId: ctx.tenantId,
          classId: klass.id,
          joinCode: klass.joinCode,
          name: rawName,
          nickname,
          password,
          actorId: ctx.user.id,
        }),
      );
      credentials.push({ name: rawName, username: r.username, password });
    } catch (err) {
      if (err instanceof NicknameTakenError) skipped.push({ line, reason: 'apelido já existe' });
      else throw err;
    }
  }
  revalidatePath(`/escola/turmas/${klass.id}`);
  return { credentials, skipped };
}

/**
 * USR-07: nova senha simples para um aluno. Gestão: qualquer aluno da escola. Professor: só
 * alunos das turmas dele (o RLS de memberships só mostra esses ao professor).
 */
export async function resetStudentPassword(
  _prev: StudentActionState,
  fd: FormData,
): Promise<StudentActionState> {
  const ctx = await requireTenant(['manager', 'teacher']);
  const parsed = z.object({ userId: z.string().min(1) }).safeParse(formObject(fd));
  if (!parsed.success) return { error: 'Aluno não encontrado.' };
  const password = simplePassword();
  const hash = await hashPassword(password);
  const result = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    const student = await tx
      .select({ name: schema.authUsers.name, username: schema.authUsers.username })
      .from(schema.memberships)
      .innerJoin(schema.authUsers, eq(schema.authUsers.id, schema.memberships.userId))
      .where(
        and(
          eq(schema.memberships.userId, parsed.data.userId),
          eq(schema.memberships.role, 'student'),
          eq(schema.memberships.status, 'active'),
        ),
      );
    const s = student[0];
    if (!s?.username) return null;
    await tx
      .update(schema.authAccounts)
      .set({ password: hash, updatedAt: new Date() })
      .where(
        and(
          eq(schema.authAccounts.userId, parsed.data.userId),
          eq(schema.authAccounts.providerId, 'credential'),
        ),
      );
    await tx.delete(schema.authSessions).where(eq(schema.authSessions.userId, parsed.data.userId));
    await tx.insert(schema.auditLogs).values({
      tenantId: ctx.tenantId,
      actorId: ctx.user.id,
      action: 'student.password_reset',
      entityType: 'user',
      entityId: parsed.data.userId,
    });
    return { name: s.name, username: s.username };
  });
  if (!result) return { error: 'Aluno não encontrado nas suas turmas.' };
  return { credentials: [{ ...result, password }] };
}

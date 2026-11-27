'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import { requireRole, type Role } from '@/lib/auth/session';
import * as svc from './service';

/*
  Ações do admin. Formulários simples (sem estado no cliente): cada ação valida, chama o
  serviço e volta para a página com ?ok= ou ?erro=. A permissão é conferida aqui
  (requireRole) e de novo no banco (RLS).
*/

const obj = (form: FormData) => Object.fromEntries(form.entries());
const id = (form: FormData, key = 'id') => z.uuid().parse(String(form.get(key) ?? ''));

function message(err: unknown) {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? 'Confira os campos.';
  if (err instanceof ApiError) return err.message;
  throw err;
}

/**
 * Volta para a página com o resultado. Com `onde`, o aviso aparece ao lado do formulário que
 * foi enviado (e a página rola até ele), em vez de só no topo.
 */
function back(path: string, result: { ok?: string; erro?: string }, onde?: string): never {
  const q = new URLSearchParams({ ...result, ...(onde ? { onde } : {}) } as Record<string, string>);
  revalidatePath(path);
  redirect(`${path}${path.includes('?') ? '&' : '?'}${q.toString()}${onde ? `#${onde}` : ''}`);
}

async function admin(next: string) {
  return requireRole(['admin'], next);
}

// ── Catálogo ──────────────────────────────────────────────────────────────

export async function saveCourseAction(form: FormData) {
  const user = await admin('/admin/cursos');
  const courseId = String(form.get('id') ?? '') || null;
  let target = '/admin/cursos';
  try {
    const row = await svc.saveCourse(user, courseId, obj(form));
    target = `/admin/cursos/${row.id}`;
  } catch (err) {
    back(
      courseId ? `/admin/cursos/${courseId}` : '/admin/cursos',
      { erro: message(err) },
      courseId ? 'editar' : 'novo',
    );
  }
  back(
    target,
    { ok: courseId ? 'Curso salvo.' : 'Curso criado.' },
    courseId ? 'editar' : undefined,
  );
}

export async function saveDisciplineAction(form: FormData) {
  const user = await admin('/admin/cursos');
  const disciplineId = String(form.get('id') ?? '') || null;
  const courseId = String(form.get('courseId') ?? '');
  let target = `/admin/cursos/${courseId}`;
  try {
    const row = await svc.saveDiscipline(
      user,
      disciplineId ? { id: disciplineId } : { courseId: z.uuid().parse(courseId) },
      obj(form),
    );
    target = `/admin/disciplinas/${row.id}`;
  } catch (err) {
    back(
      disciplineId ? `/admin/disciplinas/${disciplineId}` : target,
      { erro: message(err) },
      disciplineId ? 'dados' : 'nova',
    );
  }
  back(
    target,
    { ok: disciplineId ? 'Disciplina salva.' : 'Disciplina criada.' },
    disciplineId ? 'dados' : undefined,
  );
}

export async function deleteDisciplineAction(form: FormData) {
  const user = await admin('/admin/cursos');
  const disciplineId = id(form);
  let courseId = '';
  try {
    courseId = (await svc.deleteDiscipline(user, disciplineId)).courseId;
  } catch (err) {
    back(`/admin/disciplinas/${disciplineId}`, { erro: message(err) }, 'excluir');
  }
  back(`/admin/cursos/${courseId}`, { ok: 'Disciplina excluída.' }, 'disc');
}

export async function saveTopicAction(form: FormData) {
  const user = await admin('/admin/cursos');
  const disciplineId = id(form, 'disciplineId');
  const topicId = String(form.get('id') ?? '') || null;
  const path = `/admin/disciplinas/${disciplineId}`;
  try {
    await svc.saveTopic(user, topicId ? { id: topicId } : { disciplineId }, obj(form));
  } catch (err) {
    back(path, { erro: message(err) }, 'assuntos');
  }
  back(path, { ok: topicId ? 'Assunto salvo.' : 'Assunto criado.' }, 'assuntos');
}

export async function deleteTopicAction(form: FormData) {
  const user = await admin('/admin/cursos');
  const disciplineId = id(form, 'disciplineId');
  const path = `/admin/disciplinas/${disciplineId}`;
  try {
    await svc.deleteTopic(user, id(form));
  } catch (err) {
    back(path, { erro: message(err) }, 'assuntos');
  }
  back(path, { ok: 'Assunto excluído.' }, 'assuntos');
}

export async function moveTopicAction(form: FormData) {
  const user = await admin('/admin/cursos');
  const disciplineId = id(form, 'disciplineId');
  const path = `/admin/disciplinas/${disciplineId}`;
  let target = '';
  try {
    target = (await svc.moveTopic(user, id(form), id(form, 'targetId'))).targetName;
  } catch (err) {
    back(path, { erro: message(err) }, 'assuntos');
  }
  back(path, { ok: `Assunto movido para ${target}.` }, 'assuntos');
}

export async function saveModuleAction(form: FormData) {
  const user = await admin('/admin/cursos');
  const moduleId = String(form.get('id') ?? '') || null;
  const disciplineId = String(form.get('disciplineId') ?? '');
  let target = `/admin/disciplinas/${disciplineId}`;
  try {
    const row = await svc.saveModule(
      user,
      moduleId ? { id: moduleId } : { disciplineId: z.uuid().parse(disciplineId) },
      obj(form),
    );
    target = `/admin/modulos/${row.id}`;
  } catch (err) {
    back(
      moduleId ? `/admin/modulos/${moduleId}` : target,
      { erro: message(err) },
      moduleId ? undefined : 'novomod',
    );
  }
  back(target, { ok: moduleId ? 'Módulo salvo.' : 'Módulo criado como rascunho.' });
}

export async function transitionModuleAction(form: FormData) {
  // O revisor também decide (aprovar, devolver, publicar); editar o conteúdo continua só admin.
  const user = await requireRole(['admin', 'reviewer'], '/admin/revisao');
  const moduleId = id(form);
  const path = `/admin/modulos/${moduleId}`;
  try {
    await svc.transitionModule(user, moduleId, { to: form.get('to') });
  } catch (err) {
    back(path, { erro: message(err) });
  }
  back(path, { ok: 'Status do módulo atualizado.' });
}

// ── Instituições ──────────────────────────────────────────────────────────

export async function saveInstitutionAction(form: FormData) {
  const user = await admin('/admin/instituicoes');
  const institutionId = String(form.get('id') ?? '') || null;
  try {
    await svc.saveInstitution(user, institutionId, obj(form));
  } catch (err) {
    back('/admin/instituicoes', { erro: message(err) });
  }
  back('/admin/instituicoes', { ok: institutionId ? 'Instituição salva.' : 'Instituição criada.' });
}

export async function setInstitutionStatusAction(form: FormData) {
  const user = await admin('/admin/instituicoes');
  try {
    const status = z.enum(['active', 'pending', 'rejected']).parse(form.get('status'));
    await svc.setInstitutionStatus(user, id(form), status);
  } catch (err) {
    back('/admin/instituicoes', { erro: message(err) });
  }
  back('/admin/instituicoes', { ok: 'Status atualizado.' });
}

// ── Usuários ──────────────────────────────────────────────────────────────

export async function setRoleAction(form: FormData) {
  const user = await admin('/admin/usuarios');
  const userId = String(form.get('id') ?? '');
  const path = `/admin/usuarios/${userId}`;
  try {
    const role = z.enum(svc.ASSIGNABLE_ROLES as [Role, ...Role[]]).parse(form.get('role'));
    await svc.setRole(user, z.string().min(1).parse(userId), role, form.get('grant') === '1');
  } catch (err) {
    back(path, { erro: message(err) });
  }
  back(path, { ok: 'Papéis atualizados.' });
}

export async function verifyEmailAction(form: FormData) {
  const user = await admin('/admin/usuarios');
  const userId = String(form.get('id') ?? '');
  const path = `/admin/usuarios/${userId}`;
  try {
    await svc.verifyEmail(user, z.string().min(1).parse(userId));
  } catch (err) {
    back(path, { erro: message(err) });
  }
  back(path, { ok: 'E-mail confirmado.' });
}

export async function setStudentCourseAction(form: FormData) {
  const user = await admin('/admin/usuarios');
  const userId = String(form.get('id') ?? '');
  const path = `/admin/usuarios/${userId}`;
  let changed = false;
  try {
    changed = await svc.setStudentCourse(
      user,
      z.string().min(1).parse(userId),
      String(form.get('courseId') ?? ''),
    );
  } catch (err) {
    back(path, { erro: message(err) }, 'curso');
  }
  back(
    path,
    { ok: changed ? 'Curso do aluno atualizado.' : 'O aluno já estava nesse curso.' },
    'curso',
  );
}

export async function revokeSessionsAction(form: FormData) {
  const user = await admin('/admin/usuarios');
  const userId = String(form.get('id') ?? '');
  const path = `/admin/usuarios/${userId}`;
  let n = 0;
  try {
    n = await svc.revokeSessions(user, z.string().min(1).parse(userId));
  } catch (err) {
    back(path, { erro: message(err) });
  }
  back(path, { ok: `${n} ${n === 1 ? 'sessão encerrada' : 'sessões encerradas'}.` });
}

export type NewUserState =
  | { error: string; at: number }
  | { created: { id: string; email: string; password: string }; at: number }
  | null;

/** Com estado no cliente: a senha temporária volta para a tela uma vez e não vai para a URL. */
export async function createUserAction(_prev: NewUserState, form: FormData): Promise<NewUserState> {
  const user = await admin('/admin/usuarios');
  try {
    const created = await svc.createUser(user, obj(form));
    revalidatePath('/admin/usuarios');
    return { created, at: Date.now() };
  } catch (err) {
    return { error: message(err), at: Date.now() };
  }
}

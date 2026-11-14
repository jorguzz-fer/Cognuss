'use server';
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import { requireRole } from '@/lib/auth/session';
import { logger } from '@/lib/logger';
import { createDemoStudent } from './service';

export type DemoState =
  { ok: true; email: string; password: string } | { ok: false; error: string } | null;

export async function createDemoStudentAction(
  _prev: DemoState,
  form: FormData,
): Promise<DemoState> {
  const admin = await requireRole(['admin'], '/admin/demo');
  try {
    const r = await createDemoStudent(admin, Object.fromEntries(form));
    return { ok: true, email: r.email, password: r.password };
  } catch (err) {
    if (err instanceof z.ZodError)
      return { ok: false, error: err.issues[0]?.message ?? 'Confira os campos.' };
    if (err instanceof ApiError) return { ok: false, error: err.message };
    logger.error('demo.student_failed', { error: String(err) });
    return { ok: false, error: 'Não deu para criar a conta agora. Veja o log do web.' };
  }
}

import { production } from '@gutta/contracts';
import { requireApiRole } from '@/lib/api';
import { contractRoute } from '@/lib/contract';
import { updateTask } from '@/features/production/service';

export const dynamic = 'force-dynamic';

// PATCH /api/v1/production/tasks/{id}: aprovar, descartar ou editar uma tarefa (ADR 0021).
export const PATCH = contractRoute(production.updateTask, async ({ userId, params, body }) => {
  await requireApiRole(userId, ['admin']);
  return updateTask(userId, params.id, body);
});

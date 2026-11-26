import { production } from '@gutta/contracts';
import { requireApiRole } from '@/lib/api';
import { contractRoute } from '@/lib/contract';
import { deleteBatch, getBatch } from '@/features/production/service';

export const dynamic = 'force-dynamic';

// GET /api/v1/production/batches/{id}: slides e tarefas do lote (ADR 0021).
export const GET = contractRoute(production.getBatch, async ({ userId, params }) => {
  await requireApiRole(userId, ['admin']);
  return getBatch(userId, params.id);
});

// DELETE /api/v1/production/batches/{id}: apaga um lote que falhou.
export const DELETE = contractRoute(production.deleteBatch, async ({ userId, params }) => {
  await requireApiRole(userId, ['admin']);
  return deleteBatch(userId, params.id);
});

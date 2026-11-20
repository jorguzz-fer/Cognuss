import { production } from '@gutta/contracts';
import { requireApiRole } from '@/lib/api';
import { contractRoute } from '@/lib/contract';
import { createBatch } from '@/features/production/service';

export const dynamic = 'force-dynamic';

// POST /api/v1/production/batches: lote de produção a partir de um arquivo enviado (ADR 0021).
export const POST = contractRoute(production.createBatch, async ({ userId, body }) => {
  await requireApiRole(userId, ['admin']);
  return createBatch(userId, body);
});

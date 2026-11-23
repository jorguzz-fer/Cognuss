import { portfolio } from '@gutta/contracts';
import { contractRoute } from '@/lib/contract';
import { createItem } from '@/features/portfolio/service';

export const dynamic = 'force-dynamic';

// POST /api/v1/portfolio/items: registra um certificado (com ou sem arquivo).
export const POST = contractRoute(portfolio.createItem, ({ userId, body }) =>
  createItem(userId, body),
);

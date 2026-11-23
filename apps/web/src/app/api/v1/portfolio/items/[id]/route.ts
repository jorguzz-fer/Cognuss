import { portfolio } from '@gutta/contracts';
import { contractRoute } from '@/lib/contract';
import { deleteItem, getItem, updateItem } from '@/features/portfolio/service';

export const dynamic = 'force-dynamic';

// GET, PATCH e DELETE /api/v1/portfolio/items/{id}: ver, conferir e excluir o certificado.
export const GET = contractRoute(portfolio.getItem, ({ userId, params }) =>
  getItem(userId, params.id),
);

export const PATCH = contractRoute(portfolio.updateItem, ({ userId, params, body }) =>
  updateItem(userId, params.id, body),
);

export const DELETE = contractRoute(portfolio.deleteItem, ({ userId, params }) =>
  deleteItem(userId, params.id),
);

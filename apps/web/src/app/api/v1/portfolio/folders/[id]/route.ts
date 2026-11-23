import { portfolio } from '@gutta/contracts';
import { contractRoute } from '@/lib/contract';
import { deleteFolder, renameFolder } from '@/features/portfolio/service';

export const dynamic = 'force-dynamic';

// PATCH e DELETE /api/v1/portfolio/folders/{id}: renomear e excluir a pasta.
export const PATCH = contractRoute(portfolio.renameFolder, ({ userId, params, body }) =>
  renameFolder(userId, params.id, body.name),
);

export const DELETE = contractRoute(portfolio.deleteFolder, ({ userId, params }) =>
  deleteFolder(userId, params.id),
);

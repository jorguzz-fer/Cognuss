import { portfolio } from '@gutta/contracts';
import { contractRoute } from '@/lib/contract';
import { createFolder } from '@/features/portfolio/service';

export const dynamic = 'force-dynamic';

// POST /api/v1/portfolio/folders: nova pasta em Meus Certificados.
export const POST = contractRoute(portfolio.createFolder, ({ userId, body }) =>
  createFolder(userId, body.name),
);

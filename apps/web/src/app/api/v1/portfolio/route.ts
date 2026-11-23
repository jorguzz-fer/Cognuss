import { portfolio } from '@gutta/contracts';
import { contractRoute } from '@/lib/contract';
import { listPortfolio } from '@/features/portfolio/service';

export const dynamic = 'force-dynamic';

// GET /api/v1/portfolio: pastas, certificados e soma de horas (Competências, K1).
export const GET = contractRoute(portfolio.listPortfolio, ({ userId, query }) =>
  listPortfolio(userId, query),
);

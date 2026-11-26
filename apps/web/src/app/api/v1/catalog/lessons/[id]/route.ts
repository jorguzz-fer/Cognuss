import { apiRoute } from '@/lib/api';
import { catalogLessonHtml } from '@/features/catalog/lesson-upload';

export const dynamic = 'force-dynamic';

// GET /api/v1/catalog/lessons/{id}: a aula pronta (HTML) do módulo, para o iframe. Quem vê o
// módulo pelo RLS vê a aula. A política da peça (proxy.ts, buildPieceCsp) isola o HTML:
// sandbox sem mesma origem e sem rede.
export const GET = async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
  const res = await apiRoute(async ({ userId, params }) => ({
    html: await catalogLessonHtml(userId, params.id!),
  }))(req, ctx);
  if (!res.ok) return res;
  const { html } = (await res.json()) as { html: string };
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
};

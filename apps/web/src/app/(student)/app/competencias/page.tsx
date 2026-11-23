import type { Metadata } from 'next';
import Link from 'next/link';
import {
  PORTFOLIO_KINDS,
  PORTFOLIO_KIND_LABEL,
  formatPortfolioHours,
  isPortfolioKind,
} from '@gutta/core';
import { AutoRefresh } from '@/components/production/auto-refresh';
import { FolderManager, NewCertificate } from '@/components/portfolio/portfolio-actions';
import { Alert, Badge, Card } from '@gutta/ui/card';
import { requireFeature } from '@/features/flags/service';
import { listPortfolio } from '@/features/portfolio/service';
import { requireStudent } from '@/lib/auth/session';
import { cn } from '@gutta/ui/cn';

export const metadata: Metadata = { title: 'Meus Certificados' };

const STATUS: Record<string, { text: string; tone: 'neutral' | 'accent' | 'success' | 'warn' }> = {
  reading: { text: 'Lendo', tone: 'accent' },
  to_confirm: { text: 'A conferir', tone: 'warn' },
  confirmed: { text: 'Conferido', tone: 'success' },
};

const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' });
const fmtDate = (d: string | null) => (d ? date.format(new Date(`${d}T00:00:00Z`)) : null);

// Cognuss Competências, Meus Certificados (docs/competencias/ESPECIFICACAO.md, K1): repositório
// dos comprovantes do aluno, com pastas dele, busca, filtros e a soma de horas conferidas.
export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    pasta?: string;
    tipo?: string;
    situacao?: string;
    q?: string;
    vista?: string;
  }>;
}) {
  await requireFeature('competencias');
  const user = await requireStudent('/app/competencias');
  const sp = await searchParams;
  const query = {
    pasta:
      sp.pasta && (sp.pasta === 'sem-pasta' || /^[0-9a-f-]{36}$/i.test(sp.pasta))
        ? sp.pasta
        : undefined,
    tipo: isPortfolioKind(sp.tipo) ? sp.tipo : undefined,
    situacao:
      sp.situacao === 'a-conferir' || sp.situacao === 'conferidos' ? sp.situacao : undefined,
    q: sp.q?.slice(0, 100) || undefined,
  } as const;
  const list = sp.vista === 'lista';
  const { folders, items, summary } = await listPortfolio(user.id, query);
  const reading = items.some((i) => i.status === 'reading');
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { ...query, vista: list ? 'lista' : undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/app/competencias${s ? `?${s}` : ''}`;
  };
  const kinds = Object.entries(summary.byKind)
    .filter(([, m]) => m > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid gap-6">
      {reading ? <AutoRefresh everyMs={3000} /> : null}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-3xl md:text-4xl">Meus Certificados</h1>
          <p className="text-muted">
            Seus comprovantes num lugar só: horas complementares, congressos, cursos e publicações.
            Só você vê.
          </p>
        </div>
        <NewCertificate
          folderId={query.pasta && query.pasta !== 'sem-pasta' ? query.pasta : null}
        />
      </header>

      <Card as="section" aria-labelledby="horas" className="grid gap-2">
        <h2 id="horas" className="text-xl">
          Horas conferidas
        </h2>
        <p className="text-3xl font-semibold">{formatPortfolioHours(summary.totalMinutes)}</p>
        <p className="text-sm text-muted">
          {summary.confirmedItems}{' '}
          {summary.confirmedItems === 1 ? 'certificado conferido' : 'certificados conferidos'}
          {summary.pendingItems ? ` · ${summary.pendingItems} esperando a sua conferência` : ''}. Só
          entra na soma o que você conferiu.
        </p>
        {kinds.length ? (
          <ul className="flex flex-wrap gap-2 text-sm" aria-label="Horas por tipo">
            {kinds.map(([k, m]) => (
              <li key={k} className="rounded-[var(--radius)] border border-line px-2 py-1">
                {PORTFOLIO_KIND_LABEL[k as keyof typeof PORTFOLIO_KIND_LABEL] ?? k}:{' '}
                {formatPortfolioHours(m)}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
        <nav aria-label="Pastas" className="grid content-start gap-2">
          <ul className="grid gap-1">
            {[
              {
                id: undefined,
                name: 'Todos',
                items: summary.confirmedItems + summary.pendingItems,
                minutes: summary.totalMinutes,
              },
              ...folders,
            ].map((f) => (
              <li key={f.id ?? 'todos'}>
                <Link
                  href={href({ pasta: f.id })}
                  aria-current={query.pasta === f.id ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center justify-between gap-2 rounded-[var(--radius)] border px-3 py-2 no-underline',
                    query.pasta === f.id
                      ? 'border-accent bg-accent text-accent-ink'
                      : 'border-line hover:border-accent',
                  )}
                >
                  <span className="truncate">{f.name}</span>
                  <span className="text-xs">{f.items}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={href({ pasta: 'sem-pasta' })}
                aria-current={query.pasta === 'sem-pasta' ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center rounded-[var(--radius)] border px-3 py-2 no-underline',
                  query.pasta === 'sem-pasta'
                    ? 'border-accent bg-accent text-accent-ink'
                    : 'border-line hover:border-accent',
                )}
              >
                Sem pasta
              </Link>
            </li>
          </ul>
          <FolderManager folders={folders.map((f) => ({ id: f.id, name: f.name }))} />
        </nav>

        <section aria-labelledby="certificados" className="grid content-start gap-4">
          <h2 id="certificados" className="sr-only">
            Certificados
          </h2>
          <form className="flex flex-wrap items-end gap-2" action="/app/competencias">
            {query.pasta ? <input type="hidden" name="pasta" value={query.pasta} /> : null}
            {list ? <input type="hidden" name="vista" value="lista" /> : null}
            <label className="grid gap-1 text-sm">
              Buscar
              <input
                name="q"
                defaultValue={query.q ?? ''}
                className="min-h-11 rounded-[var(--radius)] border border-line-strong bg-surface-2 px-3"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Tipo
              <select
                name="tipo"
                defaultValue={query.tipo ?? ''}
                className="min-h-11 rounded-[var(--radius)] border border-line-strong bg-surface-2 px-3"
              >
                <option value="">Todos</option>
                {PORTFOLIO_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {PORTFOLIO_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Situação
              <select
                name="situacao"
                defaultValue={query.situacao ?? ''}
                className="min-h-11 rounded-[var(--radius)] border border-line-strong bg-surface-2 px-3"
              >
                <option value="">Todas</option>
                <option value="a-conferir">A conferir</option>
                <option value="conferidos">Conferidos</option>
              </select>
            </label>
            <button
              type="submit"
              className="min-h-11 rounded-[var(--radius)] border border-line px-4 hover:border-accent"
            >
              Filtrar
            </button>
            <span className="ml-auto flex gap-2 text-sm">
              <Link href={href({ vista: undefined })} aria-current={!list ? 'true' : undefined}>
                Grade
              </Link>
              <Link href={href({ vista: 'lista' })} aria-current={list ? 'true' : undefined}>
                Lista
              </Link>
            </span>
          </form>

          {items.length === 0 ? (
            <Alert>
              {query.pasta || query.tipo || query.situacao || query.q
                ? 'Nenhum certificado com esses filtros.'
                : 'Nenhum certificado ainda. Envie o primeiro: o Cognuss lê e você confere.'}
            </Alert>
          ) : (
            <ul
              aria-label="Lista de certificados"
              className={list ? 'grid gap-2' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'}
            >
              {items.map((i) => {
                const st = STATUS[i.status]!;
                const period = [
                  fmtDate(i.startedOn),
                  i.endedOn && i.endedOn !== i.startedOn ? fmtDate(i.endedOn) : null,
                ]
                  .filter(Boolean)
                  .join(' a ');
                return (
                  <li key={i.id}>
                    <Link
                      href={`/app/competencias/${i.id}`}
                      className={cn(
                        'grid h-full gap-2 rounded-[var(--radius)] border border-line bg-surface p-3 no-underline hover:border-accent',
                        list && 'grid-cols-[1fr_auto] items-center',
                      )}
                    >
                      {!list ? (
                        i.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- URL assinada do bucket
                          <img
                            src={i.thumbnailUrl}
                            alt=""
                            loading="lazy"
                            className="aspect-[4/3] w-full rounded border border-line bg-surface-2 object-cover object-top"
                          />
                        ) : (
                          <div className="grid aspect-[4/3] place-items-center rounded border border-dashed border-line bg-surface-2 text-xs text-muted">
                            {i.fileName ? 'Sem miniatura' : 'Sem arquivo'}
                          </div>
                        )
                      ) : null}
                      <span className="grid gap-1">
                        <span className="font-semibold text-fg">
                          {i.title || i.fileName || 'Certificado sem nome'}
                        </span>
                        <span className="text-sm text-muted">
                          {[
                            PORTFOLIO_KIND_LABEL[i.kind],
                            i.issuer,
                            period,
                            i.minutes ? formatPortfolioHours(i.minutes) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                      <span>
                        <Badge tone={st.tone}>{st.text}</Badge>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

import { Fragment, type ReactNode } from 'react';

// Peças dos mapas de /mapa, em HTML e CSS com os tokens do tema: seguem o claro e o escuro
// do botão do topo e, no celular, os fluxos viram uma coluna (setas para baixo).

export type Role = 'super' | 'gestor' | 'prof' | 'aluno' | 'resp';

export const ROLE_LABEL: Record<Role, string> = {
  super: 'Super Admin',
  gestor: 'Gestor',
  prof: 'Professor',
  aluno: 'Aluno',
  resp: 'Responsável',
};

// Classes completas (o Tailwind só gera o que aparece escrito no código).
const ROLE_CLASS: Record<Role, string> = {
  super: 'bg-cat-1 text-cat-1-fg border-cat-1-line',
  gestor: 'bg-cat-4 text-cat-4-fg border-cat-4-line',
  prof: 'bg-cat-2 text-cat-2-fg border-cat-2-line',
  aluno: 'bg-cat-5 text-cat-5-fg border-cat-5-line',
  resp: 'bg-cat-3 text-cat-3-fg border-cat-3-line',
};

export function RolePill({ role, children }: { role: Role; children?: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${ROLE_CLASS[role]}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children ?? ROLE_LABEL[role]}
    </span>
  );
}

export function Diagram({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure
      aria-label={label}
      className="my-5 rounded-[var(--radius-lg)] border border-line bg-surface p-4 sm:p-5"
    >
      {children}
    </figure>
  );
}

export type Step = { title: string; sub?: ReactNode; role?: Role; tone?: 'decision' | 'end' };

function StepBox({ s, n }: { s: Step; n?: number }) {
  const tone =
    s.tone === 'decision'
      ? 'border-dashed border-line-strong bg-surface-2'
      : s.tone === 'end'
        ? 'border-accent bg-accent-soft'
        : s.role
          ? ROLE_CLASS[s.role]
          : 'border-line bg-bg';
  return (
    <div className={`min-w-0 rounded-[var(--radius)] border px-3 py-2.5 ${tone}`}>
      <p className="m-0 text-sm leading-snug font-semibold">
        {n !== undefined && <span className="mr-1.5 opacity-70 tabular">{n}.</span>}
        {s.title}
      </p>
      {s.sub && <p className="m-0 mt-1 text-[13px] leading-snug opacity-80">{s.sub}</p>}
    </div>
  );
}

function Arrow({ label }: { label?: string }) {
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center gap-1 text-muted md:flex-col md:px-1"
    >
      <span className="text-lg leading-none md:hidden">↓</span>
      <span className="hidden text-lg leading-none md:inline">→</span>
      {label && (
        <span className="text-[11px] leading-tight md:max-w-20 md:text-center">{label}</span>
      )}
    </div>
  );
}

/** Fluxo em sequência: linha no desktop, coluna no celular. */
export function Flow({ steps, numbered = false }: { steps: Step[]; numbered?: boolean }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-1.5 p-0 md:flex-row md:items-stretch">
      {steps.map((s, i) => (
        <Fragment key={s.title}>
          {i > 0 && <Arrow />}
          <li className="min-w-0 md:flex-1">
            <StepBox s={s} n={numbered ? i + 1 : undefined} />
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

/** Relações "quem libera o quê para quem", uma por linha. */
export function Edges({ edges }: { edges: { from: Role; action: string; to: Role | string }[] }) {
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {edges.map((e) => (
        <li
          key={e.from + e.action}
          className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-[var(--radius)] border border-line bg-bg px-3 py-2 sm:grid-cols-[8.5rem_minmax(0,1fr)_9rem]"
        >
          <span>
            <RolePill role={e.from} />
          </span>
          <span className="text-sm">
            <span aria-hidden className="mr-1 text-muted">
              →
            </span>
            {e.action}
          </span>
          <span className="col-start-2 sm:col-start-auto sm:justify-self-end">
            {typeof e.to === 'string' && !(e.to in ROLE_LABEL) ? (
              <span className="text-sm font-semibold">{e.to}</span>
            ) : (
              <RolePill role={e.to as Role} />
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export type TreeNode = { title: string; sub?: string; children?: TreeNode[] };

/** Árvore com recuo e linhas de ligação; funciona igual em qualquer largura. */
export function Tree({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="m-0 grid list-none gap-1.5 p-0">
      {nodes.map((n) => (
        <li key={n.title} className="min-w-0">
          <div className="inline-block max-w-full rounded-[var(--radius)] border border-line bg-bg px-3 py-1.5">
            <span className="text-sm font-semibold">{n.title}</span>
            {n.sub && <span className="ml-2 text-[13px] text-muted">{n.sub}</span>}
          </div>
          {n.children && (
            <div className="mt-1.5 ml-3 border-l-2 border-line pl-3 sm:ml-5 sm:pl-4">
              <Tree nodes={n.children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Pergunta com caminhos. Cada caminho leva a um passo ou a outra pergunta. */
export type Decision = {
  q: string;
  paths: { when: string; to: Step | Decision }[];
};

function isDecision(x: Step | Decision): x is Decision {
  return 'q' in x;
}

export function DecisionTree({ start, d }: { start?: Step; d: Decision }) {
  return (
    <div className="grid gap-1.5">
      {start && (
        <>
          <StepBox s={start} />
          <Arrow />
        </>
      )}
      <DecisionNode d={d} />
    </div>
  );
}

function DecisionNode({ d }: { d: Decision }) {
  return (
    <div className="grid gap-2">
      <StepBox s={{ title: d.q, tone: 'decision' }} />
      <div className="grid gap-2 sm:grid-cols-2">
        {d.paths.map((p) => (
          <div key={p.when} className="min-w-0 border-l-2 border-line pl-3">
            <p className="m-0 mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
              {p.when}
            </p>
            {isDecision(p.to) ? <DecisionNode d={p.to} /> : <StepBox s={p.to} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Linha do tempo com o perfil que age em cada passo. */
export function Timeline({ steps }: { steps: { role: Role | 'sistema'; text: ReactNode }[] }) {
  return (
    <ol className="m-0 grid list-none gap-0 p-0">
      {steps.map((s, i) => (
        <li key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
          <div className="flex flex-col items-center">
            <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-xs font-bold tabular">
              {i + 1}
            </span>
            {i < steps.length - 1 && <span aria-hidden className="w-0.5 flex-1 bg-line" />}
          </div>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 pb-4">
            {s.role === 'sistema' ? (
              <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold">
                Cognuss Kids
              </span>
            ) : (
              <RolePill role={s.role} />
            )}
            <span className="text-sm">{s.text}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Estados de um ciclo (o caminho principal) e as voltas possíveis. */
export function States({
  main,
  back,
}: {
  main: { state: string; sub: string }[];
  back: { from: string; to: string; why: string }[];
}) {
  return (
    <div className="grid gap-4">
      <Flow steps={main.map((m) => ({ title: m.state, sub: m.sub }))} />
      <div>
        <p className="m-0 mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
          Também pode voltar
        </p>
        <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-2">
          {back.map((b) => (
            <li
              key={b.from + b.to}
              className="rounded-[var(--radius)] border border-line bg-bg px-3 py-2 text-sm"
            >
              <span className="font-semibold">
                {b.from} <span className="text-muted">→</span> {b.to}
              </span>
              <span className="block text-[13px] text-muted">{b.why}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Rule({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="my-5 max-w-[72ch] rounded-r-[var(--radius)] border-l-4 border-accent bg-surface px-4 py-3 text-[15px]">
      <strong className="font-display font-normal">{title}</strong> {children}
    </div>
  );
}

export type ActionRow = { action: string; who?: ReactNode; where?: string; what: ReactNode };

/** Tabela de ações no desktop; no celular cada linha vira um cartão. */
export function Actions({ rows, whoLabel = 'Quem' }: { rows: ActionRow[]; whoLabel?: string }) {
  const hasWho = rows.some((r) => r.who);
  const hasWhere = rows.some((r) => r.where);
  return (
    <div className="my-4">
      <table className="hidden w-full border-collapse text-sm md:table">
        <thead>
          <tr className="border-b-2 border-line text-left text-xs tracking-wide text-muted uppercase">
            <th className="py-2 pr-3 font-semibold">Ação</th>
            {hasWho && <th className="py-2 pr-3 font-semibold">{whoLabel}</th>}
            {hasWhere && <th className="py-2 pr-3 font-semibold">Onde</th>}
            <th className="py-2 font-semibold">O que acontece</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.action} className="border-b border-line align-top">
              <td className="w-[20%] py-2.5 pr-3 font-semibold">{r.action}</td>
              {hasWho && <td className="py-2.5 pr-3">{r.who}</td>}
              {hasWhere && <td className="py-2.5 pr-3">{r.where && <Path>{r.where}</Path>}</td>}
              <td className="py-2.5">{r.what}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="m-0 grid list-none gap-2 p-0 md:hidden">
        {rows.map((r) => (
          <li key={r.action} className="rounded-[var(--radius)] border border-line bg-surface p-3">
            <p className="m-0 font-semibold">{r.action}</p>
            {(r.who || r.where) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {r.who}
                {r.where && <Path>{r.where}</Path>}
              </div>
            )}
            <p className="m-0 mt-1.5 text-sm text-muted">{r.what}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Path({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[12.5px] break-all">{children}</code>
  );
}

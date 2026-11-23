// Cognuss Competências, Meus Certificados (docs/competencias/ESPECIFICACAO.md, K1). Regras
// puras: tipos de atividade (K-D1), papéis, carga horária em minutos e o resumo de horas por
// tipo e por pasta. Horas só somadas, sem limite por instituição (K-D1).

export const PORTFOLIO_KINDS = [
  'horas_complementares',
  'evento',
  'apresentacao',
  'resumo_anais',
  'artigo',
  'curso',
  'monitoria',
  'iniciacao_cientifica',
  'liga_academica',
  'extensao',
  'estagio',
  'outro',
] as const;
export type PortfolioKind = (typeof PORTFOLIO_KINDS)[number];

export const PORTFOLIO_KIND_LABEL: Record<PortfolioKind, string> = {
  horas_complementares: 'Horas complementares',
  evento: 'Congresso ou evento',
  apresentacao: 'Apresentação de trabalho',
  resumo_anais: 'Resumo publicado em anais',
  artigo: 'Artigo publicado',
  curso: 'Curso livre ou online',
  monitoria: 'Monitoria',
  iniciacao_cientifica: 'Iniciação científica',
  liga_academica: 'Liga acadêmica',
  extensao: 'Extensão',
  estagio: 'Estágio',
  outro: 'Outro',
};

export const PORTFOLIO_ROLES = [
  'participante',
  'ouvinte',
  'apresentador',
  'autor',
  'coautor',
  'organizador',
  'monitor',
] as const;
export type PortfolioRole = (typeof PORTFOLIO_ROLES)[number];

export const PORTFOLIO_ROLE_LABEL: Record<PortfolioRole, string> = {
  participante: 'Participante',
  ouvinte: 'Ouvinte',
  apresentador: 'Apresentador(a)',
  autor: 'Autor(a)',
  coautor: 'Coautor(a)',
  organizador: 'Organizador(a)',
  monitor: 'Monitor(a)',
};

export const isPortfolioKind = (x: unknown): x is PortfolioKind =>
  typeof x === 'string' && (PORTFOLIO_KINDS as readonly string[]).includes(x);
export const isPortfolioRole = (x: unknown): x is PortfolioRole =>
  typeof x === 'string' && (PORTFOLIO_ROLES as readonly string[]).includes(x);

/** Maior carga horária aceita num certificado (2.000 h): acima disso é erro de leitura. */
export const MAX_PORTFOLIO_MINUTES = 2000 * 60;

/** Horas (número com casas ou "12h30", "4 horas", "1h", "90 min") para minutos inteiros. */
export function parseHours(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null;
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input < 0) return null;
    return clampMinutes(Math.round(input * 60));
  }
  const t = input.trim().toLowerCase().replace(',', '.');
  let m = /^(\d+(?:\.\d+)?)\s*(?:h|hs|hr|hrs|hora|horas)?$/.exec(t);
  if (m) return clampMinutes(Math.round(Number(m[1]) * 60));
  m = /^(\d+)\s*h(?:oras?)?\s*(?:e\s*)?(\d{1,2})\s*(?:m|min|minutos?)?$/.exec(t);
  if (m) return clampMinutes(Number(m[1]) * 60 + Number(m[2]));
  m = /^(\d+)\s*(?:m|min|minutos?)$/.exec(t);
  if (m) return clampMinutes(Number(m[1]));
  return null;
}

const clampMinutes = (n: number) => (n > MAX_PORTFOLIO_MINUTES ? null : n);

/** "12 h", "4 h 30 min", "45 min". */
export function formatPortfolioHours(minutes: number | null | undefined): string {
  if (!minutes) return '0 h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export type PortfolioEntry = {
  kind: PortfolioKind;
  folderId: string | null;
  minutes: number | null;
  /** Só entram na soma os itens que o aluno conferiu (nada entra sem confirmação). */
  confirmed: boolean;
};

export type HoursSummary = {
  totalMinutes: number;
  byKind: Partial<Record<PortfolioKind, number>>;
  /** Chave "" = sem pasta. */
  byFolder: Record<string, number>;
  confirmedItems: number;
  pendingItems: number;
};

export function summarizeHours(entries: PortfolioEntry[]): HoursSummary {
  const out: HoursSummary = {
    totalMinutes: 0,
    byKind: {},
    byFolder: {},
    confirmedItems: 0,
    pendingItems: 0,
  };
  for (const e of entries) {
    if (!e.confirmed) {
      out.pendingItems++;
      continue;
    }
    out.confirmedItems++;
    const min = e.minutes ?? 0;
    out.totalMinutes += min;
    out.byKind[e.kind] = (out.byKind[e.kind] ?? 0) + min;
    const f = e.folderId ?? '';
    out.byFolder[f] = (out.byFolder[f] ?? 0) + min;
  }
  return out;
}

/** Datas ISO (aaaa-mm-dd) válidas e em ordem; o fim pode faltar. */
export function validPortfolioDates(start: string | null, end: string | null): string | null {
  const ok = (d: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
  if (start && !ok(start)) return 'Data de início inválida.';
  if (end && !ok(end)) return 'Data de término inválida.';
  if (start && end && end < start) return 'A data de término vem antes do início.';
  return null;
}

/** Nome do certificado confere com o nome do cadastro (sem acento, maiúsculas, espaços). */
export function sameHolder(
  onDocument: string | null | undefined,
  registered: string | null | undefined,
) {
  if (!onDocument || !registered) return null;
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['dos', 'das', 'del'].includes(w));
  const a = norm(onDocument);
  const b = new Set(norm(registered));
  if (!a.length || !b.size) return null;
  // Primeiro nome e ao menos um sobrenome em comum.
  return a[0] !== undefined && b.has(a[0]) && a.slice(1).some((w) => b.has(w));
}

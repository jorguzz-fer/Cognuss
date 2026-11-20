// Regras puras de acesso (sem I/O), testadas em access.test.ts.

export type MemberRole = 'manager' | 'teacher' | 'student';

export type Membership = { tenantId: string; tenantName: string; role: MemberRole };

/** Cookie da instituição ativa. Só guarda o id; o servidor confere contra memberships. */
export const ACTIVE_TENANT_COOKIE = 'kids_active_tenant';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Instituição ativa: a do cookie, se o usuário ainda for membro dela; senão, a única de que é
 * membro. Com mais de uma e sem escolha válida, devolve null e o app pede para escolher.
 */
export function resolveActiveTenant(
  cookie: string | undefined,
  memberships: Membership[],
): string | null {
  const ids = [...new Set(memberships.map((m) => m.tenantId))];
  if (cookie && UUID.test(cookie) && ids.includes(cookie)) return cookie;
  return ids.length === 1 ? ids[0]! : null;
}

/** Papéis do usuário na instituição ativa. */
export function rolesIn(tenantId: string, memberships: Membership[]): MemberRole[] {
  return memberships.filter((m) => m.tenantId === tenantId).map((m) => m.role);
}

/** Gestor precisa de 2FA (SPEC Kids, seção 3). Professor: decisão aberta D-K05. */
export function needsTwoFactor(roles: MemberRole[], platformAdmin: boolean): boolean {
  return platformAdmin || roles.includes('manager');
}

/** Primeira tela depois do login, pelo papel mais alto na instituição ativa (seção 4.2). */
export function homeFor(roles: MemberRole[]): '/escola' | '/professor' | '/estudar' {
  if (roles.includes('manager')) return '/escola';
  if (roles.includes('teacher')) return '/professor';
  return '/estudar';
}

/** Só aceita caminhos internos em ?next= (evita redirecionamento aberto). */
export function safeNext(next: string | null | undefined, fallback = '/inicio') {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\'))
    return fallback;
  return next;
}

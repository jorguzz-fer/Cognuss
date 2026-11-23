import type { Metadata } from 'next';
import { Alert } from '@gutta/ui/card';
import { buttonClass } from '@gutta/ui/button';
import { AuthShell } from '@/components/auth/auth-shell';
import { requireUser } from '@/lib/auth/session';
import { ROLE_LABEL as ROLE } from '@/lib/labels';
import { chooseTenant } from './actions';

export const metadata: Metadata = { title: 'Escolha a escola' };

export default async function ChooseTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const user = await requireUser('/escolher');
  const tenants = new Map<string, { name: string; roles: string[] }>();
  for (const m of user.memberships) {
    const t = tenants.get(m.tenantId) ?? { name: m.tenantName, roles: [] };
    t.roles.push(ROLE[m.role]!);
    tenants.set(m.tenantId, t);
  }
  return (
    <AuthShell
      title="Escolha a escola"
      lead="Você faz parte de mais de uma. Dá para trocar depois."
    >
      {aviso === 'sem-acesso' ? (
        <Alert tone="danger">Você não faz parte dessa escola.</Alert>
      ) : null}
      <ul className="grid gap-3">
        {[...tenants].map(([id, t]) => (
          <li key={id}>
            <form action={chooseTenant}>
              <input type="hidden" name="tenantId" value={id} />
              <button
                type="submit"
                className={buttonClass('secondary', 'lg', 'w-full justify-between')}
              >
                <span>{t.name}</span>
                <span className="text-sm text-muted">{t.roles.join(', ')}</span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </AuthShell>
  );
}

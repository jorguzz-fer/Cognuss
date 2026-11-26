import type { Metadata } from 'next';
import { hashToken, sql, withAnonymous } from '@gutta/db-kids';
import { Button } from '@gutta/ui/button';
import { Alert, Badge, Card } from '@gutta/ui/card';
import { Field, Select, Textarea } from '@gutta/ui/field';
import { AuthShell } from '@/components/auth/auth-shell';
import { db } from '@/lib/db';
import { decideConsent, openRequest } from './actions';

export const metadata: Metadata = { title: 'Autorização do responsável', robots: { index: false } };

const NOTICE = {
  autorizado: ['success', 'Autorização registrada. Obrigado!'],
  retirado: ['warn', 'Autorização retirada. O aluno não consegue mais estudar pela plataforma.'],
  pedido: ['success', 'Pedido enviado à escola. Ela tem até 15 dias para responder.'],
  link: ['danger', 'Este link não vale mais. Peça um novo à escola.'],
} as const;

type Row = {
  guardian_name: string;
  tenant_name: string;
  student_id: string;
  student_name: string;
  granted: boolean;
};

// Página do responsável (RES-02, RES-05; LGPD art. 14 e 18). Linguagem simples, uma decisão por
// aluno, e os direitos do titular no mesmo lugar.
export default async function GuardianPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { token } = await params;
  const { aviso } = await searchParams;
  const rows = /^[A-Za-z0-9_-]{20,100}$/.test(token)
    ? (
        await withAnonymous(db(), (tx) =>
          tx.execute<Row>(sql`select * from guardian_portal(${hashToken(token)})`),
        )
      ).rows
    : [];
  const notice = aviso && aviso in NOTICE ? NOTICE[aviso as keyof typeof NOTICE] : null;
  if (rows.length === 0) {
    return (
      <AuthShell title="Autorização do responsável">
        <Alert tone="danger">Este link não vale mais. Peça um novo à escola.</Alert>
      </AuthShell>
    );
  }
  const first = rows[0]!;
  return (
    <AuthShell
      title="Autorização do responsável"
      lead={`Olá, ${first.guardian_name}. ${first.tenant_name} usa o Cognuss Kids nos estudos.`}
    >
      {notice ? <Alert tone={notice[0]}>{notice[1]}</Alert> : null}
      <Card className="grid gap-2 text-sm">
        <h2 className="text-base font-semibold">O que é guardado</h2>
        <ul className="ml-5 list-disc space-y-1">
          <li>Nome, ano e turma do aluno, e o usuário de login. Sem CPF, foto ou telefone.</li>
          <li>
            O que ele estudou, os flashcards revisados e, depois, as notas das provas da plataforma.
          </li>
          <li>Seu nome e e-mail, para falar com você sobre a autorização.</li>
        </ul>
        <p>
          Para quê: só para o aluno estudar o plano da escola e a escola acompanhar. Sem publicidade
          e sem venda de dados. Você pode retirar a autorização quando quiser.
        </p>
      </Card>
      {rows.map((r) => (
        <Card key={r.student_id} className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{r.student_name}</span>
            <Badge tone={r.granted ? 'success' : 'warn'}>
              {r.granted ? 'Autorizado' : 'Sem autorização'}
            </Badge>
          </div>
          <form action={decideConsent}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="studentId" value={r.student_id} />
            <input type="hidden" name="granted" value={r.granted ? 'false' : 'true'} />
            <Button type="submit" variant={r.granted ? 'secondary' : 'primary'} size="lg">
              {r.granted
                ? 'Retirar a autorização'
                : `Autorizo ${r.student_name.split(' ')[0]} a usar a plataforma`}
            </Button>
          </form>
        </Card>
      ))}
      <details className="rounded-[var(--radius)] border border-line p-4">
        <summary className="cursor-pointer font-semibold">
          Pedir acesso, correção, cópia ou exclusão
        </summary>
        <form action={openRequest} className="mt-3 grid gap-3">
          <input type="hidden" name="token" value={token} />
          <Field label="Aluno">
            {(p) => (
              <Select {...p} name="studentId">
                {rows.map((r) => (
                  <option key={r.student_id} value={r.student_id}>
                    {r.student_name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="O que você quer">
            {(p) => (
              <Select {...p} name="kind">
                <option value="access">Ver os dados guardados</option>
                <option value="correction">Corrigir um dado</option>
                <option value="export">Receber uma cópia dos dados</option>
                <option value="deletion">Apagar os dados</option>
              </Select>
            )}
          </Field>
          <Field label="Detalhes" optional>
            {(p) => <Textarea {...p} name="details" rows={3} maxLength={2000} />}
          </Field>
          <Button type="submit" variant="secondary" className="justify-self-start">
            Enviar pedido
          </Button>
        </form>
      </details>
    </AuthShell>
  );
}

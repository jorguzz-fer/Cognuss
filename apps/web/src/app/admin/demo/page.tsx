import type { Metadata } from 'next';
import { AdminHeader } from '@/components/admin/ui';
import { DemoForm } from '@/components/admin/demo-form';
import { Card } from '@/components/ui/card';
import { listCourses } from '@/features/admin/service';
import { DEMO_DOWNLOADS } from '@/features/demo/service';
import { requireRole } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Conta de teste' };

// Conta de aluno de teste para o QA da v2: cadastro completo e um semestre preenchido.
export default async function DemoPage() {
  const admin = await requireRole(['admin'], '/admin/demo');
  const courses = (await listCourses(admin)).filter((c) => c.active);
  const medicina = courses.find((c) => c.slug === 'medicina') ?? courses[0];
  return (
    <div className="grid gap-6">
      <AdminHeader
        title="Conta de teste"
        lead="Cria uma conta de aluno com o cadastro feito e um semestre em andamento: Fisiologia cardiovascular (sem cronograma, para testar o envio), Patologia geral (aulas, provas, nota, faltas, slides e prova anterior) e Farmacologia básica, além de rotina, lembretes e um compromisso. As disciplinas do curso escolhido que já têm módulo publicado também entram no semestre. Tudo fictício. A senha aparece uma vez."
      />
      <Card>
        <DemoForm
          courses={courses.map((c) => ({ id: c.id, name: c.name }))}
          defaultCourseId={medicina?.id ?? ''}
        />
      </Card>
      <Card as="section" aria-labelledby="pdfs" className="grid gap-2">
        <h2 id="pdfs" className="text-xl">
          PDFs de teste
        </h2>
        <p className="text-sm text-muted">Dados fictícios, para enviar durante os testes.</p>
        <ul className="grid gap-1">
          {DEMO_DOWNLOADS.map((href) => (
            <li key={href}>
              <a href={href} download>
                {href.replace('/teste/', '')}
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

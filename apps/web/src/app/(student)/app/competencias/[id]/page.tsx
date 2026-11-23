import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AutoRefresh } from '@/components/production/auto-refresh';
import { CertificateForm, DeleteCertificate } from '@/components/portfolio/certificate-form';
import { Alert, Badge, Card } from '@/components/ui/card';
import { requireFeature } from '@/features/flags/service';
import { getItem, listPortfolio } from '@/features/portfolio/service';
import { ApiError } from '@/lib/api';
import { requireStudent } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Certificado' };

// Conferência de um certificado (docs/competencias, K1, 3.1): o comprovante ao lado dos campos
// que a leitura propôs. Nada entra na soma de horas nem no currículo sem o aluno confirmar.
export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  await requireFeature('competencias');
  const { id } = await params;
  const user = await requireStudent(`/app/competencias/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [{ item, fileUrl }, { folders }] = await Promise.all([
    getItem(user.id, id).catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) notFound();
      throw err;
    }),
    listPortfolio(user.id, {}),
  ]);
  const reading = item.status === 'reading';
  const image = item.fileName ? /\.(jpe?g|png|webp)$/i.test(item.fileName) : false;

  return (
    <div className="grid gap-6">
      <nav aria-label="Trilha" className="text-sm">
        <Link href="/app/competencias">Meus Certificados</Link>{' '}
        <span className="text-muted">/</span>{' '}
        <span aria-current="page">{item.title || 'Certificado'}</span>
      </nav>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl md:text-4xl">{item.title || 'Certificado'}</h1>
        {item.status === 'confirmed' ? (
          <Badge tone="success">Conferido</Badge>
        ) : reading ? (
          <Badge tone="accent">Lendo</Badge>
        ) : (
          <Badge tone="warn">A conferir</Badge>
        )}
      </header>

      {reading ? (
        <Alert>
          <AutoRefresh everyMs={2500} />O Cognuss está verificando o arquivo e lendo o certificado.
          Em instantes os campos aparecem para você conferir.
        </Alert>
      ) : null}
      {!reading && item.readByAi ? (
        <Alert tone="warn">
          <p className="font-semibold">Gerado por IA, sem revisão: confira antes de confirmar.</p>
          {item.readNote ? <p className="whitespace-pre-line">{item.readNote}</p> : null}
        </Alert>
      ) : !reading && item.readNote && item.status !== 'confirmed' ? (
        <Alert>
          <p className="whitespace-pre-line">{item.readNote}</p>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card as="section" aria-labelledby="campos" className="grid content-start gap-4">
          <h2 id="campos" className="text-xl">
            {item.status === 'confirmed' ? 'Dados do certificado' : 'Confira os dados'}
          </h2>
          {reading ? (
            <p className="text-sm text-muted">Os campos aparecem quando a leitura terminar.</p>
          ) : (
            <CertificateForm
              item={item}
              folders={folders.map((f) => ({ id: f.id, name: f.name }))}
            />
          )}
        </Card>
        <div className="grid content-start gap-4">
          <Card as="section" aria-labelledby="comprovante" className="grid gap-2">
            <h2 id="comprovante" className="text-xl">
              Comprovante
            </h2>
            {item.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL assinada do bucket
              <img
                src={item.thumbnailUrl}
                alt={`Comprovante: ${item.fileName ?? 'certificado'}`}
                className="w-full rounded border border-line bg-surface-2"
              />
            ) : image && fileUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL assinada do bucket
              <img
                src={fileUrl}
                alt={`Comprovante: ${item.fileName}`}
                className="w-full rounded border border-line bg-surface-2"
              />
            ) : null}
            {fileUrl ? (
              <a href={fileUrl} target="_blank" rel="noopener">
                Abrir {item.fileName}
              </a>
            ) : item.fileName ? (
              <p className="text-sm text-muted">
                {item.fileName}: o arquivo ainda está sendo verificado.
              </p>
            ) : (
              <p className="text-sm text-muted">Registrado sem arquivo.</p>
            )}
          </Card>
          <DeleteCertificate id={item.id} />
        </div>
      </div>
    </div>
  );
}

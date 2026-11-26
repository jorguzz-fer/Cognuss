import { Markdown } from '@gutta/ui/markdown';
import { embedUrl } from '@/lib/plan-content';

type Content = {
  id: string;
  kind: 'text' | 'video' | 'table' | 'timeline';
  title: string | null;
  bodyMd: string | null;
  url: string | null;
  data: { columns?: string[]; rows?: string[][]; steps?: string[] } | null;
};

// Mostra o conteúdo do tópico (CON-01) do mesmo jeito para o aluno e na prévia do editor.
export function ContentView({ content }: { content: Content }) {
  return (
    <section className="grid gap-3">
      {content.title ? <h3 className="text-lg">{content.title}</h3> : null}
      {content.kind === 'text' && content.bodyMd ? <Markdown source={content.bodyMd} /> : null}
      {content.kind === 'video' && content.url ? <Video url={content.url} /> : null}
      {content.kind === 'table' && content.data?.columns ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead>
              <tr>
                {content.data.columns.map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className="border-b-2 border-line-strong px-3 py-2 font-semibold"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {content.data.rows?.map((r, i) => (
                <tr key={i} className="border-b border-line">
                  {r.map((cell, j) =>
                    j === 0 ? (
                      <th key={j} scope="row" className="px-3 py-2 font-semibold">
                        {cell}
                      </th>
                    ) : (
                      <td key={j} className="px-3 py-2">
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {content.kind === 'timeline' && content.data?.steps ? (
        <ol className="grid gap-2">
          {content.data.steps.map((step, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-display text-accent-ink">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function Video({ url }: { url: string }) {
  const embed = embedUrl(url);
  if (!embed)
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        Abrir o vídeo
      </a>
    );
  return (
    <div className="aspect-video overflow-hidden rounded-[var(--radius)] bg-surface-2">
      <iframe
        src={embed}
        title="Vídeo do tópico"
        className="size-full"
        allow="encrypted-media; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

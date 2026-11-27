'use client';
import { Archive, FileText, Pencil, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { disciplines } from '@gutta/contracts';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { api, ClientApiError } from '@/lib/client-api';
import { cn } from '@/lib/cn';
import { uploadFile } from '@/lib/upload';
import { AttachDocument } from './attach-document';
import { isPending, ScheduleStatus } from './schedule-status';
import { CATEGORY_COLORS, categoryClasses, type CategoryColor } from '@/styles/categories';

type DisciplineDto = disciplines.DisciplineDto;
/** Disciplina do catálogo do curso do aluno, que pode ser ligada à dele (ADR 0026). */
export type CatalogOption = { id: string; name: string; slug: string; modules: number };

const modulesLabel = (n: number) =>
  n === 0 ? 'aulas em preparação' : n === 1 ? '1 módulo' : `${n} módulos`;

const ACCEPT =
  '.pdf,.doc,.docx,.xlsx,.xls,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_BYTES = 10 * 1024 * 1024;
const KIND_LABEL = { cronograma: 'Cronograma', plano_ensino: 'Plano de ensino' } as const;
const STATUS_LABEL: Record<string, string> = {
  uploading: 'Enviando',
  scanning: 'Verificando',
  processing: 'Processando',
  ready: 'Pronto',
  failed: 'Não processou',
  quarantined: 'Bloqueado pelo antivírus',
};

type Pending = { kind: 'cronograma' | 'plano_ensino'; file: File };

/*
  Disciplinas do semestre (SPEC v2, DIS-01 a DIS-03): nome, sigla, cor, docentes em etiquetas
  e os documentos. Os arquivos sobem direto para o bucket (ADR 0012); o processamento segue
  em segundo plano e o estado aparece em cada documento.
*/
export function DisciplineEditor({
  initial,
  reviewBase = '/app/minhas-disciplinas/cronograma',
  catalog = [],
}: {
  initial: DisciplineDto[];
  /** Onde fica a conferência do cronograma (no cadastro ou no app). */
  reviewBase?: string;
  /** Disciplinas do catálogo do curso do aluno, para ligar às dele. */
  catalog?: CatalogOption[];
}) {
  const [items, setItems] = useState(initial);
  const [name, setName] = useState('');
  const [catalogId, setCatalogId] = useState('');
  const linked = new Set(items.map((d) => d.catalog?.id).filter(Boolean));
  const suggestions = catalog.filter((c) => !linked.has(c.id));
  const inApp = reviewBase.startsWith('/app');
  const [shortName, setShortName] = useState('');
  const [color, setColor] = useState<CategoryColor>(((initial.length % 8) + 1) as CategoryColor);
  const [teachers, setTeachers] = useState<string[]>([]);
  const [teacherDraft, setTeacherDraft] = useState('');
  const [files, setFiles] = useState<Pending[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const addTeacher = () => {
    const t = teacherDraft.trim();
    if (t.length >= 2 && !teachers.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setTeachers([...teachers, t]);
    }
    setTeacherDraft('');
  };

  const pick = (kind: Pending['kind'], list: FileList | null) => {
    const f = list?.[0];
    setErrors((e) => ({ ...e, [kind]: '' }));
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setErrors((e) => ({ ...e, [kind]: 'O arquivo passa de 10 MB.' }));
      return;
    }
    setFiles((cur) => [...cur.filter((p) => p.kind !== kind), { kind, file: f }]);
  };

  const replace = (d: DisciplineDto) => setItems((cur) => cur.map((x) => (x.id === d.id ? d : x)));
  const refresh = async () => {
    const res = await api<{ items: DisciplineDto[] }>('/disciplines');
    setItems(res.items);
  };

  // Leitura do cronograma em andamento: consulta a cada 4 s até terminar.
  const reading = items.some((d) => isPending(d.scheduleImport));
  useEffect(() => {
    if (!reading) return;
    const t = setInterval(() => {
      refresh().catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [reading]);

  async function add(ev: React.FormEvent) {
    ev.preventDefault();
    const pendingTeacher = teacherDraft.trim();
    const allTeachers = pendingTeacher.length >= 2 ? [...teachers, pendingTeacher] : teachers;
    setErrors({});
    if (name.trim().length < 2) {
      setErrors({ name: 'Informe o nome da disciplina.' });
      return;
    }
    setBusy('Salvando a disciplina…');
    try {
      const { discipline } = await api<{ discipline: DisciplineDto }>('/disciplines', {
        method: 'POST',
        body: {
          name,
          shortName,
          color,
          teachers: allTeachers,
          catalogDisciplineId: catalogId || null,
        },
      });
      setItems((cur) => [...cur, discipline]);
      let current = discipline;
      for (const p of files) {
        setBusy(`Enviando ${KIND_LABEL[p.kind].toLowerCase()}…`);
        try {
          const uploaded = await uploadFile(p.file, () => {}, { pollMs: 0, waitProcessing: false });
          current = (
            await api<{ discipline: DisciplineDto }>(`/disciplines/${current.id}/documents`, {
              method: 'POST',
              body: { kind: p.kind, fileId: uploaded.id },
            })
          ).discipline;
          replace(current);
        } catch (err) {
          setErrors((e) => ({
            ...e,
            form: `A disciplina foi salva, mas o ${KIND_LABEL[p.kind].toLowerCase()} não subiu: ${err instanceof ClientApiError ? err.message : 'tente de novo.'} Você pode anexar depois.`,
          }));
        }
      }
      setName('');
      setCatalogId('');
      setShortName('');
      setTeachers([]);
      setTeacherDraft('');
      setFiles([]);
      setColor((((items.length + 1) % 8) + 1) as CategoryColor);
      (ev.target as HTMLFormElement).reset();
    } catch (err) {
      const msg =
        err instanceof ClientApiError ? err.message : 'Não deu para salvar. Tente de novo.';
      setErrors({
        [err instanceof ClientApiError && err.code === 'conflict' ? 'name' : 'form']: msg,
      });
    } finally {
      setBusy(null);
    }
  }

  const [editing, setEditing] = useState<string | null>(null);

  async function remove(d: DisciplineDto) {
    // Arquivar tira a disciplina do semestre; o histórico e os documentos ficam.
    if (!confirm(`Arquivar ${d.name}? Ela sai do semestre; o histórico e os documentos ficam.`))
      return;
    const id = d.id;
    setBusy('Arquivando…');
    try {
      await api(`/disciplines/${id}`, { method: 'DELETE' });
      setItems((cur) => cur.filter((x) => x.id !== id));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6">
      <form
        onSubmit={add}
        className="grid gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-4"
        noValidate
      >
        <h2 className="text-lg">Adicionar disciplina</h2>
        {errors.form ? <Alert tone="warn">{errors.form}</Alert> : null}
        {suggestions.length ? (
          <div className="grid gap-2">
            <p className="text-sm font-medium" id="sugestoes">
              Do catálogo do seu curso
            </p>
            <p className="text-sm text-muted">
              Escolha uma para já ver as aulas do Cognuss dentro da disciplina. Se a sua tiver outro
              nome na faculdade, troque o nome depois de escolher.
            </p>
            <ul className="flex flex-wrap gap-2" aria-labelledby="sugestoes">
              {suggestions.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={catalogId === c.id}
                    onClick={() => {
                      if (catalogId === c.id) {
                        setCatalogId('');
                        return;
                      }
                      setCatalogId(c.id);
                      setName(c.name);
                    }}
                    className={cn(
                      'min-h-11 rounded-full border border-line-strong px-4 text-sm hover:bg-surface-2',
                      catalogId === c.id && 'border-accent bg-accent-soft font-semibold',
                    )}
                  >
                    {c.name} · {modulesLabel(c.modules)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Nome da disciplina" error={errors.name}>
            {(p) => (
              <Input
                {...p}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Fisiopatologia"
              />
            )}
          </Field>
          <Field label="Sigla" optional>
            {(p) => (
              <Input
                {...p}
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="Ex.: Fisiopato"
                maxLength={30}
              />
            )}
          </Field>
        </div>
        {catalog.length ? (
          <Field
            label="Conteúdo do Cognuss"
            optional
            hint="Liga a sua disciplina às aulas, questões e resumos do Cognuss."
          >
            {(p) => (
              <Select {...p} value={catalogId} onChange={(e) => setCatalogId(e.target.value)}>
                <option value="">Nenhum</option>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id} disabled={linked.has(c.id)}>
                    {c.name} ({modulesLabel(c.modules)})
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : null}
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Cor na grade e no calendário</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <label
                key={c.id}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius)] border-l-4 px-3 text-sm',
                  categoryClasses(c.id),
                  color === c.id && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
                )}
              >
                <input
                  type="radio"
                  name="color"
                  value={c.id}
                  checked={color === c.id}
                  onChange={() => setColor(c.id)}
                  className="sr-only"
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Docentes" optional hint="Digite o nome e tecle Enter. Pode adicionar vários.">
          {(p) => (
            <Input
              {...p}
              value={teacherDraft}
              onChange={(e) => setTeacherDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTeacher();
                }
              }}
              onBlur={addTeacher}
              placeholder="Ex.: Profa. Dra. Maria Costa"
            />
          )}
        </Field>
        {teachers.length ? (
          <ul className="flex flex-wrap gap-2" aria-label="Docentes adicionados">
            {teachers.map((t) => (
              <li
                key={t}
                className="flex items-center gap-1 rounded-full border border-line-strong bg-surface-2 py-1 pr-1 pl-3 text-sm"
              >
                {t}
                <button
                  type="button"
                  aria-label={`Remover ${t}`}
                  className="grid size-7 place-items-center rounded-full hover:bg-surface"
                  onClick={() => setTeachers(teachers.filter((x) => x !== t))}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          {(['cronograma', 'plano_ensino'] as const).map((kind) => (
            <Field
              key={kind}
              label={KIND_LABEL[kind]}
              optional
              error={errors[kind]}
              hint="PDF, DOC, DOCX ou XLSX, até 10 MB."
            >
              {(p) => (
                <Input
                  {...p}
                  type="file"
                  accept={ACCEPT}
                  className="py-2"
                  onChange={(e) => pick(kind, e.target.files)}
                />
              )}
            </Field>
          ))}
        </div>
        <div>
          <Button type="submit" variant="secondary" disabled={Boolean(busy)}>
            {busy ?? 'Adicionar disciplina'}
          </Button>
        </div>
      </form>

      <section aria-labelledby="minhas" className="grid gap-3">
        <h2 id="minhas" className="text-lg">
          Disciplinas do semestre ({items.length})
        </h2>
        {items.length === 0 ? (
          <p className="text-muted">
            Nenhuma disciplina ainda. Adicione a primeira para continuar.
          </p>
        ) : (
          <ul className="grid gap-3">
            {items.map((d) => (
              <li
                key={d.id}
                className={cn(
                  'grid gap-2 rounded-[var(--radius)] border-l-4 p-3',
                  categoryClasses(d.color as CategoryColor),
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {reviewBase.startsWith('/app') ? (
                        <Link href={`/app/minhas-disciplinas/${d.id}`}>{d.name}</Link>
                      ) : (
                        d.name
                      )}
                      {d.shortName ? <span className="font-normal"> · {d.shortName}</span> : null}
                    </p>
                    {d.teachers.length ? (
                      <p className="text-sm">{d.teachers.map((t) => t.name).join(', ')}</p>
                    ) : null}
                    {d.catalog ? (
                      <p className="text-sm">
                        Conteúdo do Cognuss:{' '}
                        {inApp ? (
                          <Link href={`/app/disciplinas/${d.catalog.slug}`}>{d.catalog.name}</Link>
                        ) : (
                          d.catalog.name
                        )}{' '}
                        · {modulesLabel(d.catalog.modules)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex">
                    <button
                      type="button"
                      onClick={() => setEditing(editing === d.id ? null : d.id)}
                      aria-label={`Editar ${d.name}`}
                      aria-expanded={editing === d.id}
                      className="grid size-11 place-items-center rounded-[var(--radius)] hover:bg-surface/40"
                    >
                      <Pencil className="size-5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(d)}
                      aria-label={`Arquivar ${d.name}`}
                      className="grid size-11 place-items-center rounded-[var(--radius)] hover:bg-surface/40"
                    >
                      <Archive className="size-5" aria-hidden />
                    </button>
                  </div>
                </div>
                {editing === d.id ? (
                  <EditDiscipline
                    discipline={d}
                    catalog={catalog}
                    taken={linked}
                    onSaved={(nd) => {
                      replace(nd);
                      setEditing(null);
                    }}
                    onCancel={() => setEditing(null)}
                  />
                ) : null}
                {d.documents.length ? (
                  <ul className="grid gap-1 text-sm">
                    {d.documents.map((doc) => (
                      <li key={doc.id} className="flex items-center gap-2">
                        <FileText className="size-4" aria-hidden />
                        {KIND_LABEL[doc.kind]}: {doc.file.name} ·{' '}
                        {STATUS_LABEL[doc.file.status] ?? doc.file.status}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm">Sem cronograma ainda.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <AttachDocument
                    disciplineId={d.id}
                    kind="cronograma"
                    label={
                      d.documents.some((x) => x.kind === 'cronograma')
                        ? 'Enviar outro cronograma'
                        : 'Anexar cronograma'
                    }
                    onAttached={(nd) => {
                      replace(nd);
                      void refresh();
                    }}
                  />
                  {d.documents.some((x) => x.kind === 'plano_ensino') ? null : (
                    <AttachDocument
                      disciplineId={d.id}
                      kind="plano_ensino"
                      label="Anexar plano de ensino"
                      onAttached={replace}
                    />
                  )}
                </div>
                {d.scheduleImport ? (
                  <ScheduleStatus
                    value={d.scheduleImport}
                    reviewBase={reviewBase}
                    onChanged={refresh}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Edição de uma disciplina já cadastrada: nome, sigla, cor e docentes (um por linha). */
function EditDiscipline({
  discipline: d,
  catalog,
  taken,
  onSaved,
  onCancel,
}: {
  discipline: DisciplineDto;
  catalog: CatalogOption[];
  taken: Set<string | undefined>;
  onSaved: (d: DisciplineDto) => void;
  onCancel: () => void;
}) {
  const [color, setColor] = useState<CategoryColor>(d.color as CategoryColor);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = new FormData(ev.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    if (name.length < 2) return setError('Informe o nome da disciplina.');
    const teachers = String(form.get('teachers') ?? '')
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);
    setSaving(true);
    setError(null);
    try {
      const { discipline } = await api<{ discipline: DisciplineDto }>(`/disciplines/${d.id}`, {
        method: 'PATCH',
        body: {
          name,
          shortName: String(form.get('shortName') ?? ''),
          color,
          teachers,
          // Sem catálogo no curso, a ligação fica como está.
          ...(catalog.length
            ? { catalogDisciplineId: String(form.get('catalogDisciplineId') ?? '') || null }
            : {}),
        },
      });
      onSaved(discipline);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : 'Não deu para salvar. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="grid gap-3 rounded-[var(--radius)] border border-line bg-surface p-3 text-fg"
      noValidate
    >
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <Field label="Nome da disciplina">
          {(p) => <Input {...p} name="name" defaultValue={d.name} required />}
        </Field>
        <Field label="Sigla" optional>
          {(p) => <Input {...p} name="shortName" defaultValue={d.shortName ?? ''} maxLength={30} />}
        </Field>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Cor</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <label
              key={c.id}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius)] border-l-4 px-3 text-sm',
                categoryClasses(c.id),
                color === c.id && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
              )}
            >
              <input
                type="radio"
                name={`color-${d.id}`}
                value={c.id}
                checked={color === c.id}
                onChange={() => setColor(c.id)}
                className="sr-only"
              />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>
      {catalog.length ? (
        <Field label="Conteúdo do Cognuss" optional>
          {(p) => (
            <Select {...p} name="catalogDisciplineId" defaultValue={d.catalog?.id ?? ''}>
              <option value="">Nenhum</option>
              {catalog.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                  disabled={taken.has(c.id) && d.catalog?.id !== c.id}
                >
                  {c.name} ({modulesLabel(c.modules)})
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : null}
      <Field label="Docentes" optional hint="Um por linha.">
        {(p) => (
          <Textarea
            {...p}
            name="teachers"
            rows={3}
            defaultValue={d.teachers.map((t) => t.name).join('\n')}
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={saving}>
          Salvar alterações
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

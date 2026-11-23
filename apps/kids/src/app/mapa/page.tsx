import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@gutta/ui/theme-toggle';
import { KidsWordmark } from '@/components/brand';
import {
  Actions,
  DecisionTree,
  Diagram,
  Edges,
  Flow,
  RolePill,
  Rule,
  States,
  Timeline,
  Tree,
  Path,
} from '@/components/map/diagrams';

// Manual da plataforma: o que cada perfil faz e o que cada ação libera. Página pública,
// sem dados de nenhuma escola. Reflete as regras do código (RLS, gatilho editorial, provas).

export const metadata: Metadata = {
  title: 'Mapa da plataforma',
  description: 'Como o Cognuss Kids funciona: perfis, ações e o caminho até o aluno estudar.',
};

const SECTIONS = [
  ['mapa', 'Mapa geral'],
  ['estrutura', 'Como a escola se organiza'],
  ['acesso', 'Entrar e primeiro acesso'],
  ['super', 'Super Admin'],
  ['gestor', 'Gestor'],
  ['alunos', 'Contas de aluno'],
  ['responsavel', 'Responsável e LGPD'],
  ['planos', 'Planos de estudo'],
  ['estudar', 'Aluno estudando'],
  ['provas', 'Simulado, prova e recuperação'],
  ['exemplo', 'Escola de exemplo'],
] as const;

function Section({
  id,
  kicker,
  title,
  lead,
  children,
}: {
  id: (typeof SECTIONS)[number][0];
  kicker: ReactNode;
  title: string;
  lead: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-14 scroll-mt-6 first:mt-0">
      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold tracking-[0.12em] text-muted uppercase">
        {kicker}
      </div>
      <h2 className="text-[clamp(22px,3.2vw,28px)] text-balance">{title}</h2>
      <p className="mt-2 max-w-[68ch] text-muted">{lead}</p>
      {children}
    </section>
  );
}

export default function MapaPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-5 pb-20 sm:px-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" aria-label="Cognuss Kids, início">
          <KidsWordmark className="text-xl sm:text-2xl" />
        </Link>
        <ThemeToggle />
      </div>

      <header className="mt-10 max-w-3xl">
        <p className="font-mono text-xs font-semibold tracking-[0.2em] text-muted uppercase">
          Manual da plataforma
        </p>
        <h1 className="mt-2 text-[clamp(30px,5vw,48px)] text-balance">
          Quem faz o quê no Cognuss Kids
        </h1>
        <p className="mt-3 text-muted">
          Como cada parte depende das outras, quem pode fazer cada ação e o que acontece depois
          dela. Cada seção tem um mapa e a lista de ações.
        </p>
        <ul className="m-0 mt-5 flex list-none flex-wrap gap-2 p-0" aria-label="Perfis">
          <li>
            <RolePill role="super" />
          </li>
          <li>
            <RolePill role="gestor" />
          </li>
          <li>
            <RolePill role="prof" />
          </li>
          <li>
            <RolePill role="aluno" />
          </li>
          <li>
            <RolePill role="resp">Responsável (sem login)</RolePill>
          </li>
        </ul>
      </header>

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="Seções" className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <ol className="m-0 flex list-none gap-1.5 overflow-x-auto p-0 pb-1 no-scrollbar lg:grid lg:gap-0.5 lg:overflow-visible">
            {SECTIONS.map(([id, label]) => (
              <li key={id} className="shrink-0">
                <a
                  href={`#${id}`}
                  className="block rounded-full border border-line px-3 py-1 text-sm whitespace-nowrap text-fg no-underline hover:bg-surface-2 lg:rounded-[var(--radius)] lg:border-transparent lg:px-2.5"
                >
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <main id="conteudo" className="min-w-0">
          <Section
            id="mapa"
            kicker="Visão de cima"
            title="Mapa geral: quem libera o quê"
            lead="Cada perfil tem a sua área. Cada linha mostra uma ação e para quem ela abre caminho."
          >
            <Diagram label="Relações entre os perfis">
              <Edges
                edges={[
                  {
                    from: 'super',
                    action: 'cria a escola e convida o primeiro gestor',
                    to: 'gestor',
                  },
                  { from: 'gestor', action: 'convida por e-mail', to: 'prof' },
                  { from: 'gestor', action: 'cria a conta (código, apelido e senha)', to: 'aluno' },
                  { from: 'gestor', action: 'envia o link de autorização', to: 'resp' },
                  { from: 'resp', action: 'autoriza o uso (LGPD)', to: 'aluno' },
                  { from: 'prof', action: 'escreve o plano e manda para revisão', to: 'Revisão' },
                  {
                    from: 'gestor',
                    action: 'também escreve, revisa e publica planos',
                    to: 'Revisão',
                  },
                  {
                    from: 'aluno',
                    action: 'estuda; notas e progresso aparecem nos painéis',
                    to: 'prof',
                  },
                ]}
              />
            </Diagram>
            <Rule title="Regra de ouro.">
              O aluno só vê um plano quando as quatro coisas são verdade: tem conta, está numa turma
              do ano do plano, o responsável autorizou e o plano está publicado.
            </Rule>
          </Section>

          <Section
            id="estrutura"
            kicker="Dados"
            title="Como a escola se organiza"
            lead="Tudo pertence a uma instituição. Uma escola nunca vê os dados de outra: o banco bloqueia isso em cada consulta."
          >
            <Diagram label="Estrutura da escola">
              <Tree
                nodes={[
                  {
                    title: 'Instituição',
                    sub: 'a escola',
                    children: [
                      {
                        title: 'Etapas',
                        sub: 'Fundamental (1º ao 9º ano) e Médio (1ª a 3ª série)',
                        children: [
                          {
                            title: 'Ano ou série',
                            sub: 'ex.: 3º ano; pode ficar inativo',
                            children: [
                              {
                                title: 'Turma',
                                sub: 'ex.: 3º A, com código de 6 caracteres',
                                children: [
                                  { title: 'Alunos', sub: 'cada um com um responsável' },
                                  { title: 'Professor × matéria', sub: 'quem dá o quê na turma' },
                                ],
                              },
                              {
                                title: 'Plano de estudo',
                                sub: 'de um ano e uma matéria',
                                children: [
                                  {
                                    title: 'Tópicos por dia',
                                    sub: 'conteúdo, flashcards e questões',
                                  },
                                  { title: 'Simulado e prova' },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      { title: 'Matérias', sub: 'Ciências, Matemática…' },
                      { title: 'Pessoas', sub: 'gestores, professores e alunos' },
                    ],
                  },
                ]}
              />
            </Diagram>
          </Section>

          <Section
            id="acesso"
            kicker="Todos"
            title="Entrar e primeiro acesso"
            lead={
              <>
                Em <Path>/entrar</Path> há duas abas: o aluno usa o código da turma e a equipe usa o
                e-mail. Ninguém cria conta sozinho: a conta vem de um convite ou da gestão.
              </>
            }
          >
            <Diagram label="Fluxo de entrada">
              <DecisionTree
                start={{ title: 'Abrir /entrar' }}
                d={{
                  q: 'Qual aba?',
                  paths: [
                    {
                      when: 'Código da turma',
                      to: {
                        title: 'Código + apelido + senha',
                        sub: 'Entra direto na área de estudo.',
                        role: 'aluno',
                      },
                    },
                    {
                      when: 'E-mail',
                      to: {
                        q: 'E-mail e senha certos. Já tem 2FA?',
                        paths: [
                          {
                            when: 'Sim',
                            to: {
                              title: 'Código do app autenticador',
                              sub: '/entrar/dois-fatores',
                            },
                          },
                          {
                            when: 'Não',
                            to: {
                              title: 'Ativar o 2FA agora',
                              sub: 'Obrigatório para a equipe (/seguranca/dois-fatores).',
                            },
                          },
                        ],
                      },
                    },
                  ],
                }}
              />
              <div className="mt-3 grid gap-1.5">
                <Flow
                  steps={[
                    {
                      title: 'Mais de uma escola?',
                      sub: 'Escolhe em /escolher.',
                      tone: 'decision',
                    },
                    {
                      title: 'Área do perfil',
                      sub: '/inicio leva para o lugar certo.',
                      tone: 'end',
                    },
                  ]}
                />
              </div>
            </Diagram>
            <Actions
              rows={[
                {
                  action: 'Aceitar convite',
                  who: (
                    <>
                      <RolePill role="gestor" /> <RolePill role="prof" />
                    </>
                  ),
                  what: 'O link /convite/… vale 7 dias. Quem já tem conta só aceita; quem não tem cria ali, com nome e senha, e entra na escola com o papel do convite.',
                },
                {
                  action: 'Ativar 2FA',
                  who: (
                    <>
                      <RolePill role="super" /> <RolePill role="gestor" /> <RolePill role="prof" />
                    </>
                  ),
                  what: 'Obrigatório para a equipe: sem ele, a pessoa não chega à área dela. O aluno não usa 2FA.',
                },
                {
                  action: 'Esqueci a senha',
                  who: 'Equipe',
                  what: 'Chega um e-mail com o link de redefinição. O aluno não tem e-mail: a gestão ou o professor gera uma senha nova.',
                },
                {
                  action: 'Escolher escola',
                  who: 'Quem está em várias',
                  what: 'Depois da escolha, tudo o que a pessoa vê é daquela escola.',
                },
              ]}
            />
          </Section>

          <Section
            id="super"
            kicker={<RolePill role="super" />}
            title="Plataforma: criar e cuidar das escolas"
            lead="Administra o Cognuss Kids. A primeira conta nasce na instalação. Não estuda nem edita planos: cria as escolas e passa o controle para o gestor."
          >
            <Diagram label="Caminho do Super Admin">
              <Flow
                numbered
                steps={[
                  {
                    title: 'Criar instituição',
                    sub: 'nome, cidade/UF, pública ou privada',
                    role: 'super',
                  },
                  { title: 'Convidar o gestor', sub: 'e-mail com link de convite', role: 'super' },
                  { title: 'Gestor assume a escola', role: 'gestor' },
                ]}
              />
            </Diagram>
            <Actions
              rows={[
                {
                  action: 'Criar instituição',
                  where: '/plataforma/nova',
                  what: 'A escola nasce vazia: sem etapas, anos ou pessoas.',
                },
                {
                  action: 'Convidar gestor',
                  where: '/plataforma/<escola>',
                  what: 'Envia o convite por e-mail. Quem aceitar assume a gestão.',
                },
                {
                  action: 'Suspender ou reativar',
                  where: '/plataforma/<escola>',
                  what: 'Escola suspensa fica bloqueada para todos os perfis dela. Os dados continuam guardados.',
                },
              ]}
            />
          </Section>

          <Section
            id="gestor"
            kicker={<RolePill role="gestor" />}
            title="Escola: montar a estrutura e as pessoas"
            lead="O gestor monta a escola nesta ordem. Cada passo depende do anterior."
          >
            <Diagram label="Ordem de montagem da escola">
              <Flow
                numbered
                steps={[
                  { title: 'Estrutura', sub: 'etapas e anos' },
                  { title: 'Matérias', sub: 'sugeridas ou próprias' },
                  { title: 'Turmas', sub: 'com código' },
                  { title: 'Professores', sub: 'por convite' },
                  { title: 'Alunos', sub: 'um a um ou lista' },
                  { title: 'Responsáveis', sub: 'link ou papel' },
                ]}
              />
            </Diagram>
            <Actions
              rows={[
                {
                  action: 'Ativar etapa e anos',
                  where: '/escola/estrutura',
                  what: 'Liga o Fundamental, o Médio ou os dois, e só os anos que a escola oferece. Ano inativo não recebe turma nem plano.',
                },
                {
                  action: 'Matérias',
                  where: '/escola/materias',
                  what: 'Adiciona a lista sugerida (áreas da BNCC) ou matérias próprias. Arquivar esconde a matéria sem apagar os planos.',
                },
                {
                  action: 'Criar turma',
                  where: '/escola/turmas',
                  what: 'Turma de um ano e um ano letivo, como "3º A". O sistema gera o código de 6 caracteres que os alunos usam para entrar.',
                },
                {
                  action: 'Convidar professor ou gestor',
                  where: '/escola/pessoas',
                  what: 'Convite por e-mail, válido por 7 dias. Pode ser cancelado antes do aceite.',
                },
                {
                  action: 'Remover pessoa',
                  where: '/escola/pessoas',
                  what: 'Tira o acesso à escola e encerra as sessões abertas. O histórico do aluno fica com a escola.',
                },
                {
                  action: 'Professor na turma',
                  where: '/escola/turmas/<turma>',
                  what: 'Liga o professor a uma matéria da turma. O professor vê só as turmas em que está.',
                },
                {
                  action: 'Tirar aluno da turma',
                  where: '/escola/turmas/<turma>',
                  what: 'Desfaz a matrícula. O aluno deixa de ver os planos daquele ano.',
                },
              ]}
            />
          </Section>

          <Section
            id="alunos"
            kicker={
              <>
                <RolePill role="gestor" /> <RolePill role="prof" />
              </>
            }
            title="Contas de aluno: de onde vem a senha"
            lead="O aluno não cria conta nem senha. A gestão cria a conta e o sistema sorteia uma senha simples, mostrada uma única vez."
          >
            <Diagram label="Ciclo da conta do aluno">
              <Timeline
                steps={[
                  {
                    role: 'gestor',
                    text: 'Adiciona o aluno (nome e apelido) ou cola a lista da turma.',
                  },
                  {
                    role: 'sistema',
                    text: (
                      <>
                        Mostra o usuário <Path>código.apelido</Path> e uma senha simples, como{' '}
                        <Path>gato-azul-42</Path>, uma única vez.
                      </>
                    ),
                  },
                  {
                    role: 'gestor',
                    text: 'Entrega o código, o apelido e a senha para a família ou o professor.',
                  },
                  { role: 'aluno', text: 'Entra em /entrar, na aba "Código da turma".' },
                  { role: 'aluno', text: 'Esqueceu a senha? Pede ajuda a um adulto.' },
                  {
                    role: 'prof',
                    text: 'O professor da turma (ou a gestão) gera uma senha nova, também mostrada uma vez.',
                  },
                ]}
              />
            </Diagram>
            <Actions
              rows={[
                {
                  action: 'Adicionar aluno',
                  who: <RolePill role="gestor" />,
                  what: 'Nome e apelido (3 a 20 letras ou números, sem acento). O login fica código.apelido; o apelido não se repete na turma.',
                },
                {
                  action: 'Importar lista',
                  who: <RolePill role="gestor" />,
                  what: 'Uma linha por aluno, "Nome completo; apelido", até 200. Sem apelido, usa o primeiro nome. Linhas com problema são puladas e listadas.',
                },
                {
                  action: 'Nova senha',
                  who: (
                    <>
                      <RolePill role="gestor" />{' '}
                      <RolePill role="prof">Professor (só as turmas dele)</RolePill>
                    </>
                  ),
                  what: 'Gera outra senha simples e mostra uma vez. A antiga para de funcionar.',
                },
              ]}
            />
            <Rule title="Por que a senha aparece só uma vez?">
              O banco guarda só uma versão embaralhada (hash), sem volta. Se perder, gera-se outra.
            </Rule>
          </Section>

          <Section
            id="responsavel"
            kicker={
              <>
                <RolePill role="resp" /> <RolePill role="gestor" />
              </>
            }
            title="Responsável e autorização (LGPD)"
            lead="O aluno é menor de idade: só estuda depois que um responsável autoriza. O responsável não tem login; usa um link pessoal."
          >
            <Diagram label="Fluxo de autorização do responsável">
              <DecisionTree
                start={{
                  title: 'Gestor cadastra o responsável no aluno',
                  sub: 'nome e e-mail',
                  role: 'gestor',
                }}
                d={{
                  q: 'Como a autorização chega?',
                  paths: [
                    {
                      when: 'Pelo link',
                      to: {
                        q: 'Responsável abre /responsavel/… e decide',
                        paths: [
                          {
                            when: 'Autoriza',
                            to: {
                              title: 'Aluno liberado',
                              sub: 'vê os planos publicados',
                              tone: 'end',
                            },
                          },
                          { when: 'Recusa', to: { title: 'Aluno continua bloqueado' } },
                        ],
                      },
                    },
                    {
                      when: 'Termo em papel',
                      to: {
                        title: 'Gestor registra o termo assinado',
                        sub: 'Aluno liberado.',
                        tone: 'end',
                      },
                    },
                  ],
                }}
              />
              <div className="mt-4">
                <Flow
                  steps={[
                    {
                      title: 'Pedido do responsável',
                      sub: 'acesso, correção, exportação ou exclusão',
                      role: 'resp',
                    },
                    { title: 'Gestor resolve', sub: '/escola/responsaveis', role: 'gestor' },
                  ]}
                />
              </div>
            </Diagram>
            <Actions
              rows={[
                {
                  action: 'Convidar responsável',
                  who: <RolePill role="gestor" />,
                  what: 'Envia o link de autorização por e-mail. Pode reenviar se ele se perder.',
                },
                {
                  action: 'Termo em papel',
                  who: <RolePill role="gestor" />,
                  what: 'Registra que o termo foi assinado na matrícula, com quem anotou e quando. O registro não muda depois.',
                },
                {
                  action: 'Autorizar ou recusar',
                  who: <RolePill role="resp" />,
                  what: 'Decide pela página do link. A decisão fica registrada com a versão da política.',
                },
                {
                  action: 'Fazer um pedido',
                  who: <RolePill role="resp" />,
                  what: 'Pede acesso, correção, exportação ou exclusão dos dados da criança. O pedido aparece para a gestão.',
                },
                {
                  action: 'Resolver pedido',
                  who: <RolePill role="gestor" />,
                  what: 'Marca como resolvido em /escola/responsaveis.',
                },
              ]}
            />
          </Section>

          <Section
            id="planos"
            kicker={
              <>
                <RolePill role="prof" /> <RolePill role="gestor" />
              </>
            }
            title="Planos de estudo: do rascunho ao aluno"
            lead="Um plano é de um ano e uma matéria, com tópicos por dia. Cada tópico tem conteúdo, flashcards e questões. Sempre passa pela revisão de outra pessoa antes de chegar ao aluno."
          >
            <Diagram label="Ciclo editorial do plano">
              <States
                main={[
                  { state: 'Rascunho', sub: 'o autor edita' },
                  { state: 'Em revisão', sub: 'esperando outra pessoa' },
                  { state: 'Aprovado', sub: 'por quem não é o autor' },
                  { state: 'Publicado', sub: 'o aluno vê' },
                  { state: 'Arquivado', sub: 'sai do ar' },
                ]}
                back={[
                  { from: 'Em revisão', to: 'Rascunho', why: 'devolvido com uma nota' },
                  { from: 'Aprovado', to: 'Rascunho', why: 'voltou para ajustes' },
                  { from: 'Arquivado', to: 'Publicado', why: 'republicar' },
                  { from: 'Arquivado', to: 'Rascunho', why: 'reabrir para editar' },
                  {
                    from: 'Publicado',
                    to: 'Nova versão',
                    why: 'cópia em rascunho; o aluno segue com a antiga até publicar',
                  },
                ]}
              />
            </Diagram>
            <Rule title="Duas regras que o banco garante.">
              O autor não aprova o próprio plano. E só o rascunho pode ser editado: para mudar um
              plano publicado, cria-se uma versão nova.
            </Rule>
            <Actions
              rows={[
                {
                  action: 'Criar plano',
                  where: '/planos',
                  what: 'Ano, matéria, título e período (ex.: "Prova de Ciências"). Nasce como rascunho; quem cria é o autor.',
                },
                {
                  action: 'Tópicos',
                  where: '/planos/<plano>',
                  what: 'Adicionar, editar, reordenar e remover, com o dia de cada um.',
                },
                {
                  action: 'Conteúdo',
                  where: 'no tópico',
                  what: 'Texto, vídeo, tabela ou linha do tempo (as fases de um ciclo, por exemplo).',
                },
                {
                  action: 'Flashcards',
                  where: 'no tópico',
                  what: 'Frente e verso. O aluno revisa com repetição espaçada.',
                },
                {
                  action: 'Questões',
                  where: 'no tópico',
                  what: 'Um conceito em até 3 formatos: alternativas (a certa começa com *), verdadeiro ou falso, e escrita com palavras-chave. A recuperação usa os outros formatos.',
                },
                {
                  action: 'Simulado e prova',
                  where: '/planos/<plano>',
                  what: 'Número de questões. Na prova: nota mínima (padrão 8,0), tentativas e recuperações.',
                },
                {
                  action: 'Dicas para quem ajuda',
                  where: 'detalhes do plano',
                  what: 'Texto para o adulto que acompanha o aluno em casa.',
                },
              ]}
              whoLabel="Quem"
            />
          </Section>

          <Section
            id="estudar"
            kicker={<RolePill role="aluno" />}
            title="Aluno estudando"
            lead="O aluno vê só os planos publicados do ano da turma dele, e só depois da autorização do responsável."
          >
            <Diagram label="Caminho de estudo do aluno">
              <Flow
                steps={[
                  { title: 'Meus planos', sub: '/estudar', role: 'aluno' },
                  { title: 'Plano', sub: 'dias e tópicos' },
                  { title: 'Tópico', sub: 'ler e marcar como concluído' },
                  { title: 'Flashcards', sub: 'revisão do dia' },
                  { title: 'Simulado', sub: 'treino' },
                  { title: 'Prova', sub: 'vale nota', tone: 'end' },
                ]}
              />
            </Diagram>
            <Actions
              rows={[
                {
                  action: 'Concluir tópico',
                  where: '/estudar/topicos/…',
                  what: 'Registra o progresso, que aparece nos painéis do professor e do gestor.',
                },
                {
                  action: 'Revisar flashcards',
                  where: '/estudar/revisar',
                  what: 'O aluno diz se lembrou. Acertou: o cartão volta mais tarde. Errou: volta antes.',
                },
                {
                  action: 'Fazer avaliação',
                  where: '/estudar/avaliacoes/…',
                  what: 'Começa, responde uma questão por vez e envia. O gabarito fica só no servidor.',
                },
                {
                  action: 'Ver resultado',
                  where: '/estudar/tentativas/…',
                  what: 'Nota, o que acertou e a explicação de cada questão.',
                },
              ]}
            />
          </Section>

          <Section
            id="provas"
            kicker={<RolePill role="aluno" />}
            title="Simulado, prova e recuperação"
            lead="O simulado é treino e pode ser repetido. A prova vale nota; abaixo da mínima, a recuperação pergunta de novo só os conceitos errados, em outro formato."
          >
            <Diagram label="Regras da prova e da recuperação">
              <DecisionTree
                start={{ title: 'Prova', sub: 'tentativas limitadas', role: 'aluno' }}
                d={{
                  q: 'Nota igual ou acima da mínima (padrão 8,0)?',
                  paths: [
                    { when: 'Sim', to: { title: 'Aprovado', tone: 'end' } },
                    {
                      when: 'Não',
                      to: {
                        q: 'Ainda tem recuperação?',
                        paths: [
                          {
                            when: 'Sim',
                            to: {
                              title: 'Recuperação',
                              sub: 'Só os conceitos errados, cada um em outro formato. Depois, nova nota.',
                            },
                          },
                          {
                            when: 'Não',
                            to: {
                              title: 'Nova tentativa, se houver',
                              sub: 'Sem tentativas, encerra e o professor acompanha.',
                            },
                          },
                        ],
                      },
                    },
                  ],
                }}
              />
            </Diagram>
            <Rule title="Exemplo.">
              Prova de Ciências com 10 questões, nota mínima 8,0, 1 tentativa e 2 recuperações. O
              aluno tira 6,0: a recuperação refaz os conceitos que ele errou. Quem errou nas
              alternativas responde verdadeiro ou falso, ou escreve. Ainda abaixo de 8,0, tem a
              segunda recuperação; depois, o professor acompanha pelo painel da turma.
            </Rule>
          </Section>

          <Section
            id="exemplo"
            kicker="Para demonstrar"
            title="Escola de exemplo"
            lead={
              <>
                Para mostrar a plataforma funcionando, um comando no terminal do container{' '}
                <Path>kids</Path> cria uma escola completa e fictícia.
              </>
            }
          >
            <Actions
              rows={[
                {
                  action: 'Estrutura',
                  what: 'Fundamental (3º ao 9º ano) e Médio (1ª a 3ª série): 10 turmas, uma por ano.',
                },
                {
                  action: 'Equipe',
                  what: 'Uma gestora e quatro professores: Ciências/Biologia, Matemática, Português e História/Geografia.',
                },
                { action: 'Alunos', what: 'Três por turma, 30 no total.' },
                {
                  action: 'Responsáveis',
                  what: 'Em cada turma, dois alunos já autorizados e um pendente, com o link de autorização.',
                },
                {
                  action: 'Planos',
                  what: 'Ciências do 3º ano publicado (com simulado e prova), Matemática do 4º em revisão e Português do 6º em rascunho.',
                },
                {
                  action: 'Senha',
                  what: 'Todas as contas usam a senha passada em SEED_SENHA (12 caracteres ou mais). Ela não aparece na saída.',
                },
              ]}
            />
            <p className="mt-2">
              <Path>SEED_SENHA=&apos;uma-senha-forte&apos; node seed/seed-escola.mjs</Path>
            </p>
          </Section>
        </main>
      </div>
    </div>
  );
}

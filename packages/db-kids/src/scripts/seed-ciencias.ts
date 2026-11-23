import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../client';
import * as s from '../schema';
import { addConcept } from '../assessments';
import cards from './ciencias-cards.json' with { type: 'json' };
import concepts from './ciencias-questoes.json' with { type: 'json' };

// PLA-08: o plano de Ciências do 3º ano do piloto (estudos.tudomudou.com.br), como plano de
// demonstração. Conteúdo resumido da página do piloto; os flashcards são os mesmos 56 cartões.

type Key = keyof typeof cards;

const TOPICS: {
  key: Key;
  day: number;
  title: string;
  summary: string;
  contents: (
    | { kind: 'text'; title?: string; bodyMd: string }
    | { kind: 'table'; title?: string; data: { columns: string[]; rows: string[][] } }
    | { kind: 'timeline'; title?: string; data: { steps: string[] } }
  )[];
}[] = [
  {
    key: 'cl',
    day: 1,
    title: 'Classificar e vertebrados',
    summary:
      'O que é classificar, o que os animais comem, ovíparo e vivíparo, e a coluna vertebral.',
    contents: [
      {
        kind: 'text',
        bodyMd:
          'Classificar é **organizar em grupos** usando um critério de semelhança, como no supermercado. Com os animais, o critério pode ser o que comem, onde vivem, como se locomovem ou como o filhote se desenvolve.\n\n## Pelo que comem\n- **Herbívoro**: só vegetais (raiz, folha, fruto, semente)\n- **Carnívoro**: só outros animais\n- **Onívoro**: animais e vegetais\n\n## Como o filhote se desenvolve\n- **Ovíparo**: dentro do ovo (peixes, anfíbios, aves, maioria dos répteis)\n- **Vivíparo**: dentro do corpo da mãe (mamíferos)\n\n## Vertebrado ou invertebrado?\n**Vertebrados** têm coluna vertebral, formada por ossos chamados vértebras. **Invertebrados** não têm, e são a maioria dos animais do planeta: borboleta, minhoca, polvo, caranguejo.',
      },
      {
        kind: 'table',
        title: 'Tabela que resolve a prova',
        data: {
          columns: ['', 'Peixes', 'Anfíbios', 'Répteis', 'Aves', 'Mamíferos'],
          rows: [
            [
              'Corpo coberto de',
              'Escamas',
              'Pele fina e úmida',
              'Pele grossa e seca',
              'Penas',
              'Pelos',
            ],
            ['Respiram por', 'Brânquias', 'Pulmões e pele', 'Só pulmões', 'Pulmões', 'Pulmões'],
            ['Temperatura', '—', '—', 'Tomam sol', 'Sempre igual', 'Sempre igual'],
            [
              'Filhotes',
              'Ovos na água',
              'Ovos na água',
              'Maioria ovípara',
              'Ovos no ninho',
              'Mamam leite',
            ],
            [
              'Marca registrada',
              'Nadadeiras',
              'Metamorfose',
              'Troca de pele',
              'Bico e penas',
              'Glândulas mamárias',
            ],
          ],
        },
      },
    ],
  },
  {
    key: 'pe',
    day: 1,
    title: 'Peixes',
    summary: 'Brânquias, nadadeiras, escamas e o ciclo de vida.',
    contents: [
      {
        kind: 'text',
        bodyMd:
          'O peixe nada mexendo o corpo e a **nadadeira caudal**; as outras nadadeiras dão a direção. Dentro do **opérculo** ficam as **brânquias**, que tiram o oxigênio da água.\n\n> Curiosidade: o tubarão-baleia é o maior peixe (15 m). Tubarão e raia têm esqueleto de cartilagem.',
      },
      {
        kind: 'timeline',
        title: 'Ciclo de vida do peixe',
        data: {
          steps: ['Ovos', 'Embriões', 'Alevinos (filhotes)', 'Peixes jovens', 'Peixes adultos'],
        },
      },
    ],
  },
  {
    key: 'an',
    day: 2,
    title: 'Anfíbios e a metamorfose',
    summary: 'Pele úmida, sapo, rã, perereca e salamandra, e as fases da metamorfose.',
    contents: [
      {
        kind: 'text',
        bodyMd:
          '**Metamorfose** é a mudança completa da forma do corpo durante a vida. A pele dos anfíbios é **fina e úmida**: parte da respiração é pela pele. Se secar, o oxigênio não entra.\n\n- **Perereca**: ventosas nos dedos\n- **Sapo**: pele bem rugosa\n- **Rã**: pele lisa e dedos longos\n- **Salamandra**: tem cauda quando adulta',
      },
      {
        kind: 'timeline',
        title: 'Metamorfose da perereca',
        data: {
          steps: [
            'Ovos com embriões',
            'Girino: brânquias e cauda',
            'Nascem as pernas de trás',
            'Pernas da frente também',
            'A cauda começa a diminuir',
            'Perereca adulta',
          ],
        },
      },
    ],
  },
  {
    key: 're',
    day: 2,
    title: 'Répteis',
    summary: 'Pele seca, temperatura do corpo, locomoção, troca de pele e o Butantan.',
    contents: [
      {
        kind: 'text',
        bodyMd:
          'Pele **grossa, seca e impermeável**, com escamas e placas ósseas. Respiram **só pelos pulmões**. Não mantêm a temperatura constante: por isso **tomam sol**.\n\n## Troca de pele\nAs escamas não crescem com o animal, então ele troca a pele para crescer. O chocalho da cascavel serve para espantar inimigos, e **não mostra a idade**.\n\n## Instituto Butantan\nEm São Paulo, produz **soros e vacinas**.',
      },
    ],
  },
  {
    key: 'av',
    day: 3,
    title: 'Aves',
    summary: 'Penas, bicos, ninhos, incubação e o que cada ave come.',
    contents: [
      {
        kind: 'text',
        bodyMd:
          'Vertebradas, bípedes, ovíparas, com **bico e penas** e temperatura sempre igual. As penas aquecem, protegem e permitem o voo. O tempo do ovo antes de nascer é a **incubação**. No pinguim-imperador, **é o pai** que choca o ovo em cima dos pés.',
      },
      {
        kind: 'table',
        title: 'O bico mostra o que a ave come',
        data: {
          columns: ['Tipo', 'Come', 'Exemplo'],
          rows: [
            ['Granívora', 'grãos e sementes', 'Pardal'],
            ['Nectarívora', 'néctar', 'Beija-flor'],
            ['Insetívora', 'insetos', 'Pica-pau'],
            ['Necrófaga', 'animais mortos', 'Urubu'],
            ['Piscívora', 'peixes', 'Martim-pescador'],
            ['Onívora', 'de tudo', 'Bem-te-vi'],
          ],
        },
      },
    ],
  },
  {
    key: 'ma',
    day: 3,
    title: 'Mamíferos',
    summary: 'Pelos, glândulas mamárias e a troca de pelagem.',
    contents: [
      {
        kind: 'text',
        bodyMd:
          'Corpo coberto de **pelos**, que protegem e aquecem. Têm **glândulas mamárias**: os filhotes mamam leite. Temperatura do corpo sempre igual. O **ser humano** é mamífero!\n\n> A raposa-do-ártico muda de cor para se camuflar: branca no inverno, cinza no verão.',
      },
    ],
  },
];

const HELPER_TIPS =
  'Peça para o aluno **explicar com as próprias palavras**, como se fosse o professor: é o jeito mais rápido de descobrir o que ainda não ficou claro.\n\nCada dia: dois blocos de 20 minutos, com 5 minutos de pausa. Primeiro a apostila, depois o tópico aqui, e por fim os flashcards.';

/** Cria o plano publicado de Ciências na escola de demonstração. Idempotente. Roda como dono. */
export async function seedCienciasPlan(
  db: Db,
  input: {
    tenantId: string;
    gradeId: string;
    subjectId: string;
    authorId: string;
    reviewerId: string;
  },
) {
  const existing = await db.query.studyPlans.findFirst({
    where: and(
      eq(s.studyPlans.tenantId, input.tenantId),
      eq(s.studyPlans.subjectId, input.subjectId),
      eq(s.studyPlans.title, 'Vertebrados'),
    ),
  });
  if (existing) return existing.id;
  const planId = randomUUID();
  await db.insert(s.studyPlans).values({
    id: planId,
    rootId: planId,
    tenantId: input.tenantId,
    gradeId: input.gradeId,
    subjectId: input.subjectId,
    schoolYear: 2027,
    title: 'Vertebrados',
    periodLabel: 'Prova de Ciências',
    helperTipsMd: HELPER_TIPS,
    status: 'published',
    authorId: input.authorId,
    reviewerId: input.reviewerId,
    publishedAt: new Date(),
  });
  const topicByKey = new Map<string, string>();
  for (const [i, t] of TOPICS.entries()) {
    const [topic] = await db
      .insert(s.planTopics)
      .values({
        tenantId: input.tenantId,
        planId,
        title: t.title,
        summary: t.summary,
        dayNumber: t.day,
        orderIndex: i,
      })
      .returning();
    topicByKey.set(t.key, topic!.id);
    for (const [j, c] of t.contents.entries()) {
      await db.insert(s.topicContents).values({
        tenantId: input.tenantId,
        topicId: topic!.id,
        kind: c.kind,
        title: c.title ?? null,
        bodyMd: c.kind === 'text' ? c.bodyMd : null,
        data: c.kind === 'text' ? null : c.data,
        orderIndex: j,
      });
    }
    const list = cards[t.key];
    await db.insert(s.flashcards).values(
      list.map(([front, back], k) => ({
        tenantId: input.tenantId,
        topicId: topic!.id,
        front: front!,
        back: back!,
        orderIndex: k,
      })),
    );
  }
  // Dia 4 do piloto: revisão final, sem conteúdo novo.
  await db.insert(s.planTopics).values({
    tenantId: input.tenantId,
    planId,
    title: 'Revisão final',
    summary: 'Revisar todos os flashcards sem olhar a apostila. Dormir cedo!',
    dayNumber: 4,
    orderIndex: TOPICS.length,
  });
  // Fase 3: os 25 conceitos da prova do piloto, cada um em três formatos, e as avaliações.
  for (const c of concepts) {
    await addConcept(db, {
      tenantId: input.tenantId,
      topicId: topicByKey.get(c.t)!,
      multipleChoice: c.mc,
      trueFalse: c.tf,
      shortAnswer: { stem: c.sa.stem, groups: c.sa.groups, min: c.sa.min, modelAnswer: c.sa.model },
      explanation: c.sa.model,
    });
  }
  await db.insert(s.assessments).values([
    {
      tenantId: input.tenantId,
      planId,
      kind: 'practice',
      title: 'Simulado de Ciências',
      questionCount: 10,
      createdBy: input.authorId,
    },
    {
      tenantId: input.tenantId,
      planId,
      kind: 'exam',
      title: 'Prova de Ciências',
      questionCount: 10,
      passingScore: '8.0',
      maxAttempts: 1,
      maxRetakes: 2,
      createdBy: input.authorId,
    },
  ]);
  return planId;
}

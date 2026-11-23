import { randomBytes, randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import type { Db, Tx } from '../client';
import type { Stage } from '../labels';
import { linkGuardian, GUARDIAN_POLICY_VERSION } from '../plans';
import { hashPassword } from '../password';
import * as s from '../schema';
import { createStudent, generateJoinCode, simplePassword, SUGGESTED_SUBJECTS } from '../school';
import { seedCienciasPlan } from './seed-ciencias';

// Instituição de exemplo completa, para conhecer o Kids em produção com todos os papéis:
// Fundamental (3º ao 9º ano) e Médio (1ª a 3ª série), uma turma por ano, gestora, quatro
// professores, três alunos por turma, responsáveis (dois autorizados e um pendente por turma)
// e planos em estados diferentes. Todos os nomes são fictícios. As senhas são sorteadas aqui e
// só aparecem no resultado: o banco guarda só o hash. Roda como dono do banco, numa transação.

export type SchoolSeedOptions = {
  name?: string;
  slug?: string;
  /** Domínio dos e-mails da equipe e dos responsáveis. Padrão: <slug>.kids.test (não recebe e-mail). */
  emailDomain?: string;
  schoolYear?: number;
  /** URL pública do Kids, para montar o link dos responsáveis pendentes. */
  appUrl?: string;
};

export type SchoolSeedResult =
  | { status: 'exists'; slug: string }
  | {
      status: 'created';
      tenantId: string;
      name: string;
      staff: { role: string; name: string; email: string; password: string; subjects: string }[];
      classes: {
        name: string;
        joinCode: string;
        students: { name: string; nickname: string; password: string; consent: boolean }[];
      }[];
      pendingGuardians: { student: string; email: string; link: string }[];
      plans: { title: string; grade: string; status: string }[];
    };

const STAFF = [
  { key: 'manager', role: 'manager', name: 'Marina Duarte', local: 'gestora' },
  { key: 'ciencias', role: 'teacher', name: 'Ana Souza', local: 'ana.souza' },
  { key: 'matematica', role: 'teacher', name: 'Carlos Lima', local: 'carlos.lima' },
  { key: 'portugues', role: 'teacher', name: 'Beatriz Rocha', local: 'beatriz.rocha' },
  { key: 'humanas', role: 'teacher', name: 'Rafael Nunes', local: 'rafael.nunes' },
] as const;
type StaffKey = (typeof STAFF)[number]['key'];

// Quem dá cada matéria, por etapa. As outras matérias ficam cadastradas, sem professor.
const TEACHES: Record<Exclude<StaffKey, 'manager'>, Record<Stage, string[]>> = {
  ciencias: { fundamental: ['Ciências'], medio: ['Biologia'] },
  matematica: { fundamental: ['Matemática'], medio: ['Matemática'] },
  portugues: { fundamental: ['Língua Portuguesa'], medio: ['Língua Portuguesa'] },
  humanas: { fundamental: ['História', 'Geografia'], medio: ['História', 'Geografia'] },
};

const CLASSES: { stage: Stage; number: number; name: string }[] = [
  ...[3, 4, 5, 6, 7, 8, 9].map((n) => ({
    stage: 'fundamental' as const,
    number: n,
    name: `${n}º A`,
  })),
  ...[1, 2, 3].map((n) => ({ stage: 'medio' as const, number: n, name: `${n}ª série A` })),
];

// 30 alunos fictícios: três por turma, na ordem das turmas.
const STUDENTS = [
  ['Luna', 'Martins'],
  ['Theo', 'Almeida'],
  ['Alice', 'Ferreira'],
  ['Davi', 'Carvalho'],
  ['Helena', 'Ribeiro'],
  ['Miguel', 'Gomes'],
  ['Laura', 'Barbosa'],
  ['Gael', 'Teixeira'],
  ['Cecília', 'Moreira'],
  ['Bento', 'Cardoso'],
  ['Maria', 'Pires'],
  ['Heitor', 'Lopes'],
  ['Valentina', 'Dias'],
  ['Arthur', 'Castro'],
  ['Lívia', 'Mendes'],
  ['Noah', 'Freitas'],
  ['Manuela', 'Correia'],
  ['Ravi', 'Monteiro'],
  ['Isabela', 'Nogueira'],
  ['Pedro', 'Araújo'],
  ['Sofia', 'Cunha'],
  ['Lucas', 'Pinto'],
  ['Clara', 'Vieira'],
  ['Enzo', 'Rezende'],
  ['Beatriz', 'Farias'],
  ['Joaquim', 'Batista'],
  ['Lara', 'Campos'],
  ['Samuel', 'Duarte'],
  ['Antonella', 'Azevedo'],
  ['Benício', 'Fonseca'],
] as const;

/** Senha da equipe: 16 caracteres aleatórios. A pessoa troca depois, se quiser. */
function staffPassword(): string {
  return randomBytes(12).toString('base64url');
}

function nicknameOf(first: string): string {
  return first.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

async function uniqueJoinCode(tx: Tx): Promise<string> {
  for (;;) {
    const code = generateJoinCode();
    const used = await tx.query.classes.findFirst({ where: eq(s.classes.joinCode, code) });
    if (!used) return code;
  }
}

export async function seedSchool(db: Db, opts: SchoolSeedOptions = {}): Promise<SchoolSeedResult> {
  const name = opts.name ?? 'Colégio Modelo Cognuss Kids';
  const slug = opts.slug ?? 'colegio-modelo';
  const domain = (opts.emailDomain ?? `${slug}.kids.test`).toLowerCase();
  const schoolYear = opts.schoolYear ?? 2027;
  const appUrl = (opts.appUrl ?? '').replace(/\/+$/, '');

  const existing = await db.query.tenants.findFirst({ where: eq(s.tenants.slug, slug) });
  if (existing) return { status: 'exists', slug };

  const staffEmails = STAFF.map((p) => `${p.local}@${domain}`);
  const taken = await db
    .select({ email: s.authUsers.email })
    .from(s.authUsers)
    .where(inArray(s.authUsers.email, staffEmails));
  if (taken.length > 0) {
    throw new Error(`já existe conta com estes e-mails: ${taken.map((t) => t.email).join(', ')}`);
  }

  return db.transaction(async (tx) => {
    const [tenant] = await tx
      .insert(s.tenants)
      .values({ name, slug, city: 'São Paulo', state: 'SP', kind: 'private' })
      .returning();
    const tenantId = tenant!.id;

    // Equipe: conta com senha, e-mail confirmado e vínculo na escola. Gestora e professores
    // ativam o 2FA no primeiro acesso (K-D11).
    const staffIds = {} as Record<StaffKey, string>;
    const staff: Extract<SchoolSeedResult, { status: 'created' }>['staff'] = [];
    for (const p of STAFF) {
      const id = randomUUID();
      const email = `${p.local}@${domain}`;
      const password = staffPassword();
      await tx.insert(s.authUsers).values({ id, name: p.name, email, emailVerified: true });
      await tx.insert(s.authAccounts).values({
        id: randomUUID(),
        accountId: id,
        providerId: 'credential',
        userId: id,
        password: await hashPassword(password),
      });
      await tx.insert(s.memberships).values({ tenantId, userId: id, role: p.role });
      staffIds[p.key] = id;
      const teaches = p.key === 'manager' ? null : TEACHES[p.key];
      staff.push({
        role: p.role === 'manager' ? 'Gestora' : 'Professor(a)',
        name: p.name,
        email,
        password,
        subjects: teaches
          ? [...new Set([...teaches.fundamental, ...teaches.medio])].join(', ')
          : 'toda a escola',
      });
    }
    const managerId = staffIds.manager;

    // Estrutura: as duas etapas, os anos de cada uma (1º e 2º do Fundamental inativos) e as
    // matérias sugeridas pela BNCC.
    const gradeIds = new Map<string, string>();
    for (const stage of ['fundamental', 'medio'] as const) {
      await tx.insert(s.tenantStages).values({ tenantId, stage });
      const numbers = stage === 'fundamental' ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [1, 2, 3];
      for (const number of numbers) {
        const [g] = await tx
          .insert(s.grades)
          .values({ tenantId, stage, number, active: !(stage === 'fundamental' && number < 3) })
          .returning();
        gradeIds.set(`${stage}:${number}`, g!.id);
      }
    }
    const subjectIds = new Map<string, string>();
    const allSubjects = [
      ...new Set([...SUGGESTED_SUBJECTS.fundamental, ...SUGGESTED_SUBJECTS.medio]),
    ];
    for (const subject of allSubjects) {
      const [row] = await tx.insert(s.subjects).values({ tenantId, name: subject }).returning();
      subjectIds.set(subject, row!.id);
    }

    // Turmas, professores por matéria, alunos (login com código da turma) e responsáveis.
    const classes: Extract<SchoolSeedResult, { status: 'created' }>['classes'] = [];
    const pendingGuardians: Extract<SchoolSeedResult, { status: 'created' }>['pendingGuardians'] =
      [];
    let studentIndex = 0;
    for (const c of CLASSES) {
      const joinCode = await uniqueJoinCode(tx);
      const [klass] = await tx
        .insert(s.classes)
        .values({
          tenantId,
          gradeId: gradeIds.get(`${c.stage}:${c.number}`)!,
          name: c.name,
          schoolYear,
          joinCode,
        })
        .returning();
      for (const [key, bySubject] of Object.entries(TEACHES) as [
        Exclude<StaffKey, 'manager'>,
        Record<Stage, string[]>,
      ][]) {
        for (const subject of bySubject[c.stage]) {
          await tx.insert(s.teacherAssignments).values({
            tenantId,
            classId: klass!.id,
            subjectId: subjectIds.get(subject)!,
            userId: staffIds[key],
          });
        }
      }
      const students: Extract<
        SchoolSeedResult,
        { status: 'created' }
      >['classes'][number]['students'] = [];
      for (let i = 0; i < 3; i++) {
        const [first, last] = STUDENTS[studentIndex++]!;
        const nickname = nicknameOf(first);
        const password = simplePassword();
        const studentName = `${first} ${last}`;
        const { userId } = await createStudent(tx, {
          tenantId,
          classId: klass!.id,
          joinCode,
          name: studentName,
          nickname,
          password,
          actorId: managerId,
        });
        const guardianName = `Responsável de ${first}`;
        const guardianEmail = `responsavel.${nickname}@${domain}`;
        // O terceiro aluno de cada turma fica sem autorização: não vê o plano até o
        // responsável aceitar pelo link (RES-03).
        const consent = i < 2;
        if (consent) {
          const [guardian] = await tx
            .insert(s.guardians)
            .values({ tenantId, name: guardianName, email: guardianEmail })
            .returning();
          await tx
            .insert(s.guardianLinks)
            .values({ tenantId, guardianId: guardian!.id, studentUserId: userId });
          await tx.insert(s.guardianConsents).values({
            tenantId,
            guardianId: guardian!.id,
            studentUserId: userId,
            purpose: 'platform',
            policyVersion: GUARDIAN_POLICY_VERSION,
            granted: true,
            source: 'paper',
            note: 'Termo assinado na matrícula (dados de exemplo).',
            recordedBy: managerId,
          });
        } else {
          const { token } = await linkGuardian(tx, {
            tenantId,
            studentUserId: userId,
            name: guardianName,
            email: guardianEmail,
          });
          pendingGuardians.push({
            student: `${studentName} (${c.name})`,
            email: guardianEmail,
            link: `${appUrl}/responsavel/${token}`,
          });
        }
        students.push({ name: studentName, nickname, password, consent });
      }
      classes.push({ name: c.name, joinCode, students });
    }

    // Planos: Ciências do 3º ano publicado (o do piloto, com flashcards, simulado e prova),
    // Matemática do 4º ano em revisão e Português do 6º ano em rascunho.
    const plans: Extract<SchoolSeedResult, { status: 'created' }>['plans'] = [];
    await seedCienciasPlan(tx, {
      tenantId,
      gradeId: gradeIds.get('fundamental:3')!,
      subjectId: subjectIds.get('Ciências')!,
      authorId: staffIds.ciencias,
      reviewerId: managerId,
    });
    plans.push({ title: 'Vertebrados (Ciências)', grade: '3º ano', status: 'publicado' });
    await seedSmallPlan(tx, {
      tenantId,
      gradeId: gradeIds.get('fundamental:4')!,
      subjectId: subjectIds.get('Matemática')!,
      schoolYear,
      authorId: staffIds.matematica,
      status: 'in_review',
      title: 'Frações',
      topics: [
        {
          title: 'O que é uma fração',
          body: 'Uma fração mostra **partes iguais de um inteiro**. Em 3/4, o inteiro foi dividido em 4 partes iguais e pegamos 3.\n\n- O número de baixo é o **denominador**: em quantas partes o inteiro foi dividido.\n- O número de cima é o **numerador**: quantas partes pegamos.',
          cards: [
            ['Em 3/4, qual é o denominador?', '4: o inteiro foi dividido em 4 partes iguais.'],
            ['Em 3/4, qual é o numerador?', '3: pegamos 3 das 4 partes.'],
          ],
        },
        {
          title: 'Frações equivalentes',
          body: 'Frações **equivalentes** representam a mesma quantidade: 1/2 = 2/4 = 4/8. Multiplicando ou dividindo numerador e denominador pelo mesmo número, a fração não muda.',
          cards: [['1/2 é igual a quantos quartos?', '2/4.']],
        },
      ],
    });
    plans.push({ title: 'Frações (Matemática)', grade: '4º ano', status: 'em revisão' });
    await seedSmallPlan(tx, {
      tenantId,
      gradeId: gradeIds.get('fundamental:6')!,
      subjectId: subjectIds.get('Língua Portuguesa')!,
      schoolYear,
      authorId: staffIds.portugues,
      status: 'draft',
      title: 'Substantivos e adjetivos',
      topics: [
        {
          title: 'Substantivo',
          body: '**Substantivo** é a palavra que dá nome a seres, objetos, lugares e sentimentos: *menina*, *mesa*, *Brasil*, *alegria*.',
          cards: [
            [
              'O que é substantivo?',
              'A palavra que dá nome às coisas, pessoas, lugares e sentimentos.',
            ],
          ],
        },
      ],
    });
    plans.push({
      title: 'Substantivos e adjetivos (Português)',
      grade: '6º ano',
      status: 'rascunho',
    });

    await tx.insert(s.auditLogs).values({
      tenantId,
      actorId: null,
      action: 'tenant.seeded',
      entityType: 'tenant',
      entityId: tenantId,
      metadata: { source: 'seed-escola', classes: classes.length, students: studentIndex },
    });

    return { status: 'created', tenantId, name, staff, classes, pendingGuardians, plans };
  });
}

async function seedSmallPlan(
  tx: Tx,
  input: {
    tenantId: string;
    gradeId: string;
    subjectId: string;
    schoolYear: number;
    authorId: string;
    status: 'draft' | 'in_review';
    title: string;
    topics: { title: string; body: string; cards: (readonly [string, string])[] }[];
  },
) {
  const planId = randomUUID();
  await tx.insert(s.studyPlans).values({
    id: planId,
    rootId: planId,
    tenantId: input.tenantId,
    gradeId: input.gradeId,
    subjectId: input.subjectId,
    schoolYear: input.schoolYear,
    title: input.title,
    status: input.status,
    authorId: input.authorId,
  });
  for (const [i, t] of input.topics.entries()) {
    const [topic] = await tx
      .insert(s.planTopics)
      .values({ tenantId: input.tenantId, planId, title: t.title, dayNumber: i + 1, orderIndex: i })
      .returning();
    await tx.insert(s.topicContents).values({
      tenantId: input.tenantId,
      topicId: topic!.id,
      kind: 'text',
      bodyMd: t.body,
      orderIndex: 0,
    });
    await tx.insert(s.flashcards).values(
      t.cards.map(([front, back], k) => ({
        tenantId: input.tenantId,
        topicId: topic!.id,
        front,
        back,
        orderIndex: k,
      })),
    );
  }
  return planId;
}

/** Texto para o terminal: o que foi criado e as senhas (mostradas só agora). */
export function formatSchoolSeed(r: SchoolSeedResult): string {
  if (r.status === 'exists') {
    return `A instituição "${r.slug}" já existe. Nada foi alterado (as senhas não podem ser mostradas de novo).`;
  }
  const out: string[] = [];
  out.push(`Instituição criada: ${r.name}`, '');
  out.push('GUARDE AGORA: as senhas não ficam salvas em lugar nenhum e não aparecem de novo.', '');
  out.push('Equipe (entra com e-mail e senha; ativa o 2FA no primeiro acesso):');
  for (const p of r.staff) {
    out.push(
      `  ${p.role.padEnd(13)} ${p.name.padEnd(15)} ${p.email.padEnd(40)} ${p.password}  [${p.subjects}]`,
    );
  }
  out.push('', 'Turmas e alunos (aba "Código da turma": código, apelido e senha):');
  for (const c of r.classes) {
    out.push(`  ${c.name.padEnd(13)} código ${c.joinCode}`);
    for (const st of c.students) {
      const flag = st.consent ? '' : '  (responsável ainda não autorizou)';
      out.push(
        `      ${st.name.padEnd(22)} apelido ${st.nickname.padEnd(10)} senha ${st.password}${flag}`,
      );
    }
  }
  out.push('', 'Responsáveis pendentes (o link abre a página de autorização; vale 30 dias):');
  for (const g of r.pendingGuardians) out.push(`  ${g.student}: ${g.link}`);
  out.push('', 'Planos:');
  for (const p of r.plans) out.push(`  ${p.title}, ${p.grade}: ${p.status}`);
  return out.join('\n');
}

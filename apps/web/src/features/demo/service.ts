import 'server-only';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isValidCpf } from '@gutta/core';
import { and, eq, hashPassword, schema as s, withUser, type Tx } from '@gutta/db';
import { emit } from '@gutta/jobs';
import { keys } from '@gutta/storage';
import { z } from 'zod';
import { ApiError, conflict } from '@/lib/api';
import type { CurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { audit } from '@/lib/events';
import { requireStorage } from '@/lib/storage';
import { currentTerm, mirrorCatalogDisciplines } from '@/features/academics/service';
import { confirmRoutine } from '@/features/routine/service';
import { finishSignup, savePersonal } from '@/features/signup/service';

/*
  Conta de aluno de teste (QA da v2). O admin informa o e-mail; a conta nasce com o cadastro
  completo e um semestre preenchido: três disciplinas, aulas passadas e futuras, provas, notas,
  faltas, rotina, lembretes e os PDFs de teste (slides e prova anterior) enviados ao bucket e
  processados pelo worker, como num envio de verdade. Tudo fictício e marcado como teste. A
  senha é gerada aqui e mostrada uma vez; não fica no repositório nem no log.
*/

export const DEMO_FILES = {
  cronograma: 'cronograma-fisiologia.pdf',
  slides: 'slides-inflamacao.pdf',
  prova: 'prova-anterior-patologia.pdf',
} as const;

export const demoInput = z.object({
  email: z.email('Informe um e-mail válido.').trim().toLowerCase(),
  name: z.string().trim().min(5, 'Informe nome e sobrenome.').max(120),
  // Vazio: Medicina (ou o primeiro curso ativo), como antes.
  courseId: z
    .union([z.uuid(), z.literal('')])
    .optional()
    .transform((v) => v || null),
});

/** CPF válido gerado ao acaso (não pertence a ninguém de propósito). */
export function randomCpf(): string {
  for (;;) {
    const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
    if (new Set(base).size === 1) continue;
    const dv = (nums: number[]) => {
      const sum = nums.reduce((acc, n, i) => acc + n * (nums.length + 1 - i), 0);
      const r = (sum * 10) % 11;
      return r === 10 ? 0 : r;
    };
    const d1 = dv(base);
    const d2 = dv([...base, d1]);
    const cpf = [...base, d1, d2].join('');
    if (isValidCpf(cpf)) return cpf;
  }
}

/** Senha legível, sem caracteres que se confundem. */
function randomPassword() {
  const abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(16);
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}

const TZ_OFFSET = '-03:00'; // Brasília, sem horário de verão desde 2019.
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const at = (day: Date, hhmm: string) => new Date(`${ymd(day)}T${hhmm}:00${TZ_OFFSET}`);
/** Dias da semana (0 = domingo) entre duas datas, inclusive. */
function weekdaysBetween(from: Date, to: Date, weekdays: number[]) {
  const out: Date[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) if (weekdays.includes(d.getUTCDay())) out.push(d);
  return out;
}

async function readDemoPdf(name: string) {
  // No contêiner (standalone) e no desenvolvimento a pasta public fica em lugares diferentes.
  const candidates = [
    path.join(process.cwd(), 'public', 'teste', name),
    path.join(process.cwd(), 'apps', 'web', 'public', 'teste', name),
  ];
  for (const p of candidates) {
    try {
      return await readFile(p);
    } catch {
      // tenta o próximo
    }
  }
  throw new ApiError(500, 'demo_file_missing', `Arquivo de teste não encontrado: ${name}.`);
}

/** Envia o PDF ao bucket como o aluno e põe na fila do worker (antivírus, texto, miniaturas). */
async function uploadDemoPdf(tx: Tx, userId: string, name: string, title: string) {
  const body = await readDemoPdf(name);
  const [file] = await tx
    .insert(s.files)
    .values({
      ownerId: userId,
      originalName: `${title}.pdf`,
      mime: 'application/pdf',
      sizeBytes: body.length,
      sha256: createHash('sha256').update(body).digest('hex'),
      status: 'scanning',
    })
    .returning();
  await requireStorage().put(keys.original(userId, file!.id), body, 'application/pdf');
  await emit(
    tx,
    'files.process',
    { fileId: file!.id, userId },
    { dedupeKey: `file-${file!.id}-process` },
  );
  return file!.id;
}

export async function createDemoStudent(admin: CurrentUser, raw: unknown) {
  const v = demoInput.parse(raw);
  // O curso é conferido antes de criar a conta: um curso inválido não deixa conta pela metade.
  const course = await withUser(db(), admin.id, async (tx) => {
    if (v.courseId) {
      const chosen = await tx.query.courses.findFirst({
        where: and(eq(s.courses.id, v.courseId), eq(s.courses.active, true)),
      });
      if (!chosen) throw conflict('Curso indisponível. Escolha outro.');
      return chosen;
    }
    return (
      (await tx.query.courses.findFirst({
        where: and(eq(s.courses.slug, 'medicina'), eq(s.courses.active, true)),
      })) ?? (await tx.query.courses.findFirst({ where: eq(s.courses.active, true) }))
    );
  });
  if (!course) throw new ApiError(500, 'demo_no_course', 'Nenhum curso ativo no catálogo.');
  const password = randomPassword();
  const userId = randomUUID();

  // 1) Conta com e-mail já confirmado (é de teste, criada pelo admin).
  await db().transaction(async (tx) => {
    const exists = await tx.query.authUsers.findFirst({ where: eq(s.authUsers.email, v.email) });
    if (exists) throw conflict('Já existe uma conta com esse e-mail. Use outro.');
    await tx
      .insert(s.authUsers)
      .values({ id: userId, email: v.email, name: v.name, emailVerified: true });
    await tx.insert(s.authAccounts).values({
      id: randomUUID(),
      accountId: userId,
      providerId: 'credential',
      userId,
      password: await hashPassword(password),
    });
  });

  // Perfil como o hook do login faz (o papel de aluno é implícito, sem linha de papel).
  await withUser(db(), userId, (tx) =>
    tx
      .insert(s.profiles)
      .values({ userId, displayName: v.name.split(' ')[0]! })
      .onConflictDoNothing({ target: s.profiles.userId }),
  );

  // 2) Cadastro: dados pessoais (CPF e telefone fictícios, termos aceitos) e perfil.
  await savePersonal(userId, {
    fullName: v.name,
    cpf: randomCpf(),
    phone: '(11) 90000-0000',
    terms: 'on',
  });
  await withUser(db(), userId, async (tx) => {
    const institution = await tx.query.institutions.findFirst({
      where: eq(s.institutions.status, 'active'),
    });
    await tx
      .insert(s.studentProfiles)
      .values({
        userId,
        courseId: course.id,
        semester: 3,
        institutionId: institution?.id ?? null,
        institutionOther: institution ? null : 'Instituição fictícia de teste',
        classGroup: 'A',
        mainGoal: 'preparar_provas',
      })
      .onConflictDoNothing({ target: s.studentProfiles.userId });
  });

  // 3) Semestre preenchido.
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00${TZ_OFFSET}`);
  await withUser(db(), userId, async (tx) => {
    const term = await currentTerm(tx, userId);
    await tx
      .update(s.studentTerms)
      .set({
        label: 'Semestre de teste',
        startsOn: ymd(addDays(today, -45)),
        endsOn: ymd(addDays(today, 75)),
      })
      .where(eq(s.studentTerms.id, term.id));

    const discipline = async (
      name: string,
      shortName: string,
      color: number,
      teachers: string[],
    ) => {
      const [d] = await tx
        .insert(s.enrolledDisciplines)
        .values({ ownerId: userId, termId: term.id, name, shortName, color })
        .returning();
      const ids: string[] = [];
      for (const t of teachers) {
        const [row] = await tx
          .insert(s.disciplineTeachers)
          .values({ ownerId: userId, disciplineId: d!.id, name: t })
          .returning();
        ids.push(row!.id);
      }
      return { id: d!.id, teacherIds: ids };
    };

    // Fisiologia: sem cronograma, para testar o envio do PDF de cronograma.
    await discipline('Fisiologia cardiovascular', 'FISIO', 1, [
      'Prof.ª Ana Exemplo',
      'Prof. Bruno Teste',
    ]);

    // Patologia: o semestre andando, com aulas, provas, notas, faltas e materiais.
    const pato = await discipline('Patologia geral', 'PATO', 3, ['Prof.ª Carla Demonstração']);
    const topicNames = [
      'Inflamação aguda',
      'Inflamação crônica',
      'Necrose e apoptose',
      'Reparo tecidual',
    ];
    const topics: string[] = [];
    for (const [i, name] of topicNames.entries()) {
      const [t] = await tx
        .insert(s.disciplineTopics)
        .values({ ownerId: userId, disciplineId: pato.id, name, orderIndex: i })
        .returning();
      topics.push(t!.id);
    }
    const patoDays = weekdaysBetween(addDays(today, -21), addDays(today, 21), [1, 3]); // seg e qua
    const patoLessons: { id: string; day: Date }[] = [];
    for (const [i, day] of patoDays.entries()) {
      const topicIdx = Math.min(Math.floor(i / 3), topics.length - 1);
      const [l] = await tx
        .insert(s.lessons)
        .values({
          ownerId: userId,
          disciplineId: pato.id,
          title: `${topicNames[topicIdx]} (aula ${i + 1})`,
          startsAt: at(day, '10:00'),
          endsAt: at(day, '11:40'),
          topicId: topics[topicIdx],
          teacherId: pato.teacherIds[0],
          location: 'Sala 102',
          classHours: '2',
        })
        .returning();
      patoLessons.push({ id: l!.id, day });
    }
    const past = patoLessons.filter((l) => l.day < today);
    // Duas aulas concluídas e duas faltas registradas.
    for (const l of past.slice(0, 2))
      await tx.insert(s.lessonProgress).values({
        ownerId: userId,
        lessonId: l.id,
        attended: true,
        overallDifficulty: 'moderada',
        understoodGoals: true,
        concludedAt: at(l.day, '12:00'),
      });
    await tx.insert(s.attendanceRules).values({
      ownerId: userId,
      disciplineId: pato.id,
      totalClassHours: '60',
      minAttendancePct: '75',
      classHoursPerMeeting: '2',
      weekdays: [1, 3],
    });
    for (const l of past.slice(2, 4))
      await tx.insert(s.absences).values({
        ownerId: userId,
        disciplineId: pato.id,
        lessonId: l.id,
        date: ymd(l.day),
        classHours: '2',
      });
    await tx
      .insert(s.gradingSchemes)
      .values({ ownerId: userId, disciplineId: pato.id, method: 'pesos', minGrade: '7' });
    await tx.insert(s.assessments).values([
      {
        ownerId: userId,
        disciplineId: pato.id,
        kind: 'prova',
        name: 'P1',
        dueAt: at(addDays(today, -14), '10:00'),
        weight: '4',
        grade: '6.5',
        topicNote: 'Inflamação aguda e crônica',
      },
      {
        ownerId: userId,
        disciplineId: pato.id,
        kind: 'entrega',
        name: 'Seminário em grupo',
        dueAt: at(addDays(today, 10), '10:00'),
        weight: '2',
      },
      {
        ownerId: userId,
        disciplineId: pato.id,
        kind: 'prova',
        name: 'P2',
        dueAt: at(addDays(today, 21), '10:00'),
        weight: '4',
        topicNote: 'Necrose, apoptose e reparo',
      },
    ]);

    // Materiais: os PDFs de teste vão ao bucket e o worker processa como num envio real.
    const slidesFile = await uploadDemoPdf(tx, userId, DEMO_FILES.slides, 'Slides de inflamação');
    const provaFile = await uploadDemoPdf(
      tx,
      userId,
      DEMO_FILES.prova,
      'Prova anterior de Patologia',
    );
    const material = async (
      fileId: string,
      title: string,
      type: 'estudo' | 'prova',
      lessonId: string | null,
      topicId: string | null,
    ) => {
      const [m] = await tx
        .insert(s.materials)
        .values({ ownerId: userId, title, type, origin: 'professor', termId: term.id })
        .returning();
      await tx
        .insert(s.materialVersions)
        .values({ ownerId: userId, materialId: m!.id, fileId, version: 1 });
      await tx.insert(s.materialLinks).values({
        ownerId: userId,
        materialId: m!.id,
        disciplineId: pato.id,
        lessonId,
        topicId,
        teacherId: pato.teacherIds[0],
      });
    };
    await material(
      slidesFile,
      'Slides: Inflamação aguda e crônica',
      'estudo',
      past[0]?.id ?? null,
      topics[0]!,
    );
    await material(provaFile, 'Prova anterior: P1 de 2025/2', 'prova', null, null);

    // Farmacologia: aulas às sextas e uma lista para entregar.
    const farma = await discipline('Farmacologia básica', 'FARMA', 5, ['Prof. Davi Fictício']);
    for (const [i, day] of weekdaysBetween(addDays(today, -14), addDays(today, 28), [5]).entries())
      await tx.insert(s.lessons).values({
        ownerId: userId,
        disciplineId: farma.id,
        title: `Farmacocinética (aula ${i + 1})`,
        startsAt: at(day, '14:00'),
        endsAt: at(day, '15:40'),
        teacherId: farma.teacherIds[0],
        location: 'Laboratório 2',
        classHours: '2',
      });
    await tx.insert(s.assessments).values({
      ownerId: userId,
      disciplineId: farma.id,
      kind: 'entrega',
      name: 'Lista de exercícios 1',
      dueAt: at(addDays(today, 5), '23:59'),
    });

    // Rotina: sono, almoço, academia (horário protegido) e um horário de estudo.
    await tx.insert(s.routineBlocks).values([
      {
        ownerId: userId,
        kind: 'pessoal',
        category: 'sono',
        label: 'Sono',
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        startMinute: 23 * 60,
        durationMinutes: 8 * 60,
      },
      {
        ownerId: userId,
        kind: 'pessoal',
        category: 'refeicao',
        label: 'Almoço',
        weekdays: [1, 2, 3, 4, 5],
        startMinute: 12 * 60,
        durationMinutes: 60,
      },
      {
        ownerId: userId,
        kind: 'pessoal',
        category: 'academia',
        label: 'Academia',
        weekdays: [2, 4],
        startMinute: 18 * 60,
        durationMinutes: 90,
      },
      {
        ownerId: userId,
        kind: 'estudo',
        label: 'Estudo em casa',
        weekdays: [1, 2, 3, 4],
        startMinute: 19 * 60 + 30,
        durationMinutes: 90,
      },
    ]);
    await confirmRoutine(tx, userId);

    // Lembretes e um compromisso.
    await tx.insert(s.reminders).values([
      {
        ownerId: userId,
        title: 'Entregar relatório do laboratório',
        category: 'tarefa',
        disciplineId: pato.id,
        dueAt: at(addDays(today, 2), '18:00'),
      },
      {
        ownerId: userId,
        title: 'Comprar jaleco novo',
        category: 'outro',
        dueAt: at(addDays(today, 1), '09:00'),
      },
    ]);
    await tx.insert(s.calendarEvents).values({
      ownerId: userId,
      kind: 'compromisso',
      title: 'Consulta no dentista',
      startDate: ymd(addDays(today, 4)),
      startMinute: 15 * 60,
      durationMinutes: 60,
    });
  });

  // 4) Cadastro concluído.
  await finishSignup(userId);
  // 5) As disciplinas do catálogo do curso que já têm módulo publicado entram no semestre,
  // ligadas ao conteúdo (ADR 0026): a conta de teste já mostra as aulas na disciplina.
  await withUser(db(), userId, async (tx) => {
    const withModules = await tx
      .selectDistinct({ id: s.disciplines.id })
      .from(s.disciplines)
      .innerJoin(s.modules, eq(s.modules.disciplineId, s.disciplines.id))
      .where(
        and(
          eq(s.disciplines.courseId, course.id),
          eq(s.disciplines.active, true),
          eq(s.modules.status, 'published'),
        ),
      );
    await mirrorCatalogDisciplines(
      tx,
      userId,
      withModules.map((d) => d.id),
    );
  });

  // 6) Registro na auditoria (sem a senha).
  await withUser(db(), admin.id, (tx) =>
    audit(
      tx,
      admin.id,
      'demo.student_created',
      { type: 'user', id: userId },
      { email: v.email, course: course.slug },
    ),
  );
  return { email: v.email, password, userId };
}

/** Endereços fixos dos PDFs de teste (pasta public/teste do app). */
export const DEMO_DOWNLOADS = Object.values(DEMO_FILES).map((f) => `/teste/${f}`);

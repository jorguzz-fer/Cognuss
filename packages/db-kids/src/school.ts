import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { Tx } from './client';
import type { Stage } from './labels';
import { hashPassword } from './password';
import * as s from './schema';

// Regras da Fase 1 (SPEC Kids: EST-05, EST-06, USR-01 a USR-03, USR-07).

// Sem 0/o, 1/l/i: o código é lido em voz alta e digitado por criança.
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** Código de entrada da turma: 6 caracteres, único na plataforma (índice no banco). */
export function generateJoinCode(): string {
  let out = '';
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

/**
 * Apelido do aluno para o login sem e-mail (K-D07): minúsculas, sem acento, só letras e
 * números, de 3 a 20 caracteres. Devolve null se não der para formar um apelido válido.
 */
export function normalizeNickname(raw: string): string | null {
  const n = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return n.length >= 3 && n.length <= 20 ? n : null;
}

/** Usuário de login do aluno: "<código da turma>.<apelido>". */
export function studentUsername(joinCode: string, nickname: string): string {
  return `${joinCode}.${nickname}`;
}

/**
 * E-mail técnico do aluno sem e-mail. O Better Auth exige e-mail; o domínio .invalid
 * (RFC 2606) garante que nada é enviado para ele.
 */
export function studentPlaceholderEmail(username: string): string {
  return `${username}@aluno.kids.invalid`;
}

export function isPlaceholderEmail(email: string): boolean {
  return email.endsWith('@aluno.kids.invalid');
}

const WORDS = [
  'gato',
  'sol',
  'lua',
  'rio',
  'mar',
  'flor',
  'pato',
  'bola',
  'nuvem',
  'peixe',
  'sapo',
  'livro',
  'folha',
  'pipa',
  'trem',
  'onda',
  'cacau',
  'manga',
  'tatu',
  'arara',
];
const COLORS = ['azul', 'verde', 'roxo', 'rosa', 'preto', 'branco', 'cinza', 'dourado'];

/** Senha simples para criança (Fundamental I): "gato-azul-42". Mostrada uma vez ao adulto. */
export function simplePassword(): string {
  return `${WORDS[randomInt(WORDS.length)]}-${COLORS[randomInt(COLORS.length)]}-${randomInt(10, 100)}`;
}

/** Token de convite: o link leva o token; o banco guarda só o hash. */
export function newInviteToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Lista sugerida a partir das áreas da BNCC (EST-06 [ENG]). A escola edita à vontade.
export const SUGGESTED_SUBJECTS: Record<Stage, readonly string[]> = {
  fundamental: [
    'Língua Portuguesa',
    'Matemática',
    'Ciências',
    'História',
    'Geografia',
    'Arte',
    'Educação Física',
    'Língua Inglesa',
    'Ensino Religioso',
  ],
  medio: [
    'Língua Portuguesa',
    'Matemática',
    'Biologia',
    'Física',
    'Química',
    'História',
    'Geografia',
    'Filosofia',
    'Sociologia',
    'Arte',
    'Educação Física',
    'Língua Inglesa',
  ],
};

export class NicknameTakenError extends Error {
  constructor() {
    super('apelido já usado nesta turma');
    this.name = 'NicknameTakenError';
  }
}

/**
 * Cria o aluno da turma (USR-02, USR-03): conta sem e-mail, senha simples, vínculo de aluno
 * e matrícula na turma. Roda dentro de withTenantUser como gestor: o RLS confere o papel em
 * memberships e class_members; as tabelas auth_* não têm RLS (ADR 0003).
 */
export async function createStudent(
  tx: Tx,
  input: {
    tenantId: string;
    classId: string;
    joinCode: string;
    name: string;
    nickname: string;
    password: string;
    actorId: string;
  },
): Promise<{ userId: string; username: string }> {
  const username = studentUsername(input.joinCode, input.nickname);
  const taken = await tx.execute<{ n: number }>(
    sql`select count(*)::int as n from auth_users where username = ${username}`,
  );
  if (taken.rows[0]!.n > 0) throw new NicknameTakenError();
  const userId = randomUUID();
  await tx.insert(s.authUsers).values({
    id: userId,
    name: input.name.trim(),
    email: studentPlaceholderEmail(username),
    emailVerified: true,
    username,
    displayUsername: username,
  });
  await tx.insert(s.authAccounts).values({
    id: randomUUID(),
    accountId: userId,
    providerId: 'credential',
    userId,
    password: await hashPassword(input.password),
  });
  await tx.insert(s.memberships).values({
    tenantId: input.tenantId,
    userId,
    role: 'student',
    invitedBy: input.actorId,
  });
  await tx.insert(s.classMembers).values({
    tenantId: input.tenantId,
    classId: input.classId,
    userId,
  });
  await tx.insert(s.auditLogs).values({
    tenantId: input.tenantId,
    actorId: input.actorId,
    action: 'student.created',
    entityType: 'user',
    entityId: userId,
    metadata: { classId: input.classId },
  });
  return { userId, username };
}

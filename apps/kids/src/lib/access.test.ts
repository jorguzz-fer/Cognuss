import { describe, expect, it } from 'vitest';
import { homeFor, needsTwoFactor, resolveActiveTenant, rolesIn, safeNext } from './access';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const m = (tenantId: string, role: 'manager' | 'teacher' | 'student') => ({
  tenantId,
  tenantName: tenantId === A ? 'Escola A' : 'Escola B',
  role,
});

describe('instituição ativa', () => {
  it('usa o cookie só se o usuário for membro', () => {
    expect(resolveActiveTenant(B, [m(A, 'teacher'), m(B, 'teacher')])).toBe(B);
    expect(resolveActiveTenant(B, [m(A, 'teacher')])).toBe(A);
  });

  it('com uma escola só, escolhe sozinha; com várias e sem cookie, pede para escolher', () => {
    expect(resolveActiveTenant(undefined, [m(A, 'student')])).toBe(A);
    expect(resolveActiveTenant(undefined, [m(A, 'teacher'), m(B, 'manager')])).toBeNull();
    expect(resolveActiveTenant('lixo', [m(A, 'teacher'), m(B, 'manager')])).toBeNull();
    expect(resolveActiveTenant(undefined, [])).toBeNull();
  });

  it('papéis só da escola ativa', () => {
    expect(rolesIn(A, [m(A, 'teacher'), m(A, 'manager'), m(B, 'student')])).toEqual([
      'teacher',
      'manager',
    ]);
  });
});

describe('regras de acesso', () => {
  it('2FA para gestor, professor e Super Admin; aluno não', () => {
    expect(needsTwoFactor(['manager'], false)).toBe(true);
    expect(needsTwoFactor(['teacher', 'student'], false)).toBe(true);
    expect(needsTwoFactor(['student'], false)).toBe(false);
    expect(needsTwoFactor([], true)).toBe(true);
  });

  it('primeira tela pelo papel mais alto', () => {
    expect(homeFor(['student', 'manager'])).toBe('/escola');
    expect(homeFor(['teacher'])).toBe('/professor');
    expect(homeFor(['student'])).toBe('/estudar');
  });

  it('next só aceita caminho interno', () => {
    expect(safeNext('/escola')).toBe('/escola');
    expect(safeNext('//mal.com')).toBe('/inicio');
    expect(safeNext('https://mal.com')).toBe('/inicio');
    expect(safeNext('/\\mal.com')).toBe('/inicio');
  });
});

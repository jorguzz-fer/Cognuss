import { describe, expect, it } from 'vitest';
import {
  formatPortfolioHours,
  parseHours,
  sameHolder,
  summarizeHours,
  validPortfolioDates,
} from './portfolio';

describe('carga horária', () => {
  it('lê as formas comuns dos certificados', () => {
    expect(parseHours(20)).toBe(1200);
    expect(parseHours(1.5)).toBe(90);
    expect(parseHours('20h')).toBe(1200);
    expect(parseHours('4 horas')).toBe(240);
    expect(parseHours('12,5')).toBe(750);
    expect(parseHours('2h30')).toBe(150);
    expect(parseHours('2 horas e 30 minutos')).toBe(150);
    expect(parseHours('90 min')).toBe(90);
  });

  it('recusa o que não é carga horária ou é grande demais', () => {
    expect(parseHours('')).toBeNull();
    expect(parseHours(null)).toBeNull();
    expect(parseHours('vinte horas')).toBeNull();
    expect(parseHours(-3)).toBeNull();
    expect(parseHours(5000)).toBeNull();
  });

  it('mostra horas e minutos', () => {
    expect(formatPortfolioHours(0)).toBe('0 h');
    expect(formatPortfolioHours(45)).toBe('45 min');
    expect(formatPortfolioHours(120)).toBe('2 h');
    expect(formatPortfolioHours(270)).toBe('4 h 30 min');
  });
});

describe('resumo de horas', () => {
  it('soma só o que o aluno conferiu, por tipo e por pasta', () => {
    const s = summarizeHours([
      { kind: 'horas_complementares', folderId: 'a', minutes: 600, confirmed: true },
      { kind: 'evento', folderId: 'a', minutes: 240, confirmed: true },
      { kind: 'evento', folderId: null, minutes: 120, confirmed: true },
      { kind: 'curso', folderId: 'b', minutes: 900, confirmed: false },
      { kind: 'artigo', folderId: null, minutes: null, confirmed: true },
    ]);
    expect(s.totalMinutes).toBe(960);
    expect(s.byKind).toEqual({ horas_complementares: 600, evento: 360, artigo: 0 });
    expect(s.byFolder).toEqual({ a: 840, '': 120 });
    expect(s.confirmedItems).toBe(4);
    expect(s.pendingItems).toBe(1);
  });
});

describe('datas e nome', () => {
  it('confere as datas', () => {
    expect(validPortfolioDates('2026-03-10', '2026-03-12')).toBeNull();
    expect(validPortfolioDates('2026-03-12', '2026-03-10')).toMatch(/antes do início/);
    expect(validPortfolioDates('2026-13-01', null)).toMatch(/início inválida/);
  });

  it('nome do certificado contra o do cadastro, sem acento e sem ordem exata', () => {
    expect(sameHolder('MARIA EDUARDA DOS SANTOS', 'Maria Eduarda Santos')).toBe(true);
    expect(sameHolder('Maria Eduarda Santos', 'Joao Pedro Lima')).toBe(false);
    expect(sameHolder('Lúcia Araújo', 'Lucia Araujo')).toBe(true);
    expect(sameHolder(null, 'Lucia')).toBeNull();
  });
});

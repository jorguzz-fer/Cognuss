import { describe, expect, it } from 'vitest';
import { embedUrl, parseContent } from './plan-content';

describe('conteúdo do tópico (CON-01)', () => {
  it('tabela: títulos na primeira linha, separador de Markdown ignorado', () => {
    expect(
      parseContent(
        'table',
        '| Grupo | Respira por |\n|---|---|\n| Peixes | Brânquias |\nAves | Pulmões',
      ),
    ).toEqual({
      data: {
        columns: ['Grupo', 'Respira por'],
        rows: [
          ['Peixes', 'Brânquias'],
          ['Aves', 'Pulmões'],
        ],
      },
    });
    expect(parseContent('table', 'só uma coluna\nlinha')).toBeNull();
  });

  it('linha do tempo: uma etapa por linha, numeração tirada', () => {
    expect(parseContent('timeline', '1. Ovos\n2) Girino\nAdulto')).toEqual({
      data: { steps: ['Ovos', 'Girino', 'Adulto'] },
    });
    expect(parseContent('timeline', 'uma só')).toBeNull();
  });

  it('vídeo só com https; YouTube e Vimeo incorporados', () => {
    expect(parseContent('video', 'http://x.com/v')).toBeNull();
    expect(parseContent('video', 'https://youtu.be/abc')).toEqual({ url: 'https://youtu.be/abc' });
    expect(embedUrl('https://www.youtube.com/watch?v=abc')).toBe(
      'https://www.youtube-nocookie.com/embed/abc',
    );
    expect(embedUrl('https://vimeo.com/123')).toBe('https://player.vimeo.com/video/123');
    expect(embedUrl('https://exemplo.com/video')).toBeNull();
  });
});

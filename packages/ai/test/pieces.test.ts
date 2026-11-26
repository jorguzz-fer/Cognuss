import type Anthropic from '@anthropic-ai/sdk';
import { PIECE_KIT_API, type PieceBlocks } from '@gutta/core';
import { describe, expect, it } from 'vitest';
import {
  AnthropicPieceCritic,
  AnthropicPieceWriter,
  FakePieceCritic,
  FakePieceWriter,
  PIECE_RULES,
  readPieceAnswer,
  type PieceWriteInput,
} from '../src/pieces';

// Escritor e crítico das peças (ADR 0022): blocos de texto em vez de JSON, correção por
// trechos com as capturas, e o crítico visual. Sem rede: um cliente falso grava a chamada.

const input: PieceWriteInput = {
  discipline: 'Farmacologia',
  lesson: 'Aula 1',
  bibliography: null,
  pieceType: 'simulator',
  title: 'A meia-vida dita quando o fármaco some',
  instruction: 'Montar um simulador de meia-vida.',
  plan: null,
  slides: [{ number: 3, text: 'Meia-vida', image: null }],
};

const prev: PieceBlocks = {
  title: 'Título',
  style: '',
  body: '<p>um</p>',
  script: 'const x=1;\ndraw();',
};

type Call = Record<string, unknown>;
function stubClient(text: string, opts: { stop?: string } = {}) {
  const calls: Call[] = [];
  const message = {
    model: 'claude-opus-5-5',
    stop_reason: opts.stop ?? 'end_turn',
    content: [{ type: 'text', text }],
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 80,
      cache_creation_input_tokens: 0,
    },
  };
  const client = {
    beta: {
      messages: {
        stream: (p: Call) => {
          calls.push(p);
          return { finalMessage: async () => message };
        },
        parse: async (p: Call) => {
          calls.push(p);
          return { ...message, parsed_output: JSON.parse(text) };
        },
      },
    },
  } as unknown as Anthropic;
  return { client, calls };
}

describe('resposta do escritor', () => {
  it('lê a peça inteira em blocos, ignorando texto antes do primeiro bloco', () => {
    const r = readPieceAnswer(
      'Aqui está:\n@@TITLE\nT\n@@STYLE\n.a{}\n@@BODY\n<p>x</p>\n@@SCRIPT\nf();',
      null,
    );
    expect(r.mode).toBe('full');
    expect(r.blocks).toMatchObject({ title: 'T', style: '.a{}', body: '<p>x</p>', script: 'f();' });
  });

  it('ignora a cerca de código em volta da peça', () => {
    const r = readPieceAnswer(
      '```\n@@TITLE\nT\n@@STYLE\n\n@@BODY\n<p>x</p>\n@@SCRIPT\nf();\n```',
      null,
    );
    expect(r.blocks.script.trim()).toBe('f();');
  });

  it('na correção, aplica as trocas sobre a versão anterior', () => {
    const r = readPieceAnswer(
      '@@EDIT script\n@@FIND\nconst x=1;\n@@REPLACE\nconst x=2;\n@@END',
      prev,
    );
    expect(r.mode).toBe('edits');
    expect(r.blocks.script).toBe('const x=2;\ndraw();');
    expect(r.editFailures).toEqual([]);
  });

  it('na correção sem trocas nem peça, mantém a anterior e avisa', () => {
    const r = readPieceAnswer('Não sei corrigir.', prev);
    expect(r.blocks).toEqual(prev);
    expect(r.editFailures[0]).toMatch(/não trouxe trocas/);
  });
});

describe('AnthropicPieceWriter', () => {
  it('pede blocos de texto (sem formato JSON), com as regras e o kit em cache', async () => {
    const { client, calls } = stubClient('@@TITLE\nT\n@@STYLE\n\n@@BODY\n<p></p>\n@@SCRIPT\n');
    const r = await new AnthropicPieceWriter(client).write(input);
    expect(r.mode).toBe('full');
    expect(r.refused).toBe(false);
    const call = calls[0]!;
    expect(call.output_config).toEqual({ effort: 'medium' });
    const system = call.system as { text: string; cache_control?: unknown }[];
    expect(system[0]!.text).toBe(PIECE_RULES);
    expect(system[0]!.cache_control).toEqual({ type: 'ephemeral' });
    expect(PIECE_RULES).toContain(PIECE_KIT_API);
  });

  it('na correção, manda os problemas, a versão anterior e as capturas', async () => {
    const { client, calls } = stubClient(
      '@@EDIT body\n@@FIND\n<p>um</p>\n@@REPLACE\n<p>dois</p>\n@@END',
    );
    const r = await new AnthropicPieceWriter(client).write({
      ...input,
      fix: {
        previous: prev,
        problems: ['Texto sobreposto (tema claro): "a" e "b".'],
        shots: [{ name: 'claro', image: Buffer.from('jpg') }],
      },
    });
    expect(r.mode).toBe('edits');
    expect(r.blocks.body).toBe('<p>dois</p>');
    const content = (calls[0]!.messages as { content: { type: string; text?: string }[] }[])[0]!
      .content;
    const text = content.map((c) => c.text ?? '').join('\n');
    expect(text).toContain('Texto sobreposto (tema claro)');
    expect(text).toContain('<versao_anterior>');
    expect(text).toContain('Captura da versão anterior: claro');
    expect(content.filter((c) => c.type === 'image')).toHaveLength(1);
    // Na correção não vai a peça de exemplo.
    expect(text).not.toContain('<exemplo>');
  });

  it('resposta cortada no limite vira problema para a próxima tentativa', async () => {
    const { client } = stubClient('@@TITLE\nT\n@@STYLE\n\n@@BODY\n<p>', { stop: 'max_tokens' });
    const r = await new AnthropicPieceWriter(client).write(input);
    expect(r.editFailures?.join(' ')).toMatch(/cortada no limite/);
  });
});

describe('FakePieceWriter', () => {
  it('quebra e corrige por troca pontual', async () => {
    const w = new FakePieceWriter(1);
    const first = await w.write(input);
    expect(first.blocks.script.startsWith('naoExiste();')).toBe(true);
    const fixed = await w.write({ ...input, fix: { previous: first.blocks, problems: ['x'] } });
    expect(fixed.mode).toBe('edits');
    expect(fixed.blocks.script.startsWith('naoExiste();')).toBe(false);
  });
});

describe('crítico visual', () => {
  it('manda as capturas e devolve os problemas', async () => {
    const { client, calls } = stubClient(
      JSON.stringify({ problems: ['Rótulo cortado no eixo x.'] }),
    );
    const r = await new AnthropicPieceCritic(client).review({
      title: 'T',
      pieceType: 'simulator',
      plan: null,
      shots: [
        { name: 'claro', image: Buffer.from('a') },
        { name: 'escuro', image: Buffer.from('b') },
      ],
    });
    expect(r.problems).toEqual(['Rótulo cortado no eixo x.']);
    const call = calls[0]!;
    expect(call.model).toBe('claude-sonnet-5-5');
    const content = (call.messages as { content: { type: string }[] }[])[0]!.content;
    expect(content.filter((c) => c.type === 'image')).toHaveLength(2);
  });

  it('o crítico de teste devolve uma lista por chamada', async () => {
    const c = new FakePieceCritic([['a'], []]);
    const base = { title: 'T', pieceType: 'simulator' as const, plan: null, shots: [] };
    expect((await c.review(base)).problems).toEqual(['a']);
    expect((await c.review(base)).problems).toEqual([]);
    expect((await c.review(base)).problems).toEqual([]);
  });
});

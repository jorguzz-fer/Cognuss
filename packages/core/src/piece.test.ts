import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyPieceEdits,
  assemblePiece,
  isFullPieceSource,
  lintErrors,
  lintPiece,
  parsePieceEdits,
  parsePieceSource,
  pieceAssetUrl,
  type PieceBlocks,
} from './piece';
import { PIECE_3D_PATH, PIECE_KIT_JS } from './piece-kit';
import { PIECE_FONT_CSS } from './piece-fonts';

// As peças aprovadas do piloto (docs/producao/referencias) são o padrão: o linter não pode
// reprovar nenhuma delas.
const ROOT = new URL('../../../docs/producao/referencias/', import.meta.url);
function referencePieces() {
  const out: { aula: string; slug: string; blocks: PieceBlocks }[] = [];
  for (const aula of ['aula-1', 'aula-2']) {
    const dir = new URL(`${aula}/fontes/src/`, ROOT);
    for (const f of readdirSync(dir).sort()) {
      if (f === 'indice.html') continue;
      out.push({
        aula,
        slug: f.replace(/\.html$/, ''),
        blocks: parsePieceSource(readFileSync(new URL(f, dir), 'utf8')),
      });
    }
  }
  return out;
}

const ctx = {
  crumb: 'Fisiologia endócrina · Aula 2 · Eixo somatotrófico',
  foot: 'Base: Aires, <i>Fisiologia</i>, 5ª ed.',
  demo: true,
};

describe('peças de referência do piloto', () => {
  const pieces = referencePieces();

  it('lê os blocos das 18 peças aprovadas', () => {
    expect(pieces).toHaveLength(18);
    for (const p of pieces) {
      expect(p.blocks.title, p.slug).not.toBe('');
      expect(p.blocks.body, p.slug).toContain('<h1');
    }
  });

  it('nenhuma peça aprovada é reprovada pelo linter', () => {
    for (const p of pieces)
      expect(lintErrors(lintPiece(p.blocks)), `${p.aula}/${p.slug}`).toEqual([]);
  });
});

describe('montagem', () => {
  const blocks = parsePieceSource(
    readFileSync(new URL('aula-2/fontes/src/pulso.html', ROOT), 'utf8'),
  );

  it('monta com a base do piloto, fontes embutidas e o selo vindo do banco', () => {
    const html = assemblePiece(blocks, { ...ctx, fontCss: PIECE_FONT_CSS });
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('<title>O pulso do GH em 24 horas</title>');
    expect(html).toContain('Demonstração · sem revisão');
    expect(html).toContain('font-family:"Archivo Black"');
    expect(html).toContain('Fisiologia endócrina · Aula 2 · Eixo somatotrófico');
    expect(html).toContain('Base: Aires');
    expect(html).not.toMatch(/https?:\/\/fonts\./);
  });

  it('sem selo depois da revisão, e com tema fixo para a prévia', () => {
    const html = assemblePiece(blocks, { ...ctx, demo: false, theme: 'dark' });
    expect(html).not.toContain('Demonstração · sem revisão');
    expect(html).toContain('<html lang="pt-BR" data-theme="dark">');
  });

  it('escapa o título e a trilha', () => {
    const html = assemblePiece({ ...blocks, title: 'A < B & "C"' }, { ...ctx, crumb: '<b>x</b>' });
    expect(html).toContain('<title>A &lt; B &amp; &quot;C&quot;</title>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});

describe('linter', () => {
  const ok: PieceBlocks = {
    title: 'Teste',
    style: '',
    body: '<div class="eyebrow">Peça</div><h1>T</h1><p class="lead">L</p><svg aria-label="cena"></svg><p>Para fixar</p><p>Na prova</p>',
    script: 'const a = 1;',
  };
  const rules = (b: PieceBlocks) => lintErrors(lintPiece(b)).map((i) => i.rule);

  it('aceita a estrutura mínima', () => {
    expect(rules(ok)).toEqual([]);
  });

  it('cobra os quatro blocos e a cena', () => {
    expect(rules({ ...ok, body: '<p>só texto</p>' }).sort()).toEqual(
      ['closing', 'closing', 'opening', 'opening', 'opening', 'stage'].sort(),
    );
  });

  it('recusa recurso de fora, rede, armazenamento e código perigoso', () => {
    expect(rules({ ...ok, body: ok.body + '<img src="https://x.com/a.png">' })).toContain(
      'external-resource',
    );
    expect(rules({ ...ok, style: '@import url(https://x.com/a.css);' })).toContain('external-css');
    expect(rules({ ...ok, body: ok.body + '<iframe></iframe>' })).toContain('embedded-document');
    expect(rules({ ...ok, script: 'fetch("/api")' })).toContain('network');
    expect(rules({ ...ok, script: 'localStorage.x=1' })).toContain('storage');
    expect(rules({ ...ok, script: 'eval("1")' })).toContain('unsafe-code');
    expect(rules({ ...ok, script: 'parent.location="x"' })).toContain('unsafe-code');
    expect(rules({ ...ok, body: ok.body + '<script>1</script>' })).toContain('inline-script');
  });

  it('acha erro de sintaxe no script', () => {
    expect(rules({ ...ok, script: 'const = ;' })).toContain('syntax');
  });

  it('recusa peça grande demais', () => {
    expect(rules({ ...ok, script: `const s="${'x'.repeat(160_000)}";` })).toContain('size');
  });
});

describe('kit de peças (ADR 0022)', () => {
  const blocks: PieceBlocks = {
    title: 'Peça',
    style: '',
    body: '<section><div class="eyebrow">Peça interativa</div><h1>Peça</h1><p class="lead">Lead.</p></section><div id="cena" role="img" aria-label="cena"></div><div class="card explain">Para fixar<div class="exam">Na prova</div></div>',
    script: "kit.view3d('#cena').then(()=>{});",
  };

  it('a montagem traz o kit, o CSS do kit e o endereço do módulo 3D', () => {
    const html = assemblePiece(blocks, { ...ctx, assetBase: 'https://app.cognuss.com.br/' });
    expect(html).toContain('window.kit=kit');
    expect(html).toContain('.status.ok');
    expect(html).toContain(
      `window.__PIECE_3D__=${JSON.stringify('https://app.cognuss.com.br' + PIECE_3D_PATH)}`,
    );
    // O kit vem antes do script da peça, que já pode usá-lo.
    expect(html.indexOf('window.kit=kit')).toBeLessThan(html.indexOf("kit.view3d('#cena')"));
  });

  it('sem origem válida, o módulo 3D usa o caminho relativo', () => {
    expect(pieceAssetUrl(undefined)).toBe(PIECE_3D_PATH);
    expect(pieceAssetUrl('javascript:alert(1)')).toBe(PIECE_3D_PATH);
    expect(pieceAssetUrl('http://localhost:3000')).toBe('http://localhost:3000' + PIECE_3D_PATH);
  });

  it('o script do kit compila e não tem crase nem interpolação', () => {
    expect(() => new Function(PIECE_KIT_JS)).not.toThrow();
    expect(PIECE_KIT_JS).not.toMatch(/`|\$\{/);
  });

  it('a cena do kit conta como cena para o linter', () => {
    expect(lintErrors(lintPiece(blocks)).map((i) => i.rule)).not.toContain('stage');
    expect(
      lintErrors(lintPiece({ ...blocks, script: 'kit.chart("#g",{x:[0,1],y:[0,1]}).draw();' })).map(
        (i) => i.rule,
      ),
    ).not.toContain('stage');
  });

  it('a peça continua sem poder importar nada por conta própria', () => {
    const issues = lintErrors(lintPiece({ ...blocks, script: "import('https://x.y/z.js')" }));
    expect(issues.map((i) => i.rule)).toContain('network');
  });
});

describe('correção por trecho (ADR 0022)', () => {
  const prev: PieceBlocks = {
    title: 'Título',
    style: '.a{color:red}',
    body: '<p>um</p>\n<p>dois</p>',
    script: 'const x=1;\nconst y=2;\nconst y2=2;',
  };

  it('lê e aplica as trocas', () => {
    const text = `Vou corrigir.
@@EDIT script
@@FIND
const x=1;
@@REPLACE
const x=10;
@@END
@@EDIT body
@@FIND
<p>dois</p>
@@REPLACE
<p>dois e meio</p>
@@END`;
    const edits = parsePieceEdits(text);
    expect(edits).toHaveLength(2);
    const r = applyPieceEdits(prev, edits);
    expect(r.failed).toEqual([]);
    expect(r.blocks.script).toBe('const x=10;\nconst y=2;\nconst y2=2;');
    expect(r.blocks.body).toBe('<p>um</p>\n<p>dois e meio</p>');
    expect(prev.script).toBe('const x=1;\nconst y=2;\nconst y2=2;');
  });

  it('troca vazia apaga o trecho', () => {
    const r = applyPieceEdits(
      prev,
      parsePieceEdits('@@EDIT style\n@@FIND\n.a{color:red}\n@@REPLACE\n\n@@END'),
    );
    expect(r.failed).toEqual([]);
    expect(r.blocks.style).toBe('');
  });

  it('trecho inexistente ou repetido não é aplicado e vira problema', () => {
    const r = applyPieceEdits(prev, [
      { block: 'script', find: 'const z=3;', replace: '' },
      { block: 'script', find: 'const y', replace: 'let y' },
    ]);
    expect(r.blocks).toEqual(prev);
    expect(r.failed[0]).toMatch(/não existe na versão anterior/);
    expect(r.failed[1]).toMatch(/mais de uma vez/);
  });

  it('tolera espaço depois dos marcadores, linha em branco e bloco em maiúscula', () => {
    const edits = parsePieceEdits(
      '@@EDIT Script  \n\n@@FIND  \nconst x=1;\n@@REPLACE \nconst x=3;\n@@END',
    );
    expect(edits).toEqual([{ block: 'script', find: 'const x=1;', replace: 'const x=3;' }]);
  });

  it('o script da IA não pode trocar o endereço do módulo 3D', () => {
    const b = {
      ...prev,
      body: '<section><div class="eyebrow">e</div><h1>t</h1><p class="lead">l</p></section><svg aria-label="c"></svg>Para fixar Na prova',
      script: "window.__PIECE_3D__='https://x.y/m.js'",
    };
    expect(lintErrors(lintPiece(b)).map((i) => i.rule)).toContain('unsafe-code');
  });

  it('reconhece a peça inteira em vez de trocas', () => {
    expect(isFullPieceSource('@@TITLE\nT\n@@STYLE\n\n@@BODY\n<p></p>\n@@SCRIPT\n')).toBe(true);
    expect(isFullPieceSource('@@EDIT body\n@@FIND\na\n@@REPLACE\nb\n@@END')).toBe(false);
  });
});

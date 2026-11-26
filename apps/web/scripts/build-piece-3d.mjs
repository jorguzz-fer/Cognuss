// Gera o módulo 3D das peças (ADR 0022): three.js r169 + OrbitControls + RoomEnvironment num
// único ESM minificado, servido pelo app em /piece-assets e carregado pela peça só quando ela
// chama kit.view3d. O arquivo gerado fica no repositório; rode de novo só ao trocar a versão:
//   pnpm --filter @gutta/web piece-3d
import { build } from 'esbuild';
import { join } from 'node:path';

const entry = `import * as THREE from 'three';
export { THREE };
export { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';`;

await build({
  stdin: { contents: entry, resolveDir: import.meta.dirname, loader: 'js' },
  bundle: true,
  format: 'esm',
  minify: true,
  target: 'es2022',
  legalComments: 'eof',
  outfile: join(import.meta.dirname, '../public/piece-assets/three-r169.mjs'),
});

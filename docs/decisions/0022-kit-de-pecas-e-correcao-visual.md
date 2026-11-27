# ADR 0022: Kit de peças, correção por trecho com capturas e 3D servido pelo app

- Status: proposto
- Data: 2026-11-26

## Contexto

A produção de aulas (ADR 0021) gerava peças piores e cerca de três vezes mais lentas que as feitas à mão com o Claude no piloto. A comparação apontou seis causas no código:

1. O escritor escrevia CSS, HTML e JS completos a cada peça, guiado por uma peça aprovada inteira como exemplo. Mais tokens, mais variação, mais erro.
2. Ninguém olhava a tela. O teste de render só mede erro de script, rolagem lateral, cena vazia e sobreposição; peça feia ou enganosa passava.
3. A correção reescrevia a peça inteira, com esforço alto e até 64 mil tokens de saída por tentativa.
4. O código saía dentro de JSON (saída estruturada), com 20 a 40 kB em strings escapadas.
5. Uma peça por vez (`WORKER_CONCURRENCY_PRODUCTION` = 1).
6. O escritor não via o resultado do que escreveu.

## Decisão

**Kit de peças** (`packages/core/src/piece-kit.ts`). Toda peça montada recebe, junto com a base CSS, um `window.kit` testado: `kit.chart` (gráfico SVG com eixos, grade, escala log, faixas e rótulos com halo legível nos dois temas), `kit.canvas` (espaço lógico fixo, devicePixelRatio, animação que para com a aba oculta), `kit.path` (trajetos para partículas e fluxos), `kit.range`, `kit.chips`, `kit.scenarios` (com `#id` na URL), `kit.status`, `kit.reveal`, `kit.fmt` e `kit.view3d`. As primeiras chamadas de retorno dos controles acontecem depois do script da peça, o que evita o erro de variável usada antes da declaração. O prompt leva só a API do kit (`PIECE_KIT_API`), e o escritor compõe com ela. A peça de exemplo continua no prompt da primeira versão, só como padrão visual.

**Blocos de texto, não JSON.** O escritor responde nos blocos `@@TITLE`, `@@STYLE`, `@@BODY` e `@@SCRIPT`, o mesmo formato das peças do piloto (`parsePieceSource`). Esforço médio na escrita (`AI_PIECE_WRITE_EFFORT`); o alto fica no plano e no roteiro dos vídeos. As regras, o kit e a base CSS vão no system com cache, porque são iguais para todas as peças do lote.

**Correção por trecho, com as capturas.** Da segunda tentativa em diante, o escritor recebe os problemas, a versão anterior e as capturas (claro, escuro, celular) e devolve trocas `@@EDIT … @@FIND … @@REPLACE … @@END`, aplicadas por `applyPieceEdits` só quando o trecho aparece uma única vez. Troca que não acha o trecho volta como problema. Se a mudança passar de metade da peça, o escritor pode devolver a peça inteira. A versão registra o modo (`full` ou `edits`) em `production_assets.meta`.

**Crítico visual.** Depois que a peça passa no linter e no teste de render, um modelo mais barato (`AI_PIECE_CRITIC_MODEL`, padrão Sonnet, esforço baixo, saída estruturada curta) olha as capturas e aponta só problemas graves e visíveis: texto cortado ou ilegível, cena quebrada, algo que entrega a resposta, erro evidente na tela. O que ele aponta volta para a correção; na última tentativa vira aviso para o revisor, sem reprovar. Custo em `ai_usage` com o recurso `producao_critica`. Desliga com `AI_PIECE_CRITIC=off`.

Troca que não acha o trecho, ou resposta cortada no limite, sempre reprova a versão: sem isso, um pedido de ajuste do revisor que não foi aplicado passaria como peça pronta.

**Crítico falha aberto e não joga fora peça boa.** Erro do crítico (limite de uso, falha do serviço) só é registrado; a peça segue com o resultado do teste mecânico. Se o crítico pede ajuste e a correção piora, a tarefa termina com a última versão que passou no teste, com o que o crítico apontou como aviso. O crítico e a correção recebem uma captura com altura limitada (2.200 px no computador, 1.400 px no celular), para continuar legível depois que a API reduz a imagem.

**Paralelismo.** `WORKER_CONCURRENCY_PRODUCTION` passa a 3 por padrão. A concorrência vale para a fila `production` inteira, então dois cuidados acompanham: o fechamento do lote trava a linha do lote antes de contar as tarefas que ainda geram, e a conferência da cota diária de créditos de mídia roda sob uma trava (`pg_advisory_xact_lock`), para dois vídeos não passarem juntos da cota.

**3D servido pelo app.** O three.js r169, com OrbitControls e RoomEnvironment, vira um único ESM (`apps/web/public/piece-assets/three-r169.mjs`, gerado por `pnpm --filter @gutta/web piece-3d` e versionado no repositório). A peça só o carrega quando chama `kit.view3d`. A política da peça (`buildPieceCsp`) libera esse único arquivo em `script-src`, pela origem do app; o resto continua proibido, e o linter segue recusando `import()` no script da IA. Como a peça roda num sandbox sem origem, o arquivo é servido com `Access-Control-Allow-Origin: *` e cache longo (nome versionado). No teste de render, o worker serve o mesmo arquivo do disco (`/app/piece-assets` na imagem), sem sair para a rede, e o Chromium usa WebGL por software. Canvas WebGL com tamanho de cena conta como cena desenhada. Modelos externos (GLB) continuam fora: a cena é montada com primitivas do three.js.

## Consequências

- O prompt da primeira versão fica menor e estável (cacheável); as correções custam uma fração da escrita inteira.
- Mudanças no kit valem para todas as peças, inclusive as já publicadas, porque a peça é montada na hora de servir. Mudar a assinatura de uma função do kit exige cuidado com as peças existentes.
- O crítico pode errar para os dois lados; por isso só reprova antes da última tentativa, e o revisor médico continua obrigatório.
- A imagem do worker leva o módulo 3D (cerca de 700 kB). Atualizar o three.js exige gerar o arquivo de novo, com outro nome, e atualizar `PIECE_3D_PATH`.
- Três peças em paralelo triplicam o pico de uso da API; ajuste a concorrência ao limite da conta.
- O teste de render roda sem o sandbox e a CSP da prévia e serve o módulo 3D para qualquer origem; se o `APP_URL` do app não for a origem que o navegador usa, a cena 3D passa no teste e é bloqueada na prévia.
- Canvas WebGL do tamanho de uma cena conta como cena desenhada, mesmo vazio; e rótulos 3D que giram podem se cruzar numa captura. A revisão visual e a revisão médica cobrem esses casos.

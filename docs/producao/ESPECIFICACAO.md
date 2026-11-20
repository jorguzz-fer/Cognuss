# Cognuss · Módulo de produção de aulas interativas

Nov 17, 2026 · @Fernando Jorge

## Objetivo e escopo

O módulo transforma uma aula enviada pelo professor (PPT, PPTX, DOCX ou PDF) em peças interativas e questões prontas para publicar no Cognuss, com revisão médica obrigatória antes de sair do modo demonstração.

O padrão já foi validado na Aula 1 de Fisiologia Endócrina: 12 peças e 3 questões aprovadas pelo Fernando em 17/11/2026. O módulo precisa reproduzir esse resultado para as outras 6 aulas da disciplina e para as próximas disciplinas, com o mínimo de trabalho manual.

**Dentro do escopo:** área admin em `/admin/producao`, pipeline de geração, fila de jobs, tela de revisão, publicação como item de aula.

**Fora do escopo nesta fase:** edição visual das peças pelo professor, versões em outros idiomas, app mobile nativo.

## Material de entrada

O arquivo do professor é ao mesmo tempo a aula e o briefing de produção: o sistema precisa separar os dois tipos de slide.

- **Slide de conteúdo:** ilustrado, com título e texto (na Aula 1, estilo azul neon). Vira contexto e imagem de referência.
- **Slide de instrução:** texto puro com pedidos como *“no slide anterior, montar um esquema…”*, *“animar esse esquema…”*, *“mostrar o vídeo de…”*. Cada um vira uma tarefa ligada ao slide anterior.

Na Aula 1 (34 slides) havia 13 pedidos. Um deles vinha marcado como *“a parte mais importante da aula”* (feedback): o sistema deve detectar marcações de prioridade e destacá-las no plano.

Os 7 arquivos de Fisiologia Endócrina chegaram em `.ppt` antigo, de 23 a 39 MB cada. A conversão para PPTX e PDF com LibreOffice funcionou sem perda de texto; a extração usa `python-pptx` (texto + notas) e `pdftoppm` (miniaturas).

**Aula sem instruções:** a Aula 2 (eixo somatotrófico, 27 slides) chegou só com slides prontos, sem nenhum pedido. Nesse caso o plano por IA propõe as peças a partir do conteúdo (mecanismos dinâmicos viram simuladores, diagnóstico vira caso interativo) e a aprovação humana da etapa 4 passa a ser o único filtro de escopo.

## Fluxo de ponta a ponta

Sete etapas, com duas decisões humanas: aprovar o plano antes de gastar créditos e a revisão médica antes de publicar.

&#91;embedded content: fluxo de produção · 7 etapas, 2 decisões humanas\]

1. **Upload:** o admin envia o arquivo e escolhe disciplina, aula e posição na ordem do curso.
2. **Conversão:** LibreOffice converte para PPTX/PDF; extração de texto, notas e miniaturas de cada slide.
3. **Plano por IA:** a API do Claude separa slides de conteúdo e de instrução e propõe, para cada pedido, o tipo de peça, os cenários, o texto “Na prova” e 3 questões por tema central.
4. **Aprovação:** o admin aprova, edita ou descarta cada tarefa e vê o custo estimado em créditos.
5. **Geração:** jobs em fila geram o HTML de cada peça, as imagens e vídeos no Higgsfield e a narração no ElevenLabs.
6. **Revisão médica:** o revisor (Dr. Rafael ou Hugo) aprova ou comenta cada peça; um comentário gera um novo job só para aquela peça.
7. **Publicação:** a peça vira item da aula no Cognuss e perde o selo “Demonstração · sem revisão”.

## Padrão de peça aprovado

Cada peça é um HTML autocontido, servido em iframe dentro do app, com a mesma estrutura de quatro blocos.

1. **Cabeçalho:** marca Cognuss, disciplina · aula, selo “Demonstração · sem revisão” (some após a revisão), botão de tema.
2. **Abertura:** eyebrow “Peça interativa · tema”, título-afirmação em Archivo Black e um lead de até 3 linhas dizendo o que o aluno vai fazer.
3. **Área interativa:** cena (canvas ou SVG) à esquerda; controles, cenários e leituras à direita. Abre num estado útil, nunca vazia.
4. **Fechamento:** “Para fixar” (o mecanismo em 2–3 frases) e “Na prova” (a pegadinha ou a correlação clínica), mais a fonte bibliográfica no rodapé.

**Visual:** tokens de `apps/web/src/styles/tokens.css` (quase-preto quente, coral da marca em oklch(0.72 0.18 27), Archivo Black + Hind + IBM Plex Mono), tema claro e escuro, contraste mínimo 4,5:1.

**Tipos de peça usados na Aula 1:**

| Tipo | Quando usar | Exemplo publicado |
| --- | --- | --- |
| Simulador com modelo | relação dinâmica entre variáveis | [Feedback hormonal](https://claude.ai/artifact/FFsUgQJ1RDwiAzNBZR5UeG) |
| Animação em 4 etapas | emissor → sinal → receptor → resposta | [Sinalização parácrina](https://claude.ai/artifact/UnGpw3piindRkboAe3pN29) |
| Passo a passo | cascata ou via com ordem fixa | [Vias de sinalização](https://claude.ai/artifact/UNFo6sqLHNsVXXudDYPaMx) |
| Mapa clicável | estrutura com muitas partes | [Glândulas endócrinas](https://claude.ai/artifact/T1tMVV73t82fSphivrF9VP) |
| Mapa com defeitos | via metabólica + deficiências | [Esteroides](https://claude.ai/artifact/Mox7atCg3ZFmyXyaQ6k8Ps) |
| Linha do tempo | evolução ou sequência histórica | [Comunicação celular](https://claude.ai/artifact/51bzdQSwNH6oE3T8URpZzh) |
| Vídeo com narração | pedido explícito de vídeo ou zoom anatômico | [Vídeo-resumo de consolidação](https://claude.ai/artifact/BjKQvz7iP2wArETVeAsPPP) |

**Questões:** 3 por tema central (caso clínico, raciocínio de eixo, conceito). Após a resposta: explicação, gráfico gerado pelo mesmo modelo da peça, motivo de cada alternativa errada e link para abrir a peça no cenário da questão (`#cenario` na URL). O gabarito vem do servidor só depois da resposta.

## Integrações

Todas as chamadas externas rodam no backend (worker BullMQ de apps/worker, ao lado do Next.js) em jobs de fila, com as chaves no cofre do servidor; o navegador nunca fala com essas APIs.

| Serviço | Uso | Custo observado no piloto | Cuidado |
| --- | --- | --- | --- |
| API do Claude | separar slides, planejar peças, escrever o HTML e as questões | não medido | saída validada por um linter de peça antes de salvar |
| Higgsfield · imagem (gpt\_image\_2\_6) | quadros-chave, radiografias, cenas 3D | baixo por imagem | limite diário do plano: o piloto parou por isso em 17/11 |
| Higgsfield · vídeo (kling3\_0, pro, 8 s, sem som) | animação de cada cena | 14 créditos por clipe | gerar imagem, aprovar, só então animar |
| ElevenLabs | narração pt-BR (voz Henrique, e-learning) | conforme plano | o plano gratuito recusou por fila cheia; usar plano pago |
| LibreOffice + python-pptx + pdftoppm | conversão e extração | — | rodar num container de worker, não no processo da API |
| ffmpeg | montagem do vídeo, legenda palavra a palavra, rótulos | — | legenda queimada a partir do texto autoral, alinhada por transcrição (faster-whisper) |
| Armazenamento (S3 ou volume do Coolify) | arquivos de entrada, mídia gerada, HTML das peças | — | servir mídia pelo domínio do app, para o iframe poder carregar |

**Custo de referência:** o vídeo-resumo de 58 s da consolidação pulmonar usou 6 clipes (cerca de 84 créditos) mais 9 imagens. Uma aula com 2 vídeos deve ficar entre 150 e 250 créditos.

## Modelo de dados e telas do admin

O módulo reaproveita o que o repositório já tem: Next.js em `apps/web`, Drizzle em `packages/db`, BullMQ em `apps/worker`. Cada peça publicada vira um registro em `modules` (`lessonUrl` aponta para o HTML, `status` usa o fluxo `draft → in_review → approved → published`, `isDemo` controla o selo, `reviewerId` guarda o revisor). As questões vão para `questions` e `questionOptions`, ligadas ao `topic` da aula.

**Tabelas novas (prefixo `production_`):**

| Tabela | Uma linha por | Campos principais |
| --- | --- | --- |
| `production_batches` | arquivo enviado | disciplina, topic da aula, posição na ordem, arquivo original (`files`), status, custo estimado e real |
| `production_slides` | slide extraído | número, tipo (conteúdo ou instrução), texto, notas, miniatura |
| `production_tasks` | pedido do professor | slide de origem, prioridade, tipo de peça, plano (JSON), status, `moduleId` gerado |
| `production_assets` | mídia gerada | tarefa, tipo (imagem, clipe, áudio, html), provedor, job externo, URL, créditos |
| `production_reviews` | comentário do revisor | tarefa, revisor, decisão, texto, data |

**Fila:** nova fila `production` em `@gutta/jobs`, com os jobs `extract`, `plan`, `generate-piece`, `generate-media`, `assemble-video`, `regenerate`. Usa a política padrão do ADR 0013 (5 tentativas, espera exponencial); jobs de mídia nunca reenviam uma geração paga sem conferir o status do job anterior no provedor.

**Telas novas em `/admin/producao`:**

1. **Lista de lotes:** disciplina, aula, status, custo, data.
2. **Lote:** miniaturas dos slides lado a lado com as tarefas detectadas; aprovar, editar ou descartar cada tarefa; custo estimado antes de liberar a geração.
3. **Tarefa:** prévia da peça em iframe nos dois temas, mídias geradas, histórico de versões.
4. **Revisão:** fila do revisor, com aprovar ou comentar trecho por trecho; aprovar muda `status` para `approved` e `isDemo` para falso.

## Lições do piloto e riscos

O que deu errado no piloto já define requisitos do módulo.

| O que aconteceu | Requisito para o módulo |
| --- | --- |
| A IA de imagem gerou radiografias com partes artificiais (opacidade em retângulo) e bactérias com forma errada | aprovar a imagem antes de animar; revisão médica obrigatória em toda mídia gerada |
| As vozes padrão do Higgsfield tinham sotaque estrangeiro | voz pt-BR nativa fixa por disciplina (ElevenLabs), configurável no admin |
| A IA de imagem escreve rótulos mal | nenhum texto dentro da imagem; rótulos e legendas entram na montagem |
| Legenda automática errou termos (“emácias”, “alveolo”) | legenda sempre a partir do texto autoral, só o tempo vem da transcrição |
| A radiografia desenhada à mão ficou ruim; a gerada ficou realista | imagens médicas realistas vêm da geração com referência (mesmo paciente para normal e doente) |
| Limite diário do Higgsfield parou a produção | fila com controle de cota, retomada automática no dia seguinte e alerta no admin |
| Arquivos de mídia ficaram presos num serviço e não chegavam à página | toda mídia baixada para o armazenamento do Cognuss e servida pelo domínio do app |
| Peças com texto sobreposto no primeiro render | teste automático com Playwright nos dois temas e captura de tela anexada à tarefa |

**Risco principal:** conteúdo médico incorreto publicado. Mitigação: nenhuma peça sai de `in_review` sem um revisor com papel de professor, e o selo “Demonstração · sem revisão” é controlado pelo banco, não pelo HTML.

## Plano de implementação

Quatro fases, cada uma com um critério de pronto que se testa com as aulas reais de Fisiologia Endócrina.

1. **Fase 1 · Entrada e plano:** upload, conversão, extração, detecção dos slides de instrução e plano por IA na tela de lote.
   - Pronto quando: a Aula 1 gera as mesmas 13 tarefas listadas no [índice da aula](https://claude.ai/artifact/J93uSGFG7EkkikFxDBMApp).
2. **Fase 2 · Peças HTML:** geração das peças com a base comum (cabeçalho, tokens, rodapé) e os modelos de cada tipo, teste com Playwright, prévia no admin.
   - Pronto quando: as peças da Aula 2 passam no teste nos dois temas sem ajuste manual.
3. **Fase 3 · Mídia:** imagens, vídeos e narração com controle de cota e custo; montagem do vídeo com legenda e rótulos.
   - Pronto quando: o vídeo da insulina (Aula 1, peça 9) sai pelo módulo do início ao fim.
4. **Fase 4 · Revisão e publicação:** fila do revisor, comentários que geram refação, publicação como `modules` e `questions`.
   - Pronto quando: o Dr. Rafael revisa e publica a Aula 1 inteira pelo admin.

**Referências**

- Repositório: [github.com/jorguzz-fer/Cognuss](https://github.com/jorguzz-fer/Cognuss)
- Peças aprovadas da Aula 1: [índice da aula](https://claude.ai/artifact/J93uSGFG7EkkikFxDBMApp)
- Questões aprovadas: [Questões de feedback hormonal](https://claude.ai/artifact/NP1Pg7BPVzJS3BHKC6pEjy)
- Protótipo de questão com vídeo, radiografia e narração: [Consolidação pulmonar](https://claude.ai/artifact/BjKQvz7iP2wArETVeAsPPP)
- Material de entrada: pasta `Cognuss/Diciplinas/Fisiologia` (7 arquivos .ppt do Dr. Rafael)
- Bibliografia das peças: Aires, *Fisiologia*, 5ª ed., cap. 64 (Aula 1) e cap. 73 (Aula 2) (Guanabara Koogan, 2018)

# ADR 0021: Produção de aulas interativas

- Status: proposto
- Data: 2026-11-17

## Contexto

A especificação do módulo de produção (`docs/producao/ESPECIFICACAO.md`) pede que a aula enviada pelo professor (PPT, PPTX, DOCX ou PDF) vire peças interativas e questões, com o mesmo padrão do piloto feito fora do app (`docs/producao/referencias`). O arquivo é ao mesmo tempo a aula e o briefing: no meio dos slides de conteúdo, o professor escreve slides de instrução ("no slide anterior, montar um esquema…"). Na Aula 1 de Fisiologia Endócrina havia 14 slides de instrução, que formam 13 pedidos; a Aula 2 não tinha nenhum. Nas duas, os slides de conteúdo são imagem: quase não há texto para ler.

## Decisão

**Reaproveitar o caminho de arquivos.** O arquivo entra pelo upload da v2 (ADR 0012) e passa pela verificação, pelo antivírus e pela conversão para PDF do worker, que já traz LibreOffice e Poppler. Nada de conversão no processo da API.

**Fila própria.** Nova fila `production` em `@gutta/jobs`, com a política padrão do ADR 0013. Fase 1: `production.extract` (slides) e `production.plan` (plano). As fases seguintes acrescentam `generate-piece`, `generate-media`, `assemble-video` e `regenerate`.

**Slides pelo PPTX, imagens pelo PDF.** Apresentação antiga (`.ppt`) vira PPTX pelo LibreOffice. Texto, notas e slides ocultos saem do XML do PPTX, na numeração real da apresentação. As imagens saem do PDF, renderizadas a 1024 px. O PDF não traz slides ocultos, então cada página do PDF é ligada ao slide visível correspondente. PDF e DOCX usam o texto de cada página.

**Regra pura detecta, IA planeja.** A detecção dos pedidos é uma regra pura em `packages/core` (`detectTasks`). Ela separa instrução, conteúdo e referência; liga o pedido ao slide-alvo ("slide anterior", "dois slides anteriores", "esse slide"; sem indicação, presume o anterior e avisa); junta o pedido que continua no slide seguinte; e marca a prioridade dita sobre a aula. A IA (`packages/ai`, Claude com saída estruturada) recebe as tarefas detectadas e as imagens dos slides e devolve, para cada uma, o tipo de peça, o título, os cenários, o "Para fixar", o "Na prova" e 3 rascunhos de questão. Ela não cria nem apaga pedidos. Na aula sem pedidos, a IA propõe as tarefas pelo conteúdo, e a aprovação do admin é o único filtro de escopo. Assim o critério da Fase 1 (as 13 tarefas da Aula 1) não depende do modelo.

**Banco.** Tabelas `production_batches`, `production_slides` e `production_tasks`, sob RLS só para admin. O worker grava em nome do admin que criou o lote. As imagens dos slides ficam no armazenamento sob `p/b/{lote}/`, fora da pasta do usuário: o lote é da equipe, não de quem enviou. `production_assets` e `production_reviews` entram nas fases 3 e 4. A peça publicada vira `modules` e as questões vão para `questions`, como diz a especificação.

**Custo.** O plano por IA grava modelo, tokens e custo em `ai_usage` (recurso `producao_plano`) e no lote. Os créditos de mídia estimados vêm do tipo de cada tarefa aprovada (tabela do piloto) e aparecem antes de liberar a geração.

## Consequências

- O admin aprova o plano antes de qualquer gasto de mídia.
- A detecção é previsível e testada com o texto real das aulas; pedidos escritos de outro jeito podem escapar, e por isso a IA propõe peças quando não há pedidos e o admin pode editar ou descartar.
- O worker precisa do `unzip` para ler o PPTX.

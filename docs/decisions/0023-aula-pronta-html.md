# ADR 0023: Aula pronta (HTML) no módulo do catálogo

- Status: aceito (pedido do Fernando em 26/11/2026)
- Data: 2026-11-26

## Contexto

A equipe recebe aulas interativas já prontas, num arquivo .html (por exemplo, "Conceitos em Farmacologia"). Até aqui, o módulo só aceitava dois tipos de aula:

- a aula gerada pela produção (ADR 0021);
- um endereço https externo, liberado em `LESSON_ORIGINS`.

Nenhum dos dois serve para um arquivo pronto. Hospedar fora do Cognuss deixaria a aula fora do antivírus, da revisão e do isolamento.

## Decisão

**O envio usa o caminho dos arquivos (ADR 0012).**

- `text/html` entra na lista de tipos aceitos, mas só o admin pode enviar.
- O worker reconhece o HTML pelo conteúdo (doctype ou `<html>`), passa o antivírus e marca o arquivo como `html`.
- HTML não entra em Material de estudo nem na produção de aulas.
- O admin passa a enviar arquivos mesmo com os módulos de aluno desligados.

**As fontes são embutidas no envio.**

- A aula roda isolada e sem rede, então o Google Fonts não carregaria.
- No envio, o servidor baixa o CSS e as fontes do Google Fonts, só dos dois endereços dele e só dos subconjuntos latin e latin-ext.
- As fontes entram no arquivo como data URI, e os links para o Google saem.
- Se a rede falhar, a aula segue com as fontes do sistema, e a tela avisa.

**A aula fica fora da pasta de quem enviou.**

- O resultado vai para `c/lessons/{módulo}.html` no bucket.
- O módulo passa a apontar para `/api/v1/catalog/lessons/{módulo}`.

**A aula é servida isolada.**

- Essa rota recebe a mesma política da peça da produção (`buildPieceCsp`): sandbox sem mesma origem, sem rede e só com o que vem dentro do arquivo.
- Quem vê a aula é decidido pelo RLS do módulo: o aluno só vê o módulo publicado; a equipe editorial vê também o rascunho e o em revisão, para a prévia.

**A troca só acontece com o módulo em rascunho.**

- A aula nova passa pela revisão de outra pessoa antes de chegar ao aluno, como o resto do conteúdo de saúde.
- O revisor vê a prévia na tela do módulo, aberta pela fila de revisão.

## Consequências

- O envio fica registrado na auditoria (`module.lesson_uploaded`).
- O arquivo original continua na pasta de quem enviou. A cópia servida ao aluno é a de `c/lessons/`.
- Uma aula que depende de imagens ou scripts de outros sites não funciona. Ela precisa vir num arquivo só.

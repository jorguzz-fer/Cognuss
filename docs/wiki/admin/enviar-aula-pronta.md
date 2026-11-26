# Como enviar uma aula pronta (.html) para um módulo

Coloca no módulo do catálogo uma aula interativa que já vem pronta num arquivo .html, feita fora da produção de aulas.

**Quem pode:** Admin envia. Revisor vê a prévia e aprova. **Onde:** Admin → Cursos → curso → disciplina → módulo, `/admin/modulos/<módulo>`, quadro **Aula interativa**.

## Antes de começar

- O módulo precisa existir e estar em **rascunho**. Veja [Criar um módulo](criar-modulo.md).
- A aula precisa estar num arquivo só, com o CSS e os scripts dentro dele. Ela roda isolada, sem acesso à internet: imagens e scripts de outros sites não carregam. As fontes do Google Fonts são a exceção (veja abaixo).
- O arquivo pode ter até 15 MB.

## Passo a passo

1. Abra o módulo.
2. No quadro **Aula interativa**, clique em **Enviar aula pronta (.html)**.
3. Escolha o arquivo .html.
4. Espere as mensagens "Enviando e verificando no antivírus…" e "Embutindo as fontes e ligando a aula ao módulo…".
5. Confira a prévia da aula no próprio quadro.
6. Em **Fluxo editorial**, clique em **Enviar para revisão**.

## O que acontece depois

- O arquivo passa pelo antivírus antes de qualquer uso.
- As fontes do Google Fonts que a aula pede são baixadas uma vez e entram no próprio arquivo, só os conjuntos de caracteres do português. Os links para o Google saem.
- A aula abre num endereço do próprio Cognuss, isolada: não lê a conta do aluno nem acessa a internet.
- O revisor abre o módulo pela fila **Revisão de aulas**, vê a mesma prévia e aprova. Depois de publicado, o aluno vê a aula na página do módulo.
- Para trocar a aula, volte o módulo para rascunho e envie o arquivo novo. Ele passa pela revisão de novo.
- O envio fica na auditoria do módulo.

## Se der errado

- "Aula enviada." com aviso "Não deu para embutir as fontes do Google: a aula vai usar as fontes do sistema.": o servidor não conseguiu baixar as fontes. A aula funciona, com outra fonte. Envie de novo mais tarde para tentar embutir.
- "Volte o módulo para rascunho para trocar a aula: ela passa pela revisão.": o módulo está em revisão, aprovado ou publicado. Use **Voltar ao rascunho** (ou arquive e volte ao rascunho, se publicado).
- "Envie a aula como um arquivo .html.": o arquivo não é HTML.
- "O antivírus bloqueou este arquivo.": o arquivo foi bloqueado e apagado.
- "A aula passa de 15 MB.": reduza imagens embutidas no arquivo.

## Veja também

- [Criar um módulo](criar-modulo.md)
- [Levar um módulo de rascunho a publicado](publicar-modulo.md)
- [Produzir uma aula a partir do PPT](../producao/visao-geral.md)

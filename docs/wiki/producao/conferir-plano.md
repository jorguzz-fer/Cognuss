# Como conferir o plano da aula

Conferir o plano é decidir, tarefa por tarefa, o que vira peça antes de qualquer gasto com geração.

**Quem pode:** Admin, com a verificação em duas etapas ativa. **Onde:** tela do lote (`/admin/producao/<lote>`), quadro **Decisão do plano** e a lista de tarefas abaixo dele.

## Antes de começar

- O lote precisa estar em **Plano pronto** ou **Peças geradas**. Veja [Como acompanhar o lote](acompanhar-lote.md).
- Cada tarefa nasce de um slide de instrução do professor ("Pedido no slide N") ou de uma proposta da IA quando a aula não tem pedidos ("Proposta da IA"). Veja [Como escrever os pedidos do professor nos slides](escrever-pedidos-nos-slides.md).

## Passo a passo

1. No quadro **Decisão do plano**, veja os totais: **Tarefas**, **Aprovadas**, **Descartadas** e **Mídia estimada**.
2. Em cada tarefa, confira o cabeçalho:
   - número e origem, por exemplo "03 · Pedido no slide 12" ou "03 · Proposta da IA";
   - o título da peça;
   - os selos **Prioridade do professor** (quando o professor marcou), o tipo de peça (ou **Tipo a definir**) e a situação (**A decidir**, **Aprovada** ou **Descartada**).
3. Olhe as miniaturas dos slides-alvo. Se aparecer "O pedido não diz o slide: presumimos o anterior. Confira.", veja se o slide está certo.
4. Abra **Pedido do professor** (ou **Por que a IA propôs**) para ler o texto original.
5. Abra **Plano da peça** e confira: **O que o aluno faz**, **Área interativa**, **Cenários**, **Para fixar**, **Na prova**, **Questões (N)**, **Mídia gerada** e **Para o revisor conferir**.
6. Decida:
   - **Aprovar**: a tarefa vai para a geração. O botão fica desativado enquanto a tarefa estiver em **Tipo a definir** ("Defina o tipo de peça antes de aprovar.").
   - **Editar**: muda o **Título** e o **Tipo de peça**. Clique em **Salvar** ou **Cancelar**.
   - **Descartar**: a tarefa não vira peça e sai da estimativa.
   - **Desfazer decisão**: volta a tarefa para **A decidir**.
7. Tipos de peça disponíveis em **Tipo de peça**: **Simulador com modelo**, **Animação em 4 etapas**, **Passo a passo**, **Mapa clicável**, **Mapa com defeitos**, **Linha do tempo** e **Vídeo com narração**.
8. Confira a **Mídia estimada**. Só o vídeo usa mídia paga: cerca de 100 créditos por vídeo. As peças só em HTML não usam mídia gerada.
9. Quando terminar, clique em **Liberar geração**. Veja [Como gerar as peças e ver a prévia](gerar-pecas.md).

## O que acontece depois

A estimativa muda na hora a cada decisão. Ela conta todas as tarefas não descartadas, inclusive as que ainda estão em **A decidir**. Ao liberar, só as tarefas **Aprovada** com tipo definido vão para a geração.

Nas tarefas de vídeo aprovadas aparece: "O vídeo começa pelo roteiro; imagens e clipes só depois das suas aprovações."

## Se der errado

| Mensagem                                                                  | O que fazer                                                                                                                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Sem plano da IA: defina o tipo de peça."                                 | A IA não planejou esta tarefa. Clique em **Editar**, escolha o **Tipo de peça** e salve. A peça será escrita só a partir do pedido e dos slides. |
| "O plano deste lote ainda não está pronto para aprovação."                | O lote está em outra etapa (por exemplo, **Gerando as peças**). Espere ele voltar a **Peças geradas**.                                           |
| "Esta tarefa já foi para a geração. Use "Gerar de novo" na tela da peça." | A tarefa já foi gerada. Abra a peça e use [Gerar de novo](gerar-de-novo.md).                                                                     |
| "Não deu para salvar agora."                                              | Tente de novo. Se repetir, recarregue a página.                                                                                                  |

O plano detalhado (cenários, textos e questões) não é editável nesta tela. Só o título e o tipo. Para corrigir o conteúdo, aprove e depois peça o ajuste na prévia com [Gerar de novo](gerar-de-novo.md).

## Veja também

- [Como gerar as peças e ver a prévia](gerar-pecas.md)
- [Como produzir um vídeo](produzir-video.md)
- [Como escrever os pedidos do professor nos slides](escrever-pedidos-nos-slides.md)

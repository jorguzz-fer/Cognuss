# Como enviar as peças para a revisão médica

Enviar para a revisão transforma cada peça pronta em um módulo da disciplina e as questões do plano em questões do banco, todos em revisão e com o selo de demonstração.

**Quem pode:** Admin, com a verificação em duas etapas ativa. **Onde:** tela do lote (`/admin/producao/<lote>`), quadro **Revisão médica**.

## Antes de começar

- O quadro **Revisão médica** só aparece quando o lote tem ao menos uma tarefa em **Peça pronta** ou já na revisão.
- Só vão as peças em **Peça pronta** que ainda não foram enviadas. Tarefas em **Falhou** ou ainda gerando ficam de fora.
- Quem clica em enviar fica registrado como autor das peças e das questões. **Essa pessoa não pode aprovar essas peças depois.** Combine antes quem vai revisar.

## Passo a passo

1. Abra o lote em **Produção de aulas**.
2. Confira a prévia de cada peça antes. Veja [Como gerar as peças e ver a prévia](gerar-pecas.md).
3. No quadro **Revisão médica**, clique em **Enviar N peças para revisão**.
4. Leia a confirmação, por exemplo: "3 peças foram para a revisão, com 7 questões."
5. Se aparecer "Ficaram de fora (sem uma única alternativa correta): …", anote quais questões não foram.
6. Avise o revisor e use **Abrir a fila de revisão** para conferir que as peças chegaram.

## O que acontece depois

- Cada peça vira um módulo **em revisão** da disciplina e do assunto da aula, com o selo "Demonstração · sem revisão". O aluno ainda não vê.
- As questões do plano viram questões **em revisão**, com as alternativas e o motivo de cada uma. A fonte é a referência que o professor pôs na aula. Sem slide de referências, a questão vai sem fonte.
- A questão que não tem exatamente uma alternativa correta não vai.
- A ordem dos módulos na disciplina segue a **Posição na ordem do curso** do lote e a ordem das tarefas.
- O quadro passa a dizer quantas peças já estão na revisão. Se depois você gerar novas peças no lote, o botão volta a aparecer só com as novas.

## Se der errado

| Mensagem                                                                    | O que fazer                                                               |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| "Nenhuma peça pronta para enviar. Gere as peças antes de enviar à revisão." | Libere e termine a geração antes.                                         |
| "Não deu para concluir agora."                                              | Tente de novo em instantes.                                               |
| O botão não aparece                                                         | Não há peça nova em **Peça pronta**. As que já foram enviadas não contam. |

## Veja também

- [Como revisar uma peça](revisar-peca.md)
- [Como publicar a aula](publicar-aula.md)
- [Usuários e papéis no admin](../admin/)

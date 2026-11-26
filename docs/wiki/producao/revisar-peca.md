# Como revisar uma peça

A revisão médica confere a peça, o vídeo e as questões antes de chegarem ao aluno: aprovar tira o selo de demonstração.

**Quem pode:** papel **Revisão** ou **Admin**, desde que não seja quem enviou a peça para a revisão. **Onde:** menu lateral **Revisão de aulas** (`/admin/revisao`), depois a peça (`/admin/revisao/<tarefa>`).

## Antes de começar

- O revisor precisa do papel **Revisão**, dado em **Usuários** pelo Admin. Veja [Usuários e papéis no admin](../README.md#admin).
- A peça precisa ter sido enviada para a revisão pelo Admin. Veja [Como enviar as peças para a revisão](enviar-para-revisao.md).

## Passo a passo

1. Abra **Revisão de aulas** no menu lateral. As peças aparecem agrupadas por aula, com a disciplina embaixo do nome. Se houver módulos do catálogo esperando revisão, eles aparecem antes, na seção **Módulos do catálogo**. Esses seguem outro caminho: veja [Como levar um módulo de rascunho a publicado](../admin/publicar-modulo.md).
2. Veja o selo de cada peça:
   - **Para revisar**: pronta para a sua decisão;
   - **Nova versão para revisar**: voltou de um ajuste;
   - **Gerando o ajuste**: a IA está refazendo a peça;
   - **Ajuste falhou**: a nova versão não passou no teste;
   - **Aprovada** ou **Publicada**.
3. Clique no nome da peça.
4. Leia o aviso amarelo "A IA pediu atenção do revisor em:". São os pontos que a IA não tem certeza.
5. Em **Peça, versão N**, use a peça nos dois temas. Use **Abrir em tela cheia** para testar com calma.
6. Se for vídeo, assista em **Vídeo**.
7. Em **Questões (N)**, leia cada enunciado e as alternativas. A correta tem o selo **Correta**. Embaixo de cada alternativa está o motivo.
8. Confira **Plano da peça** e o **Histórico da revisão**.
9. Em **Decisão**, escolha:
   - **Aprovar**: em **Questões que entram na aula**, desmarque as questões que não devem ir. Escreva a **Observação da aprovação** se quiser. Clique em **Aprovar peça e questões**.
   - **Pedir ajuste**: veja [Como pedir ajuste numa peça](pedir-ajuste.md).

## O que acontece depois

- Ao aprovar, a tela confirma "Peça aprovada. O selo de demonstração saiu." O módulo e as questões marcadas ficam aprovados e a versão aprovada fica guardada.
- A questão desmarcada volta para rascunho no banco de questões e não entra na aula.
- A peça aprovada ainda não chega ao aluno. A tela mostra "Peça aprovada. Ela vai para os alunos quando a aula for publicada na fila de revisão." Veja [Como publicar a aula](publicar-aula.md).
- A decisão fica no **Histórico da revisão** com o nome do revisor, a versão e a data. Ela não pode ser alterada.

## Se der errado

| Mensagem                                                                      | O que fazer                                                                                       |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| "Quem enviou a peça para revisão não pode aprová-la. Peça a outro revisor."   | Outro revisor, ou outro Admin, aprova.                                                            |
| "Esta peça não está em revisão."                                              | A peça já foi aprovada ou publicada. Recarregue a fila.                                           |
| "A peça ainda está sendo gerada de novo. Revise quando a nova versão chegar." | Espere o selo voltar a **Nova versão para revisar**.                                              |
| "O ajuste não passou no teste depois das tentativas."                         | A peça está em **Ajuste falhou**. Avise o Admin, que pode usar [Gerar de novo](gerar-de-novo.md). |
| "Nenhuma peça esperando revisão."                                             | Nada foi enviado ainda. Peça ao Admin para enviar as peças do lote.                               |
| O menu não mostra **Revisão de aulas**, ou a tela volta para o app do aluno   | O seu usuário não tem o papel **Revisão**. Peça ao Admin em **Usuários**.                         |
| "Não deu para concluir agora."                                                | Tente de novo em instantes.                                                                       |

## Veja também

- [Como pedir ajuste numa peça](pedir-ajuste.md)
- [Como publicar a aula](publicar-aula.md)
- [Usuários e papéis no admin](../README.md#admin)

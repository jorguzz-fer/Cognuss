# Como pedir ajuste numa peça

Pedir ajuste manda o comentário do revisor para a IA, que gera uma nova versão da peça e a devolve para a fila de revisão.

**Quem pode:** papel **Revisão** ou **Admin**. **Onde:** **Revisão de aulas**, tela da peça (`/admin/revisao/<tarefa>`), quadro **Decisão**, parte **Pedir ajuste**.

## Antes de começar

- A peça precisa estar **Em revisão** e com a versão pronta (selo **Para revisar** ou **Nova versão para revisar** na fila).
- O ajuste refaz a peça (o HTML e, no vídeo, a mídia). Ele não reescreve as questões. Para tirar uma questão errada, desmarque-a ao aprovar. Veja [Como revisar uma peça](revisar-peca.md).

## Passo a passo

1. Abra a peça na fila **Revisão de aulas**.
2. Em **Pedir ajuste**, escolha o **Trecho** onde está o problema:
   - **A peça toda** (padrão);
   - **Cenário: …** (um para cada cenário da peça);
   - **Texto de abertura**, **Para fixar** ou **Na prova**;
   - no vídeo, **Narração e legenda** ou **Imagens do vídeo**;
   - **Questão N**.
3. Escreva o **Comentário para o ajuste**: o que está errado e como deve ficar. Use de 5 a 2.000 caracteres.
4. Clique em **Pedir ajuste**.
5. Leia a confirmação: "Ajuste pedido. A IA gera uma nova versão e a peça volta para esta fila."

## O que acontece depois

- A decisão fica no **Histórico da revisão** com o trecho e o comentário.
- A tela mostra "A IA está gerando a nova versão com o seu comentário. Esta tela se atualiza sozinha." Na fila, o selo vira **Gerando o ajuste**.
- **Peça HTML:** a IA parte da versão atual e corrige o trecho. A nova versão passa pelo teste nos dois temas e volta sozinha como **Nova versão para revisar**.
- **Vídeo:** o vídeo recomeça pelo roteiro. Ele **não volta sozinho**: o Admin precisa aprovar o roteiro e as imagens de novo na tela da produção, e os créditos de imagem e clipe são gastos de novo. Avise o Admin. Veja [Como produzir um vídeo](produzir-video.md).
- Se a nova versão não passar no teste, o selo vira **Ajuste falhou**.

## Se der errado

| Mensagem                                                                      | O que fazer                                                                      |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| "Esta peça não está em revisão."                                              | A peça já foi aprovada ou publicada.                                             |
| "A peça ainda está sendo gerada de novo. Revise quando a nova versão chegar." | Já há um ajuste em andamento. Espere.                                            |
| O campo de comentário não aceita                                              | Escreva ao menos 5 caracteres.                                                   |
| "Não deu para concluir agora."                                                | Tente de novo em instantes.                                                      |
| A peça fica em **Gerando o ajuste** por muito tempo                           | Se for vídeo, o roteiro está esperando o Admin. Se for peça HTML, avise o Admin. |

## Veja também

- [Como revisar uma peça](revisar-peca.md)
- [Como gerar uma peça de novo](gerar-de-novo.md)
- [Como produzir um vídeo](produzir-video.md)

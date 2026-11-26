# Como gerar uma peça de novo

Gerar de novo cria uma nova versão da peça, com ou sem um pedido de ajuste, quando a peça falhou ou não ficou boa.

**Quem pode:** Admin, com a verificação em duas etapas ativa. **Onde:** tela da peça (`/admin/producao/<lote>/tarefas/<tarefa>`), quadro **Gerar de novo**.

## Antes de começar

- O quadro aparece quando a tarefa está em **Peça pronta** ou **Falhou**, e também quando o vídeo está **Pausado**.
- Com pedido de ajuste, a IA parte da versão atual e corrige o que você pediu. Sem pedido, ela escreve uma versão nova a partir do plano.
- No vídeo, gerar de novo recomeça pelo roteiro, inclusive com o vídeo pausado. Use quando **Retomar** não resolve, por exemplo numa cena sem imagem aprovada ou numa recusa do provedor que se repete. Veja [Como retomar um vídeo pausado](retomar-video.md). A mídia anterior fica no histórico e imagens e clipes novos gastam créditos de novo. Veja [Como produzir um vídeo](produzir-video.md).

## Passo a passo

1. Abra a peça pelo link **Abrir a peça** na tela do lote.
2. Veja a prévia e o histórico em **Versões** para entender o que precisa mudar.
3. No quadro **Gerar de novo**, escreva o **Pedido de ajuste** (opcional, até 2.000 caracteres). Seja concreto, por exemplo: "aumentar o contraste das setas no tema escuro; trocar o exemplo do cenário 2."
4. Clique em **Gerar de novo**.
5. A tarefa volta para **Gerando a peça** e a tela se atualiza sozinha.
6. Quando terminar, confira a nova **Prévia da versão N**. As versões antigas continuam em **Versões**.

## O que acontece depois

A nova versão passa pelo linter e pelo teste nos dois temas, com até 3 tentativas. O lote volta para **Gerando as peças** enquanto isso e depois para **Peças geradas**.

Se a peça já estava na revisão, ela continua lá. Durante a geração, a fila do revisor mostra **Gerando o ajuste**. Quando termina, mostra **Para revisar** com a nova versão.

## Se der errado

| Mensagem                                                       | O que fazer                                                                                          |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| "Só dá para gerar de novo uma peça que já terminou de gerar."  | Espere a geração atual terminar. Um vídeo que está gerando mídia sem pausa também não recomeça.      |
| "Ainda não há versão para ajustar. Gere sem pedido de ajuste." | A peça falhou antes de ter qualquer versão. Apague o pedido de ajuste e clique em **Gerar de novo**. |
| "O pedido de ajuste passa de 2.000 caracteres."                | Resuma o pedido.                                                                                     |
| "Não deu para gerar agora."                                    | Tente de novo em instantes.                                                                          |

## Veja também

- [Como gerar as peças e ver a prévia](gerar-pecas.md)
- [Como pedir ajuste numa peça (revisor)](pedir-ajuste.md)
- [Como produzir um vídeo](produzir-video.md)
- [Como retomar um vídeo pausado](retomar-video.md)

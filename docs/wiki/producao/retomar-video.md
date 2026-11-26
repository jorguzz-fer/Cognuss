# Como retomar um vídeo pausado

Quando a mídia de um vídeo para por saldo, chave, voz ou pedido recusado, a tarefa fica **Pausado** até você resolver o motivo e clicar em **Retomar**.

**Quem pode:** Admin, com a verificação em duas etapas ativa. **Onde:** tela da peça de vídeo (`/admin/producao/<lote>/tarefas/<tarefa>`), seção **Mídia do vídeo**.

## Antes de começar

Nem todo aviso é pausa. Há três situações diferentes:

| Situação                          | Como aparece                                                                                                                                                            | Precisa de você?                                                                                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cota do dia acabou                | Aviso "A cota de N créditos de hoje acabou. A geração continua sozinha amanhã, a partir da meia-noite." O selo continua na etapa (por exemplo, **Gerando as imagens**). | Não. Volta sozinho logo depois da meia-noite de Brasília. Aumentar a cota em [Vozes e cota de mídia](configurar-vozes-e-cota.md) não adianta a volta deste vídeo. |
| Fila cheia ou provedor fora do ar | Aviso como "A fila da Higgsfield está cheia. Tentando de novo em instantes."                                                                                            | Não. O sistema espera e tenta de novo.                                                                                                                            |
| Pausa                             | Selo **Pausado** em vermelho e o botão **Retomar**.                                                                                                                     | Sim.                                                                                                                                                              |

## Passo a passo

1. Abra a peça de vídeo. Na tela do lote, a tarefa mostra o selo **Pausado**.
2. Leia o aviso vermelho em **Mídia do vídeo**. Ele diz o motivo.
3. Resolva o motivo:
   - **Saldo:** "Saldo insuficiente na Higgsfield. Adicione créditos e retome." ou "Créditos insuficientes na ElevenLabs." Adicione créditos na conta do provedor.
   - **Chave:** "Chave da Higgsfield inválida. Confira o key ID e o secret no worker.", "A chave da Higgsfield expirou…", "A chave da Higgsfield foi desativada…" ou "Chave da ElevenLabs inválida." Peça à equipe técnica para corrigir a chave no worker. Veja [Como configurar o servidor](configurar-servidor.md).
   - **Chave ausente:** "A geração de imagens e clipes não está configurada (faltam as chaves da Higgsfield no worker). Retome depois de configurar." ou "A narração não está configurada (falta a chave da ElevenLabs no worker). Retome depois de configurar."
   - **Voz:** "Esta disciplina ainda não tem voz de narração. Escolha a voz em Produção · Vozes e retome." Cadastre a voz em [Vozes e cota de mídia](configurar-vozes-e-cota.md).
   - **Recusa:** "A Higgsfield recusou o pedido (…)" ou "A ElevenLabs recusou o pedido (…)". Leia o detalhe entre parênteses e leve à equipe técnica. Retomar repete o mesmo pedido (ver **Se der errado**).
   - **Clipes com falha:** "Clipes com falha:" seguido das cenas. Retome para pedir de novo só os clipes que falharam.
   - **Erro inesperado:** "A mídia parou por um erro inesperado. Retome para tentar de novo."
4. Clique em **Retomar**. O botão mostra **Retomando…**.
5. Acompanhe o selo voltar à etapa em que parou.

## O que acontece depois

Ao retomar, o que falhou é pedido de novo. O que já estava pronto ou a caminho continua, sem cobrar de novo. O sistema nunca reenvia um pedido pago que já foi aceito pelo provedor: ele só consulta o andamento.

## Se der errado

- **"A mídia deste vídeo não está pausada."**: a tarefa já saiu da pausa. Recarregue a página.
- **A pausa volta logo depois de Retomar:** o motivo não foi resolvido, ou a chave nova ainda não chegou ao worker. Confirme com a equipe técnica que o worker foi reiniciado depois da troca.
- **"A cena "…" está sem imagem aprovada. Refaça a imagem."**: retomar não leva de volta à aprovação de imagens, e o quadro **Gerar de novo** não aparece enquanto a tarefa está pausada. A tela não tem saída para este caso. Avise a equipe técnica.
- **Recusa do provedor que se repete:** retomar envia o mesmo pedido de novo. Se a recusa for pelo conteúdo do pedido, a tela não tem como trocar o texto durante a pausa. Avise a equipe técnica (a confirmar o procedimento).

## Veja também

- [Como produzir um vídeo](produzir-video.md)
- [Como escolher a voz e a cota diária](configurar-vozes-e-cota.md)
- [Como configurar o servidor para a produção](configurar-servidor.md)

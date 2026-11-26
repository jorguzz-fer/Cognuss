# Como acompanhar o lote

O lote mostra em que etapa está a aula enviada e o que você precisa fazer em cada uma.

**Quem pode:** Admin, com a verificação em duas etapas ativa. **Onde:** **Produção de aulas** (`/admin/producao`), clique no nome da aula na tabela **Lotes**.

## Passo a passo

1. Abra **Produção de aulas** e clique na aula na coluna **Aula**.
2. Veja o selo no alto da tela, à direita do título. Ele mostra a situação do lote.
3. Siga a tabela abaixo conforme a situação.

| Situação na tela          | O que está acontecendo                                              | O que fazer                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Verificando o arquivo** | O arquivo passa pela verificação, pelo antivírus e pela conversão.  | Esperar. A tela se atualiza sozinha.                                                                                           |
| **Separando os slides**   | O sistema lê texto, notas e imagem de cada slide e acha os pedidos. | Esperar.                                                                                                                       |
| **Planejando as peças**   | A IA planeja cada tarefa. "Uma aula inteira leva alguns minutos."   | Esperar.                                                                                                                       |
| **Plano pronto**          | As tarefas estão prontas para a sua decisão.                        | [Conferir o plano](conferir-plano.md) e clicar em **Liberar geração**.                                                         |
| **Falhou**                | O lote parou. O motivo aparece num aviso vermelho.                  | Ver **Se der errado**. Para recomeçar, use **Apagar e enviar de novo**. Veja [Como apagar um lote que falhou](apagar-lote.md). |
| **Gerando as peças**      | As peças são escritas e testadas, uma de cada vez.                  | Esperar. Nos vídeos, aprovar o roteiro e as imagens na tela de cada um. Veja [Como produzir um vídeo](produzir-video.md).      |
| **Peças geradas**         | Nenhuma tarefa está gerando.                                        | Abrir cada peça, conferir a prévia e [enviar para a revisão](enviar-para-revisao.md).                                          |

4. Para ver os slides, abra **Todos os slides (N)** no fim da tela. Cada slide mostra a miniatura, o número e um selo: **Conteúdo**, **Pedido** ou **Referência**. Slides ocultos levam o selo **Oculto**. Notas do apresentador aparecem como "Notas: …".

## O que acontece depois

Com **Plano pronto**, a tela mostra o resumo da aula, por exemplo "34 slides, 14 com pedidos do professor, que formam 13 tarefas.", e o custo do plano por IA em dólar. Depois disso, o quadro **Decisão do plano** aparece logo abaixo.

Durante **Gerando as peças**, você não consegue aprovar nem editar tarefas, e **Liberar geração** fica desativado. Quando o lote volta a **Peças geradas**, você pode aprovar mais tarefas e liberar de novo.

## Se der errado

**Mensagens de falha (aviso vermelho):**

- "O arquivo da aula não pôde ser processado." ou o motivo dado pelo antivírus: o arquivo está corrompido ou foi recusado. Abra o arquivo no computador, salve de novo e envie outra vez.
- "Não encontramos slides nem páginas neste arquivo.": o arquivo está vazio ou não tem texto legível. Confira o arquivo e envie de novo.
- "Não foi possível preparar este lote agora. Tente enviar de novo em alguns minutos.": o servidor falhou várias vezes seguidas. Espere e envie a aula de novo.

O lote que falhou não tem botão para tentar de novo. Abaixo do aviso vermelho aparece **Apagar e enviar de novo**: ele apaga o lote e volta para **Produção de aulas**, onde você envia a aula outra vez em **Novo lote**. Veja [Como apagar um lote que falhou](apagar-lote.md). Se não apagar, o lote antigo continua na lista.

**Avisos amarelos (o lote segue, mas com limite):**

- "Não deu para ligar as páginas do PDF aos slides: as imagens dos slides não vão aparecer.": as miniaturas ficam como "Sem imagem". A IA planeja só com o texto.
- "O plano por IA não está disponível (falta a chave do Claude). As tarefas vieram só da detecção dos pedidos.": as tarefas aparecem sem plano. Defina o tipo de cada uma em **Editar**. Veja [Como configurar o servidor](configurar-servidor.md).
- "Esta aula não tem pedidos do professor e o plano por IA não está disponível: não há tarefas para propor.": o lote fica com "Nenhuma tarefa neste lote.". Configure a chave da Claude e envie a aula de novo.
- "1 tarefa ficou sem plano da IA." ou "N tarefas ficaram sem plano da IA.": defina o tipo dessas tarefas à mão.

**A tela não muda há muito tempo:** recarregue a página. Se o lote continuar em **Verificando o arquivo** ou **Planejando as peças** por mais de meia hora, avise a equipe técnica para conferir o worker (a confirmar o tempo normal em produção).

## Veja também

- [Como conferir o plano](conferir-plano.md)
- [Como enviar a aula e criar o lote](enviar-aula.md)
- [Como apagar um lote que falhou](apagar-lote.md)
- [Como configurar o servidor para a produção](configurar-servidor.md)

# Como produzir um vídeo com narração

O vídeo é a peça que gasta créditos: por isso ele passa por duas aprovações suas, o roteiro e as imagens, antes de animar, narrar e montar.

**Quem pode:** Admin, com a verificação em duas etapas ativa. **Onde:** tela da peça de vídeo (`/admin/producao/<lote>/tarefas/<tarefa>`), seção **Mídia do vídeo**.

## Antes de começar

- A tarefa precisa ser do tipo **Vídeo com narração**, aprovada e liberada. Veja [Como conferir o plano](conferir-plano.md).
- A disciplina precisa de uma voz de narração e a cota do dia precisa ter saldo. Veja [Como escolher a voz e a cota diária](configurar-vozes-e-cota.md).
- Custos de referência: uma imagem custa 2 créditos e um clipe de 8 segundos custa 14. O vídeo tem no máximo 8 cenas. Uma aula com 2 vídeos fica entre 150 e 250 créditos.

## Passo a passo

### 1. Aprovar o roteiro (nada é pago ainda)

1. Na tela do lote, clique em **Abrir a peça** ou **Acompanhar a geração** na tarefa de vídeo.
2. Enquanto o selo mostra **Escrevendo o roteiro**, espere. A tela se atualiza sozinha.
3. Com **Roteiro para aprovar**, leia cada cena em **Roteiro para aprovar**. Quando uma cena usa a imagem de outra (o mesmo paciente), aparece "usa a imagem de …".
4. Ajuste o que precisar em cada cena:
   - **Narração da cena N**: o que a voz fala. Ela vira a legenda palavra por palavra. Confira os termos técnicos.
   - **Imagem da cena N**: descrição da imagem, em inglês e sem texto dentro da imagem.
   - **Movimento do clipe da cena N**: como a imagem se move no clipe.
   - **Rótulos da cena N** (opcional): até 3, separados por ponto e vírgula. Eles entram no alto do vídeo na montagem.
5. Clique em **Aprovar roteiro e gerar imagens**.
6. Se o roteiro todo estiver ruim, abra **Pedir outro roteiro**, escreva o **Pedido de ajuste** (opcional) e clique em **Escrever outro roteiro**.

### 2. Aprovar as imagens (antes de animar)

1. O selo muda para **Gerando as imagens**. Cada cena mostra **Imagem: Gerando** e depois **Imagem: Pronta**.
2. Com **Imagens para aprovar**, confira cada imagem em **Cenas**:
   - a anatomia está correta;
   - não há texto dentro da imagem;
   - nas cenas que usam outra como referência, é o mesmo paciente.
3. Para trocar uma imagem, clique em **Refazer imagem**, reescreva a **Descrição da imagem** e clique em **Pedir nova imagem**. Cada novo pedido gasta créditos.
4. Quando todas estiverem certas, clique em **Aprovar imagens e animar**.

### 3. Clipes, narração e montagem (andam sozinhos)

1. O selo passa por **Animando os clipes**, **Gravando a narração** e **Montando o vídeo**. A tela se atualiza sozinha.
2. Ouça a **Narração** e assista ao **Vídeo montado** quando aparecerem.
3. Com **Vídeo pronto**, a tarefa vira **Peça pronta** e a **Prévia da versão N** mostra a peça com o vídeo nos dois temas.

## O que acontece depois

O vídeo vira uma versão da peça, como as outras. O topo de **Mídia do vídeo** soma os créditos gastos nesta tarefa. A peça segue para a revisão como qualquer outra. Veja [Como enviar as peças para a revisão](enviar-para-revisao.md).

Se aparecer um aviso no alto de **Mídia do vídeo**, veja [Como retomar um vídeo pausado](retomar-video.md).

## Se der errado

| Mensagem                                                                                                                               | O que fazer                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| "O roteiro não tem cenas.", "O roteiro passa de 8 cenas.", "A cena "…" não tem narração." ou "A cena "…" não tem descrição da imagem." | Corrija o roteiro e aprove de novo.                                                 |
| "Rótulo longo demais na cena "…""                                                                                                      | Use rótulos de até 40 caracteres.                                                   |
| "A cena "…" usa como referência uma cena que não vem antes dela."                                                                      | Peça outro roteiro com **Pedir outro roteiro**. A ordem das cenas não muda na tela. |
| "Refaça antes a imagem de: …"                                                                                                          | Uma imagem falhou. Use **Refazer imagem** nela antes de aprovar.                    |
| "A moderação da Higgsfield recusou a imagem. Reescreva a descrição."                                                                   | Use **Refazer imagem** com outra descrição.                                         |
| "O roteiro deste vídeo não está esperando aprovação." ou "As imagens deste vídeo não estão esperando aprovação."                       | A etapa já mudou. Recarregue a página.                                              |
| Tarefa **Falhou** com "O roteiro do vídeo não está disponível (falta a chave do Claude)…"                                              | Peça a chave da Claude no worker e use [Gerar de novo](gerar-de-novo.md).           |
| Tarefa **Falhou** com "A IA recusou escrever este roteiro. Revise o pedido e gere de novo."                                            | Use [Gerar de novo](gerar-de-novo.md) com um pedido de ajuste.                      |
| "Não deu para concluir agora."                                                                                                         | Tente de novo em instantes.                                                         |

## Veja também

- [Como retomar um vídeo pausado](retomar-video.md)
- [Como escolher a voz e a cota diária](configurar-vozes-e-cota.md)
- [Como configurar o servidor para a produção](configurar-servidor.md)

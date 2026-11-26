# Como lançar notas

Você cadastra as avaliações da disciplina, lança as notas e acompanha a média. É o seu acompanhamento: o registro oficial é o da instituição.

**Quem pode:** aluno dono da disciplina. **Onde:** **Notas** (`/app/notas`) e a página de cada disciplina (`/app/notas/(id)`). No Meu Espaço, pelo menu **Notas**; na visão da disciplina, pelo cartão **Notas** ou pelo menu **Notas e calculadora**.

**Chave de módulo:** **Notas e calculadora (NOT)** (`notas`). O botão de pedido de revisão depende também de **Equilíbrio (EQU)**.

## Antes de começar

- Cadastre a disciplina. Veja [Como cadastrar uma disciplina](cadastrar-disciplina.md).
- Provas, atividades e entregas que vieram do cronograma ou foram criadas na agenda já aparecem como avaliações.

## Passo a passo

### Configurar o cálculo (uma vez)

1. Abra **Notas** e clique em **Ver notas** na disciplina.
2. No quadro **Configuração do cálculo**, escolha a **Fórmula da média**: **Média aritmética simples**, **Média ponderada por pesos** ou **Composição por porcentagem**.
3. Em **Média mínima de aprovação**, digite a média (por exemplo, 7 ou 6,5).
4. Clique em **Salvar configuração**.

### Cadastrar uma avaliação

1. No quadro **Avaliações**, vá até **Cadastrar avaliação**.
2. Preencha **Nome da atividade ou prova**.
3. Escolha o **Tipo**: **Prova**, **Atividade** ou **Trabalho ou entrega**.
4. Preencha a **Data**.
5. Se já tem a nota, preencha **Nota (0 a 10)**. Vazio fica pendente.
6. Com pesos ou porcentagem, preencha **Peso** ou **Porcentagem**.
7. Clique em **Adicionar avaliação**.

### Lançar ou corrigir uma nota

1. Na lista **Avaliações**, clique em **Editar** ao lado da avaliação.
2. Preencha **Nota de (avaliação) (0 a 10)**. Vazio deixa pendente.
3. Com pesos ou porcentagem, ajuste **Peso de (avaliação)** ou **Porcentagem de (avaliação)**.
4. Clique em **Salvar nota**.

## O que acontece depois

- O quadro **Meu desempenho** mostra **Média atual**, **Média mínima** e **Avaliações lançadas**, e uma frase da situação, como "Para chegar a 7, você precisa de 6,5 em média nas avaliações restantes."
- A média atual considera só as notas lançadas. Avaliação sem nota fica pendente, não vale zero.
- Com duas ou mais notas, aparece o gráfico das notas por avaliação, com a linha tracejada da média mínima.
- A etiqueta **Em risco** aparece quando a média ainda é alcançável, mas a nota necessária é maior que a média já lançada ou maior que 8.
- Nota abaixo da mínima, com o Equilíbrio ligado, mostra **Pedir revisão do conteúdo de (avaliação)**. Veja [Como pedir uma revisão ao Equilíbrio](pedir-revisao-ao-equilibrio.md).
- A avaliação cadastrada aqui também aparece na agenda e gera aviso na véspera.
- Esta tela não tem botão para excluir avaliação. Com a agenda ligada, exclua pela janela do evento na agenda. Veja [Como editar um evento ou uma série na agenda](editar-evento-na-agenda.md).

## Se der errado

| Mensagem                                                                                                                        | O que fazer                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| "As porcentagens somam N%; para a média final, a soma precisa ser 100%."                                                        | Ajuste as porcentagens das avaliações.                                                           |
| "Com as avaliações restantes, a média de (mínima) não é mais alcançável. Vale conferir as regras de recuperação da disciplina." | Confira com a instituição as regras de recuperação.                                              |
| "Nenhuma avaliação cadastrada."                                                                                                 | Cadastre a primeira em **Cadastrar avaliação**.                                                  |
| "Cadastre suas disciplinas para acompanhar as notas."                                                                           | Cadastre uma disciplina antes.                                                                   |
| "Não deu para salvar agora."                                                                                                    | Confira os números (use vírgula ou ponto) e tente de novo. A mensagem aparece no quadro lateral. |
| Página não encontrada                                                                                                           | A chave **Notas e calculadora (NOT)** está desligada ou a disciplina foi arquivada.              |

## Veja também

- [Como calcular a média final](calcular-media-final.md)
- [Como usar a visão da disciplina](usar-visao-da-disciplina.md)
- [Como criar um evento na agenda](criar-evento-na-agenda.md)

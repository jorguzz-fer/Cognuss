# Como conferir o cronograma antes de ir para a agenda

A conferência mostra cada item que a IA leu no cronograma. Você corrige, tira o que não quer e só então leva para a agenda.

**Quem pode:** aluno dono da disciplina. **Onde:** `/app/minhas-disciplinas/cronograma/(id da leitura)`, aberta pelo botão **Conferir o cronograma** no cartão da disciplina. No primeiro acesso, a mesma tela abre em `/comecar/cronograma/(id)`.

**Chave de módulo:** **Minhas disciplinas e cronogramas (DIS)** (`disciplinas`) ou, no primeiro acesso, **Cadastro inicial (CAD)**.

## Antes de começar

- A leitura precisa estar pronta. Veja [Como importar o cronograma](importar-cronograma.md).

## Passo a passo

1. No cartão da disciplina, clique em **Conferir o cronograma**. A tela **Conferir cronograma** mostra a disciplina, o nome do arquivo e "Nada muda sem a sua confirmação."
2. Se houver o quadro **Pontos de atenção na leitura**, leia os avisos da IA.
3. Para cada item da lista, confira os campos **Data**, **Início**, **Fim**, **Tipo**, **Título**, **Tema**, **Docente** e **Local**. Os tipos são **Aula**, **Prática**, **Prova**, **Atividade**, **Entrega** e **Outro (feriado, recesso, evento)**.
4. Itens com a etiqueta **Confira com atenção** foram lidos com pouca certeza. Abra **De onde saiu** para ver o trecho do arquivo.
5. Para deixar um item de fora, desmarque **Levar para a agenda**.
6. Para incluir algo que faltou, clique em **Adicionar item** e preencha. Um item adicionado à mão pode ser retirado com **Tirar este item**.
7. Se já existia cronograma confirmado, cada item mostra **Novo**, **Muda: (campos)**, **Sem mudança** ou **Você editou: fica a sua versão**. O quadro **Não estão neste cronograma** lista o que sai da agenda ("Ao confirmar, saem da agenda:") e o que fica porque você editou.
8. Clique em **Confirmar e levar para a agenda (N)**, onde N é o número de itens marcados.
9. Se a leitura não serve, clique em **Descartar esta leitura**. Nada muda na agenda.

## O que acontece depois

- A tela mostra o resumo, por exemplo "Pronto. 12 itens incluídos, 0 alterados e 0 removidos na agenda."
- Aulas e provas aparecem na agenda, na visão da disciplina, nas faltas (dias de aula) e nas notas (avaliações).
- Na agenda, cada evento importado mostra "Veio do cronograma." Se você mudar um evento, o próximo cronograma não sobrescreve a sua versão.
- No primeiro acesso, as aulas confirmadas já aparecem na grade da etapa **Minha rotina**.
- Para voltar, use **Voltar para Minhas disciplinas** (ou **Voltar para as disciplinas**, no primeiro acesso).

## Se der errado

| Mensagem                                                                                                 | O que fazer                                                                     |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| "Informe uma data válida."                                                                               | Corrija a data do item.                                                         |
| "Hora de início no formato HH:MM." ou "Hora de fim no formato HH:MM."                                    | Corrija o horário.                                                              |
| "O fim precisa ser depois do início."                                                                    | Ajuste os horários.                                                             |
| "Informe o início antes do fim."                                                                         | Preencha o início ou apague o fim.                                              |
| "Informe o título."                                                                                      | Dê um título ao item.                                                           |
| "Corrija os itens destacados para confirmar."                                                            | O botão de confirmar fica desligado até todos os itens marcados estarem certos. |
| "Não encontramos datas neste arquivo. Você pode adicionar os itens à mão abaixo ou descartar a leitura." | Adicione os itens com **Adicionar item** ou descarte.                           |
| "A leitura precisa da sua autorização. Autorize no cartão da disciplina."                                | Volte ao cartão e clique em **Autorizar a leitura**.                            |
| "Esta leitura foi descartada. Nada mudou na agenda."                                                     | Envie o cronograma de novo para uma nova leitura.                               |
| "Este cronograma já foi confirmado." ou "Este cronograma já foi conferido e está na agenda."             | Não há o que fazer. Para mudar, envie um cronograma novo.                       |
| "Esta leitura não está pronta para confirmar."                                                           | Espere a leitura terminar e recarregue.                                         |

## Veja também

- [Como importar o cronograma](importar-cronograma.md)
- [Como consultar a agenda](consultar-agenda.md)
- [Como editar um evento ou uma série na agenda](editar-evento-na-agenda.md)

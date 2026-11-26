# Como registrar faltas

O controle de faltas mostra, em horas-aula, quanto você já faltou e quanto ainda pode faltar em cada disciplina. É um controle pessoal: a frequência oficial é a da instituição.

**Quem pode:** aluno dono da disciplina. **Onde:** **Faltas** (`/app/faltas`) e a página de cada disciplina (`/app/faltas/(id)`). No Meu Espaço, pelo menu **Faltas**; na visão da disciplina, pelo cartão **Faltas na disciplina** ou pelo menu **Faltas**. Sem o Meu Espaço, pelo atalho **Faltas** no alto da tela **Hoje** (`/app`).

**Chave de módulo:** **Faltas (FAL)** (`faltas`). O botão **Pedir revisão da aula perdida** depende também de **Equilíbrio (EQU)**.

## Antes de começar

- Cadastre a disciplina. Veja [Como cadastrar uma disciplina](cadastrar-disciplina.md).
- Os dias de aula vêm do cronograma conferido. Sem cronograma, você marca os dias da semana na configuração.

## Passo a passo

### Configurar a disciplina (uma vez)

1. Abra **Faltas** e clique no nome da disciplina.
2. No quadro **Configuração da disciplina**, preencha **Carga horária (horas-aula)**.
3. Em **Frequência mínima exigida**, escolha a porcentagem, por exemplo **75% (até 25% de faltas)**. Confira a regra da sua instituição.
4. Preencha **Horas-aula por encontro** (o padrão é 2).
5. Sem cronograma, marque em **Dias de aula (sem cronograma)** os dias da semana em que há aula.
6. Clique em **Salvar configuração**.

### Registrar uma falta

1. No calendário do mês, os dias de aula aparecem marcados como **aula**. Use **Mês anterior** e **Próximo mês** para navegar.
2. Clique no dia em que você faltou.
3. No quadro **Registrar ausência em (data)**, confira **Horas-aula perdidas**. A dica mostra quantas horas-aula a aula tem.
4. Se quiser, escreva uma **Observação**.
5. Clique em **Registrar falta**.

### Corrigir ou remover

- Clique num dia marcado como **falta**, ajuste e clique em **Atualizar registro**, ou clique em **Remover registro**.
- Na tabela **Minhas faltas**, clique em **Remover** na linha da falta.
- Nos dois casos, a tela pergunta "Remover esta falta?". Clique em **Confirmar exclusão** para remover ou em **Cancelar** para desistir.

## O que acontece depois

- O quadro **Indicadores** mostra **Limite de faltas**, **Minhas faltas** e **Restantes**, em horas-aula, e a porcentagem do limite usada.
- A etiqueta mostra **Dentro do limite**, **Perto do limite**, **No limite** ou **Acima do limite**.
- Ao chegar a 50%, 75% e 90% do limite, chega um aviso. Veja [Como ver os avisos](ver-avisos.md).
- Com o Equilíbrio ligado, cada falta tem **Pedir revisão da aula perdida**. Veja [Como pedir uma revisão ao Equilíbrio](pedir-revisao-ao-equilibrio.md).
- A página **Faltas** mostra o resumo de todas as disciplinas, como "4 de 15 horas-aula de falta permitidas (27% do limite)."
- Registrar uma justificativa aqui não significa abono.

## Se der errado

| Mensagem                                                                                       | O que fazer                                                                  |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| "Configure a carga horária e a frequência mínima da disciplina para ver o limite."             | Preencha e salve a **Configuração da disciplina**.                           |
| "Configure a disciplina antes de registrar."                                                   | O botão **Registrar falta** só funciona depois da configuração.              |
| "Nenhum dia de aula neste mês. Os dias vêm do cronograma ou dos dias de aula da configuração." | Confira o cronograma ou marque os **Dias de aula (sem cronograma)**.         |
| "Cadastre suas disciplinas para controlar as faltas."                                          | Cadastre uma disciplina antes.                                               |
| "Ainda sem configuração."                                                                      | A disciplina ainda não foi configurada. Abra e configure.                    |
| "Não deu para salvar agora."                                                                   | Tente de novo. A mensagem aparece no quadro lateral, abaixo da configuração. |
| "Esta página não está disponível"                                                              | A chave **Faltas (FAL)** está desligada ou a disciplina foi arquivada.       |

## Veja também

- [Como usar a visão da disciplina](usar-visao-da-disciplina.md)
- [Como acompanhar uma aula](acompanhar-aula.md), onde **Não fui** leva ao registro da falta
- [Como pedir uma revisão ao Equilíbrio](pedir-revisao-ao-equilibrio.md)
- [Como ligar e desligar módulos da v2](../admin/ligar-e-desligar-funcionalidades.md), no guia do admin

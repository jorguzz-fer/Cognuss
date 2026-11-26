# Como criar um evento na agenda

Na agenda você cria aulas, provas, entregas, compromissos e horários de estudo ou lazer. Compromissos podem se repetir.

**Quem pode:** aluno com cadastro concluído. **Onde:** `/app/agenda`, botão **Novo evento** ou o **+** de cada dia.

**Chave de módulo:** **Agenda e calendário (CAL)** (`agenda`).

## Antes de começar

- Para criar **Aula**, **Prática**, **Prova**, **Atividade** ou **Entrega ou trabalho**, é preciso ter a disciplina cadastrada. Veja [Como cadastrar uma disciplina](cadastrar-disciplina.md).
- Aulas que já vieram do cronograma não precisam ser criadas de novo.

## Passo a passo

1. Abra **Agenda** e clique em **Novo evento**, ou no **+** do dia (**Novo evento em (dia)**). A janela **Novo evento** abre.
2. Em **Tipo**, escolha: **Compromisso**, **Estudo**, **Revisão**, **Aula**, **Prática**, **Prova**, **Atividade**, **Entrega ou trabalho**, **Lazer**, **Descanso** ou **Outro**.
3. Em **Título**, digite o nome do evento.
4. Em **Disciplina**, escolha a disciplina. É obrigatória para aula, prática, prova, atividade e entrega; nos outros tipos, pode ficar **Nenhuma**.
5. Preencha **Data**, **Início** e **Fim**. Prova, atividade e entrega têm só **Início**. Para o dia inteiro, marque **Dia todo**.
6. Complete conforme o tipo:
   - **Aula** e **Prática**: **Local** (opcional).
   - **Prova**, **Atividade** e **Entrega ou trabalho**: **Conteúdo cobrado** (opcional).
   - Os demais: **Observações** (opcional).
7. Para repetir (só compromisso, estudo, revisão, lazer, descanso e outro), use **Repetição**:
   - **Não repete**, **Toda semana**, **Todo dia** ou **Todo mês**.
   - Em **Toda semana**, marque os dias (**Dom** a **Sáb**). O dia da data já vem marcado.
   - Em **Até** (opcional), escolha a data final da série.
8. Clique em **Salvar**. **Cancelar** fecha sem salvar.

## O que acontece depois

- O evento aparece na agenda, na visão da disciplina e, se for aula ou avaliação, nas faltas e nas notas.
- Prova, atividade e entrega criadas aqui são as mesmas avaliações da tela **Notas**.
- Com a chave **Alertas e lembretes (LEM)** ligada e os avisos acadêmicos ativos, a aula gera aviso 30 minutos antes e a avaliação gera aviso na véspera, às 9h. Veja [Como ver os avisos](ver-avisos.md).
- Eventos com horário criados aqui ocupam o tempo, inclusive os de **Estudo** e **Revisão**. O Equilíbrio não propõe sessão por cima deles. Eventos de **Dia todo** não ocupam horário. Os horários em que o Equilíbrio pode propor estudo vêm só dos blocos de estudo da rotina. Veja [Como montar a rotina semanal](montar-rotina-semanal.md).

## Se der errado

| Mensagem                                             | O que fazer                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| O navegador pede para preencher **Disciplina**       | Escolha a disciplina. Aula e avaliação sempre pertencem a uma disciplina. |
| "Não deu para salvar agora." ou mensagem do servidor | Confira os campos e tente de novo.                                        |
| Não há disciplinas na lista                          | Cadastre a disciplina antes.                                              |
| "Este recurso ainda não está disponível."            | A chave **Agenda e calendário (CAL)** está desligada.                     |

## Veja também

- [Como editar um evento ou uma série na agenda](editar-evento-na-agenda.md)
- [Como consultar a agenda](consultar-agenda.md)
- [Como lançar notas](lancar-notas.md)
- [Como criar um lembrete](criar-lembrete.md), para o que não ocupa horário

# Como ler as métricas

Mostra como o piloto está indo: quantos estudantes estudam de fato, se voltam, quanto praticam e quais questões merecem revisão.

**Quem pode:** Admin. **Onde:** Admin → Métricas, `/admin/metricas`.

## Passo a passo

1. No menu lateral, clique em **Métricas**.
2. Leia os cartões do topo. Valem os últimos 7 dias, salvo quando o cartão diz outra coisa. "Estudo ativo" é responder questão ou revisar cartão; entrar e navegar não contam.
   - **Estudantes ativos na semana (WALS)**: quantas pessoas tiveram estudo ativo nos últimos 7 dias. É a métrica norteadora.
   - **Ativação (onboarding concluído)**: entre todas as contas criadas desde o início, quantas concluíram o primeiro acesso.
   - **Retenção D1**: entre quem criou conta há pelo menos 1 dia, quantos estudaram no dia seguinte ao cadastro.
   - **Retenção D7**: o mesmo, no sétimo dia depois do cadastro. Meta do piloto: 40% ou mais.
   - **Questões por estudante ativo**: meta do piloto: 20 ou mais por semana.
   - **Acerto nas questões**: respostas certas sobre o total da semana.
   - **Revisões de flashcard** e **Flashcards criados** na semana.
3. Veja o gráfico **Estudantes ativos por dia (14 dias)**. Passe o mouse ou o foco do teclado sobre uma barra para ver o número do dia. Clique em **Ver como tabela** para ver os mesmos números em lista.
4. Em **Questões com menor acerto**, veja as 5 questões com pior taxa de acerto, entre as que têm 5 respostas ou mais. Clique numa questão para abrir a tela dela.
5. Em **Recomendações mostradas, por motivo**, veja quantas vezes cada motivo de recomendação apareceu para os alunos na semana: Revisões vencidas, Prova próxima com assunto fraco, Prova próxima sem dados, Sem diagnóstico, Assunto fraco, Menos praticado e Sem conteúdo.

## O que acontece depois

- Os números vêm direto do banco, sem estimativa.
- Com menos de 20 casos na base, o cartão mostra "x de y" e "amostra pequena: sem porcentagem", para não enganar.
- Sem nenhum caso, o cartão mostra "sem base ainda".
- Uma questão com acerto muito baixo pode ter gabarito ou enunciado com problema. Para corrigir, veja [Criar uma nova versão de uma questão](criar-nova-versao-de-questao.md).
- A lista de questões com menor acerto considera todas as respostas desde o início, não só a semana.
- Os dias do gráfico seguem o horário de Brasília.

## Se der errado

- Tudo zerado: ninguém respondeu questão nem revisou cartão no período. As atividades da v2, como agenda, materiais e rotina, não contam como estudo ativo nestes números.
- "Ainda não há questões com respostas suficientes.": nenhuma questão tem 5 respostas ainda.
- "Nenhuma nesta semana.": nenhuma recomendação foi mostrada nos últimos 7 dias.

## Veja também

- [O fluxo editorial de uma questão](publicar-questao.md)
- [Criar uma nova versão de uma questão](criar-nova-versao-de-questao.md)
- [Acompanhar os custos de IA](acompanhar-custos-de-ia.md)

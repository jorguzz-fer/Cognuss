# Como acompanhar os custos de IA

Mostra quanto a plataforma gastou com IA, no total e por recurso, para decidir se algum recurso precisa ser desligado.

**Quem pode:** Admin. **Onde:** Admin → Custos de IA, `/admin/ia`.

## Passo a passo

1. No menu lateral, clique em **Custos de IA**.
2. Leia os quatro totais no topo, em dólares: **Últimas 24 horas**, **Últimos 7 dias**, **Últimos 30 dias** e **Este mês** (desde o dia 1, no horário de Brasília).
3. Na tabela **Por recurso, nos últimos 30 dias**, veja cada recurso nas colunas:
   - **Chamadas**: quantas vezes a IA foi chamada;
   - **Alunos**: quantos alunos diferentes usaram;
   - **Custo** e **Custo por aluno**;
   - **Recusas**: respostas em que a IA se recusou a responder;
   - **Tokens (entrada / saída)**.
4. A tabela vem do recurso mais caro para o mais barato.

## O que acontece depois

- Os valores são estimados pela tabela de preços. A fatura real é a do console da Anthropic.
- Os recursos que aparecem na tabela incluem: Leitura do cronograma, Criar com IA (resumo, flashcards, questões, mapa mental, roteiro, análise de provas), Tutor sobre os materiais, Tutor do módulo (MVP), Produção de aulas: plano das peças, Busca por conceito (vetores dos materiais e buscas) e Leitura dos certificados.
- Se o gasto do mês passar do valor do alerta, a tela mostra um aviso no topo com o total e o limite.
- Não existe teto por aluno durante o QA. O alerta avisa e não bloqueia ninguém.

## Se der errado

- "Nenhum uso de IA nos últimos 30 dias.": ninguém usou IA no período, ou a chave da IA não está configurada no servidor. Veja o aviso em [Configurar o tutor IA](configurar-tutor.md).
- O valor diverge da fatura: é esperado. A tela estima pela tabela de preços; confira o console da Anthropic.

## Veja também

- [Ligar e desligar os recursos de IA e o alerta de gasto](configurar-recursos-de-ia.md)
- [Configurar o tutor IA](configurar-tutor.md)
- [Produção de aulas](../producao/)

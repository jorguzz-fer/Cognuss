# Como ligar e desligar os recursos de IA e o alerta de gasto

Desliga na hora um recurso de IA que está gastando demais ou dando problema, e define o valor que dispara o alerta de gasto do mês.

**Quem pode:** Admin. **Onde:** Admin → Custos de IA, quadro **Recursos e alerta**, `/admin/ia`.

## Passo a passo

1. No menu lateral, clique em **Custos de IA**.
2. Desça até o quadro **Recursos e alerta**.
3. Em **Ligados para os alunos**, marque o que deve ficar ligado e desmarque o que deve parar:
   - **Leitura do cronograma**
   - **Criar com IA**
   - **Tutor sobre os materiais**
   - **Busca por conceito (Voyage AI)**
   - **Leitura dos certificados (Competências)**
4. Em **Alerta quando o gasto do mês passar de (US$)**, escreva o valor, por exemplo 50 ou 12,50. Vazio ou zero desliga o alerta.
5. Clique em **Salvar**.

O tutor do módulo (MVP) não está nesta lista. Ele tem a configuração própria em [Configurar o tutor IA](configurar-tutor.md).

## O que acontece depois

- Aparece o aviso "Configuração salva.".
- Desligar vale na hora: pedidos novos não entram, e os que já estão na fila terminam com aviso. O aluno vê mensagens como:
  - Criar com IA: "A criação com IA está pausada no momento. Tente de novo mais tarde."
  - Tutor sobre os materiais: "O tutor está pausado no momento. Tente de novo mais tarde."
  - Leitura do cronograma: "A leitura automática do cronograma está pausada no momento. Você pode cadastrar as aulas à mão ou tentar de novo mais tarde."
  - Leitura dos certificados: "A leitura automática está pausada pela equipe. Preencha os campos à mão."
  - Busca por conceito: a busca por conceito para e a busca por palavra continua.
- O alerta: o worker confere o gasto um minuto depois de iniciar e depois a cada hora. Quando o gasto do mês passa do valor, manda um e-mail para todas as contas com papel Admin, uma vez por mês. O e-mail tem o assunto "Gasto com IA passou de <valor> em <mês>" e diz que nenhum aluno foi bloqueado.
- O quadro mostra **Alertas enviados**, com o mês, o gasto e o limite.
- Sem o serviço de e-mail configurado no worker (chave do Resend), o alerta vai só para o log do worker.
- Se você aumentar o valor depois que o alerta do mês já saiu, não sai outro alerta naquele mês.
- A mudança fica na auditoria.

## Se der errado

- "Use um valor em dólares, como 50 ou 12,50.": use só números, com até duas casas decimais.
- O alerta não chegou: confira se o valor está preenchido, se o worker está rodando e se o e-mail está configurado.

## Veja também

- [Acompanhar os custos de IA](acompanhar-custos-de-ia.md)
- [Configurar o tutor IA](configurar-tutor.md)
- [Ligar e desligar módulos da v2](ligar-e-desligar-funcionalidades.md)
- [Área do aluno](../aluno/)

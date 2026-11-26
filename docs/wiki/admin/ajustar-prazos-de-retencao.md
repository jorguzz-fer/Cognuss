# Como ajustar os prazos de retenção e rodar a limpeza

Define por quanto tempo a plataforma guarda cada tipo de dado e roda a limpeza na hora, sem esperar o próximo deploy.

**Quem pode:** Admin. **Onde:** Admin → Privacidade, quadro **Prazos de retenção**, `/admin/privacidade`.

## Antes de começar

- Os valores atuais são de rascunho e serão confirmados na revisão jurídica. Combine qualquer mudança com quem responde pela LGPD.

## Passo a passo

### Mudar os prazos

1. No menu lateral, clique em **Privacidade**.
2. No quadro **Prazos de retenção**, ajuste:
   - **Texto das conversas com o tutor (dias)**: mínimo 30. Padrão 365.
   - **Eventos de uso (dias)**: mínimo 90. Padrão 730.
   - **Auditoria (dias)**: mínimo 365. Padrão 1825.
   - **Prazo para desistir da exclusão (dias)**: de 0 a 15. Padrão 15.
3. Clique em **Salvar prazos**.

### Rodar a limpeza agora

1. No mesmo quadro, clique em **Rodar limpeza agora**.
2. Ao lado do botão, a tela mostra quando foi a última: "Última: <data>." ou "Ainda não rodou neste banco.".

## O que acontece depois

- Ao salvar: aviso "Prazos salvos.". Os prazos novos aparecem na política de privacidade pública.
- Ao rodar a limpeza, o aviso resume o que foi feito, por exemplo: "Limpeza feita: 12 mensagens do tutor apagadas, 300 eventos, 0 registros de auditoria, 45 sessões e códigos vencidos, 1 conta excluída.". Cada número usa singular ou plural conforme o caso, como "1 mensagem do tutor apagada" ou "1 sessão ou código vencido". Se alguma conta de admin ficou de fora, o aviso termina com "(1 conta de admin ficou para revisão)" ou "(N contas de admin ficaram para revisão)".
- A limpeza:
  - apaga o texto das conversas do tutor mais antigas que o prazo (o registro da mensagem fica, sem o texto);
  - apaga eventos de uso e registros de auditoria fora do prazo;
  - apaga sessões e códigos vencidos;
  - executa as exclusões de conta cujo prazo de desistência acabou. Contas com papel Admin ficam para revisão.
- A limpeza também roda a cada deploy e, se a engenharia agendou, todo dia no Coolify. Sem a tarefa diária, as exclusões vencidas só acontecem no deploy ou quando alguém clica no botão.
- O prazo de desistência vale para todos os pedidos abertos. A data que o aluno vê em Privacidade é recalculada com o prazo novo.
- Tudo fica na auditoria.

## Se der errado

- "Conversas: no mínimo 30 dias.", "Eventos: no mínimo 90 dias." ou "Auditoria: no mínimo 1 ano.": o valor está abaixo do mínimo.
- "A LGPD dá 15 dias para responder: no máximo 15.": o prazo de desistência não pode passar de 15 dias.
- "Use 0 ou mais.": o prazo de desistência não pode ser negativo.
- "Sua conta não tem permissão para essa ação.": sua conta não é admin.

## Veja também

- [Excluir uma conta](excluir-conta.md)
- [Atender um pedido LGPD](responder-pedido-lgpd.md)
- [Ver as conversas do tutor](ver-conversas-do-tutor.md)

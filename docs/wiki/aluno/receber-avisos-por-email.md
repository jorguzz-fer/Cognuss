# Como receber avisos por e-mail e definir o horário silencioso

Além da plataforma, os avisos podem chegar no e-mail da sua conta. Você escolhe se quer e-mail, um horário sem e-mail e um máximo por dia.

**Quem pode:** aluno com cadastro concluído. **Onde:** **Avisos** (`/app/avisos`), quadro **Como avisar**.

**Chave de módulo:** **Alertas e lembretes (LEM)** (`lembretes`). O envio depende também do worker e do serviço de e-mail configurados no servidor.

## Passo a passo

1. Abra **Avisos** pelo sino no topo.
2. No quadro **Como avisar**:
   1. Marque **Avisos de aulas, provas e entregas** para receber os alertas acadêmicos automáticos.
   2. Marque **Receber também por e-mail**.
   3. Em **Horário silencioso**, marque **Não mandar e-mail neste período** e escolha **Das** e **Até** (o padrão é das 22:00 às 07:00).
   4. Em **No máximo, e-mails por dia**, digite um número de 1 a 50.
3. Clique em **Salvar preferências**.

## O que acontece depois

- A tela mostra "Preferências salvas."
- Na plataforma, os avisos sempre aparecem em **Avisos**. O e-mail vai para o endereço da sua conta.
- No horário silencioso, o e-mail espera e sai depois que o período acaba.
- Passado o máximo do dia, os avisos seguintes ficam só na plataforma.
- Um aviso que não saiu em 24 horas não é mais enviado por e-mail. Ele continua na plataforma.
- O e-mail só sai para conta com e-mail confirmado.

## Se der errado

| Situação                                                | O que fazer                                                                                                                                                                                                                                                |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O e-mail não chega                                      | Confira spam e promoções. Confira se **Receber também por e-mail** está marcado e se o aviso não caiu no horário silencioso ou passou do máximo do dia.                                                                                                    |
| Desliguei os avisos acadêmicos e ainda recebo lembretes | Os lembretes que você criou seguem a opção **Quando lembrar** de cada um. Para não receber, escolha **Sem aviso** no lembrete.                                                                                                                             |
| Nenhum e-mail chega para ninguém                        | É configuração do servidor. O suporte confere o worker de avisos e o serviço de e-mail (a confirmar o procedimento; o worker e as variáveis estão descritos em [Como configurar o servidor para a produção de aulas](../producao/configurar-servidor.md)). |

## Veja também

- [Como ver os avisos](ver-avisos.md)
- [Como criar um lembrete](criar-lembrete.md)

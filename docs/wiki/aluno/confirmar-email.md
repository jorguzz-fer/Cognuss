# Como confirmar o e-mail

A confirmação prova que o e-mail é seu. Sem ela, a conta existe mas não deixa entrar.

**Quem pode:** quem acabou de criar a conta. **Onde:** o link do e-mail "Confirme seu e-mail no Cognuss" e a tela `/verificar-email`.

**Chave de módulo:** nenhuma.

## Passo a passo

1. Abra o e-mail com o assunto **Confirme seu e-mail no Cognuss**.
2. Clique em **Confirmar e-mail**. O link vale por 1 hora.
3. O Cognuss confirma o endereço e já abre a sua sessão.

## O que acontece depois

- Você cai no primeiro passo do cadastro. Com a chave **Cadastro inicial (CAD)** ligada, é o cadastro em etapas (`/comecar`); com ela desligada, são os primeiros passos antigos (`/onboarding`). Veja [Como fazer o primeiro acesso](fazer-primeiro-acesso.md) e [Como concluir os primeiros passos antigos](concluir-primeiros-passos.md).
- A partir daqui, você entra normalmente com e-mail e senha.

## Se der errado

| Situação                                                                                   | O que fazer                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O link expirou ou já foi usado                                                             | Vá para **Entrar** e tente entrar com e-mail e senha. A tela mostra "Falta confirmar seu e-mail. Reenviamos o link para ..." e um link novo chega por e-mail.                                                                          |
| Tela **Esse link expirou** ("Links de confirmação valem por 1 hora. Peça um novo abaixo.") | Clique em **Reenviar link**. O botão só aparece quando a tela sabe o seu e-mail; se não aparecer, siga a linha de cima.                                                                                                                |
| Tela **Confirme seu e-mail**                                                               | Abra o link do e-mail. Se precisar, clique em **Reenviar link**.                                                                                                                                                                       |
| "Link reenviado. Confira também a caixa de spam."                                          | O link novo saiu. Procure também em spam e promoções.                                                                                                                                                                                  |
| "Não deu para reenviar agora. Espere alguns minutos."                                      | O limite é de 5 reenvios a cada 5 minutos. Espere e tente de novo.                                                                                                                                                                     |
| O e-mail não chega de jeito nenhum                                                         | Confira se digitou o endereço certo no cadastro. O suporte pode conferir no admin se a conta existe e se o envio de e-mail está configurado (veja [Como confirmar o e-mail de alguém](../admin/confirmar-email.md), no guia do admin). |

Qual tela aparece exatamente quando o link expira depende de como o servidor de autenticação devolve o erro (a confirmar). Em qualquer caso, entrar com e-mail e senha reenvia o link.

## Veja também

- [Como criar uma conta](criar-conta.md)
- [Como entrar](entrar.md)
- [Como fazer o primeiro acesso](fazer-primeiro-acesso.md)

# Como criar uma conta

A conta dá acesso ao Cognuss com o seu e-mail pessoal. O cadastro pede só nome, e-mail, senha e o aceite dos termos; o resto vem no primeiro acesso.

**Quem pode:** qualquer pessoa, sem login. **Onde:** `/cadastro` (na tela **Entrar**, link **Criar conta grátis**).

**Chave de módulo:** nenhuma. A criação de conta funciona sempre.

## Antes de começar

- Use um e-mail pessoal que você abre com frequência. É por ele que você entra e recebe o link de confirmação.
- Tenha uma senha com pelo menos 8 caracteres (máximo de 128).

## Passo a passo

1. Abra `/cadastro`. O título da tela é **Criar conta**.
2. Em **Como quer ser chamado(a)**, digite o nome que vai aparecer na plataforma.
3. Em **E-mail**, digite seu e-mail pessoal.
4. Em **Senha**, digite uma senha com pelo menos 8 caracteres. O ícone do campo mostra ou esconde o que você digitou.
5. Marque **Li e aceito os termos de uso e a política de privacidade.** Os dois links abrem em outra aba.
6. Se quiser receber novidades, marque **Quero receber novidades e ofertas do Cognuss (opcional, dá para mudar depois).** Deixar desmarcado não muda nada no seu estudo.
7. Clique em **Criar conta**.

## O que acontece depois

- A tela mostra **Conta criada. Confira seu e-mail.** e o endereço para onde o link foi enviado.
- Chega um e-mail com o assunto "Confirme seu e-mail no Cognuss" e o botão **Confirmar e-mail**. O link vale por 1 hora.
- Você só consegue entrar depois de confirmar. Veja [Como confirmar o e-mail](confirmar-email.md).
- Por segurança, a tela mostra a mesma mensagem de sucesso mesmo quando o e-mail já tem conta. Nesse caso nenhuma conta nova é criada: use [Como entrar](entrar.md) ou [Como recuperar a senha](recuperar-senha.md).

## Se der errado

| Mensagem                                                            | O que fazer                                                                                                      |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| "Informe como quer ser chamado(a)."                                 | Digite um nome com pelo menos 2 letras.                                                                          |
| "Confira o e-mail: falta algo como nome@exemplo.com."               | Corrija o formato do e-mail.                                                                                     |
| "A senha precisa de pelo menos 8 caracteres."                       | Use uma senha mais longa.                                                                                        |
| "A senha precisa ter entre 8 e 128 caracteres."                     | Ajuste o tamanho da senha.                                                                                       |
| "Para criar a conta, aceite os termos e a política."                | Marque a caixa dos termos.                                                                                       |
| "Muitas tentativas. Espere um minuto e tente de novo."              | Aguarde um minuto. O limite é de 5 cadastros por minuto.                                                         |
| "Não foi possível criar a conta agora. Tente de novo em instantes." | Tente de novo. Se persistir, o suporte confere o log `auth.sign_up_failed`.                                      |
| A mensagem de sucesso apareceu, mas o e-mail não chegou             | Confira a caixa de spam. Se a conta já existia, nenhum e-mail novo é enviado: tente entrar ou recuperar a senha. |

## Veja também

- [Como confirmar o e-mail](confirmar-email.md)
- [Como entrar](entrar.md)
- [Como fazer o primeiro acesso](fazer-primeiro-acesso.md)
- [Como confirmar o e-mail de alguém](../admin/confirmar-email.md) e [Como criar um usuário](../admin/criar-usuario.md), no guia do admin

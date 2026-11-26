# Como ativar a verificação em duas etapas

A verificação em duas etapas pede, além da senha, um código do app autenticador do celular. Protege a conta mesmo se alguém descobrir a senha.

**Quem pode:** quem está conectado. Para o aluno é opcional; para contas de administração é obrigatória. **Onde:** `/seguranca/dois-fatores` (em **Perfil**, cartão **Conta e segurança**, link **Verificação em duas etapas**).

**Chave de módulo:** nenhuma.

## Antes de começar

- Instale um app autenticador no celular, como Google Authenticator, 1Password ou Authy.
- Tenha a senha da conta em mãos.
- Separe um lugar seguro para guardar os códigos de recuperação.

## Passo a passo

A tela mostra o progresso em **Passo 1 de 3**, **Passo 2 de 3** e **Passo 3 de 3**.

1. Abra **Perfil** e, no cartão **Conta e segurança**, clique em **Verificação em duas etapas**.
2. **Passo 1.** Em **Confirme sua senha**, digite a senha e clique em **Continuar**.
3. **Passo 2.** Escaneie o QR code com o app autenticador. Sem câmera, digite no app a chave que aparece em "Sem câmera? Digite a chave:".
4. Em **Código de 6 dígitos do app**, digite o código que o app mostra agora e clique em **Ativar**.
5. **Passo 3.** A tela mostra "Verificação em duas etapas ativa." e a lista **Guarde estes códigos de recuperação**. Anote ou salve os códigos num lugar seguro. Cada um funciona uma vez, se você perder o celular.

## O que acontece depois

- Nas próximas entradas, depois da senha, a plataforma pede o código do app. Veja [Como entrar](entrar.md).
- Se você marcar **Não pedir de novo neste aparelho por 12 horas** ao entrar, o código não é pedido de novo nesse período.
- Ao abrir a tela de novo, aparece "Já está ativa nesta conta."

## Se der errado

| Mensagem                                                                             | O que fazer                                                                                                                                       |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Senha incorreta."                                                                   | Digite de novo a senha da conta.                                                                                                                  |
| "Código incorreto. Confira se o relógio do celular está certo e use o código atual." | Use o código que aparece agora no app. Deixe a data e a hora do celular no automático.                                                            |
| No fim, o botão **Ir para o editorial** leva a uma tela sem acesso                   | O botão foi feito para contas de administração. O aluno pode sair dessa tela pelo logo do Cognuss ou abrindo `/app`. A verificação já está ativa. |
| Quer desligar a verificação                                                          | Não há opção para desligar na tela do aluno (a confirmar com a equipe como o suporte faz).                                                        |

## Veja também

- [Como entrar](entrar.md)
- [Como trocar a senha](trocar-senha.md)
- [Como ativar a verificação em duas etapas (obrigatória para admin)](../admin/ativar-dois-fatores.md), no guia do admin

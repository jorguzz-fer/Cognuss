# Como criar um usuário

Cria uma conta com senha temporária, já com um papel se precisar. É o caminho para cadastrar professores e a equipe enquanto a plataforma não envia e-mails.

**Quem pode:** Admin. **Onde:** Admin → Usuários, quadro **Novo usuário**, `/admin/usuarios`.

## Antes de começar

- Confira se a pessoa já tem conta: use a busca **Nome ou e-mail** e clique em **Filtrar**. A lista mostra as 200 contas mais recentes.
- Tenha um canal seguro para entregar a senha temporária (pessoalmente ou por um mensageiro com criptografia).

## Passo a passo

1. No menu lateral, clique em **Usuários**.
2. No quadro **Novo usuário**, preencha **Nome** e **E-mail**.
3. Em **Papel**, escolha **Aluno** (sem papel extra), **Professor**, **Editor**, **Revisão**, **Admin** ou **Suporte**. O que cada papel faz está em [Dar e tirar papéis](dar-e-tirar-papeis.md).
4. Deixe marcado **E-mail já confirmado (conheço a pessoa)** se você conhece a pessoa e o e-mail é dela. Desmarcado, a pessoa só entra depois que o e-mail for confirmado.
5. Clique em **Criar conta**.
6. Copie a senha temporária que aparece na caixa verde. Ela aparece só agora e não fica salva em lugar nenhum.
7. Entregue e-mail e senha para a pessoa por um canal seguro. Peça para ela trocar a senha em **Segurança → Trocar senha** no primeiro acesso.

## O que acontece depois

- A caixa verde diz "Conta criada para <e-mail>. Senha temporária (aparece só agora):" e traz o link **Abrir conta**, que leva para a tela da pessoa.
- A plataforma não envia e-mail para a pessoa. A senha só existe na sua tela.
- No primeiro acesso, a pessoa aceita os termos. Se for aluno, passa pelo cadastro do primeiro acesso.
- Se o papel for Admin, a pessoa precisa ativar a verificação em duas etapas antes de abrir o `/admin`.
- A criação fica no **Histórico** da conta e na auditoria, sem a senha.

## Se der errado

- "Já existe uma conta com esse e-mail.": a pessoa já tem conta. Abra a conta pela busca e dê o papel por lá.
- "Escreva o nome da pessoa.": o nome precisa de pelo menos 2 caracteres.
- "Confira o e-mail.": o e-mail está incompleto.
- "Não foi possível criar a conta.": tente de novo. Se repetir, avise a engenharia.
- Perdeu a senha temporária antes de entregar: a tela não mostra de novo e não existe botão para gerar outra (a confirmar com a engenharia como redefinir).

## Veja também

- [Dar e tirar papéis](dar-e-tirar-papeis.md)
- [Confirmar o e-mail de alguém](confirmar-email.md)
- [Ativar a verificação em duas etapas](ativar-dois-fatores.md)
- [Criar uma conta de teste](criar-conta-de-teste.md)
- [Área do professor](../professor/)

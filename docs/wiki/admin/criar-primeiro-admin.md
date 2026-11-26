# Como criar o primeiro admin (BOOTSTRAP_ADMIN_EMAILS)

Dá o papel Admin à primeira pessoa de um ambiente novo, quando ainda não existe ninguém para dar o papel pela tela.

**Quem pode:** quem cuida do deploy no Coolify. **Onde:** cadastro público (`/cadastro`) e variáveis do serviço `web` no Coolify.

## Antes de começar

- Os usuários de demonstração nunca vão para produção. O primeiro admin entra sempre por este caminho.
- A variável não cria conta nem senha. A pessoa precisa ter conta antes.

## Passo a passo

1. A pessoa cria a conta normalmente em `/cadastro`, com a senha dela.
2. No Coolify, defina a variável `BOOTSTRAP_ADMIN_EMAILS` com o e-mail da pessoa. Para vários, separe por vírgula ou espaço.
3. Faça um redeploy.
4. A pessoa entra na plataforma e abre `/admin`.
5. A plataforma pede a verificação em duas etapas. Veja [Ativar a verificação em duas etapas](ativar-dois-fatores.md).

## O que acontece depois

- No início do container, logo depois das migrations, cada e-mail da lista que já tem conta ganha o papel Admin e fica com o e-mail confirmado. Isso dispensa o e-mail de confirmação no primeiro acesso.
- A auditoria registra as duas mudanças, com a origem `BOOTSTRAP_ADMIN_EMAILS`.
- Pode deixar a variável definida. Rodar de novo não muda nada para quem já é admin.
- Tirar um e-mail da variável não tira o papel. Para tirar, use a tela. Veja [Dar e tirar papéis](dar-e-tirar-papeis.md).
- As outras contas da equipe, o admin cria pela tela. Veja [Criar um usuário](criar-usuario.md).

## Se der errado

- A pessoa não virou admin: o e-mail da variável não tinha conta no momento do start. Crie a conta e faça outro redeploy. Maiúsculas e minúsculas não importam.
- A pessoa abre `/admin` e volta para o app: o deploy ainda não rodou com a variável nova. Confira a variável e o log do start (evento `db.bootstrap_admins`).

## Veja também

- [Ativar a verificação em duas etapas](ativar-dois-fatores.md)
- [Criar um usuário](criar-usuario.md)
- [Dar e tirar papéis](dar-e-tirar-papeis.md)

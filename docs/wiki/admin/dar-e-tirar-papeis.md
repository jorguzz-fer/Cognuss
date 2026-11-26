# Como dar e tirar papéis

Libera ou remove acessos de uma pessoa: professor, editor, revisão, admin ou suporte. Toda conta já é de aluno; os papéis somam acesso.

**Quem pode:** Admin. **Onde:** Admin → Usuários → nome da pessoa, quadro **Papéis**, `/admin/usuarios/<pessoa>`.

## Os papéis

| Papel na tela | O que a tela diz                                                | Onde a pessoa trabalha                                                                                                     |
| ------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Aluno         | Padrão de toda conta, sem papel atribuído.                      | `/app`                                                                                                                     |
| Professor     | "Cria turmas e acompanha o desempenho de quem entrar nelas."    | `/professor`. Não entra no `/admin`.                                                                                       |
| Editor        | "Escreve questões, flashcards e módulos."                       | Admin → Questões. Escreve e envia para revisão. Não aprova, não publica, não arquiva. As telas de módulos são só do admin. |
| Revisão       | "Revisa e publica conteúdo de outras pessoas."                  | Admin → Questões e Admin → Revisão de aulas. Aprova, devolve, publica e arquiva.                                           |
| Admin         | "Tudo, inclusive catálogo, usuários e instituições. Exige 2FA." | `/admin` inteiro e também `/professor`.                                                                                    |
| Suporte       | "Atende alunos (sem acesso ao conteúdo editorial)."             | Nenhuma tela aceita esse papel ainda.                                                                                      |

O papel Moderação existe no banco, mas não pode ser atribuído pela tela.

Uma pessoa pode ter vários papéis. Só o Admin exige a verificação em duas etapas.

## Passo a passo

1. No menu lateral, clique em **Usuários**.
2. Ache a pessoa: escreva em **Nome ou e-mail** ou escolha um papel em **Todos os papéis** e clique em **Filtrar**.
3. Clique no nome da pessoa.
4. No quadro **Papéis**, em cada papel:
   - clique em **Dar papel** para liberar;
   - clique em **Remover** para tirar. Papel ativo aparece com o selo **ativo**.

## O que acontece depois

- Aparece o aviso "Papéis atualizados.".
- A mudança vale no próximo carregamento de página da pessoa.
- Quem ganha Admin precisa ativar a verificação em duas etapas no primeiro acesso ao `/admin`. Veja [Ativar a verificação em duas etapas](ativar-dois-fatores.md).
- Quem perde o papel deixa de ver as telas dele. Ao abrir uma tela sem acesso, volta para o app do aluno.
- O quadro **Histórico** da pessoa registra cada papel dado ou removido.
- Para excluir a conta de um admin a pedido dele (LGPD), tire antes o papel Admin.

## Se der errado

- "Você não pode tirar o seu próprio acesso de admin.": ninguém remove o próprio Admin. Na sua conta, a tela mostra "Esta é a sua conta: você não pode tirar o seu próprio admin." e esconde o botão. Peça a outra pessoa admin.
- A pessoa não aparece na lista: a lista mostra só as 200 contas mais recentes. Use a busca.

## Veja também

- [Criar um usuário](criar-usuario.md)
- [De onde vem o primeiro admin](criar-primeiro-admin.md)
- [O fluxo editorial de uma questão](publicar-questao.md)
- [Abrir o mapa de atores](abrir-mapa-de-atores.md)
- [Área do professor](../professor/)
- [Revisão de aulas da produção](../producao/)

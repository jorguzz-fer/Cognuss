# Como aprovar as instituições sugeridas pelos alunos

Revisa as faculdades que os alunos sugeriram no cadastro e decide se elas entram na lista para todos. Também serve para desativar ou reativar uma instituição.

**Quem pode:** Admin. **Onde:** Admin → Instituições, filtro **Pendentes**, `/admin/instituicoes?status=pending`.

## Antes de começar

- De onde vêm as sugestões: no cadastro, quando o aluno não acha a faculdade dele, escolhe **Não encontrei a minha** e escreve o nome. A instituição entra como **Pendente**, com o texto "sugerida por" e o e-mail do aluno.
- O aluno que sugeriu já fica ligado a essa instituição, mesmo antes da aprovação.

## Passo a passo

1. No menu lateral, clique em **Instituições**.
2. Clique no filtro **Pendentes**. As pendentes também aparecem primeiro no filtro **Todas**.
3. Confira o nome sugerido. Se tiver erro de digitação, clique no nome, corrija **Nome**, **Cidade** e **UF** e clique em **Salvar**.
4. Na coluna **Ações**, clique em:
   - **Aprovar**, para a instituição entrar na lista de todos;
   - **Recusar**, se a sugestão não serve (por exemplo, duplicada ou sem sentido).
5. Para tirar uma instituição ativa da lista, clique em **Desativar**.
6. Para trazer de volta uma instituição recusada ou desativada, clique em **Aprovar**.

## O que acontece depois

- Aparece o aviso "Status atualizado.".
- **Aprovar**: a instituição aparece no cadastro e no primeiro acesso para todos os alunos.
- **Recusar** e **Desativar**: as duas deixam a instituição com o status **Recusada**. Ela some da lista do cadastro. Os alunos que já estavam ligados a ela continuam ligados, e a plataforma não avisa o aluno.
- A mudança fica na auditoria.

## Se der errado

- Duas instituições iguais com grafias diferentes: a tela não junta instituições. Recuse a duplicada. Os alunos ligados a ela continuam ligados à recusada; corrigir isso fica (a confirmar) com a engenharia.
- "Dê o nome da instituição." ou "Já existe um item com esse nome ou endereço." ao corrigir o nome: veja [Cadastrar ou editar uma instituição](cadastrar-instituicao.md).

## Veja também

- [Cadastrar ou editar uma instituição](cadastrar-instituicao.md)
- [Área do aluno](../README.md#aluno)

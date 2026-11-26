# Como excluir uma disciplina

Apaga uma disciplina cadastrada por engano, junto com os assuntos dela.

**Quem pode:** Admin. **Onde:** Admin → Cursos → curso → disciplina, `/admin/disciplinas/<disciplina>`.

## Antes de começar

A exclusão só dá certo enquanto nada depende da disciplina. Ela é recusada quando a disciplina tem módulos, quando algum assunto tem questões, quando algum aluno a escolheu ou quando há aula em produção ligada a ela. Nesses casos, desative a disciplina em [Editar os dados de uma disciplina](editar-disciplina.md).

## Passo a passo

1. No menu lateral, clique em **Cursos**, depois no curso e depois no nome da disciplina.
2. Desça até o quadro **Excluir disciplina**, no fim da tela.
3. Clique em **Quero excluir** seguido do nome da disciplina.
4. Clique em **Excluir de vez**.

## O que acontece depois

- A tela volta para o curso com o aviso "Disciplina excluída.".
- A disciplina e todos os assuntos dela são apagados. Não tem volta.
- A exclusão fica na auditoria.

## Se der errado

- "Esse item está em uso (tem conteúdo ou alunos ligados a ele). Desative em vez de excluir.": algo ainda depende da disciplina. Desmarque **Ativa** em **Dados da disciplina** e clique em **Salvar disciplina**.

## Veja também

- [Editar os dados de uma disciplina](editar-disciplina.md)
- [Excluir um assunto](excluir-assunto.md)
- [Adicionar uma disciplina a um curso](adicionar-disciplina.md)

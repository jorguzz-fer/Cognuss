# Como editar os dados de uma disciplina

Muda nome, endereço, semestre sugerido ou descrição de uma disciplina, ou desativa a disciplina para os alunos.

**Quem pode:** Admin. **Onde:** Admin → Cursos → curso → disciplina, `/admin/disciplinas/<disciplina>`.

## Passo a passo

1. No menu lateral, clique em **Cursos**, depois no curso e depois no nome da disciplina.
2. Desça até o quadro **Dados da disciplina**, no fim da tela.
3. Ajuste o que precisar:
   - **Nome**.
   - **Endereço**: letras minúsculas, números e hífens. Se ele nasceu do nome, acompanha o nome novo quando você renomeia. Um endereço escolhido à mão continua igual. Se apagar o campo, a plataforma gera de novo a partir do nome.
   - **Semestre sugerido** (opcional): de 1 a 16.
   - **Ativa**: desmarque para desativar; marque para reativar.
   - **Descrição** (opcional): até 500 caracteres.
4. Clique em **Salvar disciplina**.

## O que acontece depois

- Aparece o aviso "Disciplina salva.".
- O endereço faz parte do link que o aluno abre (`/app/disciplinas/<endereço>`). Se você mudar, links salvos com o endereço antigo deixam de funcionar.
- Disciplina desativada sai da lista de disciplinas do aluno, do banco de questões e do primeiro acesso. Nada é apagado.
- Para apagar uma disciplina cadastrada por engano, veja [Excluir uma disciplina](excluir-disciplina.md). Uma disciplina já em uso só pode ser desativada.
- A mudança fica na auditoria.

## Se der errado

- "Dê um nome à disciplina.": o nome precisa de pelo menos 2 caracteres.
- "Use só letras minúsculas, números e hífens no endereço.": corrija o **Endereço** ou deixe vazio.
- "Já existe um item com esse nome ou endereço.": outra disciplina do mesmo curso já usa esse endereço. O aviso aparece no próprio quadro **Dados da disciplina**. Para juntar duas disciplinas, mova os assuntos de uma para a outra ([Mover um assunto](mover-assunto.md)) e exclua a que ficou vazia.

## Veja também

- [Adicionar uma disciplina a um curso](adicionar-disciplina.md)
- [Excluir uma disciplina](excluir-disciplina.md)
- [Criar um assunto](criar-assunto.md)
- [Editar ou desativar um curso](editar-curso.md)

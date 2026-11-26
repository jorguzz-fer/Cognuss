# Como adicionar uma disciplina a um curso

Cria uma disciplina dentro de um curso, por exemplo Fisiologia no curso de Medicina. É na disciplina que ficam os assuntos e os módulos.

**Quem pode:** Admin. **Onde:** Admin → Cursos → nome do curso, `/admin/cursos/<curso>`.

## Antes de começar

- O curso precisa existir. Veja [Adicionar um curso](adicionar-curso.md).

## Passo a passo

1. No menu lateral, clique em **Cursos** e depois no nome do curso.
2. No quadro **Nova disciplina**, preencha:
   - **Nome**.
   - **Semestre sugerido** (opcional): número de 1 a 16.
   - **Descrição** (opcional): até 500 caracteres.
3. Deixe marcado **Ativa** se a disciplina já pode aparecer para os alunos.
4. Clique em **Criar disciplina**.

## O que acontece depois

- A tela da disciplina abre com o aviso "Disciplina criada.".
- O endereço da disciplina é gerado a partir do nome. Ele aparece no endereço que o aluno abre (`/app/disciplinas/<endereço>`). Você pode mudar depois em [Editar os dados da disciplina](editar-disciplina.md).
- Uma disciplina ativa aparece para os alunos do curso: na lista de disciplinas, no banco de questões e na escolha de disciplinas do primeiro acesso.
- Na tabela do curso, as disciplinas ficam em ordem de semestre sugerido e depois de nome.
- A disciplina nasce sem assuntos. O próximo passo é [criar assuntos](criar-assunto.md).

## Se der errado

- "Dê um nome à disciplina.": o nome precisa de pelo menos 2 caracteres.
- "Já existe um item com esse nome ou endereço.": o curso já tem uma disciplina com esse nome. Use outro nome ou ajuste a que já existe.
- O navegador recusa o semestre: use um número de 1 a 16, ou deixe vazio.

## Veja também

- [Editar os dados de uma disciplina](editar-disciplina.md)
- [Criar um assunto](criar-assunto.md)
- [Criar um módulo](criar-modulo.md)
- [Área do aluno](../aluno/)

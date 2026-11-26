# Como editar ou desativar um curso

Muda o nome ou o endereço de um curso, ou tira o curso do cadastro de alunos novos sem apagar nada.

**Quem pode:** Admin. **Onde:** Admin → Cursos → nome do curso, `/admin/cursos/<curso>`.

## Antes de começar

- Dois endereços têm uso especial no sistema. Não troque sem falar com a engenharia:
  - `medicina`: a conta de teste entra nesse curso. Sem ele, usa o primeiro curso ativo.
  - `outro-curso-da-saude`: no cadastro, esse curso vai para o fim da lista e pede ao aluno o nome do curso dele.

## Passo a passo

1. No menu lateral, clique em **Cursos**.
2. Clique no nome do curso na tabela.
3. No quadro **Dados do curso**, ajuste o que precisar:
   - **Nome**.
   - **Endereço**: letras minúsculas, números e hífens. Se apagar o campo, a plataforma gera de novo a partir do nome.
   - **Ativo (aparece no cadastro)**: desmarque para desativar o curso; marque para reativar.
4. Clique em **Salvar curso**.

## O que acontece depois

- Aparece o aviso "Curso salvo.".
- Curso desativado some da lista do cadastro e do primeiro acesso. Nada é apagado: disciplinas, assuntos, módulos e questões continuam lá.
- Os alunos que já estão no curso continuam nele e seguem vendo as disciplinas ativas.
- A mudança fica na auditoria.
- Não existe botão para excluir um curso. Para tirar um curso de circulação, desative.

## Se der errado

- "Dê um nome ao curso.": o nome precisa de pelo menos 2 caracteres.
- "Use só letras minúsculas, números e hífens no endereço.": corrija o **Endereço** ou deixe vazio.
- "Já existe um item com esse nome ou endereço.": outro curso já usa esse endereço.

## Veja também

- [Adicionar um curso](adicionar-curso.md)
- [Adicionar uma disciplina a um curso](adicionar-disciplina.md)
- [Editar os dados de uma disciplina](editar-disciplina.md)

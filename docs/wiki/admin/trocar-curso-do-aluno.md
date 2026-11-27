# Como trocar o curso de um aluno

Corrige o curso de um aluno que se cadastrou no curso errado. O curso decide quais disciplinas do catálogo aparecem no **Estudar**.

**Quem pode:** Admin. **Onde:** Admin → Usuários → nome da pessoa, quadro **Curso do aluno**, `/admin/usuarios/<pessoa>`.

## Antes de começar

- O quadro só aparece para quem já fez o cadastro de aluno (o primeiro acesso, com curso e semestre).
- O curso novo precisa estar ativo. Veja [Editar um curso](editar-curso.md).
- O aluno não troca o próprio curso: a correção é sempre pelo admin.

## Passo a passo

1. No menu lateral, clique em **Usuários** e procure a pessoa pelo nome ou e-mail.
2. Clique no nome dela.
3. No quadro **Conta**, confira a linha **Curso**.
4. No quadro **Curso do aluno**, escolha o curso certo em **Curso**.
5. Clique em **Trocar curso**.

## O que acontece depois

- Aparece o aviso "Curso do aluno atualizado.". Se o aluno já estava nesse curso, o aviso é "O aluno já estava nesse curso." e nada muda.
- No **Estudar**, o aluno passa a ver as disciplinas do curso novo.
- O semestre, as disciplinas que ele cadastrou, as notas, as faltas e os arquivos ficam como estão.
- Uma disciplina do semestre que estava ligada ao catálogo do curso antigo deixa de mostrar as aulas. O aluno pode ligá-la a uma disciplina do curso novo em **Minhas disciplinas**, no campo **Conteúdo do Cognuss**. Veja [Como cadastrar uma disciplina](../aluno/cadastrar-disciplina.md).
- A troca entra no **Histórico** da conta como `student.course_changed`, com o curso anterior e o novo.
- Na lista de **Cursos**, a coluna **Alunos** passa a contar o aluno no curso novo.

## Se der errado

- "Esta pessoa ainda não fez o cadastro de aluno.": ela ainda não concluiu o primeiro acesso. Peça para ela entrar e escolher o curso.
- "Curso indisponível.": o curso foi desativado. Ative o curso ou escolha outro.
- O quadro **Curso do aluno** não aparece: a pessoa não tem cadastro de aluno (por exemplo, uma conta só de equipe).

## Veja também

- [Criar uma conta de teste](criar-conta-de-teste.md)
- [Confirmar o e-mail de alguém](confirmar-email.md)
- [Dar e tirar papéis](dar-e-tirar-papeis.md)

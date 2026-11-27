# ADR 0026: Disciplina do semestre ligada ao catálogo e curso do aluno pelo admin

- Status: aceito (pedido do Fernando em 27/11/2026)
- Data: 2026-11-27

## Contexto

O Cognuss tem dois tipos de "disciplina".

- **Disciplina do semestre** (`enrolled_disciplines`): o aluno digita no cadastro e organiza o semestre com ela (calendário, faltas, notas, cronograma, caderno).
- **Disciplina do catálogo** (`disciplines`): a equipe cadastra no admin, com módulos, aulas interativas e questões. Aparece no Estudar para os alunos do curso.

O cadastro não ligava uma à outra. No teste da aula de Farmacologia, uma conta nova digitou "Farmácia" como disciplina do semestre. A tela dessa disciplina não mostrava aula nenhuma, porque as aulas estavam só no Estudar.

O campo `catalog_discipline_id` já existia em `enrolled_disciplines`, mas só o onboarding do MVP o preenchia.

Havia ainda dois problemas do lado do admin.

- **O curso não podia ser corrigido.** O curso do aluno, escolhido no cadastro, decide o que aparece no Estudar. Nem o aluno nem o admin podiam trocá-lo depois.
- **O admin não via o perfil dos alunos.** O RLS de `student_profiles` só deixa o dono ver o perfil. Com isso, a coluna "Alunos" em Cursos e o curso na tela do usuário mostravam só o perfil do próprio admin.
- A conta de teste nascia sempre em Medicina.

## Decisão

**A disciplina do semestre pode ser ligada a uma disciplina do catálogo.**

- No passo "Suas disciplinas" do cadastro e em Minhas disciplinas, as disciplinas do catálogo do curso do aluno aparecem como sugestões de um clique, com o número de módulos publicados. A sugestão preenche o nome e liga.
- O campo "Conteúdo do Cognuss" liga ou desliga a qualquer momento.
- O nome continua livre: a disciplina pode ter outro nome na faculdade.
- A ligação só vale para disciplina ativa do curso atual do aluno. Uma ligação de outro curso (depois de uma troca de curso) volta como `null` no contrato e some da tela, sem apagar nada.
- A mesma disciplina do catálogo não fica ligada a duas disciplinas do mesmo semestre.

**A tela da disciplina do semestre mostra as aulas.**

- Com a ligação, a visão geral ganha o quadro "Aulas do Cognuss", com os módulos publicados e o selo de aula interativa.
- Ganha também o item "Aulas do Cognuss" no menu lateral, que leva ao Estudar.
- Sem ligação e com catálogo no curso, o quadro explica como ligar.

**O admin vê e troca o curso do aluno por funções do banco.**

- A migration 0064 cria três funções `SECURITY DEFINER`, todas só para admin (`app_assert_admin_or_system`):
  - `admin_course_student_counts()`: quantos alunos cada curso tem;
  - `admin_student_course(user)`: curso, semestre e instituição de um aluno;
  - `admin_set_student_course(user, course)`: troca só o curso.
- O perfil do aluno continua fechado no RLS: o admin não lê nem muda outros campos.
- A troca fica na auditoria (`student.course_changed`, com o curso anterior e o novo).
- O semestre, as notas e os arquivos do aluno não mudam.

**A conta de teste escolhe o curso.**

- O padrão continua sendo Medicina.
- As disciplinas do curso escolhido que têm módulo publicado entram no semestre da conta, já ligadas.

## Consequências

- O aluno chega às aulas pela disciplina que ele usa no dia a dia, sem precisar saber que existe o Estudar.
- Disciplinas digitadas antes desta mudança ficam sem ligação até o aluno escolher em "Conteúdo do Cognuss".
- O admin passa a ver números certos de alunos por curso.
- Trocar o curso do aluno é ação de admin e serve para corrigir cadastro. O aluno ainda não troca o próprio curso.

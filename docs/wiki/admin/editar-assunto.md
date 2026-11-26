# Como renomear ou reordenar um assunto

Troca o nome de um assunto ou muda a posição dele na lista da disciplina.

**Quem pode:** Admin. **Onde:** Admin → Cursos → curso → disciplina, seção **Assuntos**, `/admin/disciplinas/<disciplina>`.

## Passo a passo

1. Abra a disciplina: **Cursos** → curso → nome da disciplina.
2. Na seção **Assuntos**, ache a linha do assunto.
3. Para renomear, mude o campo **Nome**.
4. Para reordenar, mude o campo **Ordem**. Número menor vem primeiro. Use de 0 a 999.
5. Clique em **Salvar** na mesma linha.
6. Repita em cada assunto que quiser mudar. Cada linha salva sozinha.

## O que acontece depois

- Aparece o aviso "Assunto salvo.".
- Assuntos com a mesma ordem ficam em ordem alfabética.
- Subassuntos ficam sempre logo abaixo do assunto principal e se ordenam entre si pelo campo **Ordem**.
- O nome novo aparece na hora em módulos, questões e nas telas do aluno.
- Dica: numere de 10 em 10 (10, 20, 30). Assim dá para encaixar um assunto novo no meio sem renumerar todos.
- Esta tela não muda o assunto principal de um subassunto. Veja [Criar um assunto](criar-assunto.md).

## Se der errado

- "Dê um nome ao assunto.": o nome precisa de pelo menos 2 caracteres.
- O navegador recusa a ordem: use um número inteiro de 0 a 999.

## Veja também

- [Criar um assunto](criar-assunto.md)
- [Excluir um assunto](excluir-assunto.md)

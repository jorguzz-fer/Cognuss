# Como adicionar um curso

Cria um curso novo no catálogo, por exemplo Medicina. O curso agrupa disciplinas, assuntos e módulos e aparece para quem se cadastra.

**Quem pode:** Admin. **Onde:** Admin → Cursos, `/admin/cursos`.

## Antes de começar

- Sua conta precisa do papel Admin e da verificação em duas etapas ativa. Sem o 2FA, a plataforma leva você para a tela de ativação. Veja [Ativar a verificação em duas etapas](ativar-dois-fatores.md).

## Passo a passo

1. No menu lateral, clique em **Cursos**.
2. Desça até o quadro **Novo curso**.
3. Preencha **Nome**. Exemplo: Medicina.
4. Em **Endereço** (opcional), escreva o identificador do curso com letras minúsculas, números e hífens. Se deixar vazio, a plataforma gera o endereço a partir do nome: "Medicina" vira `medicina`.
5. Deixe marcado **Ativo (aparece no cadastro)** se o curso já pode receber alunos. Desmarque para montar o curso com calma, sem que ele apareça.
6. Clique em **Criar curso**.

## O que acontece depois

- A tela do curso abre com o aviso "Curso criado.".
- Um curso ativo aparece na lista de cursos do cadastro e do primeiro acesso dos alunos novos.
- O curso nasce vazio. O próximo passo é [adicionar uma disciplina](adicionar-disciplina.md).
- A criação fica na auditoria.
- Na lista de cursos, a coluna **Situação** mostra **Ativo** ou **Inativo**, e as colunas **Disciplinas** e **Alunos** mostram as contagens.

## Se der errado

- "Dê um nome ao curso.": o nome precisa de pelo menos 2 caracteres.
- "Use só letras minúsculas, números e hífens no endereço.": tire acentos, espaços e maiúsculas do **Endereço**, ou deixe o campo vazio.
- "Já existe um item com esse nome ou endereço.": outro curso já usa esse endereço. Escolha outro.
- Caiu na tela "Verificação em duas etapas": ative o 2FA e volte para `/admin/cursos`.

## Veja também

- [Editar ou desativar um curso](editar-curso.md)
- [Adicionar uma disciplina a um curso](adicionar-disciplina.md)
- [Criar uma conta de teste](criar-conta-de-teste.md)
- [Área do aluno](../README.md#aluno)

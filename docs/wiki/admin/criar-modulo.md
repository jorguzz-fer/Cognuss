# Como criar um módulo (aula do catálogo)

Cria um módulo dentro de uma disciplina. O módulo é a aula do catálogo que o aluno abre: chamada, aula interativa, resumo, questões do assunto e tutor IA.

**Quem pode:** Admin. **Onde:** Admin → Cursos → curso → disciplina, seção **Módulos**, `/admin/disciplinas/<disciplina>`. Depois, a tela do módulo, `/admin/modulos/<módulo>`.

## Antes de começar

- A disciplina precisa ter pelo menos um assunto. Sem assunto, a tela mostra "Crie um assunto antes do primeiro módulo." Veja [Criar um assunto](criar-assunto.md).
- Se a aula interativa vem da produção de aulas, veja a área de [Produção de aulas](../README.md#produção-de-aulas-e-revisão).

## Passo a passo

1. Abra a disciplina: **Cursos** → curso → nome da disciplina.
2. Na seção **Módulos**, no quadro **Novo módulo**, preencha:
   - **Título**;
   - **Assunto**: escolha na lista (subassuntos aparecem com um traço na frente).
3. Clique em **Criar como rascunho**. A tela do módulo abre.
4. No quadro **Conteúdo**, preencha o resto:
   - **Título** e **Endereço**: o endereço é gerado do título; ele aparece no link do aluno.
   - **Assunto**.
   - **Ordem na disciplina**: número menor vem primeiro.
   - **Aula interativa (endereço https)** (opcional): link da aula. Para abrir dentro do app, a origem do link precisa estar na lista `LESSON_ORIGINS` do servidor.
   - **Tempo estimado (min)** (opcional): de 1 a 240.
   - **Chamada** (opcional): uma frase que aparece na capa do módulo.
   - **Resumo** (opcional): Markdown simples (`## título`, `- lista`, `> citação`, `**negrito**`).
5. Clique em **Salvar módulo**.
6. Para o aluno ver o módulo, ele precisa ser publicado. Veja [Publicar um módulo](publicar-modulo.md).

## O que acontece depois

- Ao criar: aviso "Módulo criado como rascunho.". Ao salvar: "Módulo salvo.".
- Você fica como autor do módulo. Como Admin, você pode aprovar o próprio módulo; o ideal é que alguém com o papel Revisão aprove.
- Enquanto está em rascunho, em revisão ou aprovado, o aluno não vê o módulo.
- Depois de publicado, para o aluno:
  - com aula de origem permitida, a aula abre dentro da página, com o link "Abrir a aula em tela cheia";
  - com aula de outra origem, aparece o botão "Abrir a aula interativa", que abre em outra aba;
  - sem aula, aparece "A aula interativa deste módulo está em produção. O resumo e as questões já estão disponíveis.".
- Conteúdo de saúde passa pela revisão antes de publicar. Conteúdo de demonstração aparece com o selo "Demonstração · sem revisão".

## Se der errado

- "Dê um título ao módulo.": o título precisa de pelo menos 2 caracteres.
- "Escolha o assunto do módulo.": selecione um assunto.
- "Endereço da aula inválido." ou "Use https.": o link da aula precisa começar com `https://`.
- "Use só letras minúsculas, números e hífens no endereço.": corrija o **Endereço** ou deixe vazio.
- "Já existe um item com esse nome ou endereço.": a disciplina já tem um módulo com esse endereço.
- A aula não abre dentro do app: a origem do link não está em `LESSON_ORIGINS`. Peça à engenharia para incluir.

## Veja também

- [Publicar um módulo](publicar-modulo.md)
- [Criar um assunto](criar-assunto.md)
- [Configurar o tutor IA](configurar-tutor.md)
- [Produção de aulas](../README.md#produção-de-aulas-e-revisão)
- [Área do aluno](../README.md#aluno)

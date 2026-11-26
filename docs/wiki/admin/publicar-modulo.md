# Como levar um módulo de rascunho a publicado

Passa um módulo pelo fluxo editorial até ele aparecer para os alunos: rascunho, em revisão, aprovado e publicado.

**Quem pode:** Admin. Quem criou o módulo envia para revisão e publica, mas não aprova. A aprovação precisa ser de outra pessoa com papel Admin. **Onde:** tela do módulo, quadro **Fluxo editorial**, `/admin/modulos/<módulo>`.

## Antes de começar

- O módulo precisa existir. Veja [Criar um módulo](criar-modulo.md).
- Combine com outra pessoa admin quem vai aprovar. O banco também aceita aprovação de quem tem o papel Revisão, mas a tela de módulos só abre para admin.

## Passo a passo

1. Abra o módulo: **Cursos** → curso → disciplina → nome do módulo.
2. No quadro **Fluxo editorial**, o autor clica em **Enviar para revisão**. O status vira **Em revisão**.
3. Outra pessoa admin abre o mesmo módulo, confere o conteúdo e clica em:
   - **Aprovar**, se está pronto;
   - **Devolver ao rascunho**, se precisa de ajuste.
4. Com o módulo **Aprovado**, clique em **Publicar**. Se ainda precisar mudar algo, use **Voltar ao rascunho**.
5. Para tirar um módulo publicado do ar, clique em **Arquivar**.
6. Um módulo **Arquivado** pode voltar com **Publicar de novo**, ou ir para edição com **Voltar ao rascunho**.

## O que acontece depois

- Cada passo mostra o aviso "Status do módulo atualizado." e entra no quadro **Histórico** da tela.
- O status aparece no topo da tela e na tabela de módulos da disciplina: Rascunho, Em revisão, Aprovado, Publicado ou Arquivado.
- **Publicado**: o módulo aparece para os alunos do curso na disciplina, com a aula, o resumo, as questões e o tutor IA.
- **Arquivado**: o módulo some para os alunos. Nada é apagado.
- Módulos não têm versões. Editar um módulo aprovado ou publicado muda o que os alunos veem na hora. A tela avisa: "Editar um módulo publicado muda o que os alunos veem na hora."
- Se você é o autor e o módulo está em revisão, a tela avisa: "Você é o autor deste módulo: a aprovação precisa ser de outra pessoa."

## Se der errado

- "O autor não aprova o próprio conteúdo.": o botão **Aprovar** aparece para o autor, mas o banco recusa. Peça a outra pessoa admin.
- "Só revisor aprova, devolve, publica ou arquiva.": sua conta perdeu o papel no meio do caminho. Confira em [Dar e tirar papéis](dar-e-tirar-papeis.md).
- Mensagem começando com "transição editorial inválida": alguém mudou o status ao mesmo tempo. Recarregue a página e use os botões que aparecerem.

## Veja também

- [Criar um módulo](criar-modulo.md)
- [Escrever uma questão e o fluxo editorial](publicar-questao.md)
- [Revisão de aulas da produção](../producao/)
- [Área do aluno](../aluno/)

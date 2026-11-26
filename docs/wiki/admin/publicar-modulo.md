# Como levar um módulo de rascunho a publicado

Passa um módulo pelo fluxo editorial até ele aparecer para os alunos: rascunho, em revisão, aprovado e publicado.

**Quem pode:** Admin e Revisão. Quem criou o módulo envia para revisão e publica. Se o autor tem o papel Revisão, a aprovação precisa ser de outra pessoa. O Admin pode aprovar o que escreveu, mas aí não há segunda revisão. Editar o conteúdo continua só com o Admin. **Onde:** tela do módulo, quadro **Fluxo editorial**, `/admin/modulos/<módulo>`. O revisor chega pela fila **Revisão de aulas** (`/admin/revisao`), seção **Módulos do catálogo**.

## Antes de começar

- O módulo precisa existir. Veja [Criar um módulo](criar-modulo.md).
- Combine quem vai aprovar. O ideal é alguém com o papel Revisão (por exemplo, o Dr. Rafael), para o conteúdo de saúde passar por uma segunda pessoa. O Admin também pode aprovar o próprio módulo.

## Passo a passo

1. Abra o módulo: **Cursos** → curso → disciplina → nome do módulo.
2. No quadro **Fluxo editorial**, o autor clica em **Enviar para revisão**. O status vira **Em revisão**.
3. Quem vai aprovar abre o mesmo módulo:
   - outra pessoa admin, pelo mesmo caminho do passo 1;
   - o revisor, em **Revisão de aulas** no menu lateral. Na seção **Módulos do catálogo**, clique no nome do módulo. A linha mostra a disciplina e, se o módulo é seu, "você escreveu".
4. Confira o conteúdo. O revisor vê o quadro **Conteúdo** só para leitura: a disciplina, o tempo estimado, a chamada, o link **Abrir a aula interativa** (se houver) e o resumo. O admin vê o formulário de edição.
5. Clique em:
   - **Aprovar**, se está pronto;
   - **Devolver ao rascunho**, se precisa de ajuste.
6. Com o módulo **Aprovado**, clique em **Publicar**. Depois de aprovar, a tela continua aberta, mas o módulo sai da fila **Módulos do catálogo**. Se ainda precisar mudar algo, use **Voltar ao rascunho**.
7. Para tirar um módulo publicado do ar, clique em **Arquivar**.
8. Um módulo **Arquivado** pode voltar com **Publicar de novo**, ou ir para edição com **Voltar ao rascunho**.

## O que acontece depois

- Cada passo mostra o aviso "Status do módulo atualizado." e entra no quadro **Histórico** da tela.
- O status aparece no topo da tela e na tabela de módulos da disciplina: Rascunho, Em revisão, Aprovado, Publicado ou Arquivado.
- **Publicado**: o módulo aparece para os alunos do curso na disciplina, com a aula, o resumo, as questões e o tutor IA.
- **Arquivado**: o módulo some para os alunos. Nada é apagado.
- Módulos não têm versões. Editar um módulo aprovado ou publicado muda o que os alunos veem na hora. A tela avisa: "Editar um módulo publicado muda o que os alunos veem na hora."
- Se você é Admin e escreveu o módulo, a tela avisa: "Você escreveu este módulo. Como admin, pode aprovar mesmo assim: confira o conteúdo antes, porque não haverá uma segunda revisão." A aprovação fica marcada na auditoria.
- Se você tem o papel Revisão (sem Admin) e escreveu o módulo, a tela avisa: "Você é o autor deste módulo: a aprovação precisa ser de outra pessoa." O botão **Aprovar** não aparece.
- A seção **Módulos do catálogo** da fila mostra só módulos em revisão escritos à mão no catálogo. Os módulos que vieram da produção de aulas são revisados peça a peça. Veja [Como revisar uma peça](../producao/revisar-peca.md).
- Para o revisor, a trilha do topo da tela do módulo leva de volta a **Revisão**.

## Se der errado

- O botão **Aprovar** não aparece: você é o autor do módulo e não é Admin. Peça a um Admin ou a outra pessoa com o papel Revisão.
- O revisor quer mudar o texto do módulo: editar o conteúdo é só do Admin. Use **Devolver ao rascunho** e avise o autor.
- "Só revisor aprova, devolve, publica ou arquiva.": sua conta perdeu o papel no meio do caminho. Confira em [Dar e tirar papéis](dar-e-tirar-papeis.md).
- Mensagem como "Transição editorial inválida: rascunho → publicado.": alguém mudou o status ao mesmo tempo. Recarregue a página e use os botões que aparecerem.

## Veja também

- [Criar um módulo](criar-modulo.md)
- [Escrever uma questão e o fluxo editorial](publicar-questao.md)
- [Dar e tirar papéis](dar-e-tirar-papeis.md)
- [Revisão de aulas da produção](../README.md#produção-de-aulas-e-revisão)
- [Área do aluno](../README.md#aluno)

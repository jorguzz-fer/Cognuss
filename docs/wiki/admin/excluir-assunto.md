# Como excluir um assunto

Apaga um assunto que foi criado por engano ou que ficou sem uso.

**Quem pode:** Admin. **Onde:** Admin → Cursos → curso → disciplina, seção **Assuntos**, `/admin/disciplinas/<disciplina>`.

## Antes de começar

- O botão **Excluir** só aparece quando o assunto tem 0 questões e nenhum subassunto. A contagem aparece na linha, como "3 questões".
- Exclua antes os subassuntos.
- Módulos ligados ao assunto também impedem a exclusão. Troque o **Assunto** desses módulos antes. Veja [Criar um módulo](criar-modulo.md).

## Passo a passo

1. Abra a disciplina: **Cursos** → curso → nome da disciplina.
2. Na seção **Assuntos**, ache a linha do assunto.
3. Clique em **Excluir**. A linha pergunta "Excluir (nome do assunto)?".
4. Clique em **Confirmar exclusão**. Para desistir, clique em **Cancelar**.

## O que acontece depois

- Aparece o aviso "Assunto excluído.".
- O assunto some das listas de módulos e de questões.
- A exclusão fica na auditoria.

## Se der errado

- "Esse item está em uso (tem conteúdo ou alunos ligados a ele). Desative em vez de excluir.": algo ainda aponta para o assunto, como um módulo, flashcards, o histórico de domínio dos alunos ou um lote da produção de aulas. Troque o assunto do módulo e tente de novo. Se o motivo for o histórico dos alunos, não dá para excluir pela tela, e assuntos não têm opção de desativar. Deixe o assunto como está ou fale com a engenharia.
- O botão **Excluir** não aparece: o assunto tem questões ou subassuntos. Questões em rascunho mudam de assunto pela tela da questão. Questões publicadas só mudam criando uma nova versão. Veja [Criar uma nova versão de uma questão](criar-nova-versao-de-questao.md).

## Veja também

- [Criar um assunto](criar-assunto.md)
- [Renomear ou reordenar um assunto](editar-assunto.md)

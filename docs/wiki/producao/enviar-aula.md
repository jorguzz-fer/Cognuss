# Como enviar a aula do professor e criar o lote

Enviar a aula cria um lote: o sistema guarda o arquivo, separa os slides, acha os pedidos do professor e a IA planeja cada peça.

**Quem pode:** Admin, com a verificação em duas etapas ativa. **Onde:** **Produção de aulas** (`/admin/producao`), seção **Novo lote**.

## Antes de começar

- A disciplina precisa ter ao menos um assunto, e a aula precisa existir como assunto. Veja [Como preparar o catálogo](preparar-catalogo.md).
- Formatos aceitos: PPT, PPTX, ODP, PDF, DOC ou DOCX, até 50 MB.
- Apresentação (PPT, PPTX, ODP) dá o melhor resultado: o sistema lê o texto, as notas e os slides ocultos. Em PDF, DOC e DOCX, cada página vira um slide.

## Passo a passo

1. Abra **Produção de aulas** no menu lateral.
2. Em **Novo lote**, escolha a **Disciplina**.
3. Em **Aula**, escolha o assunto da disciplina que corresponde a esta aula.
4. Preencha **Nome da aula**. É o nome que aparece nas peças, por exemplo "Aula 1 · Introdução". Use de 3 a 160 caracteres.
5. Preencha **Posição na ordem do curso** (de 0 a 999; o padrão é 1). Ela define a ordem dos módulos da disciplina.
6. Em **Arquivo da aula**, escolha o arquivo.
7. Clique em **Enviar e criar o lote**.
8. Espere as mensagens "Preparando o arquivo…", "Enviando… N%" e "Arquivo enviado. Criando o lote…". Não feche a aba durante o envio.

## O que acontece depois

A tela abre o lote novo. Ele passa por **Verificando o arquivo**, **Separando os slides** e **Planejando as peças** até chegar a **Plano pronto**. A tela se atualiza sozinha. O lote também aparece na tabela **Lotes**, com **Aula**, **Disciplina**, **Situação**, **Mídia estimada** e **Enviada em**.

## Se der errado

| Mensagem                                                                               | O que fazer                                                                             |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| "Escolha o arquivo da aula."                                                           | Selecione um arquivo em **Arquivo da aula**.                                            |
| "O arquivo passa de 50 MB."                                                            | Reduza o arquivo (por exemplo, comprima as imagens no PowerPoint) ou divida a aula.     |
| "Envie a aula em PPT, PPTX, ODP, PDF, DOC ou DOCX."                                    | Salve o arquivo num desses formatos.                                                    |
| "O envio falhou. Tente de novo." ou "Sem conexão. Confira a internet e tente de novo." | Confira a conexão e clique de novo em **Enviar e criar o lote**.                        |
| "Dê um nome à aula."                                                                   | Preencha **Nome da aula** com ao menos 3 caracteres.                                    |
| "Envie a aula em PPT, PPTX, PDF ou DOCX."                                              | O arquivo foi reconhecido como planilha ou imagem. Envie a apresentação ou o documento. |
| "Não deu para enviar agora."                                                           | Tente de novo em alguns minutos. Se repetir, avise a equipe técnica.                    |

## Veja também

- [Como acompanhar o lote](acompanhar-lote.md)
- [Como escrever os pedidos do professor nos slides](escrever-pedidos-nos-slides.md)
- [Cursos, disciplinas e assuntos no admin](../admin/)

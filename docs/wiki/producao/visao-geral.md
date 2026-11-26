# Como produzir uma aula interativa do início ao fim

A produção de aulas transforma o arquivo que o professor enviou em peças interativas e questões que o aluno vê no Cognuss, com revisão médica antes de publicar.

**Quem pode:** Admin, com a verificação em duas etapas ativa, para enviar, planejar e gerar. Revisão (papel de revisor) ou outro Admin para revisar e publicar. **Onde:** menu lateral **Produção de aulas** (`/admin/producao`) e **Revisão de aulas** (`/admin/revisao`).

## Antes de começar

- O servidor precisa das chaves da Claude, da Higgsfield e da ElevenLabs. Sem elas, partes do fluxo param com aviso. Veja [Como configurar o servidor para a produção](configurar-servidor.md).
- O fluxo tem duas decisões humanas que custam dinheiro: aprovar o plano antes de gerar e, nos vídeos, aprovar o roteiro e as imagens antes de animar.

## Passo a passo

1. **Prepare o catálogo.** A disciplina e a aula (assunto) precisam existir antes do envio. Veja [Como preparar o catálogo](preparar-catalogo.md). Se o professor ainda vai montar os slides, mostre a ele [Como escrever os pedidos do professor nos slides](escrever-pedidos-nos-slides.md).
2. **Envie o arquivo da aula.** Em **Novo lote**, escolha disciplina, aula e posição e clique em **Enviar e criar o lote**. Veja [Como enviar a aula e criar o lote](enviar-aula.md).
3. **Acompanhe o lote.** O sistema confere o arquivo, separa os slides e a IA planeja as peças. A tela se atualiza sozinha. Veja [Como acompanhar o lote](acompanhar-lote.md).
4. **Confira o plano.** Para cada tarefa, clique em **Aprovar**, **Editar** ou **Descartar**. Veja [Como conferir o plano](conferir-plano.md).
5. **Libere a geração.** Clique em **Liberar geração**. A IA escreve cada peça, testa nos temas claro e escuro e você vê a prévia. Veja [Como gerar as peças e ver a prévia](gerar-pecas.md) e [Como gerar uma peça de novo](gerar-de-novo.md).
6. **Produza os vídeos.** Tarefas do tipo **Vídeo com narração** pedem duas aprovações: o roteiro e as imagens. Veja [Como produzir um vídeo](produzir-video.md), [Como retomar um vídeo pausado](retomar-video.md) e [Como escolher a voz e a cota diária](configurar-vozes-e-cota.md).
7. **Envie para a revisão.** No lote, clique em **Enviar N peças para revisão**. Veja [Como enviar as peças para a revisão](enviar-para-revisao.md).
8. **Revise e publique.** O revisor aprova ou pede ajuste em cada peça e depois clica em **Publicar a aula**. Veja [Como revisar uma peça](revisar-peca.md), [Como pedir ajuste numa peça](pedir-ajuste.md) e [Como publicar a aula](publicar-aula.md).

## O que acontece depois

A peça publicada vira um módulo da disciplina, sem o selo "Demonstração · sem revisão". As questões aprovadas entram na prática do aluno, ligadas ao assunto da aula.

## Se der errado

| Sintoma                                                                     | Onde ver                                                             |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| O lote mostra **Falhou**                                                    | [Como acompanhar o lote](acompanhar-lote.md)                         |
| A tarefa mostra **Falhou**                                                  | [Como gerar uma peça de novo](gerar-de-novo.md)                      |
| O vídeo mostra **Pausado**                                                  | [Como retomar um vídeo pausado](retomar-video.md)                    |
| "Quem enviou a peça para revisão não pode aprová-la. Peça a outro revisor." | [Como revisar uma peça](revisar-peca.md)                             |
| Avisos de chave ausente                                                     | [Como configurar o servidor para a produção](configurar-servidor.md) |

## Veja também

- [Cursos, disciplinas, assuntos e usuários](../README.md#admin)
- [Como o aluno estuda um módulo](../README.md#aluno)
- Especificação do módulo: `docs/producao/ESPECIFICACAO.md`
- Roteiro das provas reais: `docs/producao/roteiro-de-prova.md`
- Decisão de arquitetura: `docs/decisions/0021-producao-de-aulas.md`

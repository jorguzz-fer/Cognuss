# Como gerar as peças e ver a prévia

Liberar a geração manda as tarefas aprovadas para a IA, que escreve cada peça, testa nos temas claro e escuro e guarda cada tentativa como uma versão.

**Quem pode:** Admin, com a verificação em duas etapas ativa. **Onde:** tela do lote (`/admin/producao/<lote>`), botão **Liberar geração**; prévia na tela da peça (`/admin/producao/<lote>/tarefas/<tarefa>`).

## Antes de começar

- Aprove ao menos uma tarefa com tipo de peça definido. Veja [Como conferir o plano](conferir-plano.md).
- O servidor precisa da chave da Claude e do Chromium do worker. Veja [Como configurar o servidor](configurar-servidor.md).

## Passo a passo

1. Na tela do lote, confira o texto ao lado do botão, por exemplo "3 peças aprovadas vão para a geração."
2. Clique em **Liberar geração**. A mensagem confirma: "3 peças foram para a geração."
3. O lote passa para **Gerando as peças**. Cada tarefa aprovada mostra **Gerando a peça**.
4. Clique em **Acompanhar a geração** na tarefa. A tela avisa: "A IA está escrevendo a peça; depois vêm o linter e o teste nos temas claro e escuro. Leva alguns minutos e esta tela se atualiza sozinha."
5. Quando a tarefa mostrar **Peça pronta**, veja a seção **Prévia da versão N**:
   - a peça aparece lado a lado em **Tema claro** e **Tema escuro**;
   - use **Abrir em tela cheia** para testar a peça numa aba própria;
   - interaja com a área interativa e os cenários, e leia **Para fixar** e **Na prova**.
6. Confira a frase ao lado do título da prévia: "Passou no linter e no teste nos dois temas." ou "Esta versão não passou: veja os problemas no histórico."
7. Em **Versões**, veja cada tentativa:
   - **Versão N** com o selo **Passou** ou **Não passou**, a data e o custo;
   - em vermelho, os problemas que reprovaram a versão;
   - em amarelo, os avisos (por exemplo, do celular, que só avisa);
   - as capturas do teste: **Tema claro**, **Tema escuro** e **Celular**.
8. Clique em **Versão N** para ver a prévia de uma versão antiga.
9. Na lateral, confira **Plano aprovado** e **Slides do pedido**.

## O que acontece depois

- Se a versão passa no teste, a tarefa vira **Peça pronta**.
- Se não passa, a IA recebe os problemas e corrige, até 3 tentativas. Cada tentativa vira uma versão.
- Quando nenhuma tarefa está gerando, o lote vira **Peças geradas** e aparece o quadro **Revisão médica**. Veja [Como enviar as peças para a revisão](enviar-para-revisao.md).
- Na prévia, a peça mostra o selo "Demonstração · sem revisão" até o revisor aprovar.
- Tarefas de vídeo não geram direto: elas param em **Roteiro para aprovar**. Veja [Como produzir um vídeo](produzir-video.md).

## Se der errado

| Mensagem                                                                                                             | O que fazer                                                                                   |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| "Aprove ao menos uma tarefa com tipo de peça definido."                                                              | Aprove tarefas antes de liberar.                                                              |
| "O plano deste lote ainda não está pronto para gerar."                                                               | Espere o lote chegar a **Plano pronto** ou **Peças geradas**.                                 |
| "Não deu para liberar agora."                                                                                        | Tente de novo em instantes.                                                                   |
| Tarefa **Falhou** com "A peça não passou depois das tentativas de correção."                                         | Leia os problemas listados e use [Gerar de novo](gerar-de-novo.md) com um pedido de ajuste.   |
| "A geração de peças não está disponível (falta a chave do Claude). Gere de novo quando a chave estiver configurada." | Peça à equipe técnica a chave da Claude no worker. Depois, [Gerar de novo](gerar-de-novo.md). |
| "A IA recusou escrever esta peça. Revise o plano e gere de novo."                                                    | Reveja o pedido e o tipo de peça. Gere de novo com um pedido de ajuste.                       |
| "Não foi possível gerar esta peça agora. Gere de novo em alguns minutos."                                            | Espere alguns minutos e use [Gerar de novo](gerar-de-novo.md).                                |
| "Esta tarefa ainda não tem peça gerada."                                                                             | A tarefa ainda não foi liberada ou não terminou.                                              |

## Veja também

- [Como gerar uma peça de novo](gerar-de-novo.md)
- [Como produzir um vídeo](produzir-video.md)
- [Como enviar as peças para a revisão](enviar-para-revisao.md)

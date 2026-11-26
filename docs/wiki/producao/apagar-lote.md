# Como apagar um lote que falhou

Um lote que falhou não tem como tentar de novo. Apague o lote e envie a aula outra vez, para a lista **Lotes** não ficar com tentativas mortas.

**Quem pode:** Admin, com a verificação em duas etapas ativa. **Onde:** tela do lote (`/admin/producao/<lote>`), logo abaixo do aviso vermelho.

## Antes de começar

- Só dá para apagar um lote na situação **Falhou**. Lotes em andamento ou com peças geradas não têm o botão.
- Leia o motivo no aviso vermelho antes de apagar. Ele diz o que corrigir no arquivo. Veja [Como acompanhar o lote](acompanhar-lote.md).
- Apagar leva junto os slides e as tarefas do lote. Não tem volta.

## Passo a passo

1. Abra **Produção de aulas** e clique na aula que mostra **Falhou** na tabela **Lotes**.
2. Abaixo do aviso vermelho, clique em **Apagar e enviar de novo**.
3. A tela pergunta "Apagar este lote?". Clique em **Apagar lote** para confirmar ou em **Cancelar** para desistir.
4. A tela volta para **Produção de aulas**.
5. Corrija o arquivo, se for o caso, e envie a aula de novo em **Novo lote**. Veja [Como enviar a aula e criar o lote](enviar-aula.md).

## O que acontece depois

- O lote some da tabela **Lotes**.
- A exclusão fica na auditoria, com o nome da aula.

## Se der errado

| Mensagem                                | O que fazer                                                                |
| --------------------------------------- | -------------------------------------------------------------------------- |
| "Só dá para apagar um lote que falhou." | O lote não está em **Falhou**. Recarregue a página e confira o selo.       |
| "Lote não encontrado."                  | O lote já foi apagado, talvez em outra aba. Volte a **Produção de aulas**. |
| "Não deu para apagar agora."            | Tente de novo em instantes.                                                |

## Veja também

- [Como acompanhar o lote](acompanhar-lote.md)
- [Como enviar a aula e criar o lote](enviar-aula.md)
- [Como produzir uma aula interativa do início ao fim](visao-geral.md)

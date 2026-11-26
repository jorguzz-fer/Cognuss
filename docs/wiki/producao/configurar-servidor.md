# Como configurar o servidor para a produção de aulas

A produção de aulas só funciona de verdade com as chaves da Claude, da Higgsfield e da ElevenLabs cadastradas no worker, o processo que roda os trabalhos em fila ao lado do app.

**Quem pode:** equipe técnica com acesso ao Coolify. **Onde:** variáveis do serviço `worker` no Coolify (arquivo `infra/compose.yml`); a lista completa está em `.env.example` e em `docs/deploy.md`.

## Antes de começar

- Nunca coloque chaves no repositório nem em mensagens. Cadastre só no Coolify.
- Todas as chamadas à Claude, à Higgsfield e à ElevenLabs saem do worker. O navegador nunca fala com essas APIs.
- Use o plano pago da ElevenLabs: o gratuito recusou por fila cheia no piloto.

## Passo a passo

1. No Coolify, abra as variáveis da aplicação Cognuss.
2. Cadastre a chave da Claude:
   - `ANTHROPIC_API_KEY`: plano das peças, escrita das peças HTML e roteiro dos vídeos.
3. Cadastre a Higgsfield (imagens e clipes dos vídeos):
   - `HIGGSFIELD_API_KEY_ID` e `HIGGSFIELD_API_KEY_SECRET`. Se o console mostrar as duas juntas no formato `ID:SECRET`, cole tudo em `HIGGSFIELD_API_KEY_ID` e deixe o secret vazio.
4. Cadastre a ElevenLabs (narração):
   - `ELEVENLABS_API_KEY`.
   - `ELEVENLABS_VOICE_ID` (opcional): voz de reserva, usada quando a disciplina não tem voz escolhida em [Vozes e cota de mídia](configurar-vozes-e-cota.md).
5. Confira o armazenamento de arquivos, que o app e o worker usam: `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID` e `STORAGE_SECRET_ACCESS_KEY`.
6. Se quiser, ajuste as opcionais (todas têm padrão):
   - `AI_PRODUCTION_MODEL` e `AI_PRODUCTION_EFFORT`: modelo e esforço do plano das peças.
   - `AI_PIECE_MODEL` e `AI_PIECE_EFFORT`: modelo e esforço da escrita das peças e do roteiro dos vídeos.
   - `HIGGSFIELD_IMAGE_ENDPOINT` e `HIGGSFIELD_VIDEO_ENDPOINT`: trocam o modelo de imagem e de clipe.
   - `ELEVENLABS_MODEL`: modelo da narração.
   - `PRODUCTION_DAILY_CREDITS`: cota diária padrão de créditos de mídia (300), usada enquanto ninguém salvar outra em **Vozes e cota de mídia**.
7. Faça o deploy do worker para ele ler as variáveis novas.
8. Teste com uma aula curta: envie, aprove uma tarefa e libere a geração.

As variáveis `AI_PROVIDER`, `MEDIA_PROVIDER`, `PIECE_CHROMIUM_PATH` e `PRODUCTION_MEDIA_POLL_MS` existem em `.env.example`, mas o `infra/compose.yml` não as repassa ao worker, então valem os padrões. Os valores `fake` de `AI_PROVIDER` e `MEDIA_PROVIDER` servem só para testes e o worker se recusa a subir com eles em produção.

## O que acontece depois

O worker passa a planejar, escrever, testar e gerar a mídia. O custo de IA aparece em **Custos de IA** no admin: o plano como "Produção de aulas: plano das peças"; as peças e os roteiros com os nomes internos `producao_peca` e `producao_roteiro`. Os créditos de mídia aparecem no lote e em **Vozes e cota de mídia**.

## Se der errado

O que acontece quando falta cada chave:

| Falta                                     | O que a equipe vê na tela                                                                                                                                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY`, no plano             | Aviso no lote: "O plano por IA não está disponível (falta a chave do Claude). As tarefas vieram só da detecção dos pedidos." Numa aula sem pedidos, não há tarefas.                                                                        |
| `ANTHROPIC_API_KEY`, nas peças            | Tarefa **Falhou**: "A geração de peças não está disponível (falta a chave do Claude). Gere de novo quando a chave estiver configurada."                                                                                                    |
| `ANTHROPIC_API_KEY`, no vídeo             | Tarefa **Falhou**: "O roteiro do vídeo não está disponível (falta a chave do Claude). Gere de novo quando a chave estiver configurada."                                                                                                    |
| Chaves da Higgsfield                      | Vídeo **Pausado**: "A geração de imagens e clipes não está configurada (faltam as chaves da Higgsfield no worker). Retome depois de configurar."                                                                                           |
| `ELEVENLABS_API_KEY`                      | Vídeo **Pausado**: "A narração não está configurada (falta a chave da ElevenLabs no worker). Retome depois de configurar."                                                                                                                 |
| Voz da disciplina e `ELEVENLABS_VOICE_ID` | Vídeo **Pausado**: "Esta disciplina ainda não tem voz de narração. Escolha a voz em Produção · Vozes e retome."                                                                                                                            |
| Armazenamento                             | O envio do arquivo ou o lote falham (o lote mostra "Não foi possível preparar este lote agora. Tente enviar de novo em alguns minutos.") e a publicação falha com "Armazenamento não encontrado." (a confirmar a mensagem exata no envio). |

Chave errada, expirada ou sem saldo também pausa o vídeo, com a mensagem do provedor. Veja [Como retomar um vídeo pausado](retomar-video.md).

O worker também precisa, na imagem dele, do LibreOffice, do Poppler, do unzip, do Chromium e do ffmpeg. A imagem do `apps/worker/Dockerfile` já traz todos.

## Veja também

- [Como retomar um vídeo pausado](retomar-video.md)
- [Como escolher a voz e a cota diária](configurar-vozes-e-cota.md)
- [Configurações do admin](../README.md#admin)
- Implantação: `docs/deploy.md`

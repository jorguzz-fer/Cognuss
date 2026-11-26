# Como escolher a voz da disciplina e a cota diária de mídia

A voz da ElevenLabs escolhida para a disciplina narra todos os vídeos dela, e a cota diária limita os créditos de imagem e clipe gastos por dia.

**Quem pode:** Admin, com a verificação em duas etapas ativa. **Onde:** **Produção de aulas**, botão **Vozes e cota de mídia** (`/admin/producao/vozes`).

## Antes de começar

- Tenha o id da voz na ElevenLabs. No site da ElevenLabs, em Voices, use "Copy voice ID". Use uma voz nativa em português do Brasil.
- A cota soma os créditos de todos os lotes no dia de Brasília. Um clipe de 8 s custa 14 créditos; uma imagem, 2.

## Passo a passo

1. Abra **Produção de aulas** e clique em **Vozes e cota de mídia**.
2. Em **Cota diária**, ajuste **Créditos de mídia por dia** (de 0 a 100.000). A dica mostra quanto já foi gasto hoje: "Hoje já foram N."
3. Em **Voz de narração por disciplina**, cole o id da voz no campo com o nome da disciplina. Deixe em branco a disciplina que não terá vídeo.
4. Clique em **Salvar**. A tela confirma com **Salvo.**

## O que acontece depois

- Os próximos vídeos da disciplina usam a voz salva. Disciplina sem voz usa a voz padrão do servidor, se houver.
- Se a disciplina não tem voz nem há voz padrão, o vídeo pausa na narração com "Esta disciplina ainda não tem voz de narração. Escolha a voz em Produção · Vozes e retome." Depois de salvar a voz, clique em **Retomar** na peça. Veja [Como retomar um vídeo pausado](retomar-video.md).
- Quando a cota acaba, a geração para e continua sozinha logo depois da meia-noite de Brasília. Aumentar a cota no mesmo dia não acorda o vídeo que já esperava: ele só volta depois da meia-noite. A cota nova vale para os pedidos seguintes.

## Se der errado

| Mensagem                                             | O que fazer                                                                |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| "O id da voz da ElevenLabs tem só letras e números." | Cole só o id da voz, sem espaços nem outros sinais (de 8 a 40 caracteres). |
| "Não deu para salvar agora."                         | Tente de novo em instantes.                                                |

A cota que aparece quando ninguém salvou nada ainda é sempre 300. Se o servidor tiver outra cota padrão configurada, a tela não mostra. Ao salvar, vale o número da tela.

## Veja também

- [Como produzir um vídeo](produzir-video.md)
- [Como retomar um vídeo pausado](retomar-video.md)
- [Como configurar o servidor para a produção](configurar-servidor.md)

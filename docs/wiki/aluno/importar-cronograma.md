# Como importar o cronograma da disciplina

Você envia o cronograma da disciplina e a IA lê as datas de aulas, provas e entregas. Nada entra na agenda antes de você conferir e confirmar.

**Quem pode:** aluno dono da disciplina. **Onde:** cartão da disciplina em **Minhas disciplinas** (`/app/minhas-disciplinas`), na etapa **Disciplinas** do primeiro acesso (`/comecar/disciplinas`) ou no quadro **Cronograma da disciplina** da visão da disciplina.

**Chave de módulo:** **Minhas disciplinas e cronogramas (DIS)** (`disciplinas`) ou, no primeiro acesso, **Cadastro inicial (CAD)**. A leitura pela IA depende também da função **Leitura do cronograma** estar ligada em **IA** (`/admin/ia`) e da sua autorização de IA para materiais.

## Antes de começar

- O arquivo deve ser PDF, DOC, DOCX ou XLSX, com até 10 MB.
- A leitura usa IA. Na primeira vez, a plataforma pede a sua autorização. Veja [Como autorizar a leitura dos materiais pela IA](autorizar-leitura-por-ia.md).

## Passo a passo

1. Abra **Minhas disciplinas** e encontre o cartão da disciplina.
2. Clique em **Anexar cronograma** (ou **Enviar outro cronograma**, se já existe um) e escolha o arquivo. Também dá para escolher o arquivo no campo **Cronograma** ao cadastrar a disciplina.
3. A tela mostra "Cronograma enviado. A leitura começa em instantes; você confere tudo antes de entrar na agenda."
4. Acompanhe o estado no cartão:
   - "Lendo o cronograma. Isso costuma levar menos de um minuto." A tela se atualiza sozinha a cada poucos segundos.
   - Se aparecer o texto sobre a IA e o botão **Autorizar a leitura**, leia e clique para autorizar. A leitura recomeça.
   - "O cronograma foi lido." com o botão **Conferir o cronograma**.
5. Clique em **Conferir o cronograma** e siga [Como conferir o cronograma](conferir-cronograma.md).

## O que acontece depois

- Depois que você confirma, o cartão mostra "Cronograma conferido e na agenda."
- As aulas entram na agenda e na grade da rotina, protegidas: o planejamento nunca usa esses horários.
- Enviar um cronograma novo substitui a leitura que estava em aberto. Na conferência, a tela mostra o que é novo, o que mudou e o que sai da agenda. Eventos que você editou na agenda ficam como estão.

## Se der errado

| Mensagem no cartão                                                                                                             | O que fazer                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Não encontramos texto neste arquivo. Envie o cronograma em PDF, Word ou planilha."                                            | O arquivo pode ser uma imagem sem texto. Envie outro formato.                                                                                                                                                                                                                 |
| "A leitura automática do cronograma ainda não está disponível. Você pode cadastrar as aulas à mão."                            | O servidor não tem a IA configurada. Cadastre as aulas na agenda. Veja [Como criar um evento na agenda](criar-evento-na-agenda.md). O suporte confere as chaves de IA do worker em [Como configurar o servidor para a produção de aulas](../producao/configurar-servidor.md). |
| "A leitura automática do cronograma está pausada no momento. Você pode cadastrar as aulas à mão ou tentar de novo mais tarde." | O admin desligou **Leitura do cronograma** em **IA**. Tente mais tarde ou cadastre à mão.                                                                                                                                                                                     |
| "A leitura automática não foi possível para este arquivo. Confira o documento ou cadastre as aulas à mão."                     | Confira se o arquivo é mesmo o cronograma. Envie outro ou cadastre à mão.                                                                                                                                                                                                     |
| "Não foi possível ler o cronograma agora. Tente de novo em alguns minutos."                                                    | Clique em **Tentar de novo** depois de alguns minutos.                                                                                                                                                                                                                        |
| "O arquivo do cronograma não pôde ser processado." ou estado **Bloqueado pelo antivírus**                                      | Envie outro arquivo.                                                                                                                                                                                                                                                          |
| "O arquivo passa de 10 MB."                                                                                                    | Diminua o arquivo.                                                                                                                                                                                                                                                            |
| "Esta leitura não precisa ser refeita."                                                                                        | A leitura já está em andamento ou pronta. Recarregue a página.                                                                                                                                                                                                                |

Em qualquer falha, o botão **Tentar de novo** aparece no cartão.

## Veja também

- [Como conferir o cronograma](conferir-cronograma.md)
- [Como autorizar a leitura dos materiais pela IA](autorizar-leitura-por-ia.md)
- [Como cadastrar uma disciplina](cadastrar-disciplina.md)
- [Como ligar e desligar os recursos de IA e o alerta de gasto](../admin/configurar-recursos-de-ia.md) e [Como ligar e desligar módulos da v2](../admin/ligar-e-desligar-funcionalidades.md), no guia do admin
- [Como configurar o servidor para a produção de aulas](../producao/configurar-servidor.md), para as chaves de IA no worker

# Como usar o tutor de IA do módulo

O tutor do módulo responde dúvidas sobre o conteúdo de um módulo do catálogo, usando só o material publicado ali e as questões que você já respondeu.

**Quem pode:** aluno com o primeiro acesso concluído. **Onde:** página de um módulo (`/app/disciplinas/<disciplina>/<módulo>`), quadro **Tutor IA** no fim da página.

## Antes de começar

- O tutor do módulo não depende de chave de módulo. Ele depende da configuração própria do admin em **Tutor IA** (`/admin/tutor`): a caixa **Tutor ligado para os alunos** e o número de **Perguntas por aluno em 24 h**. Ele não está na lista de interruptores de `packages/db/src/ai-settings.ts`.
- Na primeira vez, você precisa aceitar o uso descrito na tela. Esse aceite é a autorização **Tutor IA** (`ai_tutor`) em Privacidade.
- O que vai para a IA: sua pergunta, o material do módulo e o resumo das questões deste módulo que você respondeu. Vai para a Anthropic, nos Estados Unidos. Seu nome e seu e-mail não vão.
- Não escreva dados de pacientes nem informações pessoais na pergunta.

## Passo a passo

1. Abra o módulo pelo catálogo (**Estudar**, disciplina, módulo).
2. Desça até **Tutor IA**.
3. Na primeira vez, leia o quadro **Antes da primeira pergunta** e clique em **Aceito usar o tutor**.
4. Escreva sua dúvida no campo **Sua dúvida** (de 3 a 1.500 caracteres).
5. Clique em **Perguntar ao tutor**. Enquanto ele responde, aparece "O tutor está pensando…".
6. Leia a resposta na conversa. Pergunte de novo se quiser aprofundar: o tutor lembra das últimas mensagens da conversa deste módulo.

## O que acontece depois

- Abaixo do botão aparece quantas perguntas você ainda tem: "N de M perguntas restantes nas próximas 24 horas". A conta é das últimas 24 horas, em janela corrida.
- A conversa fica guardada. Você a encontra de novo ao voltar ao módulo, e a equipe pode revê-la.
- O que o tutor faz:
  - responde em português, de forma curta, só com base no material do módulo e nas explicações das questões que você já respondeu;
  - diz quando o material do módulo não cobre a dúvida e sugere levar a pergunta ao professor;
  - avisa quando o módulo é de demonstração, sem revisão editorial;
  - não orienta casos reais (diagnóstico, dose ou conduta para um paciente ou para você);
  - não entrega a resposta de questões que você ainda não respondeu: ele guia com perguntas e conceitos.

## Se der errado

- **"O tutor está desligado no momento. O resumo e as questões continuam aqui."**: o admin desligou o tutor ou o serviço de IA não está configurado. Estude pelo resumo e pelas questões e tente outro dia.
- **"Para usar o tutor, aceite antes o uso descrito acima."**: o aceite não foi registrado ou foi retirado em Privacidade. Clique em **Aceito usar o tutor** de novo.
- **"Você usou as N perguntas das últimas 24 horas. O tutor volta a responder amanhã."**: a cota acabou. O campo fica bloqueado até a janela de 24 horas liberar perguntas.
- **"Escreva sua dúvida."** ou **"Use até 1500 caracteres."**: ajuste o tamanho da pergunta.
- **"Muitos pedidos ao mesmo tempo. Tente em um minuto."** ou **"O serviço de IA não respondeu. Tente de novo."**: falha passageira do serviço de IA. Espere um pouco e pergunte de novo.

## Veja também

- [Como estudar pelo catálogo](estudar-pelo-catalogo.md)
- [Como conversar com o tutor sobre os seus materiais](usar-tutor-dos-materiais.md)
- [Como apagar as conversas com o tutor](apagar-conversas-do-tutor.md)
- [Como ligar e desligar as autorizações de IA](gerenciar-autorizacoes-de-ia.md)
- [Como configurar o tutor (admin)](../admin/configurar-tutor.md)
- [Como ver as conversas do tutor (admin)](../admin/ver-conversas-do-tutor.md)

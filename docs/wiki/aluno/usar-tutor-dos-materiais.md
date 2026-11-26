# Como conversar com o tutor sobre os seus materiais

O tutor da Ajuda Cognuss responde dúvidas a partir dos materiais que você enviou e mostra a página de onde saiu cada resposta.

**Quem pode:** aluno com o primeiro acesso concluído. **Onde:** **Ajuda Cognuss**, **Tutor** (`/app/ajuda/tutor`).

## Antes de começar

- Depende da chave de módulo **Ajuda Cognuss (AJU)** (`ajuda`). Com ela desligada, a página não existe.
- Depende do interruptor de IA **Tutor sobre os materiais** (`tutor_materiais`), em **Custos de IA** do admin. Também precisa da caixa **Tutor ligado para os alunos**, em **Tutor IA** do admin.
- Você precisa de materiais com o texto já lido. Eles vêm de **Material de estudo**, que depende da chave **Material de estudo (MAT)** (`materiais`). Veja [Como enviar materiais de estudo](enviar-materiais.md).
- Na primeira conversa, você autoriza a leitura dos materiais pela IA. É a autorização **Leitura dos seus materiais pela IA** (`ai_materials`) em Privacidade. O conteúdo vai para a Anthropic e para a Voyage AI, nos EUA. Nome, e-mail e CPF não vão.

## Passo a passo

1. Abra **Ajuda Cognuss** e clique em **Tutor**.
2. Em **Nova conversa**, marque os materiais em **Sobre quais materiais?**.
   - Se você veio de uma aula ou de um slide, a fonte já vem escolhida e aparece como **Fonte:** com o nome da aula ou do slide.
3. Na primeira vez, marque a caixa de autorização que termina em "Autorizo a leitura.".
4. Clique em **Abrir conversa**.
5. Escreva no campo **Sua pergunta** (até 1.500 caracteres) e clique em **Perguntar**. Enquanto ele lê, aparece "O tutor está lendo seus materiais…".
6. Leia a resposta. Cada resposta traz o selo "Gerado por IA a partir dos seus materiais · sem revisão editorial" e a lista **Páginas usadas**. Clique numa página para abrir o material nela.
7. Se a conversa mostrar **Suas dúvidas registradas**, clique numa dúvida para colocá-la no campo de pergunta.

## O que acontece depois

- A conversa fica em **Conversas recentes**, na página do Tutor, com o tipo de fonte (**Materiais**, **Aula** ou **Slide**).
- Ao lado do botão aparece "N de M perguntas nas próximas 24 horas". Esta conta soma as perguntas feitas aqui e as feitas ao tutor dos módulos do catálogo.
- Quando os materiais não cobrem o assunto, o tutor diz isso.

## Se der errado

- **"Você ainda não tem material com o texto lido."**: anexe slides ou apostilas em **Material de estudo** e espere o processamento terminar.
- **"Escolha pelo menos um material."**: marque ao menos um material antes de abrir a conversa.
- **"Para continuar, autorize a leitura pela IA."**: marque a caixa de autorização.
- **"O tutor está pausado no momento. Tente de novo mais tarde."**: o admin desligou o recurso. Tente mais tarde.
- **"Você usou as N perguntas das últimas 24 horas. O tutor volta a responder amanhã."**: a cota acabou. O botão **Perguntar** fica bloqueado até a janela liberar perguntas.
- **"Nenhum material com texto lido nesta fonte. O tutor vai dizer que não tem de onde responder."**: a fonte escolhida não tem texto. Abra uma conversa nova com outros materiais.

## Veja também

- [Como enviar materiais de estudo](enviar-materiais.md)
- [Como usar o tutor de IA do módulo](usar-tutor-do-modulo.md)
- [Como criar com IA](criar-com-ia.md)
- [Como ligar e desligar as autorizações de IA](gerenciar-autorizacoes-de-ia.md)
- [Como ligar e desligar funcionalidades (admin)](../admin/ligar-e-desligar-funcionalidades.md)
- [Como configurar os recursos de IA (admin)](../admin/configurar-recursos-de-ia.md)
- [Como acompanhar uma aula](acompanhar-aula.md)

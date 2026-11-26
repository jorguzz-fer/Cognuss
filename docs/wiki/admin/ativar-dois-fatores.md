# Como ativar a verificação em duas etapas (obrigatória para admin)

Liga o segundo fator da conta: além da senha, um código de 6 dígitos do app autenticador do celular. Para quem tem o papel Admin, é obrigatório.

**Quem pode:** qualquer conta. Obrigatório para Admin. **Onde:** menu lateral → **Segurança**, `/seguranca/dois-fatores`.

## Antes de começar

- Instale um app autenticador no celular, como Google Authenticator, 1Password ou Authy.
- Tenha a senha da conta em mãos.
- Admin sem 2FA que tenta abrir o `/admin` ou o `/mapa` é levado direto para esta tela. A tela explica: "Contas de administração precisam de um segundo fator para acessar o editorial."

## Passo a passo

1. Abra **Segurança** no menu lateral, ou espere a plataforma levar você para lá.
2. **Passo 1 de 3**: digite a senha em **Confirme sua senha** e clique em **Continuar**.
3. **Passo 2 de 3**: escaneie o QR code com o app autenticador. Sem câmera, digite no app a chave que aparece em "Sem câmera? Digite a chave:".
4. Digite em **Código de 6 dígitos do app** o código que o app mostra e clique em **Ativar**.
5. **Passo 3 de 3**: a tela mostra "Verificação em duas etapas ativa." e a lista em **Guarde estes códigos de recuperação**. Guarde esses códigos fora do celular. Cada um funciona uma vez.
6. Clique em **Ir para o editorial**. Em contas sem o papel Admin, o botão é **Voltar ao Cognuss** e leva ao painel do aluno (`/app`).

## O que acontece depois

- Nas próximas entradas, depois da senha, a plataforma pede o **Código de 6 dígitos**. A opção **Não pedir de novo neste aparelho por 12 horas** vem marcada. Clique em **Confirmar**.
- Sem o celular, clique em **Usar um código de recuperação** e digite um dos códigos guardados.
- Se a verificação já está ligada, a tela mostra "Já está ativa nesta conta." e o quadro **Novos códigos de recuperação**, com o botão **Gerar novos códigos**. Ao gerar, os códigos antigos deixam de valer. Veja [Como gerar novos códigos ou desligar a verificação em duas etapas](../aluno/gerenciar-verificacao-em-duas-etapas.md).
- Conta Admin não desliga a própria verificação. A tela diz: "Contas de administração não podem desligar a verificação. Para trocar de celular, peça a outra pessoa da administração." Contas sem o papel Admin veem o botão **Desligar**.
- Na tela da pessoa em Admin → Usuários, a linha **2FA** mostra "ativo" ou "desligado".

## Se der errado

- Código recusado: confira se o relógio do celular está no horário automático e use o código atual, antes de ele trocar.
- Perdeu o celular e os códigos de recuperação: não existe botão no admin para desligar o 2FA de outra pessoa (a confirmar com a engenharia como recuperar).
- Senha errada no passo 1: a tela mostra o erro. Se esqueceu a senha, veja [Trocar a senha](../README.md#aluno).

## Veja também

- [De onde vem o primeiro admin](criar-primeiro-admin.md)
- [Dar e tirar papéis](dar-e-tirar-papeis.md)
- [Encerrar as sessões de alguém](encerrar-sessoes.md)
- [Gerar novos códigos ou desligar a verificação](../aluno/gerenciar-verificacao-em-duas-etapas.md)

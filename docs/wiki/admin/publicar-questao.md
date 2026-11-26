# Como levar uma questão pelo fluxo editorial

Leva uma questão do rascunho até o banco de questões dos alunos. O editor escreve e envia, uma pessoa da revisão aprova ou devolve, e a revisão publica.

**Quem pode:** Editor envia para revisão. Revisão e Admin aprovam, devolvem, publicam e arquivam. O autor da questão nunca aprova a própria questão. **Onde:** Admin → Questões, `/admin/questoes`, e a tela da questão, `/admin/questoes/<questão>`.

## Antes de começar

- A questão precisa estar salva como rascunho. Veja [Escrever uma questão](escrever-questao.md).
- A lista de **Questões** tem abas por status, com a contagem de cada uma: **Rascunho**, **Em revisão**, **Aprovada**, **Publicada** e **Arquivada**. Quem tem papel de revisão cai direto em **Em revisão**; o editor cai em **Rascunho**.

## Passo a passo

### Editor: enviar para revisão

1. Em **Questões**, aba **Rascunho**, abra a questão.
2. No quadro **Fluxo editorial**, clique em **Enviar para revisão**.
3. A questão vai para **Em revisão** e a tela mostra "Aguardando revisão.".

### Revisão: aprovar ou devolver

1. Em **Questões**, aba **Em revisão**, abra a questão.
2. Leia enunciado, alternativas, explicações e referências.
3. Escolha:
   - **Aprovar**, se está pronta;
   - **Devolver com observações**, se precisa de ajuste. Escreva em **O que precisa mudar** e clique em **Devolver para rascunho**.

### Revisão: publicar

1. Em **Questões**, aba **Aprovada**, abra a questão.
2. Clique em **Publicar**.

### Revisão: tirar do ar ou trazer de volta

- Questão publicada: **Arquivar**.
- Questão arquivada: **Republicar**.

## O que acontece depois

- Cada passo mostra o aviso "Status atualizado.".
- Questão devolvida volta para **Rascunho** e mostra "Observações da revisão:" com o seu texto. O autor corrige, salva e envia de novo.
- **Publicada**: a questão entra no banco de questões dos alunos do curso, no assunto escolhido. O gabarito e as explicações só aparecem para o aluno depois que ele responde.
- Para quem revisa, a tela mostra o quadro **Uso pelos alunos**, com o número de respostas e a porcentagem de acerto.
- **Arquivada**: a questão sai do estudo. As respostas antigas continuam guardadas.
- Para admin, a tela mostra o quadro **Auditoria** com cada passo.
- Questão aprovada, publicada ou arquivada não se edita. Para corrigir, veja [Criar uma nova versão de uma questão](criar-nova-versao-de-questao.md).

## Se der errado

- Ao enviar para revisão, a tela lista o que falta:
  - "Marque exatamente uma alternativa correta."
  - "Explique a correta e cada incorreta."
  - "Há alternativas repetidas."
  - "Use de 2 a 6 alternativas."
    Corrija no formulário, clique em **Salvar rascunho** e envie de novo.
- "Quem escreveu a questão não pode aprová-la. Peça a outra pessoa da revisão.": o autor não aprova. Se você é o autor e tem papel de revisão, a tela já avisa: "Você é autor desta questão: outra pessoa da revisão precisa aprovar."
- "Só quem revisa pode aprovar, devolver, publicar ou arquivar.": sua conta não tem papel Revisão nem Admin.
- "Só rascunhos podem ser editados. Crie uma nova versão.": a questão já saiu do rascunho.
- O editor enviou para revisão e quer mudar algo: ele não consegue puxar de volta. Peça a alguém da revisão para usar **Devolver com observações**.

## Veja também

- [Escrever uma questão](escrever-questao.md)
- [Criar uma nova versão de uma questão](criar-nova-versao-de-questao.md)
- [Dar e tirar papéis](dar-e-tirar-papeis.md)
- [Levar um módulo de rascunho a publicado](publicar-modulo.md)
- [Revisão de aulas da produção](../README.md#produção-de-aulas-e-revisão)
- [Área do aluno](../README.md#aluno)

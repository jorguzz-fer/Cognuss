# Como criar uma conta de teste

Cria uma conta de aluno pronta para testar a v2: cadastro feito e um semestre em andamento, com dados fictícios. A senha aparece uma vez.

**Quem pode:** Admin. **Onde:** Admin → Conta de teste, `/admin/demo`.

## Antes de começar

- Use um e-mail seu que ainda não tenha conta, por exemplo com `+teste` (`voce+teste1@exemplo.com`).
- O catálogo precisa de pelo menos um curso ativo. A conta entra no curso de endereço `medicina`; se ele não existir, no primeiro curso ativo.
- O envio de arquivos (bucket) e o worker precisam estar funcionando: a conta já nasce com PDFs enviados.
- Para o aluno de teste ver as telas da v2, os módulos precisam estar ligados. Veja [Ligar e desligar módulos](ligar-e-desligar-funcionalidades.md).

## Passo a passo

1. No menu lateral, clique em **Conta de teste**.
2. Preencha **E-mail da conta de teste**.
3. Em **Nome do aluno**, deixe "Aluna Teste Cognuss" ou escreva nome e sobrenome.
4. Clique em **Criar conta de teste**. O botão muda para "Criando… (leva alguns segundos)".
5. Copie o e-mail e a senha da caixa verde. A senha não aparece de novo.
6. Entre com essa conta numa janela anônima ou em outro navegador.

## O que acontece depois

- A caixa verde diz "Conta criada. Anote a senha agora: ela não aparece de novo." e mostra **E-mail** e **Senha**.
- A conta nasce com o e-mail confirmado, o cadastro concluído, o 3º semestre, a turma A e a primeira instituição ativa da lista.
- O semestre vem preenchido:
  - Fisiologia cardiovascular, sem cronograma, para testar o envio;
  - Patologia geral, com aulas, provas, nota, faltas, slides e prova anterior;
  - Farmacologia básica;
  - rotina da semana, lembretes e um compromisso na agenda.
- Os slides e a prova anterior levam alguns minutos para ficar prontos: o worker passa o antivírus e lê o texto.
- O quadro **PDFs de teste** traz os arquivos para enviar durante os testes: `cronograma-fisiologia.pdf`, `slides-inflamacao.pdf` e `prova-anterior-patologia.pdf`. Todos fictícios.
- A criação fica na auditoria, sem a senha.
- Para apagar a conta de teste: entre com ela, vá em Privacidade e peça a exclusão. Depois, antecipe em [Excluir uma conta](excluir-conta.md).

## Se der errado

- "Informe um e-mail válido.": confira o e-mail.
- "Informe nome e sobrenome.": o nome precisa de pelo menos 5 caracteres.
- "Já existe uma conta com esse e-mail. Use outro.": troque o e-mail, por exemplo `+teste2`.
- "Nenhum curso ativo no catálogo.": ative ou crie um curso. Veja [Adicionar um curso](adicionar-curso.md).
- "O envio de arquivos ainda não está disponível.": o bucket não está configurado neste ambiente. Fale com a engenharia.
- "Arquivo de teste não encontrado: ..." ou "Não deu para criar a conta agora. Veja o log do web.": avise a engenharia.
- Se a criação falhar no meio, a conta pode ficar criada pela metade. Para tentar de novo, use outro e-mail.

## Veja também

- [Ligar e desligar módulos](ligar-e-desligar-funcionalidades.md)
- [Criar um usuário](criar-usuario.md)
- [Excluir uma conta](excluir-conta.md)
- [Área do aluno](../aluno/)

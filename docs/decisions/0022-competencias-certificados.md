# ADR 0022: Cognuss Competências, Meus Certificados

- Status: aceito (decisões do Fernando em 23/11/2026)
- Data: 2026-11-23

## Contexto

O Dr. Hugo e o Dr. Rafael propuseram o módulo Cognuss Competências (`docs/competencias/referencias/COGNUSS_Competencias.doc`). O módulo reúne portfólio, currículo digital e Meus Certificados. A especificação para implementação está em `docs/competencias/ESPECIFICACAO.md`.

Duas premissas da proposta não se sustentam:

- O LinkedIn só entrega certificações, cursos e publicações a parceiros aprovados.
- A Coursera não tem API pública de certificados do aluno.

## Decisão

**Dados do aluno, como o resto da v2.** As tabelas `portfolio_folders` e `portfolio_items` (migrations 0061 e 0062) são de dono, com RLS. Um item só aponta para pasta e arquivo do próprio aluno.

**Reaproveitar o caminho de arquivos e a leitura com IA.** O comprovante sobe pelo envio de arquivos (ADR 0012), com antivírus. Quando o arquivo termina de processar, o worker manda ler os certificados que esperavam por ele, como já faz com o cronograma. O trabalho `ai.read_certificate` envia ao Claude:

- o texto, quando o PDF tem texto;
- o documento inteiro, quando o PDF é digitalizado;
- a imagem, quando é uma foto.

O Claude devolve campos estruturados. Não há OCR separado.

**A IA propõe, o aluno confirma.** O item nasce "lendo", passa a "a conferir" e só vira "conferido" quando o aluno confirma. Só o conferido entra na soma de horas e, na K2, no currículo. Enquanto não for confirmado, aparece o selo de gerado por IA, sem revisão. O worker também compara o nome do certificado com o do cadastro e avisa quando eles não batem.

**Mesma autorização e interruptor próprio.** A leitura usa a autorização de leitura com IA dos materiais (`ai_materials`). O admin de IA ganha o interruptor `certificados`. O custo vai para `ai_usage` com a funcionalidade `certificado_leitura`. Sem autorização, sem chave ou com o interruptor desligado, o item fica para o aluno preencher à mão, e a tela mostra o motivo.

**Horas em minutos.** A carga horária é guardada em minutos e aceita o formato que o aluno escreve ("20", "4h30", "90 min"). As horas só se somam, sem limite por instituição (K-D1).

**Selos sem "Validado" (K-D3).** Os selos são "Conferido por link", "Dados conferidos" e "A conferir", porque o Cognuss não é o emissor. Ficam para a K3.

**LinkedIn e Coursera sem OAuth (K-D4).** Na K4 entram três coisas:

- o arquivo de dados que o aluno baixa no próprio LinkedIn;
- o botão "Adicionar ao perfil do LinkedIn";
- o link de verificação da Coursera.

O pedido ao programa de parceiros do LinkedIn segue em paralelo.

**Chave de módulo `competencias`.** O módulo nasce desligado, como os outros da v2. A chave também libera o envio de arquivos.

## Consequências

- O portfólio entra na exportação e na exclusão LGPD da conta, pelos vínculos com o aluno, que apagam em cascata.
- A rota do armazenamento em disco (desenvolvimento e E2E) passou a reconhecer o driver pelo método, e não por `instanceof`. O objeto fica num global do processo e pode ter sido criado por outra rota, com outra cópia da classe.
- Falta o texto do referencial de competências (DCN de Medicina, 2014) para a K5. Ele vem do Dr. Hugo e do Dr. Rafael.

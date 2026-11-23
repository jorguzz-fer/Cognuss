# Cognuss Competências · Portfólio, currículo digital e Meus Certificados

Especificação para implementação, a partir do documento do Dr. Hugo e do Dr. Rafael (`referencias/COGNUSS_Competencias.doc`). Situação: **rascunho para decisão**. As decisões da seção 8 precisam de resposta antes da fase K2. As integrações com LinkedIn e Coursera mudam em relação ao documento (seção 5).

## 1. O que é

O aluno guarda num só lugar tudo o que comprova a formação dele fora das notas: horas complementares, congressos, cursos, artigos publicados e resumos enviados a eventos. A partir desses registros, o Cognuss mantém o currículo sempre atualizado em duas versões:

| Versão | Para quê | Formato |
| --- | --- | --- |
| **Profissional (resumida)** | Processos seletivos e LinkedIn | Uma página, linguagem objetiva |
| **Acadêmica (expandida)** | Residência e pós-graduação | Produção bibliográfica, eventos, horas complementares, links e comprovantes, próxima do Lattes |

**Meus Certificados** é o repositório dos comprovantes: pastas criadas pelo aluno, grade ou lista, busca, filtros por tipo, data e situação, contador de horas e um selo de verificação em cada item.

No menu principal, o módulo é a área **Evoluir** (SPEC v2, 4.2). Ele também responde ao objetivo "Desenvolver meu currículo" do cadastro (`main_goal = desenvolver_curriculo`), que a SPEC v2 deixou pendente (2.2).

## 2. O que já temos e reaproveitamos

| Peça | O que já existe |
| --- | --- |
| Envio do comprovante (PDF ou imagem) | Caminho de um arquivo (ADR 0012): URL assinada, antivírus, conversão, texto e miniatura, no bucket `u/{aluno}/`. |
| Leitura do certificado | Leitura com IA de documento enviado, já usada no cronograma (DIS-05): o Claude lê o PDF ou a imagem e devolve campos estruturados para o aluno conferir. Não é preciso OCR à parte. |
| Gerar o PDF do currículo | O worker já tem o Chromium do teste de render das peças (ADR 0021). A mesma instalação gera o PDF a partir de HTML. |
| Pastas, busca, situação | Mesmo padrão do Material de Estudo (MAT): pastas do aluno, busca por palavra (ADR 0014). |
| Tutor IA | Tutor contextual (ADR 0008), com o portfólio como contexto, para sugerir o que desenvolver. |
| Privacidade | Exportação e exclusão LGPD (ADR 0009). O portfólio entra no pacote de exportação e na exclusão da conta. |

## 3. Funcionalidades

### 3.1 Registrar uma atividade

1. O aluno envia o comprovante (PDF ou imagem) ou informa um link de verificação.
2. O worker lê o documento com IA e propõe os campos: tipo, título, instituição emissora, data, carga horária e nome de quem recebeu.
3. O aluno confere e corrige os campos. **Nada entra no currículo sem essa confirmação** (SPEC v2, 6.1).
4. A conferência automática atribui um selo (seção 4).
5. A atividade aparece em Meus Certificados e nas duas versões do currículo.

Tipos de atividade: horas complementares, congresso ou evento (participação), apresentação de trabalho, resumo publicado em anais, artigo publicado, curso livre ou online, monitoria, iniciação científica, liga acadêmica, extensão, estágio e outro. Os tipos aceitos dependem da decisão K-D1.

### 3.2 Meus Certificados

- Todo comprovante enviado vai para Meus Certificados.
- O aluno cria, renomeia e exclui pastas, e move certificados entre elas. A pasta não muda o que entra no currículo.
- Visualização em grade ou lista, busca, filtros por tipo, data e selo, e soma de horas por tipo e por pasta.

### 3.3 Currículo

- Duas versões, geradas na hora a partir dos registros confirmados, com prévia na tela e exportação em PDF.
- O aluno escolhe, item por item, o que aparece em cada versão.
- O texto de apresentação pode ser sugerido pela IA. Nesse caso leva o selo de gerado por IA até o aluno editar ou aprovar.
- Link público do currículo, desligado por padrão: o aluno escolhe a versão e pode revogar o link a qualquer momento.

### 3.4 Competências e evolução

- Cada atividade é associada a competências de um referencial (decisão K-D2). A IA sugere a associação e o aluno confirma.
- Um painel mostra o radar ou o progresso por competência e a linha do tempo das atividades.
- O Tutor IA sugere próximos passos (eventos, cursos, ligas), sem inventar oportunidades nem datas: só sugere tipos de atividade, ou eventos que o próprio aluno cadastrou.

## 4. Verificação dos certificados

O documento fala em "Validado automaticamente / Validação parcial / Requer revisão". Para não prometer o que o Cognuss não consegue garantir (não somos a instituição emissora), proponho os selos abaixo. Os nomes finais ficam com a decisão K-D3.

| Selo | Quando |
| --- | --- |
| **Conferido por link** | O certificado tem QR Code ou link de verificação, a página abre num domínio reconhecido do emissor, e o nome do aluno e o título batem. |
| **Dados conferidos** | O nome no certificado bate com o nome do cadastro, e data e carga horária são coerentes, mas não há link de verificação. |
| **A conferir** | Algo não bate: outro nome, data no futuro, carga horária fora do comum, ou documento ilegível. O aluno vê o motivo. |

Regras:

- **QR Code e links:** o worker lê o QR Code e só acessa links de domínios numa lista mantida no admin (por exemplo, `coursera.org/verify`, Even3, Doity, Sympla), com prazo e tamanho máximo. Nunca acessa endereço interno nem segue redirecionamento para fora da lista. Essa é a proteção contra SSRF.
- **Fraude:** o selo diz o que foi conferido, não que o documento é oficial. A interface explica isso numa linha.

## 5. LinkedIn e Coursera: o que dá para fazer

O documento pede para ler certificações, cursos e publicações do LinkedIn e importar cursos da Coursera por OAuth. Conferi a documentação oficial em 23/11/2026, e nenhum dos dois é possível hoje para um app como o Cognuss.

- **LinkedIn:** o login padrão (OpenID Connect) só devolve nome, foto, título e e-mail. Certificações, cursos e publicações estão nos campos de perfil completo, liberados apenas para parceiros aprovados em programas específicos (Talent, Marketing, Learning). Fontes: [Getting Access](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access) e [Full Profile Fields](https://learn.microsoft.com/en-gb/linkedin/shared/references/v2/profile/full-profile).
- **Coursera:** não há API pública de certificados do aluno. Cada certificado tem uma página pública de verificação (`coursera.org/verify/CÓDIGO` ou `/verify/specialization/CÓDIGO`).

Proposta no lugar do que o documento pede (decisão K-D4):

| Pedido do documento | O que fazemos |
| --- | --- |
| Ler certificações do LinkedIn por OAuth | **Importar o arquivo de dados do LinkedIn.** O aluno baixa os próprios dados no LinkedIn (Configurações, Privacidade dos dados, "Obter uma cópia dos seus dados") e envia o ZIP. O Cognuss lê as certificações, cursos e publicações, e o aluno confere antes de importar. Sem OAuth e sem token guardado. |
| Selo "Validado via LinkedIn" | Item importado do LinkedIn fica marcado como "Importado do LinkedIn". Não é uma verificação, e o selo não promete isso. |
| Enviar do Cognuss para o LinkedIn | **Botão "Adicionar ao perfil do LinkedIn"** em cada certificado: link público do LinkedIn que abre o formulário de certificação já preenchido. Não precisa de API. |
| Importar cursos da Coursera por OAuth | **Colar o link de verificação** de cada certificado. O worker abre a página pública e confere o nome e o curso, e o item ganha o selo "Conferido por link". |
| OAuth do LinkedIn no futuro | Se o Cognuss entrar num programa de parceiros, o fluxo OAuth com PKCE do documento (seção 7) é implementado como está descrito: tokens só no backend, criptografados e revogáveis. |

## 6. Modelo de dados (rascunho)

Prefixo `portfolio_`. São dados do aluno, sob `withUser` e RLS de dono, como o resto da v2.

| Tabela | Uma linha por | Campos principais |
| --- | --- | --- |
| `portfolio_folders` | pasta do aluno | dono, nome, ordem |
| `portfolio_items` | atividade ou certificado | dono, pasta, tipo, título, instituição, data de início e fim, carga horária, papel (ouvinte, apresentador, autor), DOI ou link, `file_id` do comprovante, origem (envio, LinkedIn, link), selo, motivo do selo, campos extraídos (JSON), confirmado em, visível no currículo resumido, visível no acadêmico |
| `portfolio_verifications` | tentativa de verificação | item, método (dados, QR, link), URL, resultado, detalhes, data |
| `portfolio_competencies` | competência associada | item, competência (do referencial), sugerida pela IA, confirmada |
| `portfolio_cv` | configuração do currículo | dono, apresentação, contatos exibidos, ordem das seções, link público (token, versão, ativo) |
| `portfolio_verifier_domains` | domínio aceito para verificação (admin) | domínio, prefixo de caminho, ativo |

A carga horária fica em minutos, para somar sem erro de arredondamento.

## 7. Fases

| Fase | Entrega | Pronto quando |
| --- | --- | --- |
| **K1 · Meus Certificados** | Pastas, envio, leitura com IA, conferência pelo aluno, grade e lista, busca, filtros, soma de horas. | Um aluno envia 5 certificados (PDF e foto), corrige um campo lido errado e vê a soma de horas complementares por pasta. |
| **K2 · Currículo** | As duas versões, prévia, escolha de itens, PDF, texto de apresentação com IA, link público opcional. | O PDF da versão acadêmica sai com produção, eventos e horas, e o da profissional cabe em uma página. |
| **K3 · Verificação** | Selos, QR Code, links de domínios aceitos, lista no admin, conferência de nome. | Um certificado da Coursera com link ganha "Conferido por link", e um com nome de outra pessoa fica "A conferir", com o motivo. |
| **K4 · LinkedIn e Coursera** | Importar o ZIP do LinkedIn, "Adicionar ao perfil do LinkedIn", link da Coursera. | O aluno importa as certificações do arquivo do LinkedIn depois de conferir item por item. |
| **K5 · Competências** | Referencial, associação sugerida e confirmada, radar, linha do tempo, sugestões do Tutor IA. | O radar mostra a evolução por competência a partir das atividades confirmadas. |

## 8. Decisões abertas (Hugo, Rafael e Fernando)

| # | Pergunta | Proposta |
| --- | --- | --- |
| K-D1 | Quais tipos de atividade entram, e as horas complementares seguem alguma regra (limite por tipo, conforme a instituição)? | Usar os tipos da seção 3.1 e só somar as horas, sem aplicar regra de instituição no começo. |
| K-D2 | Qual referencial de competências: as Diretrizes Curriculares Nacionais de Medicina (2014: atenção, gestão e educação em saúde), a matriz de cada instituição, ou outro? | DCN de Medicina 2014, por ser nacional e público. O texto exato do referencial vem de vocês; não vamos inventá-lo. |
| K-D3 | Que nome damos aos selos? Podemos usar "Validado" se o Cognuss não é o emissor? | Usar "Conferido por link", "Dados conferidos" e "A conferir". |
| K-D4 | Aceitam a troca do OAuth do LinkedIn e da Coursera pelo arquivo do LinkedIn e pelo link de verificação (seção 5)? Vale tentar o programa de parceiros do LinkedIn? | Sim para a troca agora, e a tentativa de parceria em paralelo. |
| K-D5 | O currículo acadêmico segue algum modelo (Lattes, ABNT, edital de residência)? | Seções do Lattes, sem integração com a Plataforma Lattes. |
| K-D6 | O link público do currículo pode mostrar os comprovantes, ou só a lista? | Só a lista e os selos. Comprovantes, só quando o aluno marcar o item. |

## 9. Riscos

- **Promessa de validação.** Um selo de "validado" que não verifica de verdade gera problema de confiança e até jurídico. Por isso a proposta da seção 4 e a decisão K-D3.
- **Integrações que não existem.** O documento supõe APIs que LinkedIn e Coursera não abrem. A seção 5 resolve sem depender delas.
- **Dados pessoais em certificados.** Certificados trazem nome completo, às vezes CPF e número de matrícula. Ficam no bucket do aluno, entram na exportação e na exclusão LGPD, e o CPF nunca vai para log.
- **Custo de IA na leitura.** Cada certificado gera uma leitura pelo Claude. A cota diária por aluno, no admin de IA, cobre esse custo.

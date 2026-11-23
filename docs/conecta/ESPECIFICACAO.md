# Cognuss Conecta · Salas de estudo interativas

Especificação para implementação, a partir da proposta funcional do Dr. Hugo e do Dr. Rafael (`referencias/COGNUSS_Conecta.docx`, telas em `referencias/telas/`). Situação: **rascunho para decisão**. As decisões da seção 9 precisam de resposta antes da fase C1.

## 1. O que é

Um ambiente de estudo em grupo dentro do Cognuss. Estudantes de instituições diferentes se encontram para estudar o mesmo tema, de três formas:

| Modalidade | Como entra na sala | Tela de referência |
| --- | --- | --- |
| **Estudar agora** (conexão inteligente) | A plataforma acha quem está estudando o mesmo tema (ou um equivalente) agora e manda um convite a cada um. A sala só abre depois do aceite de todos. | `1-convite-inteligente.png` |
| **Galeria de estudos** | O aluno anuncia uma sessão ao vivo ou agendada, e outros entram direto (sala pública) ou pedem para entrar (sala moderada). | `2-galeria-ao-vivo.png`, `3-galeria-agendados.png` |
| **Sala privada** | O aluno convida colegas da turma, dos favoritos ou de um grupo salvo. | `4-nova-sala-privada.png` |

O menu do módulo tem três ações (`5-menu-conecta.png`): "Encontrar companhia para estudar", "Explorar salas de estudo" e "Criar sala e convidar colegas". O Conecta é a área **Conectar** do menu principal (SPEC v2, 4.2). Também tem entrada pelo Meu Espaço e pelas páginas das disciplinas.

A sala é mais do que uma videoconferência (`6-sala-quadro.png`): tema fixo no topo, participantes e seus estados, chat, quadro colaborativo, áudio e vídeo, compartilhamento de tela, materiais do Cognuss e o Tutor IA. Ao sair, o aluno pode levar o resumo, flashcards e questões da sessão (`7-fluxo-geral.png`).

## 2. Mudança de escopo em relação à SPEC v2

A SPEC v2 (2.3) deixou **videoconferência** fora do escopo, e o modelo atual é de dado individual: todo dado do aluno é dele e o RLS isola um aluno do outro. O Conecta muda as duas coisas:

1. **Áudio, vídeo e tela** entram no produto, e isso pede um serviço de mídia em tempo real (decisão C-D1).
2. **Alunos passam a se ver.** Pela primeira vez, um aluno vê outro: apelido, turma, disponibilidade e o tema que está estudando. Isso só acontece com consentimento explícito e dentro das regras da seção 6.

As duas mudanças viram ADR antes da implementação (seção 8).

## 3. O que já temos e reaproveitamos

| Peça do Conecta | O que já existe no Cognuss |
| --- | --- |
| "Minha turma" | `student_profiles`: instituição, curso, período, campus e turma (cadastro CAD-02/03). A turma é quem coincide nesses campos e aceitou ser encontrado. |
| Equivalência semântica de temas | Vetores da Voyage AI da busca por conceito (ADR 0014) e o catálogo de temas (`topics`, com hierarquia). |
| Tema que o aluno estuda agora | Acompanhar Aula, Material de Estudo e Equilíbrio sabem a disciplina e o tema da tela aberta. |
| Convites, lembretes e agenda | Avisos por e-mail (LEM-11), agenda única (CAL), recorrência em `packages/core` (rotina e calendário). |
| Tutor IA na sala | Tutor contextual (ADR 0008), com custo e limites por aluno no admin de IA. |
| Resumo, flashcards e questões da sessão | Criações com IA (ADR 0020) e Memory (MEM), que já exporta para revisão espaçada. |
| Materiais na sala | Material de Estudo (MAT), com as permissões de compartilhamento (D20, ainda aberta). |
| Marcar tema como "estudado em grupo" | Plano do Equilíbrio (EQU). |
| Denúncia e moderação | Não existe. É nova (seção 6). |
| Tempo real (chat, presença, quadro) | Não existe. O app é Next.js sem WebSocket; o worker é BullMQ. É novo (seção 5). |

## 4. Escopo por fase

A ordem segue a recomendação do documento: galeria e salas primeiro, para medir adesão antes de investir no matching inteligente.

| Fase | Entrega | Pronto quando |
| --- | --- | --- |
| **C0 · Fundação** | ADRs de tempo real e de privacidade entre alunos. Serviço de tempo real no compose (seção 5). Perfil do Conecta: apelido, avatar, "quem pode me encontrar", bloqueios. "Meus Colegas": turma, favoritos e grupos. | Dois alunos da mesma turma se veem em "Minha turma" só depois de ativar a descoberta, e um aluno bloqueado some para quem bloqueou. |
| **C1 · Salas e galeria (MVP 1 sem mídia)** | Criar sala (pública, moderada ou privada), galeria ao vivo e agendada, convites com prazo, pedido de entrada, capacidade (padrão 8), encerramento automático por inatividade. Dentro da sala: tema fixo, participantes, chat, quadro colaborativo, contador de tempo, "Sair" e "Encerrar". | Três alunos de instituições diferentes entram pela galeria numa sala agendada, conversam no chat e desenham juntos no quadro. |
| **C2 · Áudio, vídeo e tela (MVP 1 completo)** | Áudio e vídeo, opção só áudio, compartilhamento de tela, indicador de quem fala e estado de microfone e câmera. | A mesma sala da C1 funciona com voz e uma pessoa compartilhando a tela, também no celular. |
| **C3 · Estudar agora (MVP 2)** | Toggle "Disponível para estudar com outros alunos", preferências (curso, período, tamanho do grupo, modo), matching por tema equivalente, convite com aceite mútuo, sugestão de salas ativas de temas próximos. | Dois alunos que abrem Fisiologia Ovariana e Ciclo Menstrual recebem o convite, e a sala só abre depois dos dois aceites. |
| **C4 · Materiais e Tutor IA (MVP 3)** | Materiais do Cognuss dentro da sala, PDFs e imagens compartilhados, notas colaborativas, Tutor IA chamado pelo grupo. | O grupo pergunta ao tutor sobre a retroalimentação do estradiol e recebe a resposta na sala, com o custo registrado. |
| **C5 · Depois da sessão e engajamento (MVP 4)** | Resumo, flashcards e questões da sessão (com consentimento de todos), histórico com busca, marcar "estudado em grupo", salas recorrentes, Pomodoro, reações, perguntas anônimas, quiz colaborativo. | Ao encerrar, quem consentiu recebe o resumo e os flashcards em Minhas Criações, e o tema aparece como estudado em grupo no plano. |
| **C6 · Modo Avatar e privacidade avançada** | Modo Avatar e modo discreto, apelido por sessão, avatar salvo no perfil, "só ouvir". | Um aluno em modo Avatar participa, e nem o criador da sala vê o nome dele. |

**Fica para depois (seções 7 e 10 do documento):** modelos 3D, anotação de imagens médicas, reconhecimento de desenho, IA que desenha, simulador de caso clínico, áudio espacial, gravação, modificação de voz, salas conduzidas por monitores e professores.

## 5. Arquitetura proposta

Três peças novas. Todas passam pelo compose do Coolify e pela mesma sessão do app.

1. **Mídia (áudio, vídeo, tela): LiveKit.** É open source, tem SFU, SDK para React, salas com permissões por token e canal de dados. O app gera um token de curta duração por aluno e por sala, com a identidade exibida (nome ou apelido). O LiveKit nunca recebe o id real de quem está em modo Avatar. Existem duas formas de rodar (decisão C-D1):
   - **LiveKit Cloud:** sem operação, pago por minuto de participante.
   - **Auto-hospedado no Coolify:** custo só de servidor, mas pede portas UDP abertas, um TURN para redes restritas (faculdade, 4G) e banda. O servidor atual também roda o app, o banco e o antivírus.
2. **Colaboração (quadro e notas): Yjs** sobre um serviço `apps/realtime` (WebSocket com `y-websocket`, autenticado pelo mesmo cookie de sessão), com o estado persistido no Postgres. O quadro usa uma biblioteca com suporte a Yjs (tldraw ou Excalidraw, decisão técnica no ADR). O mesmo serviço leva presença e convites em tempo real ("Estudar agora"), usando Redis para pub/sub.
3. **Chat:** mensagens gravadas no Postgres, com RLS de participante da sala, e entregues pelo `apps/realtime`. A retenção é definida na decisão C-D4.

**Matching (C3):** cada aluno disponível publica, a cada minuto, o tema que está estudando (heartbeat com TTL no Redis, nada no histórico). O worker calcula a proximidade entre temas pelos vetores (ADR 0014) e pela hierarquia do catálogo. O convite segue as regras da seção 6: prazo, sem insistência e sem expor o tema de quem não aceitou.

## 6. Regras de privacidade, segurança e convivência

Vêm do documento (seções 5 e 6) e da LGPD (ADR 0009). Viram teste.

- **Descoberta desligada por padrão.** O aluno liga "Disponível para estudar com outros alunos" e escolhe quem pode encontrá-lo: ninguém, só a turma, ou qualquer estudante do Cognuss.
- **O que outro aluno vê:** apelido (ou nome, se o aluno escolher), avatar, curso e período. Nome completo, instituição, e-mail e CPF nunca aparecem sem escolha explícita. O tema que um aluno estuda só aparece para quem recebe o convite, e só depois do aceite dos dois.
- **Convites** têm prazo, não se repetem depois de uma recusa (silêncio de 24 h por par de alunos) e podem ser bloqueados por pessoa.
- **Bloquear, denunciar e sair** estão sempre a um toque. A denúncia vai para uma fila de moderação no admin, com o trecho do chat da sala.
- **Modo Avatar:** os outros participantes e o criador não veem a identidade real. A plataforma guarda o vínculo interno. Só a moderação vê esse vínculo, em denúncia grave, com registro em auditoria.
- **Capacidade** padrão de 8 pessoas por sala.
- **Encerramento automático** depois de um período sem interação (15 a 30 minutos, configurável no admin).
- **Gravação** fica fora do escopo até haver consentimento por participante e base legal (C-D4).
- **Saída da IA:** resumo, flashcards e questões gerados a partir da conversa levam o selo de gerado por IA, sem revisão. Só são gerados com o consentimento de todos os participantes da sessão.
- **Sem ranking público.** Contribuições aparecem como reconhecimento discreto (documento, seção 8).

## 7. Modelo de dados (rascunho)

Prefixo `conecta_`. RLS em todas as tabelas: o aluno vê o próprio perfil e só vê outro perfil pelas regras de descoberta. A sala é visível a quem pode vê-la na galeria ou a quem participa dela.

| Tabela | Uma linha por | Campos principais |
| --- | --- | --- |
| `conecta_profiles` | aluno que ativou o Conecta | apelido, avatar, visibilidade (ninguém, turma, todos), disponível agora, preferências |
| `conecta_contacts` | favorito ou grupo do aluno | dono, colega, grupo (nome) |
| `conecta_blocks` | bloqueio | quem bloqueia, quem é bloqueado |
| `conecta_rooms` | sala | criador, tipo (estudar agora, galeria, privada), acesso (pública, moderada, convite), tema (`topic_id` e texto), disciplina, objetivos, nível, materiais, capacidade, início, duração, recorrência, situação |
| `conecta_members` | participante da sala | aluno, papel (criador, moderador, participante), modo (normal, avatar, discreto), apelido da sessão, entrada, saída |
| `conecta_invites` | convite ou pedido de entrada | sala, de, para, tipo, prazo, situação |
| `conecta_messages` | mensagem do chat | sala, membro, texto, criada em |
| `conecta_boards` | quadro ou nota colaborativa | sala, documento Yjs (binário), atualizado em |
| `conecta_reports` | denúncia | sala, quem denuncia, membro denunciado, motivo, trecho, situação |
| `conecta_sessions` | sessão realizada | sala, início, fim, participantes, consentimentos de IA, criações geradas |

## 8. ADRs a escrever antes da fase C1

- **ADR 0022 · Tempo real e mídia do Conecta:** LiveKit (Cloud ou auto-hospedado), `apps/realtime` com Yjs, Redis pub/sub, biblioteca do quadro, limites e custos.
- **ADR 0023 · Visibilidade entre alunos:** o que um aluno vê de outro, descoberta, bloqueio, modo Avatar e vínculo interno, retenção do chat, moderação.

## 9. Decisões abertas (Hugo, Rafael e Fernando)

| # | Pergunta | Proposta |
| --- | --- | --- |
| C-D1 | Áudio e vídeo: LiveKit Cloud (pago por minuto, sem operação) ou auto-hospedado no Coolify (servidor dedicado, UDP e TURN)? | Começar no Cloud para medir a adesão e reavaliar com o uso real. |
| C-D2 | Quem pode encontrar quem? Só a mesma turma no começo, ou o Brasil inteiro desde o início? | Lançar com a turma e a galeria nacional (que é opt-in por sala), e ligar o "Estudar agora" nacional na C3. |
| C-D3 | Há alunos menores de 18 anos? Se houver, eles entram em salas com adultos de outras instituições? | Bloquear o Conecta para menores até definir uma regra. O cadastro precisa da data de nascimento ou de uma declaração. |
| C-D4 | Por quanto tempo guardamos o chat e o quadro? A gravação fica fora? | Chat e quadro por 90 dias depois da última sessão. Gravação fora do produto até haver uma base legal clara. |
| C-D5 | Quem modera as denúncias? Qual o prazo de resposta? | Fila no admin, com o papel `moderator` que já existe. Prazo de 48 h. |
| C-D6 | O MVP 1 precisa sair com vídeo, ou chat e quadro primeiro (C1) e vídeo logo depois (C2)? | C1 antes de C2: testa a adesão sem o custo de mídia. |
| C-D7 | O Tutor IA na sala conta na cota de quem? | Na cota do aluno que pergunta. |

## 10. Riscos

- **Custo e operação de mídia em tempo real.** É o maior bloco de infraestrutura novo da plataforma (C-D1).
- **Privacidade entre alunos.** Expor a presença ou o tema de alguém sem consentimento seria um incidente de LGPD. As regras da seção 6 viram testes de RLS e E2E.
- **Salas vazias.** O matching só funciona com massa crítica. Por isso a galeria e as salas da turma vêm antes.
- **Moderação.** Sala aberta entre desconhecidos pede canal de denúncia e alguém para responder (C-D5).

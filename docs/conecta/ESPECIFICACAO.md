# Cognuss Conecta · Salas de estudo interativas

Especificação para implementação, a partir da proposta funcional do Dr. Hugo e do Dr. Rafael (`referencias/COGNUSS_Conecta.docx`, telas em `referencias/telas/`). Situação: **rascunho para decisão**. As decisões da seção 9 precisam de resposta antes da fase C1.

> **Em espera (Fernando, 23/11/2026): áudio, vídeo e chat.** Não entram nas fases atuais. A sala começa sem conversa por voz, vídeo ou texto dentro do Cognuss. O que muda está marcado em cada seção, e a fase C2 fica parada até nova decisão. Enquanto isso, a conversa acontece fora do Cognuss (decisão C-D8).

## 1. O que é

Um ambiente de estudo em grupo dentro do Cognuss. Estudantes de instituições diferentes se encontram para estudar o mesmo tema, de três formas:

| Modalidade | Como entra na sala | Tela de referência |
| --- | --- | --- |
| **Estudar agora** (conexão inteligente) | A plataforma acha quem está estudando o mesmo tema (ou um equivalente) agora e manda um convite a cada um. A sala só abre depois do aceite de todos. | `1-convite-inteligente.png` |
| **Galeria de estudos** | O aluno anuncia uma sessão ao vivo ou agendada, e outros entram direto (sala pública) ou pedem para entrar (sala moderada). | `2-galeria-ao-vivo.png`, `3-galeria-agendados.png` |
| **Sala privada** | O aluno convida colegas da turma, dos favoritos ou de um grupo salvo. | `4-nova-sala-privada.png` |

O menu do módulo tem três ações (`5-menu-conecta.png`): "Encontrar companhia para estudar", "Explorar salas de estudo" e "Criar sala e convidar colegas". O Conecta é a área **Conectar** do menu principal (SPEC v2, 4.2). Também tem entrada pelo Meu Espaço e pelas páginas das disciplinas.

A sala é mais do que uma videoconferência (`6-sala-quadro.png`): tema fixo no topo, participantes e seus estados, chat, quadro colaborativo, áudio e vídeo, compartilhamento de tela, materiais do Cognuss e o Tutor IA. **Por enquanto, sem áudio, vídeo e chat** (aviso no topo): a sala é o quadro, as notas, os materiais e o tutor, com a conversa fora do Cognuss. Ao sair, o aluno pode levar o resumo, flashcards e questões da sessão (`7-fluxo-geral.png`).

## 2. Mudança de escopo em relação à SPEC v2

A SPEC v2 (2.3) deixou **videoconferência** fora do escopo, e o modelo atual é de dado individual: todo dado do aluno é dele e o RLS isola um aluno do outro. O Conecta muda as duas coisas:

1. **Áudio, vídeo e tela** entrariam no produto, o que pede um serviço de mídia em tempo real (decisão C-D1). **Em espera:** a mudança só vale quando a C2 for liberada.
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
| **C1 · Salas e galeria (sem áudio, vídeo e chat)** | Criar sala (pública, moderada ou privada), galeria ao vivo e agendada, convites com prazo, pedido de entrada, capacidade (padrão 8), encerramento automático por inatividade. Dentro da sala: tema fixo, participantes e quem está presente, quadro colaborativo, notas colaborativas, contador de tempo, reações rápidas ("dúvida", "entendi"), link da chamada externa (C-D8), "Sair" e "Encerrar". | Três alunos de instituições diferentes entram pela galeria numa sala agendada e desenham juntos no quadro, vendo quem está presente. |
| **C2 · Áudio, vídeo, tela e chat · EM ESPERA** | Áudio e vídeo, opção só áudio, compartilhamento de tela, chat de texto, indicador de quem fala e estado de microfone e câmera. Parada por decisão do Fernando (23/11/2026). | A mesma sala da C1 funciona com voz, chat e uma pessoa compartilhando a tela, também no celular. |
| **C3 · Estudar agora (MVP 2)** | Toggle "Disponível para estudar com outros alunos", preferências (curso, período, tamanho do grupo, modo), matching por tema equivalente, convite com aceite mútuo, sugestão de salas ativas de temas próximos. | Dois alunos que abrem Fisiologia Ovariana e Ciclo Menstrual recebem o convite, e a sala só abre depois dos dois aceites. |
| **C4 · Materiais e Tutor IA (MVP 3)** | Materiais do Cognuss dentro da sala, PDFs e imagens compartilhados, notas colaborativas, Tutor IA chamado pelo grupo. | O grupo pergunta ao tutor sobre a retroalimentação do estradiol e recebe a resposta na sala, com o custo registrado. |
| **C5 · Depois da sessão e engajamento (MVP 4)** | Resumo, flashcards e questões da sessão (com consentimento de todos, a partir do quadro, das notas e das perguntas ao tutor, já que não há chat), histórico com busca, marcar "estudado em grupo", salas recorrentes, Pomodoro, perguntas anônimas, quiz colaborativo. | Ao encerrar, quem consentiu recebe o resumo e os flashcards em Minhas Criações, e o tema aparece como estudado em grupo no plano. |
| **C6 · Modo Avatar e privacidade avançada** | Modo Avatar e modo discreto, apelido por sessão, avatar salvo no perfil, "só ouvir". | Um aluno em modo Avatar participa, e nem o criador da sala vê o nome dele. |

**Fica para depois (seções 7 e 10 do documento):** modelos 3D, anotação de imagens médicas, reconhecimento de desenho, IA que desenha, simulador de caso clínico, áudio espacial, gravação, modificação de voz, salas conduzidas por monitores e professores.

## 5. Arquitetura proposta

Três peças novas. Todas passam pelo compose do Coolify e pela mesma sessão do app. **Com áudio, vídeo e chat em espera, só a peça 2 entra agora**; as peças 1 e 3 ficam registradas para quando a C2 for liberada.

1. **Mídia (áudio, vídeo, tela), em espera: LiveKit.** É open source, tem SFU, SDK para React, salas com permissões por token e canal de dados. O app gera um token de curta duração por aluno e por sala, com a identidade exibida (nome ou apelido). O LiveKit nunca recebe o id real de quem está em modo Avatar. Existem duas formas de rodar (decisão C-D1):
   - **LiveKit Cloud:** sem operação, pago por minuto de participante.
   - **Auto-hospedado no Coolify:** custo só de servidor, mas pede portas UDP abertas, um TURN para redes restritas (faculdade, 4G) e banda. O servidor atual também roda o app, o banco e o antivírus.
2. **Colaboração (quadro e notas): Yjs** sobre um serviço `apps/realtime` (WebSocket com `y-websocket`, autenticado pelo mesmo cookie de sessão), com o estado persistido no Postgres. O quadro usa uma biblioteca com suporte a Yjs (tldraw ou Excalidraw, decisão técnica no ADR). O mesmo serviço leva presença e convites em tempo real ("Estudar agora"), usando Redis para pub/sub.
3. **Chat, em espera:** mensagens gravadas no Postgres, com RLS de participante da sala, e entregues pelo `apps/realtime`. A retenção é definida na decisão C-D4.

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
| `conecta_rooms` | sala | criador, tipo (estudar agora, galeria, privada), acesso (pública, moderada, convite), tema (`topic_id` e texto), disciplina, objetivos, nível, materiais, capacidade, início, duração, recorrência, link da chamada externa (C-D8), situação |
| `conecta_members` | participante da sala | aluno, papel (criador, moderador, participante), modo (normal, avatar, discreto), apelido da sessão, entrada, saída |
| `conecta_invites` | convite ou pedido de entrada | sala, de, para, tipo, prazo, situação |
| `conecta_messages` | mensagem do chat (**em espera**, junto com a C2) | sala, membro, texto, criada em |
| `conecta_boards` | quadro ou nota colaborativa | sala, documento Yjs (binário), atualizado em |
| `conecta_reports` | denúncia | sala, quem denuncia, membro denunciado, motivo, trecho, situação |
| `conecta_sessions` | sessão realizada | sala, início, fim, participantes, consentimentos de IA, criações geradas |

## 8. ADRs a escrever antes da fase C1

- **ADR 0022 · Tempo real do Conecta:** `apps/realtime` com Yjs, presença, Redis pub/sub, biblioteca do quadro, limites. A parte de mídia (LiveKit) e o chat entram num adendo quando a C2 for liberada.
- **ADR 0023 · Visibilidade entre alunos:** o que um aluno vê de outro, descoberta, bloqueio, modo Avatar e vínculo interno, retenção do quadro e das notas, moderação.

## 9. Decisões abertas (Hugo, Rafael e Fernando)

| # | Pergunta | Proposta |
| --- | --- | --- |
| C-D1 | **Em espera.** Áudio e vídeo: LiveKit Cloud (pago por minuto, sem operação) ou auto-hospedado no Coolify (servidor dedicado, UDP e TURN)? | Decidir quando a C2 for liberada. Proposta: começar no Cloud. |
| C-D2 | Quem pode encontrar quem? Só a mesma turma no começo, ou o Brasil inteiro desde o início? | Lançar com a turma e a galeria nacional (que é opt-in por sala), e ligar o "Estudar agora" nacional na C3. |
| C-D3 | Há alunos menores de 18 anos? Se houver, eles entram em salas com adultos de outras instituições? | Bloquear o Conecta para menores até definir uma regra. O cadastro precisa da data de nascimento ou de uma declaração. |
| C-D4 | Por quanto tempo guardamos o quadro e as notas (e o chat, quando voltar)? A gravação fica fora? | 90 dias depois da última sessão. Gravação fora do produto até haver uma base legal clara. |
| C-D5 | Quem modera as denúncias? Qual o prazo de resposta? | Fila no admin, com o papel `moderator` que já existe. Prazo de 48 h. |
| C-D6 | ~~O MVP 1 sai com vídeo?~~ Decidido (Fernando, 23/11/2026): áudio, vídeo e chat em espera; a C1 sai sem eles. | — |
| C-D7 | O Tutor IA na sala conta na cota de quem? | Na cota do aluno que pergunta. |
| C-D8 | Sem voz e sem chat no Cognuss, como o grupo conversa? (a) um campo opcional "link da chamada" na sala, para Meet, Zoom ou WhatsApp que o criador já usa; (b) só quadro, notas e reações, sem conversa; (c) segurar a C1 até liberar a C2. | (a): mantém a sala útil sem custo de mídia, e o Cognuss continua sendo o lugar do tema, do quadro e das notas. O link só aparece para quem está na sala. |

## 10. Riscos

- **Custo e operação de mídia em tempo real.** É o maior bloco de infraestrutura novo da plataforma (C-D1). Está em espera.
- **Sala sem conversa.** Sem voz e chat no Cognuss, a sala pode parecer vazia. O link da chamada externa (C-D8) e as reações reduzem isso, e a adesão medida na C1 diz se vale liberar a C2.
- **Privacidade entre alunos.** Expor a presença ou o tema de alguém sem consentimento seria um incidente de LGPD. As regras da seção 6 viram testes de RLS e E2E.
- **Salas vazias.** O matching só funciona com massa crítica. Por isso a galeria e as salas da turma vêm antes.
- **Moderação.** Sala aberta entre desconhecidos pede canal de denúncia e alguém para responder (C-D5).

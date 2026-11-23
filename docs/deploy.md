# Deploy no Coolify

São dois recursos no mesmo projeto do Coolify. O site estático continua como está.

| Recurso                   | O que é                               | Build                                                           | Domínio                    |
| ------------------------- | ------------------------------------- | --------------------------------------------------------------- | -------------------------- |
| Site estático (já existe) | página de espera e `/roadmap`         | `Dockerfile` da raiz                                            | gutta.tudomudou.com.br     |
| Plataforma (novo)         | app Next.js, worker, Redis e Postgres | Docker Compose, Base Directory `/infra`, arquivo `/compose.yml` | app-gutta.tudomudou.com.br |

## Primeira vez

1. No Coolify: **New Resource → Docker Compose**, repositório `jorguzz-fer/gutta`, branch `main`, **Base Directory `/infra`** e arquivo **`/compose.yml`**.
   Com a base em `/infra`, os caminhos relativos do compose (`..` do `web` e `./postgres` do `db`) valem igual no Coolify e na sua máquina.
2. Defina as variáveis (aba Environment Variables). Gere as senhas com `openssl rand -base64 32`:

   | Variável                                                                                   | Exemplo / observação                                                                                                                                                                                                                              |
   | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `APP_URL`                                                                                  | `https://app-gutta.tudomudou.com.br` (sem barra no fim)                                                                                                                                                                                           |
   | `BETTER_AUTH_SECRET`                                                                       | 32+ caracteres aleatórios                                                                                                                                                                                                                         |
   | `POSTGRES_PASSWORD`                                                                        | superusuário do Postgres (só para administração)                                                                                                                                                                                                  |
   | `GUTTA_OWNER_PASSWORD`                                                                     | dono do schema; usado só pelas migrations                                                                                                                                                                                                         |
   | `GUTTA_APP_PASSWORD`                                                                       | papel da aplicação (sem BYPASSRLS)                                                                                                                                                                                                                |
   | `RESEND_API_KEY`                                                                           | sem ela, nenhum e-mail sai (confirmação de conta fica travada)                                                                                                                                                                                    |
   | `MAIL_FROM`                                                                                | remetente verificado no Resend                                                                                                                                                                                                                    |
   | `LESSON_ORIGINS`                                                                           | origens das aulas interativas, ex. `https://aula.alumine.com.br`                                                                                                                                                                                  |
   | `ANTHROPIC_API_KEY`                                                                        | chave da API da Anthropic para o tutor IA (web) e a leitura de cronograma (worker); sem ela os dois ficam indisponíveis para o aluno (ADR 0008; SPEC v2, DIS-05)                                                                                  |
   | `TUTOR_MODEL`                                                                              | opcional; padrão `claude-opus-5-5`                                                                                                                                                                                                                |
   | `AI_SCHEDULE_MODEL`, `AI_SCHEDULE_EFFORT`                                                  | opcionais; modelo e esforço da leitura de cronograma (padrão `claude-opus-5-5` e `medium`). O custo de cada leitura fica em `ai_usage`                                                                                                            |
| `AI_CREATION_MODEL`, `AI_CREATION_EFFORT` | opcionais; modelo e esforço das criações da Ajuda Cognuss (padrão `claude-opus-5-5` e `medium`). Custo por criação em `ai_usage` |
| `AI_PRODUCTION_MODEL`, `AI_PRODUCTION_EFFORT` | opcionais; modelo e esforço do plano das peças na produção de aulas (padrão `claude-opus-5-5` e `high`), só no worker. Custo em `ai_usage` (`producao_plano`) e no lote |
| `AI_PIECE_MODEL`, `AI_PIECE_EFFORT`, `PIECE_CHROMIUM_PATH` | opcionais; escritor das peças HTML (padrão `claude-opus-5-5` e `high`) e o Chromium do teste de render. Na imagem do worker o Chromium do Alpine é achado sozinho. Custo em `ai_usage` (`producao_peca`) |
| `HIGGSFIELD_API_KEY_ID`, `HIGGSFIELD_API_KEY_SECRET` | só no worker; imagens e clipes dos vídeos (Fase 3). A credencial do console tem key ID e secret (o secret aparece só ao criar a chave); se o console mostrar as duas juntas (`ID:SECRET`), cole tudo em `HIGGSFIELD_API_KEY_ID` e deixe o secret vazio. Sem elas, o vídeo pausa no admin com o aviso. `HIGGSFIELD_IMAGE_ENDPOINT` e `HIGGSFIELD_VIDEO_ENDPOINT` trocam o modelo (padrão `marketing-studio/image` e `kling-video/v3.0/pro/image-to-video`) |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_MODEL`, `ELEVENLABS_VOICE_ID` | só no worker; narração dos vídeos (padrão `eleven_multilingual_v2`). A voz de cada disciplina é escolhida em `/admin/producao/vozes`; `ELEVENLABS_VOICE_ID` é a reserva. Use plano pago (o gratuito recusou por fila cheia no piloto) |
| `PRODUCTION_DAILY_CREDITS`, `PRODUCTION_MEDIA_POLL_MS` | opcionais; cota diária de créditos de mídia (padrão 300, o admin muda sem deploy) e intervalo de consulta ao provedor (padrão 20 s). `MEDIA_PROVIDER=fake` só em teste |
   | `WORKER_NOTIFY_INTERVAL_MS`                                                                | opcional, no worker; intervalo entre as voltas do envio de avisos por e-mail (padrão 60000). O worker usa `RESEND_API_KEY`, `MAIL_FROM` e `APP_URL` como o app (SPEC v2, LEM-11)                                                                  |
   | `TUTOR_DAILY_LIMIT`                                                                        | opcional; perguntas por aluno em 24 h (padrão 20; o admin muda em `/admin/tutor`)                                                                                                                                                                 |
   | `SEED_CATALOG`                                                                             | opcional; `demo` carrega curso, disciplinas, módulos, questões e flashcards de demonstração (com selo), sem usuários. Ver ADR 0005                                                                                                                |
   | `BOOTSTRAP_ADMIN_EMAILS`                                                                   | opcional; e-mails que viram admin no start (ver "Primeiro administrador")                                                                                                                                                                         |
   | `LEGAL_CONTROLLER_NAME`, `LEGAL_CONTROLLER_DOCUMENT`                                       | LGPD: razão social e CNPJ do controlador, mostrados na política (ADR 0009). Sem valor, aparece "a definir"                                                                                                                                        |
   | `DPO_NAME`, `DPO_EMAIL`                                                                    | LGPD: encarregado de dados (art. 41). Preencha antes do piloto                                                                                                                                                                                    |
   | `REDIS_PASSWORD`                                                                           | senha do Redis da fila (ADR 0013). Gere com `openssl rand -hex 32`: só letras e números, porque ela vai dentro da URL de conexão                                                                                                                  |
   | `QUEUE_PREFIX`                                                                             | opcional; prefixo das chaves da fila (padrão `cognuss`)                                                                                                                                                                                           |
   | `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | Cloudflare R2 (ADR 0012). Endpoint `https://<conta>.r2.cloudflarestorage.com`, bucket privado e uma chave restrita a ele. Sem elas, o envio de arquivos fica indisponível. **Arquivo real de aluno só depois do parecer jurídico** (SPEC v2, D06) |
   | `STORAGE_REGION`                                                                           | opcional; `auto` para o R2                                                                                                                                                                                                                        |
   | `PII_ENCRYPTION_KEY`, `PII_HASH_KEY`                                                       | cadastro da v2 (CPF cifrado; SPEC v2, CAD-10). Gere cada uma com `openssl rand -base64 32` e guarde no cofre: sem a de cifra o CPF salvo não volta a ser lido, e trocar a de resumo quebra a regra de um CPF por conta                            |
   | `FEATURES_ON`                                                                              | opcional e só fora de produção; liga módulos da v2 sem passar por `/admin/funcionalidades`                                                                                                                                                        |

3. Domínio no serviço `web`, porta `3000`. DNS: registro `A` de `app-gutta` apontando para o VPS.
4. Deploy. No primeiro start:
   - o Postgres roda `infra/postgres/init/01-roles.sh`, que cria `gutta_owner`, `gutta_app` e o banco. O script vai **dentro da imagem** (`infra/postgres/Dockerfile`); montado como volume, chegaria vazio no Coolify;
   - o `web` aplica as migrations e só depois sobe o servidor.
5. Confira `https://app-gutta.tudomudou.com.br/api/health`, que deve responder `{"status":"ok","db":"ok"}`.

Nenhum serviço publica porta no servidor (`expose`, não `ports`): o proxy do Coolify chega ao `web` pela rede interna, e só o `web` e o `worker` alcançam o banco e o Redis.

### Worker e Redis (ADR 0013)

O compose tem mais dois serviços, que o Coolify sobe junto:

- **`redis`**: fila de trabalhos e limite de tentativas de login compartilhado entre réplicas. Guarda os dados no volume `gutta-redis` (AOF), com senha. Não guarda dado pessoal: os trabalhos levam só identificadores.
- **`worker`**: publica na fila os eventos que o app grava na tabela `outbox` e executa os trabalhos. Usa o mesmo papel do app (`gutta_app`, sem BYPASSRLS) e só sobe depois de o `web` estar saudável, porque é o `web` que aplica as migrations. A saúde fica em `http://worker:3001/health`, só na rede interna.

### Arquivos: R2 e antivírus (ADR 0012)

1. **Bucket no R2**: um por ambiente (`cognuss-qa`, `cognuss-prod`), privado, sem domínio público. Dica de localização: leste da América do Norte.
2. **CORS do bucket**: aceitar `PUT` e `GET` só a partir de `APP_URL`, com o cabeçalho `content-type`. Sem isso, o navegador não consegue enviar direto ao bucket.
3. **Chave de API** com permissão de leitura e escrita só nesse bucket.
4. **Antivírus**: o serviço `clamav` do compose baixa a base no primeiro start e leva alguns minutos para ficar saudável. O `worker` espera por ele. Ele usa cerca de 1 GB de memória: confira a folga do servidor.

Se o Redis cair, o app continua funcionando: o limite de login passa as requisições (e registra `auth.rate_limit_unavailable` no log) e os eventos esperam no `outbox` até o `worker` conseguir publicar. Os trabalhos que falham 5 vezes ficam 30 dias na lista de falhas do BullMQ.

## Primeiro administrador

Os usuários de demonstração nunca vão para produção (ADR 0005). O catálogo só entra com `SEED_CATALOG=demo`.

1. Crie a conta pelo `/cadastro`.
2. No Coolify, defina `BOOTSTRAP_ADMIN_EMAILS` com o seu e-mail (vários: separados por vírgula) e faça um redeploy.
3. No start, logo depois das migrations, cada e-mail listado que já tem conta ganha o papel `admin` e fica com o e-mail confirmado. Isso dispensa o Resend para o primeiro acesso, e a mudança fica na auditoria (`role.granted`, `user.email_verified`).

A variável não cria usuário nem guarda senha: a senha é a do cadastro. Pode deixá-la definida; rodar de novo não muda nada. No primeiro acesso a `/admin`, a plataforma pede para ativar a verificação em duas etapas.

Outras contas (professor, equipe) o admin cria em `/admin/usuarios` → Novo usuário. A senha temporária aparece uma vez na tela; a pessoa troca em Segurança → Trocar senha.

## Retenção e exclusão (LGPD)

A limpeza (`apply_retention`, ADR 0009) roda a cada start do container. Para não depender de deploy, crie uma tarefa agendada diária no Coolify, em **Scheduled Tasks** da aplicação, no serviço `web`:

- Comando: `node migrate.mjs --retention-only`
- Frequência: `17 4 * * *` (todo dia às 4h17)

Ela apaga o texto antigo das conversas do tutor, eventos e auditoria fora do prazo, sessões vencidas, e executa as exclusões cujo prazo de desistência acabou. O resultado vai para o log (`db.retention_applied`) e para a auditoria.

## Busca por conceito (pgvector e Voyage AI)

A migration 0051 precisa da extensão `vector`, que só um superusuário cria. O serviço `db-extensions` do compose faz isso a cada deploy, com o usuário `postgres`, antes de o `web` aplicar as migrations: volumes novos e bancos que já existiam não precisam de passo manual. A imagem `gutta-db` (`infra/postgres`) já vem com o pgvector compilado.

Os vetores vêm da Voyage AI (decisão do Fernando, 14/11/2026). Cadastre `VOYAGE_API_KEY` no `web` e no `worker`. No painel da Voyage, em Organization → Terms of Service, mude para **Opted Out** (retenção zero, sem uso para treino; pede cartão cadastrado e conta de admin). Sem a chave, a busca por conceito fica desligada e a busca por palavra continua.

## Cognuss Kids (ADR 0022)

O Kids é **outro recurso no Coolify**, com deploy, banco e backup próprios. Um deploy do Kids não reinicia o Cognuss, e o contrário também vale. Os dados das crianças ficam num **Postgres separado**: nenhum papel do Cognuss alcança esse servidor.

| Recurso | O que sobe | Build | Domínio |
| --- | --- | --- | --- |
| Cognuss Kids | `kids` (Next.js), `db` (Postgres 16 só do Kids), `db-roles` (passo de papéis) | Docker Compose, Base Directory `/infra/kids`, arquivo `/compose.yml` | o do Kids (D-K08) |

### Primeira vez

1. No Coolify: **New Resource → Docker Compose**, mesmo repositório, branch `main` (ou `cognuss-kids` para testar antes do merge), **Base Directory `/infra/kids`** e arquivo **`/compose.yml`**. O build usa a raiz do repositório como contexto (`../..`), porque o Kids usa os pacotes do monorepo.
2. Variáveis (aba Environment Variables). Gere as senhas com `openssl rand -hex 32`: elas vão dentro da URL de conexão.

   | Variável | Observação |
   | --- | --- |
   | `KIDS_APP_URL` | endereço do Kids, sem barra no fim |
   | `KIDS_BETTER_AUTH_SECRET` | 32+ caracteres; **diferente** do `BETTER_AUTH_SECRET` do Cognuss |
   | `KIDS_POSTGRES_PASSWORD` | superusuário do Postgres do Kids (só administração e o passo `db-roles`) |
   | `KIDS_OWNER_PASSWORD` | dono do banco `cognuss_kids`; usado só pelas migrations |
   | `KIDS_APP_PASSWORD` | papel da aplicação (sem BYPASSRLS) |
   | `KIDS_BOOTSTRAP_ADMIN_EMAILS` | e-mails que viram Super Admin no start, se a conta existir e o e-mail estiver confirmado |
   | `RESEND_API_KEY` | a mesma chave do Cognuss; sem ela, convites e links do responsável só vão para o log |
   | `KIDS_MAIL_FROM` | opcional; remetente do Kids no Resend |

3. Domínio no serviço `kids`, porta `3100`. DNS: registro `A` do subdomínio apontando para o mesmo servidor. O Coolify emite o HTTPS, que a resposta por voz exige.
4. **Watch Paths** do recurso (para só o que é do Kids disparar deploy automático):

   ```
   apps/kids/**
   packages/db-kids/**
   packages/ui/**
   packages/core/**
   infra/kids/**
   pnpm-lock.yaml
   ```

5. Deploy. A cada deploy:
   - o `db-roles` roda `kids-roles.sh` (dentro da imagem `cognuss-kids-db`), cria ou atualiza `kids_owner`, `kids_app` e o banco `cognuss_kids`, e termina. É idempotente: vale no volume novo e no que já existe, e é por ele que uma senha trocada no Coolify chega ao banco;
   - o `kids` aplica as migrations como `kids_owner` e só então sobe.
6. Confira `KIDS_APP_URL/api/health`, que deve responder `{"status":"ok","db":"ok"}`.
7. Primeiro acesso:
   - crie a sua conta;
   - no próximo deploy ou restart, o bootstrap transforma você em Super Admin;
   - ative o 2FA;
   - em `/plataforma`, cadastre a primeira escola.

### Backup

No Coolify, em **Scheduled Backups** do serviço `db` **deste recurso**, configure o dump diário do banco `cognuss_kids`, com retenção de 14 dias e destino S3/R2, separado do backup do Cognuss. Teste a restauração uma vez por mês, como no Cognuss.

### Recurso do Cognuss

Para um commit só do Kids não redeployar o Cognuss, ponha nos Watch Paths do recurso do Cognuss (Base Directory `/infra`) só os caminhos dele:

```
apps/web/**
apps/worker/**
packages/ai/**
packages/contracts/**
packages/core/**
packages/db/**
packages/jobs/**
packages/storage/**
packages/ui/**
infra/compose.yml
infra/postgres/**
pnpm-lock.yaml
```

Os pacotes compartilhados (`packages/ui`, `packages/core`) e o `pnpm-lock.yaml` disparam os dois recursos, como deve ser.

### Localmente

`pnpm kids:db:setup` cria papéis, banco, migrations e a escola de demonstração:
- usuários `superadmin@kids.test`, `gestor@kids.test`, `professor@kids.test` e `aluno@kids.test`, todos com a senha `gutta-demo-2026`;
- a aluna sem e-mail da turma 3º A, que entra em "Sou aluno" com o código `demo3a`, o usuário `luna` e a senha `gato-azul-42`.

`pnpm kids:dev` sobe em `http://localhost:3100`. Para subir como no Coolify: `docker compose -f infra/kids/compose.yml --env-file <arquivo> up -d --build`.

## Atualizações

Cada deploy reconstrói a imagem e aplica as migrations novas no start. Migrations são só para a frente; para desfazer, crie uma migration nova.

## Backup

1. No Coolify, em **Scheduled Backups** do serviço `db`, configure um dump diário do banco `gutta`, com retenção de 14 dias e destino S3 (por exemplo, Cloudflare R2).
2. Teste a restauração uma vez por mês num banco descartável:
   ```bash
   pg_restore -d gutta_restore dump.sql
   ```
3. Metas iniciais: RPO de 24 h e RTO de 2 h. Revisar antes do piloto da F3.

## Build local da imagem

```bash
docker build -f apps/web/Dockerfile -t gutta-web .
```

```bash
docker build -f apps/kids/Dockerfile -t gutta-kids .
```

Atrás de proxy com certificado próprio, acrescente `--secret id=ca,src=/caminho/ca.crt`.

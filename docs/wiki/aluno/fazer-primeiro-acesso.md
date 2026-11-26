# Como fazer o primeiro acesso

O primeiro acesso configura o seu perfil em quatro etapas: dados pessoais, perfil acadêmico, disciplinas e rotina. Cada etapa grava na hora; se você sair no meio, volta de onde parou.

**Quem pode:** aluno com e-mail confirmado que ainda não concluiu o cadastro. **Onde:** `/comecar`, com as etapas `/comecar/dados`, `/comecar/perfil`, `/comecar/disciplinas` e `/comecar/rotina`.

**Chave de módulo:** **Cadastro inicial (CAD)** (`cadastro`). Com ela desligada, `/comecar` não abre e o aluno faz os primeiros passos antigos. Veja [Como concluir os primeiros passos antigos](concluir-primeiros-passos.md). O admin liga a chave em **Funcionalidades** (`/admin/funcionalidades`).

## Antes de começar

- Tenha em mãos o seu CPF e um telefone com DDD.
- Se tiver o cronograma das disciplinas (PDF, DOC, DOCX ou XLSX, até 10 MB), deixe o arquivo à mão. Ele é opcional.

## Passo a passo

O topo da tela mostra as etapas numeradas: **Dados pessoais**, **Perfil acadêmico**, **Disciplinas** e **Minha rotina**. Uma etapa só abre depois das anteriores.

### 1. Dados pessoais

1. Confira **Nome completo** (nome e sobrenome).
2. Digite o **CPF**. Ele é usado só para emitir nota fiscal e fica guardado cifrado. Se você já salvou antes, o campo mostra "Salvo: ..." e pode ficar em branco.
3. Digite o **Telefone com DDD**, como (11) 98765-4321.
4. Se a tela pedir, marque **Li e aceito os termos de uso e a política de privacidade.**
5. Clique em **Salvar e continuar**.

### 2. Perfil acadêmico

1. Em **Curso de graduação**, escolha o curso. Se o seu não está na lista, escolha **Outro curso da saúde** e preencha **Nome do curso**.
2. Em **Semestre**, escolha o semestre atual.
3. Em **Instituição**, escolha a sua. Se ela não aparece, escolha **Não encontrei a minha** e digite o nome. Veja [Como sugerir uma instituição](sugerir-instituicao.md).
4. Se quiser, preencha **Campus** e **Turma** (como aparece no seu horário, por exemplo XIIA). Os dois são opcionais.
5. Em **Principal objetivo**, escolha uma opção: **Reforçar disciplinas**, **Preparar-me para provas**, **Organizar minha rotina** ou **Desenvolver meu currículo**.
6. Clique em **Salvar e continuar**. Para corrigir a etapa anterior, use **Voltar para os dados pessoais**.

### 3. Disciplinas

1. Em **Adicionar disciplina**, preencha **Nome da disciplina** e, se quiser, a **Sigla**, a **Cor na grade e no calendário** e os **Docentes**.
2. Se tiver o arquivo, anexe em **Cronograma** e em **Plano de ensino**. Os dois são opcionais.
3. Clique em **Adicionar disciplina**. Repita para cada disciplina do semestre.
4. Se você anexou o cronograma, acompanhe a leitura no cartão da disciplina e, quando aparecer **Conferir o cronograma**, confira antes de seguir. Veja [Como importar o cronograma](importar-cronograma.md) e [Como conferir o cronograma](conferir-cronograma.md).
5. Clique em **Continuar**. É preciso ter pelo menos uma disciplina.

Detalhes de cada campo em [Como cadastrar uma disciplina](cadastrar-disciplina.md).

### 4. Minha rotina

1. As aulas do cronograma conferido já aparecem na grade.
2. Clique numa célula vazia para marcar horários de **Estudo** e atividades pessoais, como sono, refeições e academia. Veja [Como montar a rotina semanal](montar-rotina-semanal.md).
3. Clique em **Concluir cadastro**. Não é preciso cumprir a meta de estudo para concluir.

## O que acontece depois

- A plataforma abre o painel do aluno (`/app`). Com a chave **Meu Espaço (ESP)** ligada, aparece "Tudo pronto. Seu Meu Espaço já mostra suas disciplinas e sua rotina."
- Tudo o que você preencheu pode ser mudado depois: disciplinas em **Minhas disciplinas**, rotina em **Rotina semanal** e objetivo em **Alterar objetivo**.
- Se você sair no meio, abrir `/comecar` leva direto à etapa que falta.

## Se der errado

| Mensagem                                                                                                     | O que fazer                                                                                                                |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| "Digite seu nome completo." ou "Digite nome e sobrenome."                                                    | Escreva nome e sobrenome.                                                                                                  |
| "Informe seu CPF."                                                                                           | O CPF é obrigatório na primeira vez.                                                                                       |
| "CPF inválido. Confira os números."                                                                          | Confira os dígitos.                                                                                                        |
| "Este CPF já está em outra conta. Se for sua, entre por ela ou fale com o suporte."                          | Entre com a outra conta. Se não lembra qual é, fale com o suporte (como o suporte localiza a conta pelo CPF: a confirmar). |
| "Informe seu telefone com DDD." ou "Telefone inválido. Use DDD e número, como (11) 98765-4321."              | Digite DDD e número.                                                                                                       |
| "Para continuar, aceite os termos de uso e a política de privacidade."                                       | Marque a caixa dos termos.                                                                                                 |
| "Escolha seu curso.", "Escolha o semestre.", "Escolha sua instituição." ou "Escolha seu objetivo principal." | Preencha o campo indicado.                                                                                                 |
| "Digite o nome do seu curso." ou "Digite o nome da instituição."                                             | Escreva pelo menos 3 letras.                                                                                               |
| "Adicione pelo menos uma disciplina para continuar."                                                         | Cadastre uma disciplina antes de clicar em **Continuar**.                                                                  |
| "Não deu para salvar agora. Tente de novo."                                                                  | Tente de novo. O que você digitou continua no formulário.                                                                  |
| `/comecar` mostra "Esta página não está disponível"                                                          | A chave **Cadastro inicial (CAD)** está desligada. Use `/onboarding`.                                                      |

## Veja também

- [Como concluir os primeiros passos antigos](concluir-primeiros-passos.md)
- [Como sugerir uma instituição](sugerir-instituicao.md)
- [Como cadastrar uma disciplina](cadastrar-disciplina.md)
- [Como montar a rotina semanal](montar-rotina-semanal.md)
- [Como trocar o objetivo](trocar-objetivo.md)
- [Como ligar e desligar módulos da v2](../admin/ligar-e-desligar-funcionalidades.md), no guia do admin

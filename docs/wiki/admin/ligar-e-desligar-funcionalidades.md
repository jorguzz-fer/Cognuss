# Como ligar e desligar módulos da v2

Liga cada módulo da v2 para os alunos quando ele estiver pronto, ou desliga se der problema. Cada módulo novo entra desligado.

**Quem pode:** Admin. **Onde:** Admin → Visão geral → cartão **Funcionalidades** → **Abrir chaves**, `/admin/funcionalidades`. Essa tela não aparece no menu lateral.

## As chaves

| Chave na tela                          | O que liga                                                   |
| -------------------------------------- | ------------------------------------------------------------ |
| Cadastro inicial (CAD)                 | Dados pessoais, perfil acadêmico e objetivo.                 |
| Minhas disciplinas e cronogramas (DIS) | Disciplinas do aluno, cronograma e plano de ensino.          |
| Rotina semanal (ROT)                   | Grade da semana, horários protegidos e meta de estudo.       |
| Equilíbrio (EQU)                       | Propostas de plano de estudo e replanejamento.               |
| Meu Espaço (ESP)                       | Painel inicial da v2.                                        |
| Agenda e calendário (CAL)              | Agenda geral e calendário de cada disciplina.                |
| Material de estudo (MAT)               | Envio de arquivos, biblioteca e busca.                       |
| Acompanhar aula (AUL)                  | Slides com marcações, caderno e selos.                       |
| Alertas e lembretes (LEM)              | Alertas acadêmicos, meus lembretes e notificações.           |
| Faltas (FAL)                           | Controle pessoal de frequência.                              |
| Notas e calculadora (NOT)              | Avaliações, médias e "quanto preciso tirar".                 |
| Ajuda Cognuss (AJU)                    | Criar com IA, tutor sobre os materiais e minhas criações.    |
| Competências: Meus Certificados        | Certificados, horas complementares e, em breve, o currículo. |
| Áudio inteligente (AUD)                | Só depois do parecer jurídico (SPEC v2, D10).                |

Funcionam sempre, sem chave: catálogo, questões, flashcards, revisões, perfil e privacidade.

## Passo a passo

1. No menu lateral, clique em **Visão geral**.
2. No cartão **Funcionalidades**, clique em **Abrir chaves**.
3. Marque os módulos que devem ficar ligados e desmarque os que devem ficar desligados.
4. Clique em **Salvar**.

## O que acontece depois

- Aparece o aviso "Chaves salvas.".
- A mudança vale para todos em até 30 segundos.
- Com um módulo desligado, as telas dele respondem "não encontrado", como se não existissem. Pedidos ao servidor recebem "Este recurso ainda não está disponível.".
- A chave **Cadastro inicial (CAD)** decide o primeiro acesso: ligada, o aluno novo vai para o cadastro da v2 (`/comecar`); desligada, vai para o primeiro acesso antigo do MVP.
- Desligar não apaga nada. Os dados do aluno voltam a aparecer quando o módulo é ligado de novo.
- A mudança fica na auditoria.

## Se der errado

- Aviso "FEATURES_ON está definida no servidor (...)": a engenharia ligou alguns módulos por variável do servidor. Eles ficam ligados mesmo desmarcados aqui. Atenção: esses módulos aparecem marcados, e salvar grava esse estado. Se a variável for tirada depois, eles continuam ligados até alguém desmarcar.
- O aluno ainda vê o módulo desligado: espere 30 segundos e recarregue a página.

## Veja também

- [Ligar e desligar os recursos de IA](configurar-recursos-de-ia.md)
- [Criar uma conta de teste](criar-conta-de-teste.md)
- [Abrir o mapa de atores](abrir-mapa-de-atores.md)
- [Área do aluno](../README.md#aluno)

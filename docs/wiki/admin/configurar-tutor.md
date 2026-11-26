# Como configurar o tutor IA

Liga ou desliga o tutor IA dos módulos e define quantas perguntas cada aluno pode fazer em 24 horas. Explica também como o tutor funciona para o aluno.

**Quem pode:** Admin. **Onde:** Admin → Tutor IA, `/admin/tutor`.

## Antes de começar

- Esta tela cuida do tutor que aparece dentro de cada módulo do catálogo. O tutor sobre os materiais do aluno (Ajuda Cognuss) é ligado e desligado em [Custos de IA](configurar-recursos-de-ia.md).
- O servidor precisa da chave da Anthropic (`ANTHROPIC_API_KEY`). Sem ela, a tela mostra: "Sem ANTHROPIC_API_KEY no servidor: o tutor aparece como desligado para os alunos. Cadastre a chave no Coolify e faça um redeploy."

## Passo a passo

1. No menu lateral, clique em **Tutor IA**.
2. Confira os números do topo: **Perguntas hoje**, **Perguntas em 30 dias**, **Custo em 30 dias** e **Custo por aluno (30 dias)**, com as recusas.
3. No quadro **Configuração**, confira o provedor, o modelo e os tokens dos últimos 30 dias.
4. Marque ou desmarque **Tutor ligado para os alunos**.
5. Em **Perguntas por aluno em 24 h**, escreva a cota, de 0 a 500. O padrão do servidor é 20.
6. Clique em **Salvar**.

## O que acontece depois

- Aparece o aviso "Configuração salva.".
- A mudança fica na auditoria.

### Como o tutor funciona para o aluno

- O tutor aparece no fim da página de cada módulo publicado, no quadro **Tutor IA** (beta).
- Ele responde só com o material publicado do módulo e com as questões daquele assunto que o aluno já respondeu. O gabarito de uma questão nunca entra antes de o aluno responder.
- Na primeira vez, o aluno vê **Antes da primeira pergunta**: a pergunta, o material do módulo e o resumo das respostas dele vão para a Anthropic, nos Estados Unidos; nome e e-mail não vão; as conversas ficam guardadas e podem ser revistas pela equipe. Ele clica em **Aceito usar o tutor**. Esse aceite é o consentimento "Tutor IA", que ele pode retirar em Privacidade.
- Depois do aceite, o aluno escreve em **Sua dúvida** e clica em **Perguntar ao tutor**. A tela mostra quantas perguntas restam, por exemplo "18 de 20 perguntas restantes nas próximas 24 horas".
- A cota conta as perguntas das últimas 24 horas, não do dia do calendário. Com a cota em 0, ninguém consegue perguntar.
- Tutor desligado, ou servidor sem chave: o aluno vê "O tutor está desligado no momento. O resumo e as questões continuam aqui.".

## Se der errado

Mensagens que o aluno pode ver:

- "Você usou as 20 perguntas das últimas 24 horas. O tutor volta a responder amanhã.": a cota acabou. Aumente aqui, se fizer sentido.
- "Para usar o tutor, aceite antes o uso descrito acima.": o aluno ainda não aceitou ou retirou o aceite.
- "Chave da Anthropic inválida.": a chave do servidor está errada. Avise a engenharia.
- "Muitos pedidos ao mesmo tempo. Tente em um minuto." ou "O serviço de IA não respondeu. Tente de novo.": instabilidade do provedor. Espere e tente de novo.

Na tela do admin:

- "Use 0 ou mais." ou "No máximo 500.": ajuste a cota.

## Veja também

- [Ver as conversas do tutor](ver-conversas-do-tutor.md)
- [Acompanhar os custos de IA](acompanhar-custos-de-ia.md)
- [Ligar e desligar os recursos de IA](configurar-recursos-de-ia.md)
- [Ajustar os prazos de retenção](ajustar-prazos-de-retencao.md)
- [Área do aluno](../README.md#aluno)

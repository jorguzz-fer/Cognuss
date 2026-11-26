# Como calcular a média final com a calculadora

A calculadora responde "quanto preciso tirar?": você informa a média final que quer e vê a nota necessária no que falta. Ela começa com os seus números e não muda nenhuma nota.

**Quem pode:** aluno dono da disciplina. **Onde:** quadro **Calculadora: quanto preciso tirar?** em `/app/notas/(id)#calculadora`. Abra pelo botão **Calcular minha média final** em **Notas** ou pelo link **Calcular média final** na visão da disciplina.

**Chave de módulo:** **Notas e calculadora (NOT)** (`notas`).

## Passo a passo

1. Abra a calculadora. Os campos já vêm preenchidos com as suas notas lançadas, e a média desejada começa na mínima de aprovação.
2. Confira ou mude os campos:
   - **Média das avaliações realizadas**;
   - **Média final desejada**;
   - **Peso já realizado** (ou **Porcentagem já realizada**, na composição por porcentagem);
   - **Peso restante** (ou **Porcentagem restante**).
3. Leia o resultado em **Nota necessária nas próximas avaliações**. Ele muda enquanto você digita.

## O que acontece depois

- A frase abaixo do resultado explica o cenário:
  - "A média desejada já está garantida."
  - "Passa da nota máxima de 10: a média desejada não é alcançável com o que falta."
  - "Considerando os pesos informados e nota máxima de 10."
- Nada é salvo. A calculadora é só uma simulação. Ao lançar ou mudar uma nota, os campos voltam aos números da disciplina.

## Se der errado

| Mensagem                                   | O que fazer                                                                                                                            |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| "Informe um peso restante maior que zero." | Preencha **Peso restante** (ou **Porcentagem restante**) com um número maior que zero.                                                 |
| O resultado parece errado                  | Confira a **Fórmula da média** em **Configuração do cálculo** e os pesos de cada avaliação. Veja [Como lançar notas](lancar-notas.md). |

## Veja também

- [Como lançar notas](lancar-notas.md)
- [Como usar a visão da disciplina](usar-visao-da-disciplina.md)

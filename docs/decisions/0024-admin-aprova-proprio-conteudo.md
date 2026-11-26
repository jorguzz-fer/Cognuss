# ADR 0024: O admin pode aprovar o próprio conteúdo

- Status: aceito (pedido do Fernando em 26/11/2026)
- Data: 2026-11-26

## Contexto

Até aqui, o banco (trigger `enforce_editorial_transition`, migration 0001) recusava qualquer autor que tentasse aprovar o próprio conteúdo. A regra valia para questões, módulos, peças da produção e cartões editoriais. Com só um admin cadastrado, um módulo que ele escrevia ficava parado em "em revisão".

## Decisão

- **O admin (Super Admin) pode aprovar o que escreveu.** A migration 0063 refaz as duas funções de trava (`enforce_editorial_transition` e `guard_flashcard_editorial`) com essa exceção.
- **Revisor e editor continuam sem aprovar o próprio conteúdo.**
- **As demais regras não mudam:**
  - não se pula etapa;
  - só revisor ou admin aprova, publica e arquiva;
  - conteúdo publicado só muda por revisor.
- **A tela avisa o admin autor** de que não haverá uma segunda revisão.
- **A auditoria do módulo marca `selfApproved`** quando o autor aprova.

## Consequências

- Conteúdo de saúde aprovado só pelo admin que o escreveu não passa por uma segunda pessoa. Quando o Dr. Rafael tiver o papel de revisor, a recomendação é deixar a aprovação com ele.
- A mensagem da produção de aulas passa a dizer que só o admin pode aprovar o que enviou.

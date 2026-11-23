import { Alert } from '@gutta/ui/card';

// Avisos depois de uma ação. A URL leva só a chave, nunca texto livre nem dado pessoal.
const MESSAGES = {
  'escola-criada': ['success', 'Instituição cadastrada. O convite foi enviado para a gestão.'],
  'status-alterado': ['success', 'Situação da instituição atualizada.'],
  'convite-enviado': ['success', 'Convite enviado. Ele vale por 7 dias.'],
  'convite-cancelado': ['success', 'Convite cancelado.'],
  'estrutura-salva': ['success', 'Estrutura atualizada.'],
  'materia-criada': ['success', 'Matéria criada.'],
  'materias-sugeridas': ['success', 'Matérias sugeridas adicionadas.'],
  'materia-arquivada': ['success', 'Matéria arquivada.'],
  'turma-criada': ['success', 'Turma criada.'],
  'professor-ligado': ['success', 'Professor ligado à turma.'],
  'professor-desligado': ['success', 'Professor desligado da turma.'],
  'aluno-removido': ['success', 'Aluno retirado da turma. O histórico fica guardado.'],
  'membro-removido': ['success', 'Acesso removido. As sessões dessa pessoa foram encerradas.'],
  'slug-usado': ['danger', 'Esse endereço curto já está em uso. Escolha outro.'],
  'nome-usado': ['danger', 'Já existe um item com esse nome.'],
  'dados-invalidos': ['danger', 'Confira os campos destacados e tente de novo.'],
  confirmar: ['danger', 'Marque a confirmação para desativar.'],
  'sem-acesso': ['danger', 'Essa ação não faz parte do seu acesso.'],
  'nao-remove-a-si': ['danger', 'Você não pode remover o próprio acesso.'],
  'plano-criado': ['success', 'Plano criado em rascunho.'],
  'plano-salvo': ['success', 'Plano salvo.'],
  'plano-apagado': ['success', 'Rascunho apagado.'],
  'plano-in_review': ['success', 'Plano enviado para revisão.'],
  'plano-approved': ['success', 'Plano aprovado. Já pode ser publicado.'],
  'plano-published': ['success', 'Plano publicado para os alunos do ano.'],
  'plano-archived': ['success', 'Plano arquivado. Os alunos não veem mais.'],
  'plano-draft': ['success', 'Plano de volta ao rascunho.'],
  'versao-criada': ['success', 'Nova versão criada em rascunho. A publicada continua no ar.'],
  'plano-sem-permissao': [
    'danger',
    'Essa ação não é possível: só o rascunho muda, e quem escreveu o plano não o aprova.',
  ],
  'topico-salvo': ['success', 'Tópico salvo.'],
  'topico-apagado': ['success', 'Tópico apagado.'],
  'conteudo-salvo': ['success', 'Conteúdo adicionado.'],
  'conteudo-apagado': ['success', 'Conteúdo apagado.'],
  'conteudo-invalido': [
    'danger',
    'Não deu para montar esse conteúdo. Vídeo precisa de link https; tabela, de títulos e linhas.',
  ],
  'flashcards-salvos': ['success', 'Flashcards adicionados.'],
  'flashcards-invalidos': ['danger', 'Use uma linha por cartão: frente | verso.'],
  'flashcard-apagado': ['success', 'Flashcard apagado.'],
  'responsavel-convidado': ['success', 'Link enviado ao responsável. Ele vale por 30 dias.'],
  'papel-registrado': ['success', 'Autorização em papel registrada.'],
  'pedido-resolvido': ['success', 'Pedido marcado como resolvido.'],
} as const;

export type FlashKey = keyof typeof MESSAGES;

export function Flash({ code }: { code?: string }) {
  if (!code || !(code in MESSAGES)) return null;
  const [tone, text] = MESSAGES[code as FlashKey];
  return <Alert tone={tone}>{text}</Alert>;
}

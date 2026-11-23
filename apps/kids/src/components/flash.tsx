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
} as const;

export type FlashKey = keyof typeof MESSAGES;

export function Flash({ code }: { code?: string }) {
  if (!code || !(code in MESSAGES)) return null;
  const [tone, text] = MESSAGES[code as FlashKey];
  return <Alert tone={tone}>{text}</Alert>;
}

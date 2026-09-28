/**
 * Regras de "quem pode mexer no quê" — puras (sem banco), usadas tanto nas rotas de
 * API quanto na UI (pra esconder botões que a pessoa não pode usar).
 * Princípio: o que alguém criou, só essa pessoa (ou owner/admin do workspace) edita ou
 * apaga. Quem recebeu uma tarefa pode trabalhar nela (concluir, mover), não reescrevê-la.
 */

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** Editar/excluir um card: quem criou ou owner/admin. */
export function canManageCard(userId: string, card: { createdById: string }, role: string | null | undefined): boolean {
  return card.createdById === userId || isAdminRole(role);
}

/** Concluir/mover um card e mexer nas subtarefas: quem pode gerenciá-lo + o responsável. */
export function canWorkOnCard(
  userId: string,
  card: { createdById: string; assignedToId: string | null },
  role: string | null | undefined
): boolean {
  return canManageCard(userId, card, role) || card.assignedToId === userId;
}

/** Mudar nome/cor/visibilidade/colunas/membros de um board, arquivar ou excluir. */
export function canManageBoard(userId: string, board: { createdById: string }, role: string | null | undefined): boolean {
  return board.createdById === userId || isAdminRole(role);
}

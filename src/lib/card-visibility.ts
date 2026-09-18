/**
 * Regra de visibilidade "private" de um card, isolada sem dependência de banco —
 * fica num arquivo próprio (em vez de dentro de workspace.ts) só pra poder ser testada
 * sem precisar de DATABASE_URL configurada (workspace.ts importa `db` no topo do arquivo).
 */
export function isCardVisibleTo(
  userId: string,
  card: { visibility: string; createdById: string; assignedToId: string | null }
): boolean {
  return card.visibility !== "private" || card.createdById === userId || card.assignedToId === userId;
}

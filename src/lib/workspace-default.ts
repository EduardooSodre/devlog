/**
 * Sem escolha salva (cookie): abre a organização paga em que a pessoa trabalha, não o
 * workspace pessoal vazio criado no cadastro. Antes era sempre o primeiro em que entrou —
 * quem se cadastrou e depois aceitou convite caía no pessoal grátis, aparecendo como
 * "responsável" e plano gratuito, enquanto o assento dela era cobrado na empresa.
 * Empate (dois pagos ou dois grátis): o mais antigo, como antes.
 */
export function pickDefaultWorkspace(
  memberships: { workspaceId: string; joinedAt: Date; workspace: { plan: string } }[]
): string {
  const ranked = [...memberships].sort(
    (a, b) =>
      Number(b.workspace.plan !== "free") - Number(a.workspace.plan !== "free") ||
      a.joinedAt.getTime() - b.joinedAt.getTime()
  );
  return ranked[0].workspaceId;
}

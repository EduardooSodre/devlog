/**
 * Detecta menções "@Nome Completo" num comentário (HTML do TipTap) comparando contra
 * os nomes dos membros do workspace. ponytail: casamento simples por substring no texto
 * (sem autocomplete/editor dedicado) — se precisar de um picker de menção de verdade
 * na UI, isso vira uma extensão do TipTap; hoje o ganho (avisar quem foi citado) já
 * vem só de detectar o texto.
 */
export function extractMentionedUserIds(
  content: string,
  members: { id: string; name: string | null }[],
  excludeUserId: string
): string[] {
  const plainText = content.replace(/<[^>]+>/g, " ").toLowerCase();
  const ids: string[] = [];

  for (const member of members) {
    if (member.id === excludeUserId || !member.name?.trim()) continue;
    if (plainText.includes(`@${member.name.toLowerCase()}`)) {
      ids.push(member.id);
    }
  }

  return ids;
}

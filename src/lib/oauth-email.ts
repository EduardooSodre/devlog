/**
 * O provedor OAuth confirmou que a pessoa é dona deste e-mail? Ter conta Google/GitHub
 * NÃO basta: o GitHub aceita e-mail primário não verificado e o Google aceita contas com
 * e-mail de outro domínio sem confirmar. Só quando o provedor diz "verificado" é que
 * gravamos users.emailVerified — e todo o resto do app (domínio da empresa, workspace
 * público, convites automáticos) confia só nesse campo.
 */
type AccountLike = { provider?: string; access_token?: string | null } | null | undefined;

export async function isEmailVerifiedByProvider(account: AccountLike, profile: unknown, email: string): Promise<boolean> {
  if (!account || !email) return false;
  const target = email.toLowerCase();

  if (account.provider === "google") {
    const p = profile as { email?: string; email_verified?: boolean } | undefined;
    return p?.email_verified === true && p.email?.toLowerCase() === target;
  }

  if (account.provider === "github" && account.access_token) {
    try {
      const res = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${account.access_token}`, Accept: "application/vnd.github+json" },
      });
      if (!res.ok) return false;
      const emails = (await res.json()) as { email: string; verified: boolean }[];
      return emails.some((e) => e.email.toLowerCase() === target && e.verified === true);
    } catch {
      return false;
    }
  }

  return false;
}

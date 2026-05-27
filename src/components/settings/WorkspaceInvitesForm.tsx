"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, Loader2, Copy } from "lucide-react";

interface WorkspaceInvitesFormProps {
  workspaceId: string;
}

export function WorkspaceInvitesForm({ workspaceId }: WorkspaceInvitesFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/workspaces/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), workspaceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar convite");

      setLastInviteUrl(data.data.inviteUrl);
      setEmail("");
      toast.success("Convite criado! Copie o link e envie ao convidado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao convidar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Convide membros por e-mail. O convidado precisa usar a mesma conta de e-mail para aceitar.
      </p>
      <form onSubmit={handleInvite} className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            className="w-full h-10 pl-9 pr-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 h-10 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Convidar"}
        </button>
      </form>
      {lastInviteUrl && (
        <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border text-xs">
          <code className="flex-1 truncate text-muted-foreground">{lastInviteUrl}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(lastInviteUrl);
              toast.success("Link copiado!");
            }}
            className="text-primary hover:text-primary/80"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

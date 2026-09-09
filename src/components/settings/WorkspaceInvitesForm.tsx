"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Loader2, Copy } from "lucide-react";

interface WorkspaceInvitesFormProps {
  workspaceId: string;
}

interface Department {
  id: string;
  name: string;
}

export function WorkspaceInvitesForm({ workspaceId }: WorkspaceInvitesFormProps) {
  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/workspaces/departments?workspaceId=${workspaceId}`)
      .then((res) => res.json())
      .then((json) => setDepartments(json.data ?? []))
      .catch(() => {});
  }, [workspaceId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/workspaces/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), workspaceId, departmentId: departmentId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar convite");

      setLastInviteUrl(data.data.inviteUrl);
      setEmail("");
      toast.success(
        data.data.emailSent
          ? "Convite enviado por e-mail!"
          : "Convite criado! Copie o link e envie ao convidado (e-mail não configurado)."
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao convidar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Convide alguém por e-mail — pro workspace inteiro ou direto pra um departamento. A
        pessoa só entra depois de confirmar o convite com o mesmo e-mail.
      </p>
      <form onSubmit={handleInvite} className="space-y-2">
        <div className="flex gap-2">
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
            className="px-4 h-10 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Convidar"}
          </button>
        </div>
        {departments.length > 0 && (
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full h-9 px-2 bg-background border border-border rounded-lg text-xs text-muted-foreground focus:outline-none focus:border-primary"
          >
            <option value="">Todo o workspace</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
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

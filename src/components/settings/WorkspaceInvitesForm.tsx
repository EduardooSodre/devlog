"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Loader2, Copy, RotateCw, X, Clock } from "lucide-react";

interface WorkspaceInvitesFormProps {
  workspaceId: string;
  canInviteAdmins: boolean;
}

interface Department {
  id: string;
  name: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: "admin" | "member";
  inviteUrl: string;
  expired: boolean;
  expiresAt: string;
}

export function WorkspaceInvitesForm({ workspaceId, canInviteAdmins }: WorkspaceInvitesFormProps) {
  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function loadPending() {
    fetch(`/api/workspaces/invites?workspaceId=${workspaceId}`)
      .then((res) => res.json())
      .then((json) => setPending(json.data ?? []))
      .catch(() => {});
  }

  useEffect(() => {
    fetch(`/api/workspaces/departments?workspaceId=${workspaceId}`)
      .then((res) => res.json())
      .then((json) => setDepartments(json.data ?? []))
      .catch(() => {});
    loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function sendInvite(targetEmail: string, opts?: { departmentId?: string; role?: string }) {
    const res = await fetch("/api/workspaces/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail, workspaceId, departmentId: opts?.departmentId || undefined, role: opts?.role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Erro ao enviar convite");
    return data.data as { emailSent: boolean; inviteUrl: string };
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const result = await sendInvite(email.trim(), { departmentId, role });
      setEmail("");
      if (result.emailSent) {
        toast.success("Convite enviado por e-mail! A pessoa entra sozinha ao abrir o link.");
      } else {
        navigator.clipboard?.writeText(result.inviteUrl).catch(() => {});
        toast.success("Convite criado e link copiado — o e-mail não está configurado, envie o link pra pessoa.");
      }
      loadPending();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao convidar");
    } finally {
      setLoading(false);
    }
  }

  async function resend(invite: PendingInvite) {
    setBusyId(invite.id);
    try {
      const result = await sendInvite(invite.email, { role: invite.role });
      toast.success(result.emailSent ? "Convite reenviado (validade renovada)" : "Validade renovada — copie o link");
      loadPending();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reenviar");
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(invite: PendingInvite) {
    setBusyId(invite.id);
    try {
      const res = await fetch(`/api/workspaces/invites?id=${invite.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPending((prev) => prev.filter((p) => p.id !== invite.id));
    } catch {
      toast.error("Erro ao cancelar convite");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Convide por e-mail. Quando a pessoa abre o link, ela cria a conta (ou entra) e já cai
        direto no workspace — sem precisar aceitar de novo. Se ela entrar com Google usando esse
        e-mail, entra automaticamente mesmo sem clicar no link.
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
        <div className="flex gap-2">
          {departments.length > 0 && (
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="flex-1 h-9 px-2 bg-background border border-border rounded-lg text-xs text-muted-foreground focus:outline-none focus:border-primary"
            >
              <option value="">Todo o workspace</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
          {canInviteAdmins && (
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "member" | "admin")}
              className="h-9 px-2 bg-background border border-border rounded-lg text-xs text-muted-foreground focus:outline-none focus:border-primary"
            >
              <option value="member">Membro</option>
              <option value="admin">Admin</option>
            </select>
          )}
        </div>
      </form>

      {pending.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Aguardando a pessoa entrar</p>
          {pending.map((inv) => (
            <div key={inv.id} className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
              <Clock className={inv.expired ? "w-3.5 h-3.5 text-red-400 shrink-0" : "w-3.5 h-3.5 text-muted-foreground shrink-0"} />
              <span className="flex-1 min-w-0 text-sm truncate">
                {inv.email}
                {inv.expired && <span className="text-xs text-red-400"> · expirado</span>}
              </span>
              <button
                type="button"
                title="Copiar link do convite"
                onClick={() => {
                  navigator.clipboard.writeText(inv.inviteUrl);
                  toast.success("Link copiado!");
                }}
                className="p-1 text-muted-foreground hover:text-primary"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Reenviar e renovar validade"
                disabled={busyId === inv.id}
                onClick={() => resend(inv)}
                className="p-1 text-muted-foreground hover:text-primary disabled:opacity-50"
              >
                {busyId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                title="Cancelar convite"
                disabled={busyId === inv.id}
                onClick={() => cancel(inv)}
                className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

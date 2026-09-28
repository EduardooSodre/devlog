"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Crown, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { initials } from "@/lib/utils";

interface Member {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  jobTitle: string | null;
  role: "owner" | "admin" | "member";
}

interface Props {
  workspaceId: string;
  currentUserId: string;
  canManage: boolean;
  /** Mostra quanto cada pessoa custa (Enterprise é por assento). */
  seatPrice?: number;
}

const ROLE_LABEL = { owner: "Dono", admin: "Admin", member: "Membro" } as const;

export function MembersForm({ workspaceId, currentUserId, canManage, seatPrice }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    fetch(`/api/workspaces/members?workspaceId=${workspaceId}`)
      .then((res) => res.json())
      .then((json) => setMembers(json.data ?? []))
      .catch(() => {});
  }

  useEffect(load, [workspaceId]);

  async function changeRole(userId: string, role: "admin" | "member") {
    setBusyId(userId);
    try {
      const res = await fetch("/api/workspaces/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, userId, role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao alterar papel");
      toast.success(role === "admin" ? "Agora é administrador" : "Agora é membro");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar papel");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(member: Member) {
    if (!confirm(`Remover ${member.name ?? member.email} do workspace?${seatPrice ? " O assento sai da próxima fatura." : ""}`)) return;
    setBusyId(member.id);
    try {
      const res = await fetch(`/api/workspaces/members?workspaceId=${workspaceId}&userId=${member.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao remover");
      toast.success("Removido do workspace");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {canManage
          ? "Administradores podem editar e excluir o que qualquer pessoa criou, e promover outros a administrador."
          : "Só administradores podem mudar papéis ou remover pessoas."}
        {seatPrice ? ` Cada pessoa é um assento de R$ ${seatPrice}/mês.` : ""}
      </p>

      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 bg-background border border-border rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center overflow-hidden shrink-0">
              {m.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.image} alt="" className="w-full h-full object-cover" />
              ) : (
                initials(m.name || m.email)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {m.name ?? m.email}
                {m.id === currentUserId && <span className="text-xs text-muted-foreground font-normal"> (você)</span>}
              </p>
              <p className="text-xs text-muted-foreground truncate">{m.jobTitle ? `${m.jobTitle} · ${m.email}` : m.email}</p>
            </div>

            {m.role === "owner" ? (
              <span className="flex items-center gap-1 text-xs text-amber-400 shrink-0">
                <Crown className="w-3.5 h-3.5" /> {ROLE_LABEL.owner}
              </span>
            ) : canManage && m.id !== currentUserId ? (
              <div className="flex items-center gap-1.5 shrink-0">
                {busyId === m.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                <select
                  value={m.role}
                  disabled={busyId === m.id}
                  onChange={(e) => changeRole(m.id, e.target.value as "admin" | "member")}
                  className="h-8 px-2 bg-card border border-border rounded-lg text-xs focus:outline-none focus:border-primary"
                >
                  <option value="member">Membro</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={() => remove(m)}
                  disabled={busyId === m.id}
                  title="Remover do workspace"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                {m.role === "admin" && <ShieldCheck className="w-3.5 h-3.5 text-primary" />}
                {ROLE_LABEL[m.role]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, Users } from "lucide-react";
import { initials } from "@/lib/utils";

interface DeptOption {
  id: string;
  name: string;
}

interface DeptMember {
  userId: string;
  user: { id: string; name: string | null; image: string | null };
}

interface Props {
  workspaceId: string;
  isPersonal: boolean;
  departmentId: string | null;
  departments: DeptOption[];
  onChangeVisibility: (mode: "personal" | "workspace" | string) => void;
}

/** Painel "quem tem acesso a este board" — pessoal (só o criador), um departamento
 * específico, ou todo o workspace. Convite direto por e-mail e troca de visibilidade
 * na hora, sem precisar ir em Configurações. */
export function BoardAccessPanel({ workspaceId, isPersonal, departmentId, departments, onChangeVisibility }: Props) {
  const [members, setMembers] = useState<DeptMember[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!departmentId) {
      setMembers(null);
      return;
    }
    setLoading(true);
    fetch(`/api/workspaces/departments?id=${departmentId}`)
      .then((res) => res.json())
      .then((json) => setMembers(json.data?.members ?? []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [departmentId]);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/workspaces/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), workspaceId, departmentId: departmentId ?? undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao convidar");
      toast.success(json.data?.emailSent ? "Convite enviado por e-mail!" : "Convite criado — copie o link em Configurações › Convites");
      setInviteEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao convidar");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="p-2 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium px-1">
        <Users className="w-4 h-4 text-primary" />
        Quem tem acesso
      </div>

      {isPersonal ? (
        <p className="text-xs text-muted-foreground px-1">
          Pessoal — só você vê este board. Compartilhe com o time abaixo.
        </p>
      ) : !departmentId ? (
        <p className="text-xs text-muted-foreground px-1">
          Visível para todo o workspace — qualquer membro consegue ver este board.
        </p>
      ) : loading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 px-1">
          {(members ?? []).map((m) => (
            <div
              key={m.userId}
              title={m.user.name ?? undefined}
              className="flex items-center gap-1.5 text-xs bg-background border border-border rounded-full pl-1 pr-2 py-1"
            >
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold flex items-center justify-center overflow-hidden shrink-0">
                {m.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.user.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials(m.user.name || "?")
                )}
              </span>
              <span className="truncate max-w-[7rem]">{m.user.name}</span>
            </div>
          ))}
          {members?.length === 0 && <p className="text-xs text-muted-foreground">Ninguém neste departamento ainda.</p>}
        </div>
      )}

      {!isPersonal && (
        <div className="flex items-center gap-1.5 px-1">
          <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            type="email"
            placeholder="Convidar por e-mail…"
            className="flex-1 h-8 bg-background border border-border rounded-lg px-2 text-xs focus:outline-none focus:border-primary transition-colors min-w-0"
          />
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            className="shrink-0 bg-primary text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Convidar"}
          </button>
        </div>
      )}

      <div className="px-1">
        <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 block">
          Quem vai ver este board
        </label>
        <select
          value={isPersonal ? "personal" : departmentId ?? "workspace"}
          onChange={(e) => onChangeVisibility(e.target.value)}
          className="w-full h-8 px-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:border-primary transition-colors"
        >
          <option value="personal">Pessoal (só você)</option>
          <option value="workspace">Todo o workspace</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

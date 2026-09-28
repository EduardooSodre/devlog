"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Crown, Loader2, Mail, Users, X } from "lucide-react";
import { initials } from "@/lib/utils";

interface DeptOption {
  id: string;
  name: string;
}

interface Person {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Props {
  boardId: string;
  isPersonal: boolean;
  departmentId: string | null;
  departments: DeptOption[];
  canManage: boolean;
  onChangeVisibility: (mode: "personal" | "workspace" | string) => void;
}

/**
 * "Quem tem acesso a este board": quem criou + quem foi adicionado diretamente, e a
 * visibilidade geral (privado / departamento / workspace). Adicionar por e-mail é
 * automático: quem já está no workspace entra no board na hora; quem não está recebe
 * convite que já o coloca no workspace e no board ao aceitar.
 */
export function BoardAccessPanel({ boardId, isPersonal, departmentId, departments, canManage, onChangeVisibility }: Props) {
  const [creator, setCreator] = useState<Person | null>(null);
  const [members, setMembers] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [pendingLink, setPendingLink] = useState<string | null>(null);

  function load() {
    fetch(`/api/kanban/boards/members?boardId=${boardId}`)
      .then((res) => res.json())
      .then((json) => {
        setCreator(json.data?.creator ?? null);
        setMembers(json.data?.members ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [boardId]);

  async function handleAdd() {
    if (!email.trim()) return;
    setAdding(true);
    setPendingLink(null);
    try {
      const res = await fetch("/api/kanban/boards/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId, email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao adicionar");

      if (json.data.status === "added") {
        toast.success("Adicionado ao board — a pessoa foi avisada");
        load();
      } else if (json.data.emailSent) {
        toast.success("Convite enviado — ao aceitar, a pessoa já entra neste board");
      } else {
        setPendingLink(json.data.inviteUrl);
        toast.success("Convite criado — copie o link abaixo e envie pra pessoa");
      }
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userId: string) {
    const prev = members;
    setMembers((m) => m.filter((p) => p.id !== userId));
    const res = await fetch(`/api/kanban/boards/members?boardId=${boardId}&userId=${userId}`, { method: "DELETE" });
    if (!res.ok) {
      setMembers(prev);
      toast.error("Erro ao remover");
    }
  }

  const visibilityText = isPersonal
    ? "Privado — só as pessoas abaixo veem este board."
    : departmentId
    ? `Todo o departamento ${departments.find((d) => d.id === departmentId)?.name ?? ""} vê, mais as pessoas abaixo.`
    : "Todo o workspace vê este board.";

  return (
    <div className="p-2 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium px-1">
        <Users className="w-4 h-4 text-primary" />
        Quem tem acesso
      </div>
      <p className="text-xs text-muted-foreground px-1">{visibilityText}</p>

      {loading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-1 px-1">
          {creator && <PersonRow person={creator} badge={<Crown className="w-3 h-3 text-amber-400" />} />}
          {members.map((m) => (
            <PersonRow
              key={m.id}
              person={m}
              onRemove={canManage ? () => handleRemove(m.id) : undefined}
            />
          ))}
        </div>
      )}

      {canManage && (
        <>
          <div className="flex items-center gap-1.5 px-1">
            <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              type="email"
              placeholder="Adicionar pessoa por e-mail…"
              className="flex-1 h-8 bg-background border border-border rounded-lg px-2 text-xs focus:outline-none focus:border-primary transition-colors min-w-0"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !email.trim()}
              className="shrink-0 bg-primary text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Adicionar"}
            </button>
          </div>

          {pendingLink && (
            <div className="flex items-center gap-2 mx-1 p-2 bg-background rounded-lg border border-border text-xs">
              <code className="flex-1 truncate text-muted-foreground">{pendingLink}</code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(pendingLink);
                  toast.success("Link copiado!");
                }}
                className="text-primary hover:text-primary/80"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="px-1">
            <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 block">
              Visibilidade
            </label>
            <select
              value={isPersonal ? "personal" : departmentId ?? "workspace"}
              onChange={(e) => onChangeVisibility(e.target.value)}
              className="w-full h-8 px-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:border-primary transition-colors"
            >
              <option value="personal">Privado (você e quem adicionar)</option>
              <option value="workspace">Todo o workspace</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>Departamento: {d.name}</option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}

function PersonRow({ person, badge, onRemove }: { person: Person; badge?: React.ReactNode; onRemove?: () => void }) {
  return (
    <div className="group flex items-center gap-2 text-xs py-1">
      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[9px] font-semibold flex items-center justify-center overflow-hidden shrink-0">
        {person.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.image} alt="" className="w-full h-full object-cover" />
        ) : (
          initials(person.name || person.email)
        )}
      </span>
      <span className="flex-1 min-w-0 truncate">{person.name ?? person.email}</span>
      {badge}
      {onRemove && (
        <button
          onClick={onRemove}
          title="Remover do board"
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Loader2, Plus, Trash2, X } from "lucide-react";
import { initials } from "@/lib/utils";

interface Member {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Department {
  id: string;
  name: string;
  createdById: string;
  members: { userId: string; user: Member }[];
}

interface Props {
  workspaceId: string;
  currentUserId: string;
}

export function DepartmentsForm({ workspaceId, currentUserId }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  function load() {
    fetch(`/api/workspaces/departments?workspaceId=${workspaceId}`)
      .then((res) => res.json())
      .then((json) => setDepartments(json.data ?? []));
    fetch(`/api/workspaces/members?workspaceId=${workspaceId}`)
      .then((res) => res.json())
      .then((json) => setMembers(json.data ?? []));
  }

  useEffect(load, [workspaceId]);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/workspaces/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, name: name.trim(), memberIds: [...selected] }),
      });
      if (!res.ok) throw new Error();
      toast.success("Departamento criado!");
      setName("");
      setSelected(new Set());
      setCreating(false);
      load();
    } catch {
      toast.error("Erro ao criar departamento");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este departamento? Boards restritos a ele voltam a ser visíveis para o workspace inteiro.")) return;
    await fetch(`/api/workspaces/departments?id=${id}`, { method: "DELETE" });
    load();
  }

  function toggleMember(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Qualquer pessoa pode criar um departamento e escolher exatamente quem enxerga. Boards
        podem ser restritos a um departamento na hora da criação.
      </p>

      <div className="space-y-2">
        {departments.map((dept) => (
          <div key={dept.id} className="flex items-center justify-between bg-background border border-border rounded-xl p-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium truncate">{dept.name}</span>
              <div className="flex -space-x-1.5 shrink-0">
                {dept.members.slice(0, 5).map((m) => (
                  <div
                    key={m.userId}
                    title={m.user.name ?? m.user.email}
                    className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[9px] font-semibold flex items-center justify-center overflow-hidden ring-2 ring-background"
                  >
                    {m.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.user.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initials(m.user.name || m.user.email)
                    )}
                  </div>
                ))}
              </div>
            </div>
            {dept.createdById === currentUserId && (
              <button
                onClick={() => handleDelete(dept.id)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {departments.length === 0 && !creating && (
          <p className="text-sm text-muted-foreground italic">Nenhum departamento ainda.</p>
        )}
      </div>

      {creating ? (
        <div className="bg-background border border-primary/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do departamento (ex.: Vendas)"
              className="flex-1 h-9 bg-card border border-border rounded-lg px-3 text-sm focus:outline-none focus:border-primary mr-2"
            />
            <button onClick={() => setCreating(false)}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Quem enxerga (você já está incluído)
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {members.filter((m) => m.id !== currentUserId).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMember(m.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                    selected.has(m.id)
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {m.name || m.email}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Criar departamento
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Novo departamento
        </button>
      )}
    </div>
  );
}

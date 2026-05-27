"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";

interface Props {
  workspace: {
    id: string;
    name: string;
  };
}

export function WorkspaceSettingsForm({ workspace }: Props) {
  const router = useRouter();
  const [name, setName] = useState(workspace.name);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: workspace.id, name: name.trim() }),
      });

      if (!res.ok) throw new Error();

      toast.success("Workspace atualizado!");
    } catch {
      toast.error("Erro ao atualizar workspace");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("TEM CERTEZA? Isso excluirá TODOS os boards, cards e documentações deste workspace. Esta ação é IRREVERSÍVEL.")) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/workspaces?id=${workspace.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      toast.success("Workspace excluído!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Erro ao excluir workspace");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1">
            Nome do workspace
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 bg-background border border-border rounded-xl px-3 text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving || name === workspace.name}
          className="flex items-center gap-2 text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Salvar
        </button>
      </div>

      <div className="pt-6 border-t border-border">
        <div className="flex items-center gap-2 text-red-400 mb-4">
          <AlertTriangle className="w-4 h-4" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">Zona de Perigo</h3>
        </div>
        <div className="bg-red-400/5 border border-red-400/20 rounded-2xl p-4">
          <p className="text-sm text-muted-foreground mb-4">
            Ao excluir o workspace, você perderá permanentemente todos os dados associados a ele.
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 text-sm bg-red-400/10 text-red-400 border border-red-400/20 px-4 py-2 rounded-lg hover:bg-red-400 hover:text-white transition-all disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Excluir permanentemente este Workspace
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { VisibilityPicker } from "@/components/layout/WorkspaceSwitcher";

interface Props {
  workspace: {
    id: string;
    name: string;
    isPublic: boolean;
  };
  canEdit: boolean;
  isOwner: boolean;
}

export function WorkspaceSettingsForm({ workspace, canEdit, isOwner }: Props) {
  const router = useRouter();
  const [name, setName] = useState(workspace.name);
  const [isPublic, setIsPublic] = useState(workspace.isPublic);
  const dirty = name.trim() !== workspace.name || isPublic !== workspace.isPublic;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: workspace.id, name: name.trim(), isPublic }),
      });

      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error);

      toast.success("Workspace atualizado!");
      router.refresh();
    } catch (err) {
      toast.error((err instanceof Error && err.message) || "Erro ao atualizar workspace");
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

      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error);

      toast.success("Workspace excluído!");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error((err instanceof Error && err.message) || "Erro ao excluir workspace");
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
            disabled={!canEdit}
            maxLength={100}
            className="w-full h-10 bg-background border border-border rounded-xl px-3 text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1">
            Visibilidade
          </label>
          <fieldset disabled={!canEdit} className="disabled:opacity-60">
            <VisibilityPicker value={isPublic} onChange={setIsPublic} />
          </fieldset>
          <p className="text-xs text-muted-foreground mt-1.5">
            Público só vale pra e-mail corporativo: quem usa Gmail, Outlook etc. não enxerga workspaces públicos.
          </p>
        </div>
        {!canEdit && (
          <p className="text-xs text-muted-foreground">Só owner ou admin pode alterar o workspace.</p>
        )}
        <button
          onClick={handleSave}
          disabled={!canEdit || saving || !dirty || !name.trim()}
          className="flex items-center gap-2 text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Salvar
        </button>
      </div>

      {isOwner && <div className="pt-6 border-t border-border">
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
      </div>}
    </div>
  );
}

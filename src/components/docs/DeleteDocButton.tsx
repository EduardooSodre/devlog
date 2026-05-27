"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";

interface Props {
  docId: string;
}

export function DeleteDocButton({ docId }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir esta documentação? Esta ação não pode ser desfeita.")) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/docs?id=${docId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      toast.success("Documentação excluída com sucesso");
      router.push("/docs");
      router.refresh();
    } catch (error) {
      toast.error("Erro ao excluir documentação");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="flex items-center gap-1.5 px-3 py-1.5 border border-destructive/20 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors shrink-0"
    >
      {deleting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
      Excluir
    </button>
  );
}

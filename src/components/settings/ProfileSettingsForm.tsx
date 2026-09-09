"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function ProfileSettingsForm({ user }: Props) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) throw new Error();

      toast.success("Perfil atualizado!");
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary border border-primary/10">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            user.name?.[0]?.toUpperCase() ?? "U"
          )}
        </div>
        <div>
          <p className="font-medium text-foreground">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>
      
      <hr className="border-border" />
      
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">
            Nome de exibição
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-11 bg-background border border-border rounded-xl px-4 text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">
            Endereço de e-mail
          </label>
          <input
            value={user.email ?? ""}
            disabled
            className="w-full h-11 bg-background border border-border rounded-xl px-4 text-sm text-muted-foreground cursor-not-allowed opacity-70"
          />
          <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
            O e-mail não pode ser alterado pois é vinculado à sua conta de autenticação.
          </p>
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={saving || name === user.name}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Salvar alterações
        </button>
      </div>
    </div>
  );
}

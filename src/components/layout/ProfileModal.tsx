"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { X, LogOut, Loader2, User } from "lucide-react";
import { initials } from "@/lib/utils";

interface Props {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    jobTitle?: string | null;
  };
  workspaceName?: string;
  onClose: () => void;
}

export function ProfileModal({ user, workspaceName, onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [jobTitle, setJobTitle] = useState(user.jobTitle ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const dirty = name.trim() !== (user.name ?? "") || jobTitle.trim() !== (user.jobTitle ?? "");

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), jobTitle: jobTitle.trim() || null }),
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
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl pointer-events-auto animate-in fade-in zoom-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold">Seu perfil</p>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-background flex items-center justify-center transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary border border-primary/10 overflow-hidden">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="w-full h-full object-cover" />
                ) : user.name ? (
                  initials(user.name)
                ) : (
                  <User className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{user.name ?? "Usuário"}</p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                {workspaceName && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{workspaceName}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Nome de exibição
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 bg-background border border-border rounded-lg px-3 text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Cargo
                </label>
                <input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Ex.: Desenvolvedor, Gerente de TI…"
                  className="w-full h-10 bg-background border border-border rounded-lg px-3 text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white h-10 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar alterações
            </button>
          </div>

          <div className="px-5 pb-5">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

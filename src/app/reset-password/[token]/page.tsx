"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Lock, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Senha deve ter no mínimo 8 caracteres");
    if (password !== confirm) return toast.error("As senhas não coincidem");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao redefinir a senha");
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao redefinir a senha");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full h-10 bg-card border border-border rounded-lg pl-9 pr-10 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/60";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-sm w-full">
        {done ? (
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Senha redefinida!</h1>
            <p className="text-sm text-muted-foreground mb-6">Já pode entrar com a nova senha.</p>
            <Link
              href="/login"
              className="block w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary/90"
            >
              Ir para o login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">Nova senha</h1>
            <p className="text-muted-foreground text-sm mb-8">Escolha uma senha com pelo menos 8 caracteres.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Confirmar senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={show ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Salvar nova senha
              </button>
            </form>
            <p className="text-sm text-muted-foreground text-center mt-6">
              Link expirado?{" "}
              <Link href="/forgot-password" className="text-primary hover:underline">
                Pedir outro
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

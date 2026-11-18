"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Mail, Loader2, MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar o link");
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar o link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-sm w-full">
        {sent ? (
          <div className="text-center">
            <MailCheck className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Confira seu e-mail</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Se existir uma conta com <strong>{email}</strong>, enviamos um link pra redefinir a senha. Ele expira em 1 hora.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">Esqueceu a senha?</h1>
            <p className="text-muted-foreground text-sm mb-8">
              Informe seu e-mail e enviaremos um link pra criar uma nova senha.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full h-10 bg-card border border-border rounded-lg pl-9 pr-4 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Enviar link
              </button>
            </form>
          </>
        )}
        <p className="text-sm text-muted-foreground text-center mt-6">
          <Link href="/login" className="text-primary hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { BookOpen, Github, User, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Senha deve ter no mínimo 8 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao criar conta");
        return;
      }

      // Auto-login após registro
      await signIn("credentials", { email, password, redirect: false });
      router.push("/dashboard");
    } catch {
      toast.error("Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold">DevLog</span>
        </div>

        <h1 className="text-2xl font-bold mb-2">Criar sua conta</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Gratuito para sempre no plano Free
        </p>

        {/* OAuth */}
        <button
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          className="w-full flex items-center justify-center gap-2 h-10 bg-card border border-border rounded-lg text-sm hover:border-primary/40 transition-colors mb-6"
        >
          <Github className="w-4 h-4" />
          Continuar com GitHub
        </button>

        <div className="relative flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">ou com email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Nome</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                required
                className="w-full h-10 bg-card border border-border rounded-lg pl-9 pr-4 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full h-10 bg-card border border-border rounded-lg pl-9 pr-4 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                className="w-full h-10 bg-card border border-border rounded-lg pl-9 pr-10 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Criar conta
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Ao criar uma conta, você concorda com os Termos de Uso.
        </p>

        <p className="text-sm text-muted-foreground text-center mt-4">
          Já tem conta?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

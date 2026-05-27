"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { BookOpen, Github, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"github" | "google" | null>(null);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Email ou senha incorretos");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error("Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "github" | "google") {
    setOauthLoading(provider);
    try {
      await signIn(provider, { callbackUrl });
    } catch {
      toast.error("Erro ao autenticar. Tente novamente.");
      setOauthLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left side — decorative ── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-card border-r border-border items-center justify-center">
        <div
          className="absolute inset-0 bg-grid-pattern bg-grid-md opacity-20"
          style={{ maskImage: "radial-gradient(ellipse at center, black 50%, transparent 90%)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(231 90% 65%) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 text-center px-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">DevLog</span>
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-tight">
            Seu histórico de<br />
            <span className="text-gradient">evolução técnica</span>
          </h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Kanban, documentação com antes/depois, notas de refatoração — tudo em um só lugar.
          </p>
        </div>
      </div>

      {/* ── Right side — form ── */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">DevLog</span>
          </div>

          <h1 className="text-2xl font-bold mb-2">Bem-vindo de volta</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Entre na sua conta para continuar
          </p>

          {/* OAuth */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => handleOAuth("github")}
              disabled={!!oauthLoading}
              className="flex items-center justify-center gap-2 h-10 bg-card border border-border rounded-lg text-sm hover:border-primary/40 transition-colors disabled:opacity-50"
            >
              {oauthLoading === "github" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Github className="w-4 h-4" />
              )}
              GitHub
            </button>
            <button
              onClick={() => handleOAuth("google")}
              disabled={!!oauthLoading}
              className="flex items-center justify-center gap-2 h-10 bg-card border border-border rounded-lg text-sm hover:border-primary/40 transition-colors disabled:opacity-50"
            >
              {oauthLoading === "google" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Google
            </button>
          </div>

          <div className="relative flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">ou com email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Credentials form */}
          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
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
                  placeholder="••••••••"
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
              Entrar
            </button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Não tem conta?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

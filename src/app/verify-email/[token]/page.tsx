"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erro ao verificar e-mail");
        setState("ok");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Erro ao verificar e-mail");
        setState("error");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center">
        {state === "loading" && <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />}

        {state === "ok" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">E-mail confirmado!</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Se sua empresa já está no DevLog, você já foi encaixado(a) no workspace certo.
            </p>
            <Link
              href="/dashboard"
              className="block w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary/90"
            >
              Ir para o Dashboard
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Não deu certo</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        )}
      </div>
    </div>
  );
}

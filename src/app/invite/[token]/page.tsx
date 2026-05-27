"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function acceptInvite() {
    setAccepting(true);
    try {
      const res = await fetch("/api/workspaces/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao aceitar convite");

      setAccepted(true);
      toast.success("Convite aceito!");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao aceitar");
    } finally {
      setAccepting(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center">
        {accepted ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Bem-vindo ao workspace!</h1>
            <p className="text-sm text-muted-foreground">Redirecionando…</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold mb-2">Convite para workspace</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {session
                ? `Aceitar convite como ${session.user?.email}?`
                : "Faça login com o e-mail que recebeu o convite para continuar."}
            </p>
            {session ? (
              <button
                type="button"
                onClick={acceptInvite}
                disabled={accepting}
                className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {accepting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Aceitar convite"}
              </button>
            ) : (
              <Link
                href={`/login?callbackUrl=/invite/${token}`}
                className="block w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary/90"
              >
                Fazer login
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle, Users } from "lucide-react";

interface InvitePreview {
  email: string;
  workspaceName: string;
  inviterName: string;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    fetch(`/api/workspaces/invites/accept?token=${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Convite inválido");
        setPreview(json.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Convite inválido"));
  }, [token]);

  const sessionEmail = session?.user?.email?.toLowerCase();
  const emailMatches = !!preview && sessionEmail === preview.email.toLowerCase();

  // Logado com o e-mail certo = aceita sozinho, sem botão pra clicar.
  useEffect(() => {
    if (!emailMatches || attempted.current) return;
    attempted.current = true;
    fetch("/api/workspaces/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erro ao aceitar convite");
        setAccepted(true);
        setTimeout(() => router.push("/projetos"), 1200);
        router.refresh();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao aceitar convite"));
  }, [emailMatches, token, router]);

  const callbackUrl = `/invite/${token}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center">
        {error ? (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Não deu certo</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        ) : accepted ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Você entrou em {preview?.workspaceName}!</h1>
            <p className="text-sm text-muted-foreground">Abrindo os projetos…</p>
          </>
        ) : !preview || status === "loading" || emailMatches ? (
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold mb-2">Convite para {preview.workspaceName}</h1>
            <p className="text-sm text-muted-foreground mb-6">
              <strong>{preview.inviterName}</strong> te convidou. O convite é para{" "}
              <strong>{preview.email}</strong>.
            </p>

            {session ? (
              <>
                <p className="text-xs text-muted-foreground mb-4">
                  Você está logado como {session.user?.email}. Entre com {preview.email} para aceitar.
                </p>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` })}
                  className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary/90"
                >
                  Trocar de conta
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <Link
                  href={`/register?email=${encodeURIComponent(preview.email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  className="block w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary/90"
                >
                  Criar minha conta
                </Link>
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  className="block w-full border border-border py-3 rounded-xl text-sm font-medium hover:border-primary/40"
                >
                  Já tenho conta
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

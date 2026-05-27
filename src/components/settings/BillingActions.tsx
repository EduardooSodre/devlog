"use client";

import { useState } from "react";
import { Zap, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface BillingActionsProps {
  workspaceId: string;
  isPro: boolean;
  variant?: "inline" | "cta";
}

export function BillingActions({ workspaceId, isPro, variant = "cta" }: BillingActionsProps) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao iniciar checkout");
      if (data.url) window.location.href = data.url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar checkout");
    } finally {
      setLoading(false);
    }
  }

  async function handlePortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao abrir portal");
      if (data.url) window.location.href = data.url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao abrir portal");
    } finally {
      setLoading(false);
    }
  }

  if (isPro) {
    return (
      <button
        type="button"
        onClick={handlePortal}
        disabled={loading}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors underline disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
        Gerenciar assinatura
      </button>
    );
  }

  const className =
    variant === "inline"
      ? "flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      : "flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/20 disabled:opacity-50";

  return (
    <button type="button" onClick={handleUpgrade} disabled={loading} className={className}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
      {variant === "inline" ? "Fazer upgrade" : "Fazer upgrade agora"}
    </button>
  );
}

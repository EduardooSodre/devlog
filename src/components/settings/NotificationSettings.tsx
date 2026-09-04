"use client";

import { toast } from "sonner";
import { BellRing, BellOff, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function NotificationSettings() {
  const { supported, subscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  if (!loading && !supported) {
    return (
      <p className="text-sm text-muted-foreground">
        Este navegador não suporta notificações push.
      </p>
    );
  }

  async function handleToggle() {
    try {
      if (subscribed) {
        await unsubscribe();
        toast.success("Notificações desativadas");
      } else {
        await subscribe();
        toast.success("Notificações ativadas! Você será avisado quando receber uma tarefa.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível alterar as notificações");
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">Notificações de tarefas</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Receba um aviso no navegador quando uma tarefa for atribuída a você.
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-border hover:border-primary/40 transition-colors disabled:opacity-50 shrink-0"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : subscribed ? (
          <BellRing className="w-4 h-4 text-primary" />
        ) : (
          <BellOff className="w-4 h-4 text-muted-foreground" />
        )}
        {subscribed ? "Ativadas" : "Ativar"}
      </button>
    </div>
  );
}

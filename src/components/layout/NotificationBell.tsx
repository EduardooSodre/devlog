"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  body: string;
  url: string | null;
  read: boolean;
  createdAt: string;
}

const POLL_INTERVAL_MS = 20_000;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function NotificationBell({ collapsed }: { collapsed?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  function load() {
    fetch("/api/me/notifications")
      .then((res) => res.json())
      .then((json) => {
        setItems(json.data ?? []);
        setUnreadCount(json.unreadCount ?? 0);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  async function markAllRead() {
    setUnreadCount(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/me/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  }

  async function handleClick(n: Notification) {
    setOpen(false);
    if (!n.read) {
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)));
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch("/api/me/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {});
    }
    if (n.url) router.push(n.url);
  }

  return (
    <div className={cn("relative", collapsed ? "flex justify-center" : "")}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notificações"
        className={cn(
          "relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
          open ? "bg-primary/10 text-primary" : "hover:bg-background text-muted-foreground hover:text-foreground"
        )}
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-full bottom-0 ml-2 w-80 max-h-96 bg-card border border-border rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <span className="text-sm font-semibold">Notificações</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Marcar tudo como lido
                </button>
              )}
            </div>
            <div className="overflow-y-auto flex-1">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma notificação ainda.</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-border/50 last:border-0 hover:bg-background transition-colors",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

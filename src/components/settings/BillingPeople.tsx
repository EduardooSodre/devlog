"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Crown, Loader2, Shield, UserMinus, Users, RefreshCw, AlertTriangle } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { api, errorMessage } from "@/lib/api-client";
import { prorateSeat, daysSince } from "@/lib/proration";

export type BillingPerson = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  joinedAt: string;
  departmentIds: string[];
};

interface Props {
  workspaceId: string;
  currentUserId: string;
  people: BillingPerson[];
  departments: { id: string; name: string }[];
  /** Cobrança por assento ativa? (Enterprise com assinatura) — liga os valores proporcionais. */
  seat: { unitPrice: number; periodStart: string; periodEnd: string; billedSeats: number } | null;
}

/** Troca o workspace ativo e continua na mesma página (o conteúdo passa a ser o dele). */
export function SwitchWorkspaceButton({ workspaceId, label = "Abrir" }: { workspaceId: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        try {
          await api("/api/workspaces/active", { method: "POST", json: { workspaceId } });
          router.refresh();
        } catch (err) {
          toast.error(errorMessage(err, "Erro ao trocar de workspace"));
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
      className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10 disabled:opacity-50 shrink-0"
    >
      {busy && <Loader2 className="w-3 h-3 animate-spin" />}
      {label}
    </button>
  );
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const NO_DEPT = "__none__";

export function BillingPeople({ workspaceId, currentUserId, people, departments, seat }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const deptName = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);
  const noDeptCount = people.filter((p) => p.departmentIds.length === 0).length;
  const tabs = [
    { id: "all", label: "Todos", count: people.length },
    ...departments.map((d) => ({ id: d.id, label: d.name, count: people.filter((p) => p.departmentIds.includes(d.id)).length })),
    ...(departments.length > 0 && noDeptCount > 0 ? [{ id: NO_DEPT, label: "Sem departamento", count: noDeptCount }] : []),
  ];
  const visible = people.filter((p) =>
    filter === "all" ? true : filter === NO_DEPT ? p.departmentIds.length === 0 : p.departmentIds.includes(filter)
  );

  const proration = seat ? prorateSeat(seat.unitPrice, new Date(seat.periodStart), new Date(seat.periodEnd)) : null;
  const mismatch = seat && seat.billedSeats !== people.length;

  async function remove(p: BillingPerson) {
    setRemoving(p.id);
    try {
      await api(`/api/workspaces/members?workspaceId=${workspaceId}&userId=${p.id}`, { method: "DELETE" });
      toast.success(`${p.name ?? p.email} foi removido(a)${seat ? " — o assento sai da cobrança" : ""}`);
      setConfirming(null);
      router.refresh(); // continua na mesma página com os valores atualizados
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao remover pessoa"));
    } finally {
      setRemoving(null);
    }
  }

  async function syncSeats() {
    setSyncing(true);
    try {
      const res = await api<{ billedSeats: number }>("/api/stripe/sync-seats", { method: "POST", json: { workspaceId } });
      toast.success(`Cobrança ajustada para ${res.billedSeats} ${res.billedSeats === 1 ? "pessoa" : "pessoas"}`);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao ajustar a cobrança"));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {mismatch && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-yellow-400/5 border-b border-yellow-400/20">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
          <p className="text-sm flex-1">
            A Stripe está cobrando <strong>{seat.billedSeats}</strong> {seat.billedSeats === 1 ? "assento" : "assentos"}, mas a
            organização tem <strong>{people.length}</strong> {people.length === 1 ? "pessoa" : "pessoas"}.
            {proration && (
              <span className="text-muted-foreground">
                {" "}Ao ajustar, a diferença é cobrada ou creditada só pelos {proration.daysLeft} dias que faltam no ciclo.
              </span>
            )}
          </p>
          <button
            onClick={syncSeats}
            disabled={syncing}
            className="flex items-center justify-center gap-1.5 text-xs font-medium bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 px-3 py-1.5 rounded-lg hover:bg-yellow-400/20 disabled:opacity-50 shrink-0"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Ajustar cobrança
          </button>
        </div>
      )}

      {tabs.length > 1 && (
        <div role="tablist" aria-label="Filtrar por departamento" className="flex gap-1 overflow-x-auto px-3 pt-3 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={filter === t.id}
              onClick={() => setFilter(t.id)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
                filter === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              <span className="font-mono text-[10px] px-1.5 rounded-full bg-background">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Users className="w-4 h-4" /> Ninguém neste departamento.
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {visible.map((p) => {
            const isOwner = p.role === "owner";
            const canRemove = !isOwner && p.id !== currentUserId;
            const days = daysSince(new Date(p.joinedAt));
            return (
              <li key={p.id} className="p-4">
                <div className="flex items-center gap-3">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                      {initials(p.name ?? p.email)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{p.name ?? p.email}</span>
                      {isOwner && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
                          <Crown className="w-3 h-3" /> Responsável
                        </span>
                      )}
                      {p.role === "admin" && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      {p.departmentIds.map((id) => (
                        <span key={id} className="text-[10px] px-1.5 py-0.5 rounded-md bg-background border border-border text-muted-foreground">
                          {deptName.get(id)}
                        </span>
                      ))}
                      <span className="text-[10px] text-muted-foreground">
                        {days === 0 ? "Entrou hoje" : `Há ${days} ${days === 1 ? "dia" : "dias"}`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {seat && <p className="text-xs font-mono text-muted-foreground">{brl(seat.unitPrice)}/mês</p>}
                    {canRemove && confirming !== p.id && (
                      <button
                        onClick={() => setConfirming(p.id)}
                        className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <UserMinus className="w-3.5 h-3.5" /> Remover
                      </button>
                    )}
                  </div>
                </div>

                {confirming === p.id && (
                  <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/5 p-3">
                    <p className="text-xs leading-relaxed">
                      <strong>{p.name ?? p.email}</strong> perde o acesso a esta organização (os cards e documentações dela continuam aqui).
                      {proration && proration.amount > 0 && (
                        <>
                          {" "}O assento sai da cobrança: os <strong>{proration.daysLeft} dias</strong> não usados viram um crédito de
                          aproximadamente <strong>{brl(proration.amount)}</strong>, abatido na próxima fatura.
                        </>
                      )}
                    </p>
                    <div className="flex justify-end gap-2 mt-3">
                      <button
                        onClick={() => setConfirming(null)}
                        disabled={removing === p.id}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-background"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => remove(p)}
                        disabled={removing === p.id}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-500/90 disabled:opacity-50"
                      >
                        {removing === p.id && <Loader2 className="w-3 h-3 animate-spin" />}
                        Remover
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

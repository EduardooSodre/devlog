import { auth } from "@/lib/auth";
import { CreditCard, CheckCircle2, ArrowLeft, Users, Kanban, FileText, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PLANS, getPlanConfig, type PlanId } from "@/lib/plans";
import { getActiveWorkspace, getWorkspaceUsage } from "@/lib/workspace";
import { BillingActions } from "@/components/settings/BillingActions";

export const metadata = { title: "Plano & Billing — DevLog" };

const planStyles: Record<PlanId, { color: string; bg: string; border: string }> = {
  free: { color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20" },
  pro: { color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  enterprise: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30" },
};

export default async function BillingPage() {
  const session = await auth();
  const ctx = await getActiveWorkspace(session!.user.id);

  const workspace = ctx?.workspace ?? null;
  const currentPlan = (workspace?.plan ?? "free") as PlanId;
  const plan = getPlanConfig(currentPlan);
  const style = planStyles[currentPlan] ?? planStyles.free;

  const usage = workspace
    ? await getWorkspaceUsage(workspace.id)
    : { boards: 0, docs: 0, members: 0, storageMb: 0 };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href="/settings"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Configurações
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Plano & Billing</h1>
            <p className="text-sm text-muted-foreground">Gerencie seu plano e uso</p>
          </div>
        </div>
      </div>

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Plano atual
        </h2>
        <div className={cn("bg-card border rounded-2xl p-6", style.border)}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-lg font-bold", style.color)}>{plan.name}</span>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium border",
                    style.bg,
                    style.border,
                    style.color
                  )}
                >
                  {currentPlan === "free" ? "Ativo" : "Pro"}
                </span>
              </div>
              <p className="text-2xl font-bold mt-1">{plan.priceLabel}</p>
            </div>
            {currentPlan === "free" && workspace && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-2">Quer mais recursos?</p>
                <BillingActions workspaceId={workspace.id} isPro={false} variant="inline" />
              </div>
            )}
            {currentPlan !== "free" && workspace && (
              <BillingActions workspaceId={workspace.id} isPro />
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2">
            {plan.features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Uso atual
        </h2>
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <UsageBar
            icon={<Kanban className="w-4 h-4" />}
            label="Boards Kanban"
            used={usage.boards}
            limit={plan.limits.boards}
          />
          <UsageBar
            icon={<FileText className="w-4 h-4" />}
            label="Documentações"
            used={usage.docs}
            limit={plan.limits.docEntries}
          />
          <UsageBar
            icon={<Users className="w-4 h-4" />}
            label="Membros"
            used={usage.members}
            limit={plan.limits.members}
          />
          <UsageBar
            icon={<HardDrive className="w-4 h-4" />}
            label="Armazenamento"
            used={usage.storageMb}
            limit={plan.limits.storageMb}
            unit=" MB"
          />
        </div>
      </section>

      {currentPlan === "free" && workspace && (
        <section>
          <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-2xl p-6">
            <h2 className="font-semibold text-primary mb-2">DevLog Pro</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Remova todos os limites e desbloqueie recursos avançados.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {PLANS.pro.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{PLANS.pro.priceLabel}</p>
              </div>
              <BillingActions workspaceId={workspace.id} isPro={false} variant="cta" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function UsageBar({
  icon,
  label,
  used,
  limit,
  unit = "",
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number;
  unit?: string;
}) {
  const isUnlimited = limit === Infinity;
  const pct = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{icon}</span>
          <span className="font-medium">{label}</span>
        </div>
        <span
          className={cn(
            "text-xs font-mono",
            isAtLimit ? "text-red-400" : isNearLimit ? "text-yellow-400" : "text-muted-foreground"
          )}
        >
          {used}
          {unit} / {isUnlimited ? "∞" : `${limit}${unit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 bg-background rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isAtLimit ? "bg-red-400" : isNearLimit ? "bg-yellow-400" : "bg-primary"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

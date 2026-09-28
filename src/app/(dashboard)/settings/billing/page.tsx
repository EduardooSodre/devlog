import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreditCard, CheckCircle2, ArrowLeft, Users, Kanban, FileText, HardDrive, Download, ExternalLink, Receipt } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { PLANS, getPlanConfig, type PlanId } from "@/lib/plans";
import { getActiveWorkspace, getWorkspaceUsage } from "@/lib/workspace";
import { isTrialExpired } from "@/lib/org-domain";
import { getBillingOverview, type InvoiceSummary } from "@/lib/stripe";
import { BillingActions } from "@/components/settings/BillingActions";

export const metadata = { title: "Plano & Billing — DevLog" };

const planStyles: Record<PlanId, { color: string; bg: string; border: string }> = {
  free: { color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20" },
  pro: { color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  enterprise: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30" },
};

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const INVOICE_STATUS: Record<string, { label: string; className: string }> = {
  paid: { label: "Paga", className: "text-emerald-400 bg-emerald-400/10" },
  open: { label: "Em aberto", className: "text-yellow-400 bg-yellow-400/10" },
  draft: { label: "Rascunho", className: "text-muted-foreground bg-background" },
  void: { label: "Cancelada", className: "text-muted-foreground bg-background" },
  uncollectible: { label: "Não paga", className: "text-red-400 bg-red-400/10" },
};

export default async function BillingPage() {
  const session = await auth();
  const ctx = await getActiveWorkspace(session!.user.id);

  // Pagamento é só de quem é dono do workspace (quem paga pela empresa).
  if (!ctx || ctx.membership.role !== "owner") redirect("/settings");

  const workspace = ctx.workspace;
  const currentPlan = workspace.plan as PlanId;
  const plan = getPlanConfig(currentPlan);
  const style = planStyles[currentPlan] ?? planStyles.free;
  const usage = await getWorkspaceUsage(workspace.id);
  const trialExpired = isTrialExpired(workspace);

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.workspaceId, workspace.id),
    orderBy: [desc(subscriptions.createdAt)],
  });
  const hasActiveSub = sub && (sub.status === "active" || sub.status === "trialing");
  const overview = sub?.stripeCustomerId ? await getBillingOverview(sub.stripeCustomerId) : { invoices: [], upcoming: null };

  const isPerSeat = currentPlan === "enterprise";
  const seats = usage.members;
  const estimatedMonthly = isPerSeat ? seats * PLANS.enterprise.priceMonthly : plan.priceMonthly;

  const statusLabel = hasActiveSub
    ? sub.cancelAtPeriodEnd
      ? `Cancela em ${sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : "breve"}`
      : "Assinatura ativa"
    : trialExpired
    ? "Trial encerrado — bloqueado"
    : workspace.trialEndsAt
    ? `Trial grátis até ${formatDate(workspace.trialEndsAt)}`
    : currentPlan === "free"
    ? "Gratuito"
    : "Sem assinatura";

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
            <p className="text-sm text-muted-foreground">
              Só você vê esta área — é o responsável pelo pagamento de {workspace.name}.
            </p>
          </div>
        </div>
      </div>

      {/* Quanto paga */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quanto você paga</h2>
        <div className={cn("bg-card border rounded-2xl p-6", style.border)}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-lg font-bold", style.color)}>{plan.name}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", style.bg, style.border, style.color)}>
                  {statusLabel}
                </span>
              </div>
              <p className="text-3xl font-bold mt-2">
                {brl(overview.upcoming?.amount ?? estimatedMonthly)}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
              {isPerSeat && (
                <p className="text-sm text-muted-foreground mt-1">
                  {seats} {seats === 1 ? "pessoa" : "pessoas"} × {brl(PLANS.enterprise.priceMonthly)} por pessoa
                </p>
              )}
              {overview.upcoming?.date && (
                <p className="text-xs text-muted-foreground mt-1">Próxima cobrança em {formatDate(overview.upcoming.date)}</p>
              )}
              {!hasActiveSub && isPerSeat && (
                <p className="text-xs text-muted-foreground mt-1">
                  Nada é cobrado ainda — o valor acima passa a valer quando você assinar.
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {hasActiveSub ? (
                <BillingActions workspaceId={workspace.id} isPro />
              ) : currentPlan !== "free" || workspace.trialEndsAt ? (
                <BillingActions
                  workspaceId={workspace.id}
                  isPro={false}
                  plan={currentPlan === "pro" ? "pro" : "enterprise"}
                  variant="inline"
                  label={`Assinar ${currentPlan === "pro" ? "Pro" : "Enterprise"}`}
                />
              ) : null}
              {isPerSeat && (
                <Link href="/settings#membros" className="text-xs text-primary hover:underline">
                  Gerenciar pessoas (cada uma é um assento)
                </Link>
              )}
            </div>
          </div>
          {hasActiveSub && (
            <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
              Em &quot;Gerenciar assinatura&quot; você altera o cartão, os dados de faturamento (CNPJ, endereço) ou cancela.
              Quando alguém entra ou sai, o número de assentos é ajustado automaticamente e a diferença entra na próxima fatura.
            </p>
          )}
        </div>
      </section>

      {/* Faturas */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Faturas</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {overview.invoices.length === 0 ? (
            <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <Receipt className="w-4 h-4 shrink-0" />
              Nenhuma fatura ainda — elas aparecem aqui depois da primeira cobrança.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Número</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {overview.invoices.map((inv) => (
                    <InvoiceRow key={inv.id} invoice={inv} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Uso */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Uso atual</h2>
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <UsageBar icon={<Kanban className="w-4 h-4" />} label="Boards Kanban" used={usage.boards} limit={plan.limits.boards} />
          <UsageBar icon={<FileText className="w-4 h-4" />} label="Documentações" used={usage.docs} limit={plan.limits.docEntries} />
          <UsageBar icon={<Users className="w-4 h-4" />} label="Membros" used={usage.members} limit={plan.limits.members} />
          <UsageBar icon={<HardDrive className="w-4 h-4" />} label="Armazenamento" used={usage.storageMb} limit={plan.limits.storageMb} unit=" MB" />
        </div>
      </section>

      {currentPlan === "free" && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Escolha um plano</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(["pro", "enterprise"] as const).map((id) => (
              <div
                key={id}
                className={cn(
                  "border rounded-2xl p-6 flex flex-col",
                  id === "pro"
                    ? "bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/30"
                    : "bg-gradient-to-br from-amber-400/20 via-amber-400/10 to-transparent border-amber-400/30"
                )}
              >
                <h3 className={cn("font-semibold mb-1", id === "pro" ? "text-primary" : "text-amber-400")}>DevLog {PLANS[id].name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{PLANS[id].description}</p>
                <div className="grid gap-2 mb-6 flex-1">
                  {PLANS[id].features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-3">
                  <p className="text-xl font-bold">{PLANS[id].priceLabel}</p>
                  <BillingActions workspaceId={workspace.id} isPro={false} plan={id} variant="cta" label={`Escolher ${PLANS[id].name}`} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: InvoiceSummary }) {
  const status = INVOICE_STATUS[invoice.status ?? ""] ?? { label: invoice.status ?? "—", className: "text-muted-foreground bg-background" };
  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="px-4 py-3 whitespace-nowrap">{formatDate(invoice.createdAt)}</td>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{invoice.number ?? "—"}</td>
      <td className="px-4 py-3 font-medium whitespace-nowrap">{brl(invoice.amount)}</td>
      <td className="px-4 py-3">
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", status.className)}>{status.label}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-3">
          {invoice.pdfUrl && (
            <a href={invoice.pdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Download className="w-3.5 h-3.5" /> PDF
            </a>
          )}
          {invoice.hostedUrl && (
            <a href={invoice.hostedUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ExternalLink className="w-3.5 h-3.5" /> Ver
            </a>
          )}
        </div>
      </td>
    </tr>
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
        <span className={cn("text-xs font-mono", isAtLimit ? "text-red-400" : isNearLimit ? "text-yellow-400" : "text-muted-foreground")}>
          {used}
          {unit} / {isUnlimited ? "∞" : `${limit}${unit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 bg-background rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", isAtLimit ? "bg-red-400" : isNearLimit ? "bg-yellow-400" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  Users,
  Kanban,
  FileText,
  HardDrive,
  Download,
  ExternalLink,
  Receipt,
  Building2,
  Info,
  AlertTriangle,
  Crown,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";
import { eq, desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, users, workspaceMembers, departments, departmentMembers } from "@/lib/db/schema";
import { PLANS, getPlanConfig, type PlanId } from "@/lib/plans";
import { getActiveWorkspace, getUserWorkspaces, getWorkspaceUsage } from "@/lib/workspace";
import { isTrialExpired } from "@/lib/org-domain";
import { getBillingOverview, getSeatSubscription, type InvoiceSummary } from "@/lib/stripe";
import { prorateSeat } from "@/lib/proration";
import { BillingActions } from "@/components/settings/BillingActions";
import { BillingPeople, SwitchWorkspaceButton, type BillingPerson } from "@/components/settings/BillingPeople";

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
  const userId = session!.user.id;
  const ctx = await getActiveWorkspace(userId);
  if (!ctx) redirect("/settings");

  const workspace = ctx.workspace;
  const currentPlan = workspace.plan as PlanId;
  const plan = getPlanConfig(currentPlan);
  const style = planStyles[currentPlan] ?? planStyles.free;
  const isOwner = ctx.membership.role === "owner";

  // Outras organizações em que a pessoa é membro (não dona) — ex.: tem o workspace
  // pessoal grátis mas trabalha no da empresa. Sem isso ela não sabe "de onde" é.
  const otherOrgs = (await getUserWorkspaces(userId)).filter(
    (m) => m.workspaceId !== workspace.id && m.role !== "owner"
  );
  const ownerIds = [...new Set([workspace.ownerId, ...otherOrgs.map((m) => m.workspace.ownerId)])];
  const owners = await db.query.users.findMany({
    where: inArray(users.id, ownerIds),
    columns: { id: true, name: true, email: true },
  });
  const ownerName = (id: string) => {
    const o = owners.find((u) => u.id === id);
    return o?.name ?? o?.email ?? "o responsável";
  };
  const memberCounts = await Promise.all(
    otherOrgs.map(async (m) => ({ id: m.workspaceId, n: (await getWorkspaceUsage(m.workspaceId)).members }))
  );

  const otherOrgsCard = otherOrgs.length > 0 && (
    <section className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {isOwner ? "Você também faz parte de" : "Outras organizações"}
      </h2>
      <div className="bg-card border border-border rounded-2xl divide-y divide-border/60">
        {otherOrgs.map((m) => {
          const p = getPlanConfig(m.workspace.plan as PlanId);
          const n = memberCounts.find((c) => c.id === m.workspaceId)?.n ?? 0;
          return (
            <div key={m.workspaceId} className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.workspace.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.name} · {n} {n === 1 ? "pessoa" : "pessoas"} · pago por {ownerName(m.workspace.ownerId)} — você não paga nada
                </p>
              </div>
              <SwitchWorkspaceButton workspaceId={m.workspaceId} />
            </div>
          );
        })}
      </div>
    </section>
  );

  const header = (subtitle: string) => (
    <div className="mb-8">
      <Link href="/settings" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar para Configurações
      </Link>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Plano & Billing</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  );

  // ── Quem não paga: só vê a que organização pertence e quem é o responsável ──
  if (!isOwner) {
    const usage = await getWorkspaceUsage(workspace.id);
    return (
      <div className="p-4 sm:p-8 max-w-3xl mx-auto">
        {header("Seu acesso é pago pela organização — aqui você vê de onde ele vem.")}
        <section className="mb-6">
          <div className={cn("bg-card border rounded-2xl p-6", style.border)}>
            <div className="flex items-start gap-4">
              <div className={cn("p-3 rounded-xl shrink-0", style.bg, style.color)}>
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Você faz parte de</p>
                <p className="text-lg font-bold truncate">{workspace.name}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
                  <span className={cn("font-medium", style.color)}>Plano {plan.name}</span>
                  <span>·</span>
                  <span>
                    {usage.members} {usage.members === 1 ? "pessoa" : "pessoas"}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-amber-400" /> Responsável: {ownerName(workspace.ownerId)}
                  </span>
                </div>
              </div>
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground mt-5 pt-4 border-t border-border">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Você não paga nada pelo seu acesso. Dúvidas sobre plano ou cobrança vão para {ownerName(workspace.ownerId)}.
            </p>
          </div>
        </section>
        {otherOrgsCard}
      </div>
    );
  }

  // ── Responsável pelo pagamento ──
  const usage = await getWorkspaceUsage(workspace.id);
  const trialExpired = isTrialExpired(workspace);

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.workspaceId, workspace.id),
    orderBy: [desc(subscriptions.createdAt)],
  });
  const hasActiveSub = sub && (sub.status === "active" || sub.status === "trialing");
  const [overview, seat] = await Promise.all([
    sub?.stripeCustomerId ? getBillingOverview(sub.stripeCustomerId) : Promise.resolve({ invoices: [], upcoming: null }),
    hasActiveSub ? getSeatSubscription(workspace.id) : Promise.resolve(null),
  ]);

  const isPerSeat = currentPlan === "enterprise";
  const unitPrice = seat?.unitPrice || PLANS.enterprise.priceMonthly;

  // Pessoas + departamentos (pra lista agrupada)
  const [memberRows, deptRows] = await Promise.all([
    db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.workspaceId, workspace.id),
      with: { user: { columns: { id: true, name: true, email: true, image: true } } },
      orderBy: (m, { asc }) => [asc(m.joinedAt)],
    }),
    db.query.departments.findMany({
      where: eq(departments.workspaceId, workspace.id),
      columns: { id: true, name: true },
      orderBy: (d, { asc }) => [asc(d.name)],
    }),
  ]);
  const deptLinks = deptRows.length
    ? await db.query.departmentMembers.findMany({ where: inArray(departmentMembers.departmentId, deptRows.map((d) => d.id)) })
    : [];
  const people: BillingPerson[] = memberRows
    .map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      departmentIds: deptLinks.filter((l) => l.userId === m.user.id).map((l) => l.departmentId),
    }))
    // Responsável primeiro, depois admins, depois por nome.
    .sort((a, b) => {
      const rank = (r: string) => (r === "owner" ? 0 : r === "admin" ? 1 : 2);
      return rank(a.role) - rank(b.role) || (a.name ?? a.email).localeCompare(b.name ?? b.email, "pt-BR");
    });

  const monthly = isPerSeat ? people.length * unitPrice : plan.priceMonthly;
  const proration = seat ? prorateSeat(seat.unitPrice, seat.periodStart, seat.periodEnd) : null;

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
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      {header(`Só você vê esta área — você é o responsável pelo pagamento de ${workspace.name}.`)}

      {/* Organização */}
      <section className="mb-6">
        <div className={cn("bg-card border rounded-2xl p-6", style.border)}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className={cn("p-3 rounded-xl shrink-0", style.bg, style.color)}>
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Organização</p>
                <p className="text-lg font-bold truncate">{workspace.name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={cn("text-sm font-semibold", style.color)}>{plan.name}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", style.bg, style.border, style.color)}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-right">
              <dt className="text-xs text-muted-foreground">Pessoas</dt>
              <dt className="text-xs text-muted-foreground">Departamentos</dt>
              <dd className="text-2xl font-bold">{people.length}</dd>
              <dd className="text-2xl font-bold">{deptRows.length}</dd>
            </dl>
          </div>
        </div>
      </section>

      {/* Quanto paga */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quanto você paga</h2>
        <div className="bg-card border border-border rounded-2xl p-6">
          {seat && seat.activeSubscriptions > 1 && (
            <div className="flex items-start gap-2 mb-5 p-3 rounded-xl bg-red-400/5 border border-red-400/20 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p>
                Existem <strong>{seat.activeSubscriptions} assinaturas ativas</strong> para esta organização — você está sendo cobrado em
                duplicidade. Abra <em>Gerenciar assinatura</em> e cancele a que sobrou.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-3xl font-bold">
                {brl(monthly)}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
              {isPerSeat && (
                <p className="text-sm text-muted-foreground mt-1">
                  {people.length} {people.length === 1 ? "pessoa" : "pessoas"} × {brl(unitPrice)} por pessoa
                </p>
              )}
              {overview.upcoming && (
                <p className="text-xs text-muted-foreground mt-2">
                  Próxima fatura: <strong className="text-foreground">{brl(overview.upcoming.amount)}</strong>
                  {overview.upcoming.date && <> em {formatDate(overview.upcoming.date)}</>}
                  {Math.abs(overview.upcoming.amount - monthly) >= 0.01 && " (já com ajustes de quem entrou ou saiu)"}
                </p>
              )}
              {!hasActiveSub && isPerSeat && (
                <p className="text-xs text-muted-foreground mt-2">Nada é cobrado ainda — o valor acima passa a valer quando você assinar.</p>
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
            </div>
          </div>

          {isPerSeat && (
            <div className="grid sm:grid-cols-2 gap-3 mt-5 pt-5 border-t border-border text-xs text-muted-foreground">
              <p className="flex items-start gap-2">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>
                  <strong className="text-foreground">Entrou no meio do mês?</strong> Paga só os dias que faltam
                  {proration ? ` (hoje: ${proration.daysLeft} de ${proration.totalDays} dias ≈ ${brl(proration.amount)})` : ""}.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span>
                  <strong className="text-foreground">Removeu alguém?</strong> Os dias não usados viram crédito, abatido na próxima fatura.
                </span>
              </p>
            </div>
          )}
          {hasActiveSub && (
            <p className="text-xs text-muted-foreground mt-4">
              Em &quot;Gerenciar assinatura&quot; você altera o cartão, os dados de faturamento (CNPJ, endereço) ou cancela.
            </p>
          )}
        </div>
      </section>

      {otherOrgsCard}

      {/* Pessoas */}
      <section className="mb-6" id="pessoas">
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pessoas {isPerSeat ? "(cada uma é um assento)" : ""}
          </h2>
          <Link href="/settings#membros" className="text-xs text-primary hover:underline">
            Convidar ou mudar papéis
          </Link>
        </div>
        <BillingPeople
          workspaceId={workspace.id}
          currentUserId={userId}
          people={people}
          departments={deptRows}
          seat={
            seat && isPerSeat
              ? {
                  unitPrice: seat.unitPrice,
                  periodStart: seat.periodStart.toISOString(),
                  periodEnd: seat.periodEnd.toISOString(),
                  billedSeats: seat.billedSeats,
                }
              : null
          }
        />
      </section>

      {/* Faturas */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Faturas</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {overview.invoices.length === 0 ? (
            <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <Receipt className="w-4 h-4 shrink-0" />
              {hasActiveSub
                ? "Não foi possível carregar as faturas agora. Elas também ficam em \"Gerenciar assinatura\"."
                : "Nenhuma fatura ainda — elas aparecem aqui depois da primeira cobrança."}
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
  // Vermelho só quando passou do limite; no limite é amarelo (1/1 no plano grátis é o
  // normal de quem usa sozinho, não um alarme).
  const isOver = !isUnlimited && used > limit;
  const isAtOrNear = !isUnlimited && pct >= 80;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{icon}</span>
          <span className="font-medium">{label}</span>
        </div>
        <span className={cn("text-xs font-mono", isOver ? "text-red-400" : isAtOrNear ? "text-yellow-400" : "text-muted-foreground")}>
          {used}
          {unit} / {isUnlimited ? "∞" : `${limit}${unit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 bg-background rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", isOver ? "bg-red-400" : isAtOrNear ? "bg-yellow-400" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

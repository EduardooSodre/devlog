import { db } from "@/lib/db";
import { workspaces, users, workspaceMembers, subscriptions, aiReportUsage } from "@/lib/db/schema";
import { count, eq, desc, inArray } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { PLANS } from "@/lib/plans";
import { getAiReportDailyLimit } from "@/lib/ai-report-limit";
import { todayInBrasilia, addDaysToDateStr } from "@/lib/date-brasilia";
import { Users, Building2, CircleDollarSign, Sparkles, TrendingUp } from "lucide-react";
import { AiLimitForm } from "@/components/admin/AiLimitForm";

async function getEstimatedMrr(): Promise<number> {
  const activeSubs = await db
    .select({ workspaceId: subscriptions.workspaceId })
    .from(subscriptions)
    .where(inArray(subscriptions.status, ["active", "trialing"]));
  if (activeSubs.length === 0) return 0;

  const wsIds = activeSubs.map((s) => s.workspaceId);
  const wsRows = await db
    .select({ id: workspaces.id, plan: workspaces.plan })
    .from(workspaces)
    .where(inArray(workspaces.id, wsIds));

  const memberCounts = await db
    .select({ workspaceId: workspaceMembers.workspaceId, value: count() })
    .from(workspaceMembers)
    .where(inArray(workspaceMembers.workspaceId, wsIds))
    .groupBy(workspaceMembers.workspaceId);
  const membersByWs = new Map(memberCounts.map((m) => [m.workspaceId, m.value]));

  return wsRows.reduce((total, ws) => {
    if (ws.plan === "pro") return total + PLANS.pro.priceMonthly;
    if (ws.plan === "enterprise") return total + PLANS.enterprise.priceMonthly * (membersByWs.get(ws.id) ?? 0);
    return total;
  }, 0);
}

/** Soma das faturas pagas no mês corrente, olhando a conta Stripe inteira (não só um
 * customer) — aproximação simples da receita realmente recebida; se o Stripe não
 * estiver configurado, ou a chamada falhar, mostramos só o MRR estimado.
 * ponytail: 1 página de até 100 faturas — se o volume mensal passar disso, paginar. */
async function getPaidRevenueThisMonth(): Promise<number | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  try {
    const now = new Date();
    const startOfMonth = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
    const stripe = getStripe();
    const invoices = await stripe.invoices.list({
      status: "paid",
      created: { gte: startOfMonth },
      limit: 100,
    });
    return invoices.data.reduce((sum, inv) => sum + inv.total / 100, 0);
  } catch (error) {
    console.error("[admin] getPaidRevenueThisMonth", error);
    return null;
  }
}

async function getAiUsageLast14Days(): Promise<{ day: string; count: number }[]> {
  const today = todayInBrasilia();
  const days = Array.from({ length: 14 }, (_, i) => addDaysToDateStr(today, -(13 - i)));

  const rows = await db
    .select({ usedOn: aiReportUsage.usedOn, value: count() })
    .from(aiReportUsage)
    .where(inArray(aiReportUsage.usedOn, days))
    .groupBy(aiReportUsage.usedOn);
  const byDay = new Map(rows.map((r) => [r.usedOn, r.value]));

  return days.map((day) => ({ day, count: byDay.get(day) ?? 0 }));
}

export default async function AdminPage() {
  const [totalWorkspaces] = await db.select({ value: count() }).from(workspaces);
  const [totalUsers] = await db.select({ value: count() }).from(users);

  const [planCounts, mrr, revenueThisMonth, aiUsage14d, aiDailyLimit] = await Promise.all([
    db.select({ plan: workspaces.plan, value: count() }).from(workspaces).groupBy(workspaces.plan),
    getEstimatedMrr(),
    getPaidRevenueThisMonth(),
    getAiUsageLast14Days(),
    getAiReportDailyLimit(),
  ]);

  const aiUsedToday = aiUsage14d[aiUsage14d.length - 1]?.count ?? 0;
  const aiUsed14d = aiUsage14d.reduce((sum, d) => sum + d.count, 0);
  const maxDayCount = Math.max(1, ...aiUsage14d.map((d) => d.count));

  const workspaceRows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      plan: workspaces.plan,
      createdAt: workspaces.createdAt,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(workspaces)
    .leftJoin(users, eq(workspaces.ownerId, users.id))
    .orderBy(desc(workspaces.createdAt))
    .limit(50);

  const memberCountRows = await db
    .select({ workspaceId: workspaceMembers.workspaceId, value: count() })
    .from(workspaceMembers)
    .groupBy(workspaceMembers.workspaceId);
  const membersByWs = new Map(memberCountRows.map((m) => [m.workspaceId, m.value]));

  const planLabel = (plan: string) => PLANS[plan as keyof typeof PLANS]?.name ?? plan;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">Visão geral do negócio</h1>
        <p className="text-sm text-muted-foreground mt-1">Clientes, receita e uso de IA em toda a plataforma</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Building2} label="Clientes (workspaces)" value={totalWorkspaces.value} color="text-primary" bg="bg-primary/10" />
        <Kpi icon={Users} label="Usuários" value={totalUsers.value} color="text-cyan-500" bg="bg-cyan-500/10" />
        <Kpi
          icon={CircleDollarSign}
          label="MRR estimado"
          value={`R$ ${mrr.toLocaleString("pt-BR")}`}
          color="text-emerald-500"
          bg="bg-emerald-500/10"
        />
        <Kpi
          icon={TrendingUp}
          label="Recebido este mês"
          value={revenueThisMonth === null ? "—" : `R$ ${revenueThisMonth.toLocaleString("pt-BR")}`}
          color="text-amber-500"
          bg="bg-amber-500/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workspaces por plano + tabela */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-4">Workspaces recentes</h2>
          <div className="flex gap-2 mb-4">
            {planCounts.map((p) => (
              <span key={p.plan} className="text-xs px-2.5 py-1 rounded-full bg-background border border-border text-muted-foreground">
                {planLabel(p.plan)}: <strong className="text-foreground">{p.value}</strong>
              </span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="pb-2 font-medium">Nome</th>
                  <th className="pb-2 font-medium">Plano</th>
                  <th className="pb-2 font-medium">Membros</th>
                  <th className="pb-2 font-medium">Dono</th>
                  <th className="pb-2 font-medium">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {workspaceRows.map((ws) => (
                  <tr key={ws.id} className="border-b border-border last:border-0">
                    <td className="py-2 font-medium">{ws.name}</td>
                    <td className="py-2 text-muted-foreground">{planLabel(ws.plan)}</td>
                    <td className="py-2 text-muted-foreground">{membersByWs.get(ws.id) ?? 0}</td>
                    <td className="py-2 text-muted-foreground truncate max-w-[160px]">{ws.ownerName ?? ws.ownerEmail}</td>
                    <td className="py-2 text-muted-foreground">{ws.createdAt.toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* IA */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          <div>
            <h2 className="font-semibold text-sm mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" /> Uso de IA
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              {aiUsedToday} hoje · {aiUsed14d} nos últimos 14 dias
            </p>
            <div className="flex items-end gap-1 h-20">
              {aiUsage14d.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: ${d.count}`}>
                  <div
                    className="w-full rounded-sm bg-primary/70 min-h-[2px]"
                    style={{ height: `${(d.count / maxDayCount) * 100}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <AiLimitForm initialLimit={aiDailyLimit} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center ${color} mb-3`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

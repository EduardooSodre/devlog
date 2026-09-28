import { auth } from "@/lib/auth";
import { Settings, User, CreditCard, Bell, Building2, AlertTriangle, Users, Mail } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getPlanConfig, PLANS } from "@/lib/plans";
import { getActiveWorkspace, isAdminRole } from "@/lib/workspace";
import { isTrialExpired } from "@/lib/org-domain";
import { BillingActions } from "@/components/settings/BillingActions";
import { WorkspaceInvitesForm } from "@/components/settings/WorkspaceInvitesForm";
import { MembersForm } from "@/components/settings/MembersForm";
import { cn, formatDate } from "@/lib/utils";
import { WorkspaceSettingsForm } from "@/components/settings/WorkspaceSettingsForm";
import { ProfileSettingsForm } from "@/components/settings/ProfileSettingsForm";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { DepartmentsForm } from "@/components/settings/DepartmentsForm";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  const userId = session.user.id;

  const ctx = await getActiveWorkspace(userId);
  const workspace = ctx?.workspace ?? null;
  const role = ctx?.membership.role;
  const isOwner = role === "owner";
  const isAdmin = isAdminRole(role);
  const currentPlan = workspace?.plan ?? "free";
  const planConfig = getPlanConfig(currentPlan);
  const isOrgWorkspace = !!workspace?.domain;
  const trialExpired = workspace ? isTrialExpired(workspace) : false;
  const owner = workspace && !isOwner
    ? await db.query.users.findFirst({ where: eq(users.id, workspace.ownerId), columns: { name: true, email: true } })
    : null;
  const ownerName = owner?.name ?? owner?.email ?? "o responsável pelo workspace";

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Configurações</h1>

      {/* Banner de trial de organização */}
      {isOrgWorkspace && workspace?.trialEndsAt && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-2xl border p-4 mb-8",
            trialExpired
              ? "bg-destructive/10 border-destructive/30"
              : "bg-primary/10 border-primary/30"
          )}
        >
          {trialExpired ? (
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          ) : (
            <Building2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">
              {trialExpired
                ? "O trial gratuito da sua organização terminou"
                : `Trial gratuito da organização até ${formatDate(workspace.trialEndsAt)}`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {trialExpired
                ? isOwner
                  ? "Criar novos boards e convidar membros está bloqueado até assinar o plano Enterprise."
                  : `Criar novos boards e convidar membros está bloqueado até ${ownerName} assinar o plano.`
                : "Todo cadastro com o mesmo domínio de e-mail entra automaticamente neste workspace."}
            </p>
          </div>
          {isOwner && (
            <BillingActions
              workspaceId={workspace.id}
              isPro={false}
              plan="enterprise"
              variant="inline"
              label="Assinar Enterprise"
            />
          )}
        </div>
      )}

      {/* Profile section */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Perfil</h2>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <ProfileSettingsForm user={session.user} />
        </div>
      </section>

      {/* Workspace */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Workspace</h2>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          {workspace ? (
            <WorkspaceSettingsForm workspace={workspace} />
          ) : (
            <p className="text-sm text-muted-foreground italic">Nenhum workspace encontrado.</p>
          )}
        </div>
      </section>

      {/* Plan & Billing */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Plano & Billing</h2>
        </div>
        {!isOwner ? (
          <div className="bg-card border border-border rounded-2xl p-5 text-sm text-muted-foreground">
            Você faz parte do plano <strong className="text-foreground">{planConfig.name}</strong> de{" "}
            <strong className="text-foreground">{workspace?.name}</strong>. Você não paga nada — a cobrança
            {currentPlan === "enterprise" ? " (por pessoa)" : ""} é feita para {ownerName}, que é quem gerencia
            o pagamento.
          </div>
        ) : (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{planConfig.name}</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  trialExpired
                    ? "bg-destructive/10 text-destructive"
                    : currentPlan === "pro"
                    ? "bg-primary/10 text-primary"
                    : "bg-card border border-border text-muted-foreground"
                )}>
                  {trialExpired ? "Bloqueado" : currentPlan === "free" ? "Gratuito" : isOrgWorkspace ? "Em trial" : "Ativo"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{planConfig.description}</p>
              {currentPlan === "enterprise" && (
                <p className="text-xs text-primary font-medium mt-1">{planConfig.priceLabel}</p>
              )}
            </div>
            {currentPlan === "free" && (
              <a
                href="/settings/billing"
                className="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Fazer upgrade →
              </a>
            )}
          </div>

          <div className="space-y-2">
            {planConfig.features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-emerald-400">✓</span>
                {f}
              </div>
            ))}
          </div>

          <a href="/settings/billing" className="inline-block mt-4 text-sm text-primary hover:underline">
            Ver quanto pago, faturas e gerenciar pagamento →
          </a>
        </div>
        )}
      </section>

      {workspace && (
        <section className="mb-8" id="membros">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Membros</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <MembersForm
              workspaceId={workspace.id}
              currentUserId={userId}
              canManage={isAdmin}
              seatPrice={currentPlan === "enterprise" ? PLANS.enterprise.priceMonthly : undefined}
            />
          </div>
        </section>
      )}

      {/* Notificações */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Notificações</h2>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <NotificationSettings />
        </div>
      </section>

      {workspace && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Departamentos</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <DepartmentsForm workspaceId={workspace.id} currentUserId={userId} />
          </div>
        </section>
      )}

      {workspace && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Convites</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <WorkspaceInvitesForm workspaceId={workspace.id} canInviteAdmins={isAdmin} />
          </div>
        </section>
      )}

      {/* Danger zone */}
      <section>
        <h2 className="font-semibold text-destructive mb-4">Zona de perigo</h2>
        <div className="bg-card border border-destructive/20 rounded-2xl p-5">
          <p className="text-sm text-muted-foreground mb-4">
            Ações irreversíveis. Tenha certeza antes de prosseguir.
          </p>
          <button className="text-sm text-destructive border border-destructive/30 px-4 py-2 rounded-lg hover:bg-destructive/10 transition-colors">
            Deletar conta
          </button>
        </div>
      </section>
    </div>
  );
}

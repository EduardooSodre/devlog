import { auth } from "@/lib/auth";
import { Settings, User, CreditCard, Bell } from "lucide-react";
import { getPlanConfig } from "@/lib/plans";
import { getActiveWorkspace } from "@/lib/workspace";
import { BillingActions } from "@/components/settings/BillingActions";
import { WorkspaceInvitesForm } from "@/components/settings/WorkspaceInvitesForm";
import { cn } from "@/lib/utils";
import { WorkspaceSettingsForm } from "@/components/settings/WorkspaceSettingsForm";
import { ProfileSettingsForm } from "@/components/settings/ProfileSettingsForm";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  const userId = session.user.id;

  const ctx = await getActiveWorkspace(userId);
  const workspace = ctx?.workspace ?? null;
  const currentPlan = workspace?.plan ?? "free";
  const planConfig = getPlanConfig(currentPlan);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Configurações</h1>

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
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{planConfig.name}</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  currentPlan === "pro"
                    ? "bg-primary/10 text-primary"
                    : "bg-card border border-border text-muted-foreground"
                )}>
                  {currentPlan === "free" ? "Gratuito" : "Ativo"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{planConfig.description}</p>
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

          {currentPlan !== "free" && workspace && (
            <div className="mt-4">
              <BillingActions workspaceId={workspace.id} isPro />
            </div>
          )}
        </div>
      </section>

      {workspace && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Convites</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <WorkspaceInvitesForm workspaceId={workspace.id} />
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

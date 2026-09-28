import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { Sidebar } from "@/components/layout/Sidebar";
import { OnboardingWizard } from "@/components/layout/OnboardingWizard";
import { getUserWorkspaces, getActiveWorkspaceId, getWorkspaceUsage } from "@/lib/workspace";
import { acceptPendingInvitesForUser } from "@/lib/invites";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  // Convite pendente pro e-mail de quem entrou (com identidade verificada) é aceito
  // aqui mesmo, sem a pessoa precisar achar o e-mail e clicar no link.
  await acceptPendingInvitesForUser(session.user.id);

  const memberships = await getUserWorkspaces(session.user.id);
  const activeId = await getActiveWorkspaceId(session.user.id);

  const workspaces = memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    plan: m.workspace.plan,
  }));

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { hasOnboarded: true },
  });

  const activeWorkspaceId = activeId ?? workspaces[0]?.id ?? "";
  const activeMembership = memberships.find((m) => m.workspaceId === activeWorkspaceId);

  // Domínio corporativo + já tem gente além de quem está entrando agora = a pessoa
  // está chegando numa organização que alguém já colocou no ar, não criando do zero.
  let showOrgWelcome = false;
  if (dbUser?.hasOnboarded === false && activeMembership?.workspace.domain) {
    const usage = await getWorkspaceUsage(activeWorkspaceId);
    showOrgWelcome = usage.members > 1;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        isBillingOwner={activeMembership?.role === "owner"}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
      {dbUser?.hasOnboarded === false && (
        <OnboardingWizard
          workspaceId={activeWorkspaceId}
          workspaceName={activeMembership?.workspace.name}
          showOrgWelcome={showOrgWelcome}
        />
      )}
    </div>
  );
}

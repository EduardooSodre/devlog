import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { Sidebar } from "@/components/layout/Sidebar";
import { OnboardingWizard } from "@/components/layout/OnboardingWizard";
import { getUserWorkspaces, getActiveWorkspaceId } from "@/lib/workspace";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar workspaces={workspaces} activeWorkspaceId={activeId ?? workspaces[0]?.id ?? ""} />
      <main className="flex-1 overflow-y-auto">{children}</main>
      {dbUser?.hasOnboarded === false && (
        <OnboardingWizard workspaceId={activeId ?? workspaces[0]?.id ?? ""} />
      )}
    </div>
  );
}

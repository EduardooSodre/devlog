import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar workspaces={workspaces} activeWorkspaceId={activeId ?? workspaces[0]?.id ?? ""} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

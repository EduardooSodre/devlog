import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { ReportGenerator } from "@/components/reports/ReportGenerator";

export const metadata = { title: "Relatórios" };

export default async function RelatoriosPage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");

  const workspaceId = await getActiveWorkspaceId(session.user.id);
  if (!workspaceId) redirect("/dashboard");

  return (
    <div className="p-8">
      <ReportGenerator workspaceId={workspaceId} />
    </div>
  );
}

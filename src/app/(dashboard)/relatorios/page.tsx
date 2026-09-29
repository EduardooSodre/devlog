import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { savedReports } from "@/lib/db/schema";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { ReportGenerator } from "@/components/reports/ReportGenerator";

export const metadata = { title: "Relatórios" };

export default async function RelatoriosPage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");

  const workspaceId = await getActiveWorkspaceId(session.user.id);
  if (!workspaceId) redirect("/dashboard");

  const saved = await db
    .select({
      id: savedReports.id,
      periodStart: savedReports.periodStart,
      periodEnd: savedReports.periodEnd,
      aiUsed: savedReports.aiUsed,
      createdAt: savedReports.createdAt,
    })
    .from(savedReports)
    .where(and(eq(savedReports.userId, session.user.id), eq(savedReports.workspaceId, workspaceId)))
    .orderBy(desc(savedReports.createdAt))
    .limit(50);

  return (
    <div className="p-8">
      <ReportGenerator workspaceId={workspaceId} saved={saved.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />
    </div>
  );
}

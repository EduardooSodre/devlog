import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { NewDocForm } from "@/components/docs/NewDocForm";

export const metadata = { title: "Nova documentação" };

export default async function NewDocPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const workspaceId = await getActiveWorkspaceId(session.user.id);
  if (!workspaceId) redirect("/settings");

  return <NewDocForm workspaceId={workspaceId} />;
}

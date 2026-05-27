import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { docEntries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { EditDocForm } from "@/components/docs/EditDocForm";

export default async function EditDocPage({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const doc = await db.query.docEntries.findFirst({
    where: eq(docEntries.id, docId),
    with: {
      attachments: true,
    },
  });

  if (!doc) notFound();
  if (doc.authorId !== session.user.id) {
    redirect("/docs");
  }

  return <EditDocForm doc={doc} />;
}

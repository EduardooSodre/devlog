import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { docAttachments } from "@/lib/db/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";

const createAttachmentSchema = z.object({
  docId: z.string(),
  type: z.enum(["screenshot", "before", "after"]),
  fileName: z.string(),
  fileUrl: z.string().url(),
  fileKey: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createAttachmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const [attachment] = await db
      .insert(docAttachments)
      .values({
        ...parsed.data,
        uploadedById: session.user.id,
      })
      .returning();

    return NextResponse.json({ success: true, data: attachment });
  } catch (error) {
    console.error("[POST /api/docs/attachments]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }

    const attachment = await db.query.docAttachments.findFirst({
      where: eq(docAttachments.id, id),
    });

    if (!attachment) {
      return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });
    }

    await db
      .delete(docAttachments)
      .where(eq(docAttachments.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/docs/attachments]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

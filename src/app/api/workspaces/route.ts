import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { getUserWorkspaces, getActiveWorkspaceId } from "@/lib/workspace";
import { z } from "zod";
import { nanoid } from "nanoid";

export async function GET() {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const memberships = await getUserWorkspaces(session.user.id);
  const activeId = await getActiveWorkspaceId(session.user.id);

  return NextResponse.json({
    activeWorkspaceId: activeId,
    workspaces: memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      plan: m.workspace.plan,
      role: m.role,
    })),
  });
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const slug = `${parsed.data.name.toLowerCase().replace(/\s+/g, "-")}-${nanoid(6)}`;

    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: parsed.data.name,
        slug,
        ownerId: session.user.id,
        plan: "free",
      })
      .returning();

    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: session.user.id,
      role: "owner",
    });

    return NextResponse.json({ success: true, data: workspace }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/workspaces]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

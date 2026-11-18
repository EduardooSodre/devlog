import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers, subscriptions } from "@/lib/db/schema";
import {
  getUserWorkspaces,
  getActiveWorkspaceId,
  verifyWorkspaceAccess,
  isAdminRole,
  WORKSPACE_COOKIE,
} from "@/lib/workspace";
import { and, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
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
  name: z.string().trim().min(1, "Nome obrigatório").max(100),
  isPublic: z.boolean().optional().default(false),
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
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }

    // Slug só com [a-z0-9-] — acento e símbolo no nome viravam slug quebrado.
    const base = parsed.data.name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const slug = `${base || "workspace"}-${nanoid(6)}`;

    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: parsed.data.name,
        slug,
        ownerId: session.user.id,
        plan: "free",
        isPublic: parsed.data.isPublic,
      })
      .returning();

    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: session.user.id,
      role: "owner",
    });

    // Já entra no workspace novo.
    (await cookies()).set(WORKSPACE_COOKIE, workspace.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ success: true, data: workspace }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/workspaces]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Nome obrigatório").max(100).optional(),
  isPublic: z.boolean().optional(),
});

/** PATCH /api/workspaces — renomeia e/ou muda público/privado (owner/admin). */
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const parsed = updateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }

    const member = await verifyWorkspaceAccess(session.user.id, parsed.data.id);
    if (!isAdminRole(member?.role)) {
      return NextResponse.json({ error: "Só owner ou admin pode renomear o workspace" }, { status: 403 });
    }

    const [workspace] = await db
      .update(workspaces)
      .set({ name: parsed.data.name, isPublic: parsed.data.isPublic, updatedAt: new Date() })
      .where(eq(workspaces.id, parsed.data.id))
      .returning();

    return NextResponse.json({ success: true, data: workspace });
  } catch (error) {
    console.error("[PATCH /api/workspaces]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/** DELETE /api/workspaces?id= — só o owner. Boards, cards etc. vão junto (FK cascade). */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

    const member = await verifyWorkspaceAccess(session.user.id, id);
    if (member?.role !== "owner") {
      return NextResponse.json({ error: "Só o owner pode excluir o workspace" }, { status: 403 });
    }

    // Excluir o workspace apagaria a linha da assinatura mas a Stripe continuaria cobrando.
    const sub = await db.query.subscriptions.findFirst({
      where: and(eq(subscriptions.workspaceId, id), inArray(subscriptions.status, ["active", "trialing", "past_due"])),
    });
    if (sub) {
      return NextResponse.json({ error: "Cancele a assinatura deste workspace antes de excluí-lo" }, { status: 409 });
    }

    await db.delete(workspaces).where(eq(workspaces.id, id));

    // Cookie apontava pro workspace apagado — limpa pra cair no próximo disponível.
    const cookieStore = await cookies();
    if (cookieStore.get(WORKSPACE_COOKIE)?.value === id) cookieStore.delete(WORKSPACE_COOKIE);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/workspaces]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

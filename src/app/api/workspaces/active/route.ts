import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyWorkspaceAccess, WORKSPACE_COOKIE } from "@/lib/workspace";
import { cookies } from "next/headers";
import { z } from "zod";

const schema = z.object({ workspaceId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "workspaceId inválido" }, { status: 400 });
  }

  const member = await verifyWorkspaceAccess(session.user.id, parsed.data.workspaceId);
  if (!member) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, parsed.data.workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ success: true, workspaceId: parsed.data.workspaceId });
}

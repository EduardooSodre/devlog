/**
 * POST /api/auth/verify-email — Confirma o token enviado por e-mail no cadastro por senha.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmailToken } from "@/lib/email-verification";

const schema = z.object({ token: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  const result = await verifyEmailToken(parsed.data.token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

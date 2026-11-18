/**
 * POST /api/auth/password-reset
 *   { email }            → envia o link (sempre 200, não revela se a conta existe)
 *   { token, password }  → troca a senha
 */
import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { requestPasswordReset, resetPassword } from "@/lib/password-reset";

const schema = z.union([
  z.object({ token: z.string().min(1), password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres") }),
  z.object({ email: z.string().email("Email inválido") }),
]);

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  try {
    if ("token" in parsed.data) {
      const result = await resetPassword(parsed.data.token, parsed.data.password);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    } else {
      // Roda depois da resposta: o tempo de resposta é igual com ou sem conta,
      // então não dá pra descobrir quem tem cadastro medindo a latência.
      const email = parsed.data.email.trim();
      after(() => requestPasswordReset(email).catch((err) => console.error("[password-reset]", err)));
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/auth/password-reset]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

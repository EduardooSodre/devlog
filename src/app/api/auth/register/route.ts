/**
 * POST /api/auth/register — Cria novo usuário com email/senha
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { resolveSignupWorkspace } from "@/lib/org-domain";

const registerSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(100),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Verifica se email já existe
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existing) {
      return NextResponse.json(
        { error: "Este email já está cadastrado" },
        { status: 409 }
      );
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Cria usuário
    const [user] = await db
      .insert(users)
      .values({ name, email, password: hashedPassword })
      .returning();

    // Cadastro por e-mail/senha não prova dono do e-mail (sem verificação) — nunca
    // agrupa por domínio aqui, sempre workspace pessoal. Ver nota em resolveSignupWorkspace.
    await resolveSignupWorkspace(user.id, name, email, false);

    return NextResponse.json(
      { success: true, data: { id: user.id, name: user.name, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

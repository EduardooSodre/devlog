/**
 * DevLog — NextAuth v5 Configuration
 *
 * Providers: Credentials (email/senha) + GitHub + Google
 * Adapter: Drizzle (NeonDB)
 * Session: JWT (stateless, ideal para Edge)
 */

import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "./db/schema";
import { z } from "zod";
import { resolveSignupWorkspace } from "./org-domain";

// Schema de validação para login com credentials
const credentialsSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),

  providers: [
    // ── GitHub OAuth ──
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),

    // ── Google OAuth ──
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),

    // ── Email + Senha ──
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (rawCredentials) => {
        // Valida input com Zod
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Busca usuário no banco
        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user || !user.password) return null;

        // Compara senha com hash bcrypt
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],

  // JWT stateless — não usa tabela de sessões
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },

  callbacks: {
    // Adiciona o ID do usuário no token JWT
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    // Expõe o ID na session (client-side)
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  events: {
    // Só dispara para contas criadas via adapter (OAuth) — o cadastro por e-mail/senha
    // insere direto na tabela `users` e nunca passa por aqui. Isso é o que torna seguro
    // agrupar por domínio: GitHub/Google já provaram que o usuário é dono do e-mail.
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      const workspaceName = user.name ?? user.email.split("@")[0];
      await resolveSignupWorkspace(user.id, workspaceName, user.email, true);
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
});

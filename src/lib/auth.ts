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
import { eq, and, isNull } from "drizzle-orm";
import { isEmailVerifiedByProvider } from "./oauth-email";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "./db/schema";
import { z } from "zod";
import { resolveSignupWorkspace } from "./org-domain";
import { authConfig } from "./auth.config";

// Schema de validação para login com credentials
const credentialsSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
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

  events: {
    // Login OAuth (o de credenciais não tem `account` OAuth). Era no `createUser`, que
    // não recebe o perfil do provedor — e tratava "tem conta Google/GitHub" como prova de
    // dono do e-mail. Agora só vale o que o provedor confirma (email_verified / verified).
    async signIn({ user, account, profile, isNewUser }) {
      if (!user.id || !user.email || !account || account.type !== "oauth" && account.type !== "oidc") return;
      try {
        const verified = await isEmailVerifiedByProvider(account, profile, user.email);
        if (verified) {
          await db
            .update(users)
            .set({ emailVerified: new Date() })
            .where(and(eq(users.id, user.id), isNull(users.emailVerified)));
        }

        if (isNewUser) {
          const workspaceName = user.name ?? user.email.split("@")[0];
          await resolveSignupWorkspace(user.id, workspaceName, user.email, verified);
          // A coluna tem default true (pra não afetar quem já existia antes dela existir) —
          // usuário recém-criado via OAuth precisa do onboarding como qualquer outro.
          await db.update(users).set({ hasOnboarded: false }).where(eq(users.id, user.id));
        }
      } catch (error) {
        // Nunca derruba o login por causa disso — no pior caso a pessoa fica sem o
        // agrupamento automático por domínio até o próximo login.
        console.error("[auth.events.signIn]", error);
      }
    },
  },
});

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
import { users, workspaces, workspaceMembers } from "./db/schema";
import { z } from "zod";

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
    // Cria workspace automático quando novo usuário é criado via OAuth
    async createUser({ user }) {
      if (!user.id || !user.email) return;

      const workspaceName = user.name ?? user.email.split("@")[0];
      const slug = workspaceName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 32);

      // Cria workspace pessoal
      const [workspace] = await db
        .insert(workspaces)
        .values({
          name: `${workspaceName}'s Workspace`,
          slug: `${slug}-${user.id.slice(0, 6)}`,
          ownerId: user.id,
          plan: "free",
        })
        .returning();

      // Adiciona owner como membro
      await db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user.id,
        role: "owner",
      });
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
});

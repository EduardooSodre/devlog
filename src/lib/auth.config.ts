/**
 * DevLog — Config Auth.js compatível com Edge (usada pelo middleware)
 *
 * Sem adapter, sem providers que tocam banco/bcrypt — isso é o que mantém o
 * bundle do middleware abaixo do limite de 1 MB da Vercel. A config completa
 * (com DrizzleAdapter, GitHub/Google/Credentials) fica em auth.ts, que roda
 * em runtime Node (rotas de API), nunca no Edge.
 */

import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [],
} satisfies NextAuthConfig;

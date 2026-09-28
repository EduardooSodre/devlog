/**
 * DevLog — Middleware de Autenticação
 *
 * Rotas públicas: /, /login, /register
 * Rotas protegidas: /dashboard, /projetos, /docs, /settings, /api/*
 */

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Instância Edge-only, sem adapter/db/bcrypt — só checa a sessão via JWT do
// cookie. A instância completa (auth.ts) roda nas rotas de API, em Node.
const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = ["/", "/login", "/register", "/api/workspaces/invites/accept"];
// Prefixos que se autenticam por conta própria: token no link (convite, verificação de
// e-mail), assinatura do Stripe (webhooks) ou CRON_SECRET (cron). Passar pelo redirect
// pro /login aqui quebrava esses fluxos — o cron, por exemplo, nunca rodava.
const PUBLIC_PREFIXES = ["/api/auth", "/api/webhooks/", "/api/cron/", "/invite/", "/verify-email/"];
const AUTH_ROUTES = ["/login", "/register"]; // redireciona para /dashboard se já logado

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session;
  const isPublicRoute =
    PUBLIC_ROUTES.includes(nextUrl.pathname) ||
    PUBLIC_PREFIXES.some((prefix) => nextUrl.pathname.startsWith(prefix));
  const isAuthRoute = AUTH_ROUTES.includes(nextUrl.pathname);

  // Já logado tentando acessar /login ou /register → redireciona (respeitando o
  // callbackUrl, pra quem veio de um link de convite voltar pra ele).
  if (isAuthRoute && isLoggedIn) {
    const callbackUrl = nextUrl.searchParams.get("callbackUrl");
    const target = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/dashboard";
    return NextResponse.redirect(new URL(target, nextUrl));
  }

  // Rota protegida sem sessão → redireciona para /login
  if (!isPublicRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Aplica middleware em todas as rotas exceto assets estáticos e _next
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};

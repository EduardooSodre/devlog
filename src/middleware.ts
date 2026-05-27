/**
 * DevLog — Middleware de Autenticação
 *
 * Rotas públicas: /, /login, /register
 * Rotas protegidas: /dashboard, /kanban, /docs, /settings, /api/*
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/register"];
const AUTH_ROUTES = ["/login", "/register"]; // redireciona para /dashboard se já logado

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session;
  const isPublicRoute = PUBLIC_ROUTES.includes(nextUrl.pathname) || nextUrl.pathname.startsWith("/api/auth");
  const isAuthRoute = AUTH_ROUTES.includes(nextUrl.pathname);

  // Já logado tentando acessar /login ou /register → redireciona para dashboard
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
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

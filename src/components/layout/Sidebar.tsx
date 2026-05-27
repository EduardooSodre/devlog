"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BookOpen,
  LayoutDashboard,
  Kanban,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  Plus,
  User,
  CreditCard,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { WorkspaceSwitcher, type WorkspaceOption } from "@/components/layout/WorkspaceSwitcher";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kanban", href: "/kanban", icon: Kanban },
  { label: "Documentação", href: "/docs", icon: FileText },
];

const bottomItems = [
  { label: "Configurações", href: "/settings", icon: Settings },
  { label: "Plano & Billing", href: "/settings/billing", icon: CreditCard },
];

interface SidebarProps {
  workspaces?: WorkspaceOption[];
  activeWorkspaceId?: string;
}

export function Sidebar({ workspaces = [], activeWorkspaceId = "" }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full bg-card border-r border-border transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* ── Logo ── */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-border",
          collapsed && "justify-center px-0"
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-sm tracking-tight truncate">DevLog</span>
        )}
      </div>

      <WorkspaceSwitcher
        workspaces={workspaces}
        activeId={activeWorkspaceId}
        collapsed={collapsed}
      />

      {/* ── Collapse toggle ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-primary/10 transition-colors z-10"
      >
        <ChevronLeft
          className={cn(
            "w-3 h-3 text-muted-foreground transition-transform duration-300",
            collapsed && "rotate-180"
          )}
        />
      </button>

      {/* ── Nav items ── */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-3">
            Menu
          </p>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm transition-all duration-200 group",
                collapsed && "justify-center px-0",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-card"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isActive ? "text-primary" : "group-hover:text-foreground"
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* Quick add */}
        {!collapsed && (
          <div className="pt-3 border-t border-border mt-3">
            <Link
              href="/docs/new"
              className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova documentação
            </Link>
          </div>
        )}
      </nav>

      {/* ── Bottom items ── */}
      <div className="px-2 pb-2 border-t border-border pt-2 space-y-1">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}

        {/* User */}
        <div
          className={cn(
            "flex items-center gap-3 px-2 py-3 rounded-lg border border-border mt-2",
            collapsed && "justify-center px-0"
          )}
        >
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
            {session?.user?.name
              ? initials(session.user.name)
              : <User className="w-3.5 h-3.5" />}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{session?.user?.name ?? "Usuário"}</p>
                <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Sair"
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

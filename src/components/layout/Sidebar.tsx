"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BookOpen,
  LayoutDashboard,
  Kanban,
  FileText,
  Settings,
  ChevronLeft,
  Plus,
  User,
  CreditCard,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { WorkspaceSwitcher, type WorkspaceOption } from "@/components/layout/WorkspaceSwitcher";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ProfileModal } from "@/components/layout/ProfileModal";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projetos", href: "/projetos", icon: Kanban },
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
  const [showProfile, setShowProfile] = useState(false);
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  function openProfile() {
    setShowProfile(true);
    fetch("/api/me")
      .then((res) => res.json())
      .then((json) => setJobTitle(json.user?.jobTitle ?? null))
      .catch(() => {});
  }

  // Restaura a preferência salva — sem isso, o sidebar volta a expandir a cada
  // refresh e o usuário tem que recolher de novo toda hora.
  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      localStorage.setItem("sidebar-collapsed", v ? "0" : "1");
      return !v;
    });
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full bg-card border-r border-border transition-all duration-300",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      {/* ── Logo ── */}
      <div className={cn("flex items-center gap-2.5 px-5 py-5", collapsed && "justify-center px-0")}>
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <BookOpen className="w-3.5 h-3.5 text-white" />
        </div>
        {!collapsed && <span className="font-semibold text-sm tracking-tight truncate">DevLog</span>}
      </div>

      <WorkspaceSwitcher workspaces={workspaces} activeId={activeWorkspaceId} collapsed={collapsed} />

      {/* ── Collapse toggle ── */}
      <button
        onClick={toggleCollapsed}
        title={collapsed ? "Expandir menu" : "Recolher menu"}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary/40 transition-colors z-10 shadow-sm"
      >
        <ChevronLeft
          className={cn(
            "w-3 h-3 text-muted-foreground transition-transform duration-300",
            collapsed && "rotate-180"
          )}
        />
      </button>

      {/* ── Nav items ── */}
      <nav className={cn("flex-1 py-4 overflow-y-auto overflow-x-hidden min-w-0", collapsed ? "px-2 space-y-2" : "px-3 space-y-0.5")}>
        <div className={cn("mb-4", collapsed ? "px-0" : "px-1")}>
          <CommandPalette workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} hideTrigger={collapsed} />
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          if (collapsed) {
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full min-w-0 py-2.5 rounded-xl text-center transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-background"
                )}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="w-full text-[10px] font-medium leading-tight line-clamp-2 break-words px-0.5">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-background"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0 transition-colors", active ? "text-primary" : "group-hover:text-foreground")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        {/* Quick add */}
        {!collapsed && (
          <div className="pt-3 mt-3 border-t border-border">
            <Link
              href="/docs/new"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova documentação
            </Link>
          </div>
        )}
      </nav>

      {/* ── Bottom items ── */}
      <div className={cn("pb-3 pt-2 border-t border-border", collapsed ? "px-2 space-y-2" : "px-3 space-y-0.5")}>
        <ThemeToggle collapsed={collapsed} />
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          if (collapsed) {
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full min-w-0 py-2.5 rounded-xl text-center transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-background"
                )}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="w-full text-[10px] font-medium leading-tight line-clamp-2 break-words px-0.5">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-background"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {/* User */}
        <button
          onClick={openProfile}
          title="Ver perfil"
          className={cn(
            "flex items-center gap-3 pt-2 mt-2 w-full rounded-lg hover:bg-background transition-colors text-left",
            collapsed ? "flex-col px-0 py-2" : "px-3 py-2"
          )}
        >
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-semibold text-primary overflow-hidden">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" className="w-full h-full object-cover" />
            ) : session?.user?.name ? (
              initials(session.user.name)
            ) : (
              <User className="w-3.5 h-3.5" />
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{session?.user?.name ?? "Usuário"}</p>
              <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
            </div>
          )}
        </button>
      </div>

      {showProfile && (
        <ProfileModal
          user={{ ...session?.user, jobTitle }}
          workspaceName={activeWorkspace?.name}
          onClose={() => setShowProfile(false)}
        />
      )}
    </aside>
  );
}

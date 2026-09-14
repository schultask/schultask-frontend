"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, BookOpen, Hammer } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { isManagerOrAdmin } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type NavKey = "dashboard" | "courses" | "builder";

const NAV_ITEMS: { key: NavKey; href: string; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "courses", href: "/courses", label: "My courses", icon: BookOpen },
  { key: "builder", href: "/admin/courses", label: "Builder", icon: Hammer },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

// Persistent icon+label sidebar (PLAN.md section 11 asked for this from day one;
// the app shipped through Phase 7 with a thin top nav instead — this replaces it).
// Collapses to an icon-only rail below `lg` via breakpoint classes, not JS state.
export function AppShell({ active, children }: { active: NavKey; children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const showAdminNav = isManagerOrAdmin(user);

  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-16 shrink-0 flex-col border-r border-border bg-card lg:w-56">
        <div className="flex h-16 items-center justify-center px-2 lg:justify-start lg:px-6">
          <span className="hidden font-logo text-xl text-foreground lg:inline">Schultask</span>
          <span className="font-logo text-xl text-foreground lg:hidden">S</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-2 py-2 lg:px-3">
          {NAV_ITEMS.filter((item) => item.key === "courses" || showAdminNav).map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center justify-center gap-3 rounded-md border-l-2 border-transparent px-2 py-2 text-sm font-medium transition-colors lg:justify-start lg:px-3",
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" strokeWidth={1.75} />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="flex flex-col gap-3 border-t border-border p-3">
            <div className="flex items-center justify-center gap-2 lg:justify-start">
              <Avatar size="sm">
                <AvatarFallback className="bg-secondary font-medium text-secondary-foreground">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden truncate text-sm text-muted-foreground lg:inline">{user.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="justify-center lg:justify-start"
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
            >
              Log out
            </Button>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

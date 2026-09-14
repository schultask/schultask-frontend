"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { isManagerOrAdmin } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type NavKey = "dashboard" | "courses" | "builder";

const NAV_ITEMS: { key: NavKey; href: string; label: string }[] = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard" },
  { key: "courses", href: "/courses", label: "My courses" },
  { key: "builder", href: "/admin/courses", label: "Builder" },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function AppHeader({ active }: { active: NavKey }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const showAdminNav = isManagerOrAdmin(user);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-6">
      <div className="flex items-center gap-8">
        <span className="font-logo text-xl text-foreground">Schultask</span>
        <nav className="flex items-center gap-1 text-sm">
          {NAV_ITEMS.filter((item) => item.key === "courses" || showAdminNav).map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium transition-colors",
                active === item.key
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarFallback className="bg-secondary font-medium text-secondary-foreground">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{user.name}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          Log out
        </Button>
      </div>
    </header>
  );
}

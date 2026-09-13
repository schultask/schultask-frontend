import type { AuthUser } from "@/types/shared";

// Frontend-only UX gating (hide/show nav, redirect away from /dashboard) —
// the actual security boundary is the backend's `analytics:view_org` CASL
// check, which a learner will hit and get a 403 from regardless of this.
export function isManagerOrAdmin(user: AuthUser | null): boolean {
  return user?.userRoles.some((ur) => ur.role.name === "admin" || ur.role.name === "manager") ?? false;
}

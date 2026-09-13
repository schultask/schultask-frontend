"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AnalyticsOrgOverview } from "@/types/shared";
import { useAuth } from "@/lib/auth-context";
import { isManagerOrAdmin } from "@/lib/roles";
import { RequireAuth } from "@/components/require-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { DauChart } from "@/components/analytics/dau-chart";
import { CompletionChart } from "@/components/analytics/completion-chart";

function formatPct(n: number): string {
  return `${Math.round(n)}%`;
}

function DashboardContent() {
  const { user, authFetch, logout } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<AnalyticsOrgOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    return authFetch<AnalyticsOrgOverview>("/analytics/org-overview")
      .then(setOverview)
      .catch(() => setError("Couldn't load analytics. Try refreshing the page."));
  }, [authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const runRollup = async () => {
    setRefreshing(true);
    try {
      await authFetch("/analytics/rollup", { method: "POST" });
      await load();
    } catch {
      setError("Couldn't refresh analytics right now.");
    } finally {
      setRefreshing(false);
    }
  };

  const hasAnyData = overview && (overview.dau.length > 0 || overview.courseCompletion.length > 0);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-6">
          <h1 className="font-display text-xl text-foreground">Schultask</h1>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="font-medium text-accent">
              Dashboard
            </Link>
            <Link href="/courses" className="text-foreground/60 hover:text-foreground">
              My courses
            </Link>
            <Link href="/admin/courses" className="text-foreground/60 hover:text-foreground">
              Builder
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-foreground/60">{user?.name}</span>
          <Button
            variant="ghost"
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
          >
            Log out
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-foreground">Analytics</h2>
            <p className="mt-1 text-sm text-foreground/60">Org-wide activity and course completion.</p>
          </div>
          <Button variant="secondary" onClick={runRollup} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh analytics"}
          </Button>
        </div>

        {error && <p className="mt-8 text-sm text-danger">{error}</p>}

        {!error && overview === null && <p className="mt-8 text-sm text-foreground/50">Loading…</p>}

        {overview !== null && !hasAnyData && (
          <Card className="mt-8 flex flex-col items-center gap-2 p-10 text-center">
            <p className="text-sm font-medium text-foreground">No analytics yet</p>
            <p className="text-sm text-foreground/60">
              Rollups run nightly. If learners have already been active today, refresh now to see numbers
              immediately.
            </p>
            <Button className="mt-2" onClick={runRollup} disabled={refreshing}>
              {refreshing ? "Refreshing…" : "Refresh analytics"}
            </Button>
          </Card>
        )}

        {overview !== null && hasAnyData && (
          <div className="mt-8 flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard hero label="Active learners today" value={String(overview.activeLearners)} className="sm:col-span-1" />
              <KpiCard label="Completion rate" value={formatPct(overview.completionRate)} />
              <KpiCard label="Courses in progress" value={String(overview.coursesInProgress)} />
            </div>

            <Card className="p-6">
              <h3 className="text-sm font-medium text-foreground">Daily active learners</h3>
              <p className="text-xs text-foreground/50">Last 30 days</p>
              <div className="mt-4">
                <DauChart data={overview.dau} />
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium text-foreground">Enrollment vs. completion by course</h3>
              <div className="mt-4">
                <CompletionChart data={overview.courseCompletion} />
              </div>
            </Card>

            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-foreground/60">
                    <th className="px-4 py-3 font-medium">Course</th>
                    <th className="px-4 py-3 font-medium">Enrolled</th>
                    <th className="px-4 py-3 font-medium">Completed</th>
                    <th className="px-4 py-3 font-medium">Avg. progress</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.courseCompletion.map((row) => (
                    <tr key={row.courseId} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-foreground">{row.title}</td>
                      <td className="px-4 py-3 text-foreground/80">{row.enrolledCount}</td>
                      <td className="px-4 py-3 text-foreground/80">{row.completedCount}</td>
                      <td className="px-4 py-3 text-foreground/80">{formatPct(row.avgProgressPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function NoAccess() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm font-medium text-foreground">This page is for admins and managers</p>
      <p className="max-w-sm text-sm text-foreground/60">
        You don&rsquo;t have access to org analytics. Head back to your courses instead.
      </p>
      <Link href="/courses" className="text-sm text-accent hover:underline">
        Go to my courses
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <RoleGate />
    </RequireAuth>
  );
}

function RoleGate() {
  const { user } = useAuth();
  return isManagerOrAdmin(user) ? <DashboardContent /> : <NoAccess />;
}

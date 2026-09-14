"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { AnalyticsOrgOverview } from "@/types/shared";
import { useAuth } from "@/lib/auth-context";
import { isManagerOrAdmin } from "@/lib/roles";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { DauChart } from "@/components/analytics/dau-chart";
import { CompletionChart } from "@/components/analytics/completion-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatPct(n: number): string {
  return `${Math.round(n)}%`;
}

function DashboardContent() {
  const { authFetch } = useAuth();
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
    <AppShell active="dashboard">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">Org-wide activity and course completion.</p>
          </div>
          <Button variant="secondary" onClick={runRollup} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh analytics"}
          </Button>
        </div>

        {error && <p className="mt-8 text-sm text-destructive">{error}</p>}

        {!error && overview === null && (
          <div className="mt-8 flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="p-6">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="mt-3 h-9 w-16 animate-pulse rounded bg-muted" />
                </Card>
              ))}
            </div>
            <div className="h-64 animate-pulse rounded-xl bg-muted" />
          </div>
        )}

        {overview !== null && !hasAnyData && (
          <Card className="mt-8 flex flex-col items-center gap-2 p-10 text-center">
            <p className="text-sm font-medium text-foreground">No analytics yet</p>
            <p className="text-sm text-muted-foreground">
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

            <Card>
              <CardHeader>
                <CardTitle>Daily active learners</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <DauChart data={overview.dau} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Enrollment vs. completion by course</CardTitle>
              </CardHeader>
              <CardContent>
                <CompletionChart data={overview.courseCompletion} />
              </CardContent>
            </Card>

            <Card className="overflow-hidden py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 py-3">Course</TableHead>
                    <TableHead className="px-4 py-3">Enrolled</TableHead>
                    <TableHead className="px-4 py-3">Completed</TableHead>
                    <TableHead className="px-4 py-3">Avg. progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.courseCompletion.map((row) => (
                    <TableRow key={row.courseId}>
                      <TableCell className="px-4 py-3 font-normal whitespace-normal text-foreground">
                        {row.title}
                      </TableCell>
                      <TableCell className="px-4 py-3 tabular-nums text-foreground/80">{row.enrolledCount}</TableCell>
                      <TableCell className="px-4 py-3 tabular-nums text-foreground/80">{row.completedCount}</TableCell>
                      <TableCell className="px-4 py-3 tabular-nums text-foreground/80">
                        {formatPct(row.avgProgressPct)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function NoAccess() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm font-medium text-foreground">This page is for admins and managers</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        You don&rsquo;t have access to org analytics. Head back to your courses instead.
      </p>
      <Link href="/courses" className="text-sm text-primary hover:underline">
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

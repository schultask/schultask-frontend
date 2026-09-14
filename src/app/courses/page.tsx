"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Enrollment } from "@/types/shared";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/require-auth";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/progress";
import { CourseCover } from "@/components/course-cover";
import { ContinueLearningHero } from "@/components/continue-learning-hero";

function CoursesPageContent() {
  const { authFetch, user } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch<Enrollment[]>("/enrollments/me")
      .then(setEnrollments)
      .catch(() => setError("Couldn't load your courses. Try refreshing the page."));
  }, [authFetch]);

  const hasFeatured =
    enrollments?.some((e) => e.status === "in_progress" || e.status === "not_started") ?? false;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader active="courses" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {enrollments !== null && enrollments.length === 0
            ? "Your assigned courses will show up here."
            : enrollments !== null && !hasFeatured
              ? "You're all caught up — nice work."
              : "Here's where you left off."}
        </p>

        {error && <p className="mt-8 text-sm text-destructive">{error}</p>}

        {!error && enrollments === null && (
          <>
            <Card className="mt-8 flex-row items-stretch overflow-hidden py-0">
              <div className="h-40 w-48 shrink-0 animate-pulse bg-muted" />
              <div className="flex flex-1 flex-col justify-center gap-3 p-6">
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-2 w-40 animate-pulse rounded-full bg-muted" />
              </div>
            </Card>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="overflow-hidden py-0">
                  <div className="h-28 w-full animate-pulse bg-muted" />
                  <div className="flex flex-col gap-3 p-4">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {enrollments !== null && enrollments.length === 0 && (
          <Card className="mt-8 flex flex-col items-center gap-2 p-10 text-center">
            <p className="text-sm font-medium text-foreground">Nothing assigned yet</p>
            <p className="text-sm text-muted-foreground">
              When your manager assigns you a course, it&rsquo;ll show up here.
            </p>
          </Card>
        )}

        {hasFeatured && (
          <div className="mt-8">
            <ContinueLearningHero enrollments={enrollments ?? []} />
          </div>
        )}

        {enrollments !== null && enrollments.length > 0 && (
          <div className={hasFeatured ? "mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" : "mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
            {enrollments.map((enrollment) => (
              <Card
                key={enrollment.id}
                className="cursor-pointer overflow-hidden py-0 transition-colors hover:border-primary/50"
                onClick={() => router.push(`/courses/${enrollment.id}`)}
              >
                <CourseCover id={enrollment.course.id} className="flex h-28 w-full items-center justify-center" />
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-foreground">{enrollment.course.title}</h3>
                    <StatusBadge status={enrollment.status}>{enrollment.status.replace("_", " ")}</StatusBadge>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Progress value={enrollment.progressPct} />
                    <p className="text-xs text-muted-foreground">{enrollment.progressPct}% complete</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function CoursesPage() {
  return (
    <RequireAuth>
      <CoursesPageContent />
    </RequireAuth>
  );
}

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

function CoursesPageContent() {
  const { authFetch } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch<Enrollment[]>("/enrollments/me")
      .then(setEnrollments)
      .catch(() => setError("Couldn't load your courses. Try refreshing the page."));
  }, [authFetch]);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader active="courses" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">My courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">Courses assigned to you, and your progress on each.</p>

        {error && <p className="mt-8 text-sm text-destructive">{error}</p>}

        {!error && enrollments === null && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        )}

        {enrollments !== null && enrollments.length === 0 && (
          <Card className="mt-8 flex flex-col items-center gap-2 p-10 text-center">
            <p className="text-sm font-medium text-foreground">Nothing assigned yet</p>
            <p className="text-sm text-muted-foreground">
              When your manager assigns you a course, it&rsquo;ll show up here.
            </p>
          </Card>
        )}

        {enrollments !== null && enrollments.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

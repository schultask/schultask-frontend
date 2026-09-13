"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Enrollment } from "@/types/shared";
import { useAuth } from "@/lib/auth-context";
import { isManagerOrAdmin } from "@/lib/roles";
import { RequireAuth } from "@/components/require-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CourseCover } from "@/components/course-cover";
import { Button } from "@/components/ui/button";

function CoursesPageContent() {
  const { user, authFetch, logout } = useAuth();
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
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-6">
          <h1 className="font-display text-xl text-foreground">Schultask</h1>
          {isManagerOrAdmin(user) && (
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="text-foreground/60 hover:text-foreground">
                Dashboard
              </Link>
              <Link href="/courses" className="font-medium text-accent">
                My courses
              </Link>
              <Link href="/admin/courses" className="text-foreground/60 hover:text-foreground">
                Builder
              </Link>
            </nav>
          )}
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
        <h2 className="font-display text-2xl text-foreground">My courses</h2>
        <p className="mt-1 text-sm text-foreground/60">Courses assigned to you, and your progress on each.</p>

        {error && <p className="mt-8 text-sm text-danger">{error}</p>}

        {!error && enrollments === null && (
          <p className="mt-8 text-sm text-foreground/50">Loading…</p>
        )}

        {enrollments !== null && enrollments.length === 0 && (
          <Card className="mt-8 flex flex-col items-center gap-2 p-10 text-center">
            <p className="text-sm font-medium text-foreground">Nothing assigned yet</p>
            <p className="text-sm text-foreground/60">
              When your manager assigns you a course, it&rsquo;ll show up here.
            </p>
          </Card>
        )}

        {enrollments !== null && enrollments.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((enrollment) => (
              <Card
                key={enrollment.id}
                className="cursor-pointer overflow-hidden transition-colors hover:border-accent/50"
                onClick={() => router.push(`/courses/${enrollment.id}`)}
              >
                <CourseCover id={enrollment.course.id} className="flex h-28 w-full items-center justify-center" />
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-foreground">{enrollment.course.title}</h3>
                    <Badge status={enrollment.status}>{enrollment.status.replace("_", " ")}</Badge>
                  </div>
                  <ProgressBar value={enrollment.progressPct} />
                  <p className="text-xs text-foreground/50">{enrollment.progressPct}% complete</p>
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

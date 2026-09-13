"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Course } from "@/types/shared";
import { useAuth } from "@/lib/auth-context";
import { isManagerOrAdmin } from "@/lib/roles";
import { RequireAuth } from "@/components/require-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseCover } from "@/components/course-cover";

function BuilderContent() {
  const { user, authFetch, logout } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch<Course[]>("/courses")
      .then(setCourses)
      .catch(() => setError("Couldn't load courses. Try refreshing the page."));
  }, [authFetch]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-6">
          <h1 className="font-display text-xl text-foreground">Schultask</h1>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-foreground/60 hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/courses" className="text-foreground/60 hover:text-foreground">
              My courses
            </Link>
            <Link href="/admin/courses" className="font-medium text-accent">
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
            <h2 className="font-display text-2xl text-foreground">Course builder</h2>
            <p className="mt-1 text-sm text-foreground/60">Every course in your org, draft or published.</p>
          </div>
          <Button onClick={() => router.push("/admin/courses/new")}>New course</Button>
        </div>

        {error && <p className="mt-8 text-sm text-danger">{error}</p>}
        {!error && courses === null && <p className="mt-8 text-sm text-foreground/50">Loading…</p>}

        {courses !== null && courses.length === 0 && (
          <Card className="mt-8 flex flex-col items-center gap-2 p-10 text-center">
            <p className="text-sm font-medium text-foreground">No courses yet</p>
            <p className="text-sm text-foreground/60">Create one manually, or generate a draft with AI.</p>
            <Button className="mt-2" onClick={() => router.push("/admin/courses/new")}>
              New course
            </Button>
          </Card>
        )}

        {courses !== null && courses.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link key={course.id} href={`/admin/courses/${course.id}`}>
                <Card className="overflow-hidden transition-colors hover:border-accent/50">
                  <CourseCover id={course.id} className="flex h-28 w-full items-center justify-center" />
                  <div className="flex flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="line-clamp-1 text-sm font-medium text-foreground">{course.title}</h3>
                      <Badge status={course.status}>{course.status}</Badge>
                    </div>
                    {course.aiGenerated && (
                      <span className="w-fit rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                        AI generated
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
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
        You don&rsquo;t have access to the course builder. Head back to your courses instead.
      </p>
      <Link href="/courses" className="text-sm text-accent hover:underline">
        Go to my courses
      </Link>
    </div>
  );
}

export default function AdminCoursesPage() {
  return (
    <RequireAuth>
      <RoleGate />
    </RequireAuth>
  );
}

function RoleGate() {
  const { user } = useAuth();
  return isManagerOrAdmin(user) ? <BuilderContent /> : <NoAccess />;
}

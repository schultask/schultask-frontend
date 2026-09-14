"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Course } from "@/types/shared";
import { useAuth } from "@/lib/auth-context";
import { isManagerOrAdmin } from "@/lib/roles";
import { RequireAuth } from "@/components/require-auth";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseCover } from "@/components/course-cover";
import { Plus } from "lucide-react";

function BuilderContent() {
  const { authFetch } = useAuth();
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
      <AppHeader active="builder" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Course builder</h1>
            <p className="mt-1 text-sm text-muted-foreground">Every course in your org, draft or published.</p>
          </div>
          <Button onClick={() => router.push("/admin/courses/new")}>
            <Plus />
            New course
          </Button>
        </div>

        {error && <p className="mt-8 text-sm text-destructive">{error}</p>}

        {!error && courses === null && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="overflow-hidden py-0">
                <div className="h-28 w-full animate-pulse bg-muted" />
                <div className="flex flex-col gap-2 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {courses !== null && courses.length === 0 && (
          <Card className="mt-8 flex flex-col items-center gap-2 p-10 text-center">
            <p className="text-sm font-medium text-foreground">No courses yet</p>
            <p className="text-sm text-muted-foreground">Create one manually, or generate a draft with AI.</p>
            <Button className="mt-2" onClick={() => router.push("/admin/courses/new")}>
              <Plus />
              New course
            </Button>
          </Card>
        )}

        {courses !== null && courses.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link key={course.id} href={`/admin/courses/${course.id}`}>
                <Card className="overflow-hidden py-0 transition-colors hover:border-primary/50">
                  <CourseCover id={course.id} className="flex h-28 w-full items-center justify-center" />
                  <div className="flex flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="line-clamp-1 text-sm font-medium text-foreground">{course.title}</h3>
                      <StatusBadge status={course.status}>{course.status}</StatusBadge>
                    </div>
                    {course.aiGenerated && (
                      <Badge variant="outline" className="w-fit border-primary/30 bg-primary/10 text-primary">
                        AI generated
                      </Badge>
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
      <p className="max-w-sm text-sm text-muted-foreground">
        You don&rsquo;t have access to the course builder. Head back to your courses instead.
      </p>
      <Link href="/courses" className="text-sm text-primary hover:underline">
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

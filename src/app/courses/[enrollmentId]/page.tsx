"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Enrollment, EnrollmentWithCourseDetail, Lesson } from "@/types/shared";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/require-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CONTENT_LABEL: Record<Lesson["contentType"], string> = {
  video: "Open video",
  text: "Read",
  quiz: "Take quiz",
  file: "Download file",
};

// Text lessons (including every AI-generated one) carry their content in
// contentJson.body rather than a fetchable contentUrl — narrowed locally
// here rather than widening the shared Lesson["contentJson"]: unknown type.
function getTextBody(lesson: Lesson): string | null {
  if (lesson.contentType !== "text") return null;
  const json = lesson.contentJson;
  if (json && typeof json === "object" && "body" in json && typeof json.body === "string") {
    return json.body;
  }
  return null;
}

function PlayerContent() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const { authFetch } = useAuth();
  const router = useRouter();

  const [enrollment, setEnrollment] = useState<EnrollmentWithCourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  // Which lessons are checked off in this session — there's no per-lesson
  // completion table in the schema (only Enrollment.progressPct), so a
  // returning learner mid-course starts with nothing checked here even
  // though their overall percentage is preserved. Documented in PROGRESS.md.
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const lessons = useMemo(
    () => enrollment?.course.modules.flatMap((m) => m.lessons) ?? [],
    [enrollment],
  );
  const activeLesson = lessons.find((l) => l.id === activeLessonId) ?? lessons[0] ?? null;

  useEffect(() => {
    let cancelled = false;
    authFetch<EnrollmentWithCourseDetail>(`/enrollments/${enrollmentId}/course`)
      .then((data) => {
        if (cancelled) return;
        setEnrollment(data);
        if (data.progressPct >= 100) {
          setCompletedLessonIds(new Set(data.course.modules.flatMap((m) => m.lessons.map((l) => l.id))));
        }
        // Only the first open should count — status flips off "not_started"
        // the moment any progress is recorded, so this can't re-fire on
        // every later visit and pollute Phase 7's DAU/completion rollups.
        if (data.status === "not_started") {
          void authFetch("/events", {
            method: "POST",
            body: { verb: "course_started", objectType: "course", objectId: data.course.id },
          }).catch(() => {});
        }
      })
      .catch(() => !cancelled && setError("Couldn't load this course. It may not be assigned to you."));
    return () => {
      cancelled = true;
    };
  }, [authFetch, enrollmentId]);

  async function markComplete(lesson: Lesson) {
    if (!enrollment || saving) return;
    setSaving(true);
    try {
      const nextCompleted = new Set(completedLessonIds);
      nextCompleted.add(lesson.id);
      const progressPct = Math.round((nextCompleted.size / lessons.length) * 100);

      await authFetch("/events", {
        method: "POST",
        body: { verb: "lesson_completed", objectType: "lesson", objectId: lesson.id },
      });
      const updated = await authFetch<Enrollment>(`/enrollments/${enrollmentId}/progress`, {
        method: "PATCH",
        body: { progressPct },
      });
      if (progressPct >= 100 && enrollment.status !== "completed") {
        await authFetch("/events", {
          method: "POST",
          body: { verb: "course_completed", objectType: "course", objectId: enrollment.course.id },
        });
      }

      setCompletedLessonIds(nextCompleted);
      setEnrollment({ ...enrollment, progressPct: updated.progressPct, status: updated.status });
    } catch {
      setError("Couldn't save your progress. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-danger">{error}</p>
        <Button variant="secondary" onClick={() => router.push("/courses")}>
          Back to my courses
        </Button>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-foreground/50">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <button
            className="text-xs text-foreground/50 hover:text-foreground"
            onClick={() => router.push("/courses")}
          >
            &larr; My courses
          </button>
          <h1 className="font-display text-xl text-foreground">{enrollment.course.title}</h1>
        </div>
        <Badge status={enrollment.status}>{enrollment.status.replace("_", " ")}</Badge>
      </header>

      <div className="border-b border-border px-6 py-3">
        <ProgressBar value={enrollment.progressPct} />
        <p className="mt-1 text-xs text-foreground/50">{enrollment.progressPct}% complete</p>
      </div>

      <main className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-6 py-8">
        <nav className="w-64 shrink-0">
          {enrollment.course.modules.map((module) => (
            <div key={module.id} className="mb-4">
              <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-foreground/40">
                {module.title}
              </p>
              <ul className="flex flex-col gap-0.5">
                {module.lessons.map((lesson) => {
                  const isActive = activeLesson?.id === lesson.id;
                  const isDone = completedLessonIds.has(lesson.id);
                  return (
                    <li key={lesson.id}>
                      <button
                        onClick={() => setActiveLessonId(lesson.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                          isActive ? "bg-accent/10 text-accent" : "text-foreground/80 hover:bg-surface-1",
                        )}
                      >
                        <span>{lesson.title}</span>
                        {isDone && <span className="text-success">✓</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <Card className="flex-1 p-8">
          {activeLesson ? (
            <div className="flex flex-col gap-4">
              <h2 className="font-display text-lg text-foreground">{activeLesson.title}</h2>
              {activeLesson.contentUrl ? (
                <a
                  href={activeLesson.contentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-accent hover:underline"
                >
                  {CONTENT_LABEL[activeLesson.contentType]} &rarr;
                </a>
              ) : getTextBody(activeLesson) ? (
                <div className="flex flex-col gap-3 text-sm leading-relaxed text-foreground/80">
                  {getTextBody(activeLesson)!
                    .split(/\n{2,}/)
                    .map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-foreground/50">No content attached to this lesson yet.</p>
              )}

              <div>
                <Button
                  variant={completedLessonIds.has(activeLesson.id) ? "secondary" : "primary"}
                  disabled={saving || completedLessonIds.has(activeLesson.id)}
                  onClick={() => markComplete(activeLesson)}
                >
                  {completedLessonIds.has(activeLesson.id) ? "Completed" : "Mark complete"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground/50">This course has no lessons yet.</p>
          )}
        </Card>
      </main>
    </div>
  );
}

export default function CoursePlayerPage() {
  return (
    <RequireAuth>
      <PlayerContent />
    </RequireAuth>
  );
}

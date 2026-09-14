"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import type { Enrollment, EnrollmentWithCourseDetail, Lesson, QuizQuestion, QuizSubmitResult } from "@/types/shared";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/require-auth";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/progress";
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

function getQuizQuestions(lesson: Lesson): QuizQuestion[] {
  if (lesson.contentType !== "quiz") return [];
  const json = lesson.contentJson;
  if (json && typeof json === "object" && "questions" in json && Array.isArray(json.questions)) {
    return json.questions as QuizQuestion[];
  }
  return [];
}

function QuizPlayer({
  lesson,
  answers,
  onAnswer,
  result,
  alreadyCompleted,
  submitting,
  onSubmit,
}: {
  lesson: Lesson;
  answers: Record<string, string>;
  onAnswer: (questionId: string, optionId: string) => void;
  result: QuizSubmitResult | null;
  alreadyCompleted: boolean;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const questions = getQuizQuestions(lesson);

  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">This quiz has no questions yet.</p>;
  }

  if (result) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium text-foreground">
          You scored {result.correctCount}/{result.totalCount} ({result.scorePct}%)
        </p>
      </div>
    );
  }

  // Session-local scores aren't persisted across a reload (same limitation as
  // completedLessonIds), so a returning learner who already finished this
  // quiz has no score to show here — but the form must still not reappear
  // and be resubmittable.
  if (alreadyCompleted) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium text-foreground">You&rsquo;ve already completed this quiz.</p>
      </div>
    );
  }

  const allAnswered = questions.every((q) => answers[q.id]);

  return (
    <div className="flex flex-col gap-5">
      {questions.map((question, index) => (
        <div key={question.id} className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">
            {index + 1}. {question.prompt}
          </p>
          <div className="flex flex-col gap-1.5">
            {question.options.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground/80 has-checked:border-primary has-checked:bg-primary/5 has-checked:text-foreground"
              >
                <input
                  type="radio"
                  name={`quiz-${question.id}`}
                  checked={answers[question.id] === option.id}
                  onChange={() => onAnswer(question.id, option.id)}
                  className="accent-primary"
                />
                {option.text}
              </label>
            ))}
          </div>
        </div>
      ))}
      <div>
        <Button disabled={!allAnswered || submitting} onClick={onSubmit}>
          Submit answers
        </Button>
      </div>
    </div>
  );
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
  // Quiz answers/results are session-local, same as completedLessonIds above —
  // no per-lesson persistence table exists yet (see PROGRESS.md's Phase 6 note).
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResults, setQuizResults] = useState<Record<string, QuizSubmitResult>>({});

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

  async function submitQuiz(lesson: Lesson) {
    if (saving) return;
    setSaving(true);
    try {
      const result = await authFetch<QuizSubmitResult>(
        `/enrollments/${enrollmentId}/lessons/${lesson.id}/quiz-submit`,
        { method: "POST", body: { answers: quizAnswers } },
      );
      setQuizResults((prev) => ({ ...prev, [lesson.id]: result }));
      // markComplete manages `saving` itself (and bails if it's already true),
      // so it has to be released here before handing off to it.
      setSaving(false);
      await markComplete(lesson);
    } catch {
      setError("Couldn't submit your answers. Try again.");
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="secondary" onClick={() => router.push("/courses")}>
          Back to my courses
        </Button>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex h-16 items-center border-b border-border px-6">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-6 py-8">
          <div className="w-64 shrink-0 space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
          <div className="h-64 flex-1 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/courses")}
          >
            <ArrowLeft className="size-3.5" />
            My courses
          </button>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            {enrollment.course.title}
          </h1>
        </div>
        <StatusBadge status={enrollment.status}>{enrollment.status.replace("_", " ")}</StatusBadge>
      </header>

      <div className="border-b border-border px-6 py-3">
        <Progress value={enrollment.progressPct} className="h-1.5" />
        <p className="mt-1.5 text-xs text-muted-foreground">{enrollment.progressPct}% complete</p>
      </div>

      <main className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-6 py-8">
        <nav className="w-64 shrink-0">
          {enrollment.course.modules.map((module) => (
            <div key={module.id} className="mb-4">
              <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {module.title}
              </p>
              <ul className="flex flex-col gap-0.5">
                {module.lessons.map((lesson) => {
                  const isActive = activeLesson?.id === lesson.id;
                  const isDone = completedLessonIds.has(lesson.id);
                  return (
                    <li key={lesson.id}>
                      <button
                        onClick={() => {
                          setActiveLessonId(lesson.id);
                          setQuizAnswers({});
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                          isActive ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-muted",
                        )}
                      >
                        <span>{lesson.title}</span>
                        {isDone && (
                          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                            <Check className="size-3" strokeWidth={2.5} />
                          </span>
                        )}
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
              <h2 className="font-display text-lg font-semibold text-foreground">{activeLesson.title}</h2>
              {activeLesson.contentType === "quiz" ? (
                <QuizPlayer
                  lesson={activeLesson}
                  answers={quizAnswers}
                  onAnswer={(questionId, optionId) =>
                    setQuizAnswers((prev) => ({ ...prev, [questionId]: optionId }))
                  }
                  result={quizResults[activeLesson.id] ?? null}
                  alreadyCompleted={completedLessonIds.has(activeLesson.id)}
                  submitting={saving}
                  onSubmit={() => submitQuiz(activeLesson)}
                />
              ) : activeLesson.contentUrl ? (
                <a
                  href={activeLesson.contentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  {CONTENT_LABEL[activeLesson.contentType]}
                  <ExternalLink className="size-3.5" />
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
                <p className="text-sm text-muted-foreground">No content attached to this lesson yet.</p>
              )}

              {activeLesson.contentType !== "quiz" && (
                <div>
                  <Button
                    variant={completedLessonIds.has(activeLesson.id) ? "secondary" : "default"}
                    disabled={saving || completedLessonIds.has(activeLesson.id)}
                    onClick={() => markComplete(activeLesson)}
                  >
                    {completedLessonIds.has(activeLesson.id) ? "Completed" : "Mark complete"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">This course has no lessons yet.</p>
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

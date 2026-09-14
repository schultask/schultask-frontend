"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { Course, CourseModule, Lesson, LessonContentType, QuizQuestion } from "@/types/shared";
import { useAuth } from "@/lib/auth-context";
import { isManagerOrAdmin } from "@/lib/roles";
import { ApiError } from "@/lib/api";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CourseWithModules = Course & { modules: CourseModule[] };

const CONTENT_TYPES: LessonContentType[] = ["text", "video", "quiz", "file"];

function textBody(lesson: Lesson): string {
  const json = lesson.contentJson;
  if (json && typeof json === "object" && "body" in json && typeof json.body === "string") {
    return json.body;
  }
  return "";
}

function quizQuestions(lesson: Lesson): QuizQuestion[] {
  const json = lesson.contentJson;
  if (json && typeof json === "object" && "questions" in json && Array.isArray(json.questions)) {
    return json.questions as QuizQuestion[];
  }
  return [];
}

function newQuestion(): QuizQuestion {
  const optionId = crypto.randomUUID();
  return {
    id: crypto.randomUUID(),
    prompt: "",
    options: [{ id: optionId, text: "" }, { id: crypto.randomUUID(), text: "" }],
    correctOptionId: optionId,
  };
}

function BuilderContent({ courseId }: { courseId: string }) {
  const { authFetch } = useAuth();
  const [course, setCourse] = useState<CourseWithModules | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newModuleTitle, setNewModuleTitle] = useState("");

  const load = useCallback(() => {
    return authFetch<CourseWithModules>(`/courses/${courseId}`)
      .then((data) => {
        setCourse(data);
        setTitle(data.title);
        setDescription(data.description ?? "");
      })
      .catch(() => setError("Couldn't load this course."));
  }, [authFetch, courseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That action failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !course) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Link href="/admin/courses" className="text-sm text-primary hover:underline">
          Back to course builder
        </Link>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex h-16 items-center border-b border-border px-6">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-6 py-10">
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  const modules = [...course.modules].sort((a, b) => a.sortOrder - b.sortOrder);

  function swapModuleOrder(index: number, direction: -1 | 1) {
    const other = modules[index + direction];
    const self = modules[index];
    if (!other) return;
    run(async () => {
      await authFetch(`/courses/${courseId}/modules/${self.id}`, {
        method: "PATCH",
        body: { sortOrder: other.sortOrder },
      });
      await authFetch(`/courses/${courseId}/modules/${other.id}`, {
        method: "PATCH",
        body: { sortOrder: self.sortOrder },
      });
    });
  }

  return (
    <AppShell active="builder">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <Link
          href="/admin/courses"
          className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Course builder
        </Link>

        <div className="mt-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={course.status}>{course.status}</StatusBadge>
            {course.aiGenerated && (
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                AI generated
              </Badge>
            )}
          </div>
          {course.status === "draft" && (
            <Button
              disabled={busy || modules.length === 0}
              onClick={() => run(() => authFetch(`/courses/${courseId}/publish`, { method: "POST" }))}
            >
              Publish
            </Button>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <Card className="mt-4">
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={busy}
              />
            </div>
            <Button
              variant="secondary"
              className="w-fit"
              disabled={busy || (title === course.title && description === (course.description ?? ""))}
              onClick={() => run(() => authFetch(`/courses/${courseId}`, { method: "PATCH", body: { title, description } }))}
            >
              Save details
            </Button>
          </CardContent>
        </Card>

        <h2 className="mt-8 text-sm font-medium text-muted-foreground">Modules</h2>
        <div className="mt-3 flex flex-col gap-4">
          {modules.map((module, index) => (
            <ModuleEditor
              key={module.id}
              courseId={courseId}
              module={module}
              busy={busy}
              isFirst={index === 0}
              isLast={index === modules.length - 1}
              onMoveUp={() => swapModuleOrder(index, -1)}
              onMoveDown={() => swapModuleOrder(index, 1)}
              run={run}
            />
          ))}
        </div>

        <Card className="mt-4">
          <CardContent className="flex items-center gap-2">
            <Input
              placeholder="New module title"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              disabled={busy}
            />
            <Button
              variant="secondary"
              disabled={busy || !newModuleTitle.trim()}
              onClick={() =>
                run(async () => {
                  await authFetch(`/courses/${courseId}/modules`, {
                    method: "POST",
                    body: { title: newModuleTitle, sortOrder: modules.length },
                  });
                  setNewModuleTitle("");
                })
              }
            >
              <Plus />
              Add module
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function ReorderButtons({
  busy,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  busy: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="flex flex-col">
      <Button variant="ghost" size="icon-xs" disabled={busy || isFirst} onClick={onMoveUp} aria-label="Move up">
        <ChevronUp />
      </Button>
      <Button variant="ghost" size="icon-xs" disabled={busy || isLast} onClick={onMoveDown} aria-label="Move down">
        <ChevronDown />
      </Button>
    </div>
  );
}

function ModuleEditor({
  courseId,
  module,
  busy,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  run,
}: {
  courseId: string;
  module: CourseModule;
  busy: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const { authFetch } = useAuth();
  const [title, setTitle] = useState(module.title);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const lessons = [...module.lessons].sort((a, b) => a.sortOrder - b.sortOrder);

  function swapLessonOrder(index: number, direction: -1 | 1) {
    const other = lessons[index + direction];
    const self = lessons[index];
    if (!other) return;
    run(async () => {
      await authFetch(`/modules/${module.id}/lessons/${self.id}`, {
        method: "PATCH",
        body: { sortOrder: other.sortOrder },
      });
      await authFetch(`/modules/${module.id}/lessons/${other.id}`, {
        method: "PATCH",
        body: { sortOrder: self.sortOrder },
      });
    });
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-2">
        <ReorderButtons busy={busy} isFirst={isFirst} isLast={isLast} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
        <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} className="flex-1" />
        <Button
          variant="secondary"
          disabled={busy || title === module.title}
          onClick={() => run(() => authFetch(`/courses/${courseId}/modules/${module.id}`, { method: "PATCH", body: { title } }))}
        >
          Save
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={busy}
          aria-label="Delete module"
          onClick={() => run(() => authFetch(`/courses/${courseId}/modules/${module.id}`, { method: "DELETE" }))}
        >
          <Trash2 />
        </Button>
      </CardContent>

      <div className="flex flex-col gap-3 px-6 pb-6 pl-14">
        {lessons.map((lesson, index) => (
          <LessonEditor
            key={lesson.id}
            moduleId={module.id}
            lesson={lesson}
            busy={busy}
            isFirst={index === 0}
            isLast={index === lessons.length - 1}
            onMoveUp={() => swapLessonOrder(index, -1)}
            onMoveDown={() => swapLessonOrder(index, 1)}
            run={run}
          />
        ))}

        <div className="flex items-center gap-2">
          <Input
            placeholder="New lesson title"
            value={newLessonTitle}
            onChange={(e) => setNewLessonTitle(e.target.value)}
            disabled={busy}
          />
          <Button
            variant="secondary"
            disabled={busy || !newLessonTitle.trim()}
            onClick={() =>
              run(async () => {
                await authFetch(`/modules/${module.id}/lessons`, {
                  method: "POST",
                  body: { title: newLessonTitle, contentType: "text", sortOrder: lessons.length },
                });
                setNewLessonTitle("");
              })
            }
          >
            <Plus />
            Add lesson
          </Button>
        </div>
      </div>
    </Card>
  );
}

function QuizEditor({
  questions,
  onChange,
  busy,
}: {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
  busy: boolean;
}) {
  function updateQuestion(id: string, patch: Partial<QuizQuestion>) {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function updateOption(questionId: string, optionId: string, text: string) {
    onChange(
      questions.map((q) =>
        q.id !== questionId
          ? q
          : { ...q, options: q.options.map((o) => (o.id === optionId ? { ...o, text } : o)) },
      ),
    );
  }

  function addOption(questionId: string) {
    onChange(
      questions.map((q) =>
        q.id !== questionId ? q : { ...q, options: [...q.options, { id: crypto.randomUUID(), text: "" }] },
      ),
    );
  }

  function removeOption(questionId: string, optionId: string) {
    onChange(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        const options = q.options.filter((o) => o.id !== optionId);
        const correctOptionId = q.correctOptionId === optionId ? options[0]?.id : q.correctOptionId;
        return { ...q, options, correctOptionId };
      }),
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-3">
      {questions.map((question, qIndex) => (
        <div key={question.id} className="rounded-md border border-border p-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder={`Question ${qIndex + 1}`}
              value={question.prompt}
              onChange={(e) => updateQuestion(question.id, { prompt: e.target.value })}
              disabled={busy}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={busy}
              aria-label="Delete question"
              onClick={() => onChange(questions.filter((q) => q.id !== question.id))}
            >
              <Trash2 />
            </Button>
          </div>

          <div className="mt-2 flex flex-col gap-1.5">
            {question.options.map((option) => (
              <div key={option.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={question.correctOptionId === option.id}
                  onChange={() => updateQuestion(question.id, { correctOptionId: option.id })}
                  disabled={busy}
                  className="accent-primary"
                  aria-label="Mark as correct answer"
                />
                <Input
                  placeholder="Option text"
                  value={option.text}
                  onChange={(e) => updateOption(question.id, option.id, e.target.value)}
                  disabled={busy}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={busy || question.options.length <= 2}
                  aria-label="Remove option"
                  onClick={() => removeOption(question.id, option.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              className="mt-1 w-fit"
              disabled={busy}
              onClick={() => addOption(question.id)}
            >
              <Plus />
              Add option
            </Button>
          </div>
        </div>
      ))}

      <Button
        variant="secondary"
        size="sm"
        className="w-fit"
        disabled={busy}
        onClick={() => onChange([...questions, newQuestion()])}
      >
        <Plus />
        Add question
      </Button>
    </div>
  );
}

function LessonEditor({
  moduleId,
  lesson,
  busy,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  run,
}: {
  moduleId: string;
  lesson: Lesson;
  busy: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const { authFetch } = useAuth();
  const [title, setTitle] = useState(lesson.title);
  const [contentType, setContentType] = useState<LessonContentType>(lesson.contentType);
  const [contentUrl, setContentUrl] = useState(lesson.contentUrl ?? "");
  const [body, setBody] = useState(textBody(lesson));
  const [questions, setQuestions] = useState<QuizQuestion[]>(quizQuestions(lesson));

  const dirty =
    title !== lesson.title ||
    contentType !== lesson.contentType ||
    contentUrl !== (lesson.contentUrl ?? "") ||
    (contentType === "text" && body !== textBody(lesson)) ||
    (contentType === "quiz" && JSON.stringify(questions) !== JSON.stringify(quizQuestions(lesson)));

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <ReorderButtons busy={busy} isFirst={isFirst} isLast={isLast} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
        <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} className="flex-1" />
        <Select
          value={contentType}
          onValueChange={(value) => setContentType(value as LessonContentType)}
          disabled={busy}
        >
          <SelectTrigger size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPES.map((type) => (
              <SelectItem key={type} value={type} className="capitalize">
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          disabled={busy}
          aria-label="Delete lesson"
          onClick={() => run(() => authFetch(`/modules/${moduleId}/lessons/${lesson.id}`, { method: "DELETE" }))}
        >
          <Trash2 />
        </Button>
      </div>

      {contentType === "text" ? (
        <Textarea
          className="mt-2"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={busy}
          placeholder="Lesson content the learner will read"
        />
      ) : contentType === "quiz" ? (
        <QuizEditor questions={questions} onChange={setQuestions} busy={busy} />
      ) : (
        <Input
          className="mt-2"
          value={contentUrl}
          onChange={(e) => setContentUrl(e.target.value)}
          disabled={busy}
          placeholder="Content URL"
        />
      )}

      <Button
        variant="secondary"
        size="sm"
        className="mt-2"
        disabled={busy || !dirty}
        onClick={() =>
          run(() =>
            authFetch(`/modules/${moduleId}/lessons/${lesson.id}`, {
              method: "PATCH",
              body: {
                title,
                contentType,
                contentUrl: contentType === "text" || contentType === "quiz" ? undefined : contentUrl || undefined,
                contentJson:
                  contentType === "text" ? { body } : contentType === "quiz" ? { questions } : undefined,
              },
            }),
          )
        }
      >
        Save
      </Button>
    </div>
  );
}

function NoAccess() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm font-medium text-foreground">This page is for admins and managers</p>
      <Link href="/courses" className="text-sm text-primary hover:underline">
        Go to my courses
      </Link>
    </div>
  );
}

export default function AdminCourseEditorPage() {
  const { courseId } = useParams<{ courseId: string }>();
  return (
    <RequireAuth>
      <RoleGate courseId={courseId} />
    </RequireAuth>
  );
}

function RoleGate({ courseId }: { courseId: string }) {
  const { user } = useAuth();
  return isManagerOrAdmin(user) ? <BuilderContent courseId={courseId} /> : <NoAccess />;
}

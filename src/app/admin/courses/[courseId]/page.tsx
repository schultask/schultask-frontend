"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Course, CourseModule, Lesson, LessonContentType } from "@/types/shared";
import { useAuth } from "@/lib/auth-context";
import { isManagerOrAdmin } from "@/lib/roles";
import { ApiError } from "@/lib/api";
import { RequireAuth } from "@/components/require-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CourseWithModules = Course & { modules: CourseModule[] };

const CONTENT_TYPES: LessonContentType[] = ["text", "video", "quiz", "file"];

function textBody(lesson: Lesson): string {
  const json = lesson.contentJson;
  if (json && typeof json === "object" && "body" in json && typeof json.body === "string") {
    return json.body;
  }
  return "";
}

function BuilderContent({ courseId }: { courseId: string }) {
  const { user, authFetch, logout } = useAuth();
  const router = useRouter();
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
        <p className="text-sm text-danger">{error}</p>
        <Link href="/admin/courses" className="text-sm text-accent hover:underline">
          Back to course builder
        </Link>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-foreground/50">Loading…</p>
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

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Link href="/admin/courses" className="text-xs text-foreground/50 hover:text-foreground">
          &larr; Course builder
        </Link>

        <div className="mt-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Badge status={course.status}>{course.status}</Badge>
            {course.aiGenerated && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                AI generated
              </span>
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

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <Card className="mt-4 flex flex-col gap-4 p-6">
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
        </Card>

        <h2 className="mt-8 text-sm font-medium text-foreground/60">Modules</h2>
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

        <Card className="mt-4 flex items-center gap-2 p-4">
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
            Add module
          </Button>
        </Card>
      </main>
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
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button className="disabled:opacity-30" disabled={busy || isFirst} onClick={onMoveUp}>
            ▲
          </button>
          <button className="disabled:opacity-30" disabled={busy || isLast} onClick={onMoveDown}>
            ▼
          </button>
        </div>
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
          disabled={busy}
          onClick={() => run(() => authFetch(`/courses/${courseId}/modules/${module.id}`, { method: "DELETE" }))}
        >
          Delete
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-3 pl-6">
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
            Add lesson
          </Button>
        </div>
      </div>
    </Card>
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

  const dirty =
    title !== lesson.title ||
    contentType !== lesson.contentType ||
    contentUrl !== (lesson.contentUrl ?? "") ||
    (contentType === "text" && body !== textBody(lesson));

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button className="text-xs disabled:opacity-30" disabled={busy || isFirst} onClick={onMoveUp}>
            ▲
          </button>
          <button className="text-xs disabled:opacity-30" disabled={busy || isLast} onClick={onMoveDown}>
            ▼
          </button>
        </div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} className="flex-1" />
        <select
          value={contentType}
          onChange={(e) => setContentType(e.target.value as LessonContentType)}
          disabled={busy}
          className="rounded-md border border-border bg-surface-0 px-2 py-2 text-sm text-foreground"
        >
          {CONTENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => run(() => authFetch(`/modules/${moduleId}/lessons/${lesson.id}`, { method: "DELETE" }))}
        >
          Delete
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
        className="mt-2"
        disabled={busy || !dirty}
        onClick={() =>
          run(() =>
            authFetch(`/modules/${moduleId}/lessons/${lesson.id}`, {
              method: "PATCH",
              body: {
                title,
                contentType,
                contentUrl: contentType === "text" ? undefined : contentUrl || undefined,
                contentJson: contentType === "text" ? { body } : undefined,
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
      <Link href="/courses" className="text-sm text-accent hover:underline">
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

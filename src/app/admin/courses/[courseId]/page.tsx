"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  ListChecks,
  Paperclip,
  Plus,
  Trash2,
  Upload,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { Course, CourseModule, Lesson, LessonContentType, QuizQuestion } from "@/types/shared";
import { useAuth } from "@/lib/auth-context";
import { isManagerOrAdmin } from "@/lib/roles";
import { ApiError } from "@/lib/api";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ProtectedMedia } from "@/components/protected-media";
import { CourseCover } from "@/components/course-cover";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CourseWithModules = Course & { modules: CourseModule[] };
type OpenLesson = { moduleId: string; lesson: Lesson };

const CONTENT_TYPES: LessonContentType[] = ["text", "image", "video", "quiz", "file"];

const CONTENT_TYPE_ICON: Record<LessonContentType, LucideIcon> = {
  text: FileText,
  image: ImageIcon,
  video: Video,
  quiz: ListChecks,
  file: Paperclip,
};

const CONTENT_TYPE_LABEL: Record<LessonContentType, string> = {
  text: "Text",
  image: "Image",
  video: "Video",
  quiz: "Quiz",
  file: "File",
};

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

function CourseBreadcrumb({ current }: { current: string }) {
  return (
    <div className="flex h-16 shrink-0 items-center border-b border-border px-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/courses">Course builder</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{current}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

function BuilderContent({ courseId }: { courseId: string }) {
  const { authFetch } = useAuth();
  const [course, setCourse] = useState<CourseWithModules | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [openLesson, setOpenLesson] = useState<OpenLesson | null>(null);
  const initializedExpansion = useRef(false);

  const load = useCallback(() => {
    return authFetch<CourseWithModules>(`/courses/${courseId}`)
      .then((data) => {
        setCourse(data);
        setTitle(data.title);
        setDescription(data.description ?? "");
        if (!initializedExpansion.current) {
          initializedExpansion.current = true;
          setExpandedModules(new Set(data.modules.filter((m) => m.lessons.length === 0).map((m) => m.id)));
        }
        setOpenLesson((prev) => {
          if (!prev) return prev;
          const mod = data.modules.find((m) => m.id === prev.moduleId);
          const lesson = mod?.lessons.find((l) => l.id === prev.lesson.id);
          return lesson ? { moduleId: prev.moduleId, lesson } : null;
        });
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

  async function runReturning<T>(action: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      await load();
      return result;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That action failed. Try again.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  function toggleModule(id: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (error && !course) {
    return (
      <AppShell active="builder">
        <div className="flex flex-1 flex-col">
          <CourseBreadcrumb current="Error" />
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Link href="/admin/courses" className="text-sm text-primary hover:underline">
              Back to course builder
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!course) {
    return (
      <AppShell active="builder">
        <div className="flex flex-1 flex-col">
          <CourseBreadcrumb current="Loading…" />
          <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-6 py-10">
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </AppShell>
    );
  }

  const modules = [...course.modules].sort((a, b) => a.sortOrder - b.sortOrder);
  const allExpanded = modules.length > 0 && modules.every((m) => expandedModules.has(m.id));

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

  async function addLessonToModule(module: CourseModule, contentType: LessonContentType) {
    const created = await runReturning(() =>
      authFetch<Lesson>(`/modules/${module.id}/lessons`, {
        method: "POST",
        body: { title: "New lesson", contentType, sortOrder: module.lessons.length },
      }),
    );
    if (created) {
      setExpandedModules((prev) => new Set(prev).add(module.id));
      setOpenLesson({ moduleId: module.id, lesson: created });
    }
  }

  return (
    <AppShell active="builder">
      <div className="flex flex-1 flex-col">
        <CourseBreadcrumb current={course.title} />
        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          <CourseCover id={course.id} className="flex h-32 w-full items-center justify-center rounded-xl" />

          <div className="mt-4 flex items-center justify-between gap-4">
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

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title !== course.title) run(() => authFetch(`/courses/${courseId}`, { method: "PATCH", body: { title } }));
            }}
            disabled={busy}
            className="mt-4 h-auto border-none px-0 font-display text-2xl font-bold tracking-tight text-foreground shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== (course.description ?? ""))
                run(() => authFetch(`/courses/${courseId}`, { method: "PATCH", body: { description } }));
            }}
            disabled={busy}
            rows={2}
            placeholder="What's this course about?"
            className="mt-1 resize-none border-none px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0 dark:bg-transparent"
          />

          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Modules</h2>
            {modules.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setExpandedModules(allExpanded ? new Set() : new Set(modules.map((m) => m.id)))
                }
              >
                {allExpanded ? "Collapse all" : "Expand all"}
              </Button>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {modules.map((module, index) => (
              <ModuleRow
                key={module.id}
                courseId={courseId}
                module={module}
                busy={busy}
                isFirst={index === 0}
                isLast={index === modules.length - 1}
                expanded={expandedModules.has(module.id)}
                onToggle={() => toggleModule(module.id)}
                onMoveUp={() => swapModuleOrder(index, -1)}
                onMoveDown={() => swapModuleOrder(index, 1)}
                onAddLesson={(contentType) => addLessonToModule(module, contentType)}
                onOpenLesson={(lesson) => setOpenLesson({ moduleId: module.id, lesson })}
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
                onClick={async () => {
                  const created = await runReturning(() =>
                    authFetch<CourseModule>(`/courses/${courseId}/modules`, {
                      method: "POST",
                      body: { title: newModuleTitle, sortOrder: modules.length },
                    }),
                  );
                  if (created) {
                    setExpandedModules((prev) => new Set(prev).add(created.id));
                    setNewModuleTitle("");
                  }
                }}
              >
                <Plus />
                Add module
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <LessonSheet
        openLesson={openLesson}
        busy={busy}
        run={run}
        onOpenChange={(open) => !open && setOpenLesson(null)}
      />
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

function AddLessonMenu({ busy, onAdd }: { busy: boolean; onAdd: (contentType: LessonContentType) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" disabled={busy}>
          <Plus />
          Add lesson
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {CONTENT_TYPES.map((type) => {
          const Icon = CONTENT_TYPE_ICON[type];
          return (
            <DropdownMenuItem key={type} onClick={() => onAdd(type)}>
              <Icon />
              {CONTENT_TYPE_LABEL[type]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ModuleRow({
  courseId,
  module,
  busy,
  isFirst,
  isLast,
  expanded,
  onToggle,
  onMoveUp,
  onMoveDown,
  onAddLesson,
  onOpenLesson,
  run,
}: {
  courseId: string;
  module: CourseModule;
  busy: boolean;
  isFirst: boolean;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddLesson: (contentType: LessonContentType) => void;
  onOpenLesson: (lesson: Lesson) => void;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const { authFetch } = useAuth();
  const [title, setTitle] = useState(module.title);
  // Only re-fires when the server value itself changes (e.g. edited from
  // elsewhere), never while the user is mid-edit here — see the identical
  // pattern in LessonRow below.
  useEffect(() => setTitle(module.title), [module.title]);
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
    <Collapsible open={expanded} onOpenChange={onToggle} asChild>
      <Card className="py-0">
        <div className="flex items-center gap-2 p-4">
          <ReorderButtons busy={busy} isFirst={isFirst} isLast={isLast} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={expanded ? "Collapse module" : "Expand module"}>
              {expanded ? <ChevronDown /> : <ChevronRight />}
            </Button>
          </CollapsibleTrigger>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title !== module.title)
                run(() => authFetch(`/courses/${courseId}/modules/${module.id}`, { method: "PATCH", body: { title } }));
            }}
            disabled={busy}
            className="flex-1 border-none shadow-none focus-visible:ring-1 dark:bg-transparent"
          />
          <Badge variant="secondary">{lessons.length} lesson{lessons.length === 1 ? "" : "s"}</Badge>
          <Button
            variant="ghost"
            size="icon"
            disabled={busy}
            aria-label="Delete module"
            onClick={() => run(() => authFetch(`/courses/${courseId}/modules/${module.id}`, { method: "DELETE" }))}
          >
            <Trash2 />
          </Button>
        </div>

        <CollapsibleContent>
          <div className="flex flex-col gap-1 border-t border-border px-4 pt-3 pb-4 pl-16">
            {lessons.map((lesson, index) => (
              <LessonRow
                key={lesson.id}
                moduleId={module.id}
                lesson={lesson}
                busy={busy}
                isFirst={index === 0}
                isLast={index === lessons.length - 1}
                onMoveUp={() => swapLessonOrder(index, -1)}
                onMoveDown={() => swapLessonOrder(index, 1)}
                onOpen={() => onOpenLesson(lesson)}
                run={run}
              />
            ))}

            <div className="mt-2">
              <AddLessonMenu busy={busy} onAdd={onAddLesson} />
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function LessonRow({
  moduleId,
  lesson,
  busy,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onOpen,
  run,
}: {
  moduleId: string;
  lesson: Lesson;
  busy: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onOpen: () => void;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const { authFetch } = useAuth();
  const [title, setTitle] = useState(lesson.title);
  // Resyncs after e.g. a rename from inside the LessonSheet; only fires when
  // the server value actually changes, so mid-typing here is never clobbered.
  useEffect(() => setTitle(lesson.title), [lesson.title]);
  const Icon = CONTENT_TYPE_ICON[lesson.contentType];

  return (
    <div className="flex items-center gap-2 rounded-md py-1">
      <ReorderButtons busy={busy} isFirst={isFirst} isLast={isLast} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={busy}
        aria-label={`Edit ${CONTENT_TYPE_LABEL[lesson.contentType]} content`}
        onClick={onOpen}
        className="shrink-0 text-muted-foreground"
      >
        <Icon />
      </Button>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          if (title !== lesson.title)
            run(() => authFetch(`/modules/${moduleId}/lessons/${lesson.id}`, { method: "PATCH", body: { title } }));
        }}
        disabled={busy}
        className="flex-1 border-none shadow-none focus-visible:ring-1 dark:bg-transparent"
      />
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
    <div className="flex flex-col gap-3">
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

function LessonSheet({
  openLesson,
  busy,
  run,
  onOpenChange,
}: {
  openLesson: OpenLesson | null;
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={openLesson !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        {openLesson && (
          <LessonSheetBody
            key={openLesson.lesson.id}
            moduleId={openLesson.moduleId}
            lesson={openLesson.lesson}
            busy={busy}
            run={run}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function LessonSheetBody({
  moduleId,
  lesson,
  busy,
  run,
}: {
  moduleId: string;
  lesson: Lesson;
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const { authFetch, authUpload } = useAuth();
  const [title, setTitle] = useState(lesson.title);
  const [contentUrl, setContentUrl] = useState(lesson.contentUrl ?? "");
  const [body, setBody] = useState(textBody(lesson));
  const [questions, setQuestions] = useState<QuizQuestion[]>(quizQuestions(lesson));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const Icon = CONTENT_TYPE_ICON[lesson.contentType];

  // Resync when the same lesson's contentType changes server-side (e.g. via
  // the Select below), since that clears contentKey/contentJson upstream.
  // Deliberately scoped to these fields, not `lesson` itself, which would
  // re-run on every reload and clobber in-progress edits.
  useEffect(() => {
    setContentUrl(lesson.contentUrl ?? "");
    setBody(textBody(lesson));
    setQuestions(quizQuestions(lesson));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.contentType, lesson.contentUrl, lesson.contentJson]);

  function saveTitle() {
    if (title !== lesson.title)
      run(() => authFetch(`/modules/${moduleId}/lessons/${lesson.id}`, { method: "PATCH", body: { title } }));
  }

  function saveContentType(contentType: LessonContentType) {
    run(() => authFetch(`/modules/${moduleId}/lessons/${lesson.id}`, { method: "PATCH", body: { contentType } }));
  }

  function saveBody() {
    if (body !== textBody(lesson))
      run(() =>
        authFetch(`/modules/${moduleId}/lessons/${lesson.id}`, { method: "PATCH", body: { contentJson: { body } } }),
      );
  }

  function saveContentUrl() {
    if (contentUrl !== (lesson.contentUrl ?? ""))
      run(() =>
        authFetch(`/modules/${moduleId}/lessons/${lesson.id}`, {
          method: "PATCH",
          body: { contentUrl: contentUrl || undefined },
        }),
      );
  }

  function saveQuiz() {
    if (JSON.stringify(questions) !== JSON.stringify(quizQuestions(lesson)))
      run(() =>
        authFetch(`/modules/${moduleId}/lessons/${lesson.id}`, {
          method: "PATCH",
          body: { contentJson: { questions } },
        }),
      );
  }

  function uploadContent(file: File) {
    run(() => authUpload(`/modules/${moduleId}/lessons/${lesson.id}/content`, file)).finally(() => {
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  return (
    <>
      <SheetHeader className="border-b border-border">
        <SheetTitle className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          Edit lesson
        </SheetTitle>
      </SheetHeader>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lesson-title">Title</Label>
          <Input
            id="lesson-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            disabled={busy}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Content type</Label>
          <Select value={lesson.contentType} onValueChange={(value) => saveContentType(value as LessonContentType)} disabled={busy}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {CONTENT_TYPE_LABEL[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {lesson.contentType === "text" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lesson-body">Content</Label>
            <Textarea
              id="lesson-body"
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onBlur={saveBody}
              disabled={busy}
              placeholder="Lesson content the learner will read"
            />
          </div>
        )}

        {lesson.contentType === "quiz" && (
          <div onBlur={saveQuiz}>
            <Label className="mb-2">Questions</Label>
            <QuizEditor questions={questions} onChange={setQuestions} busy={busy} />
          </div>
        )}

        {(lesson.contentType === "image" || lesson.contentType === "video") && (
          <div className="flex flex-col gap-2">
            <Label>{CONTENT_TYPE_LABEL[lesson.contentType]}</Label>
            {lesson.contentKey ? (
              <ProtectedMedia
                type={lesson.contentType}
                src={`/modules/${moduleId}/lessons/${lesson.id}/content`}
                className={lesson.contentType === "image" ? "h-40 w-auto max-w-full object-cover" : "h-40 w-full"}
              />
            ) : (
              <p className="text-xs text-muted-foreground">No {lesson.contentType} uploaded yet.</p>
            )}
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept={lesson.contentType === "image" ? "image/*" : "video/*"}
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadContent(file);
                }}
              />
              <Upload className="size-4 shrink-0 text-muted-foreground" />
            </div>
          </div>
        )}

        {lesson.contentType === "file" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lesson-url">Content URL</Label>
            <Input
              id="lesson-url"
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              onBlur={saveContentUrl}
              disabled={busy}
              placeholder="https://…"
            />
          </div>
        )}
      </div>
    </>
  );
}

function NoAccess() {
  return (
    <AppShell active="builder">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-medium text-foreground">This page is for admins and managers</p>
        <Link href="/courses" className="text-sm text-primary hover:underline">
          Go to my courses
        </Link>
      </div>
    </AppShell>
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

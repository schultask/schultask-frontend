"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Course = { id: string };
type AiJobStatus = { status: string; courseId: string | null; error: string | null };

const POLL_INTERVAL_MS = 1500;

function NewCourseContent() {
  const { authFetch } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => void (pollRef.current && clearInterval(pollRef.current)), []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const course = await authFetch<Course>("/courses", { method: "POST", body: { title, description } });
      router.push(`/admin/courses/${course.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the course. Try again.");
      setCreating(false);
    }
  }

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const { jobId } = await authFetch<{ jobId: string }>("/ai/generate-outline", {
        method: "POST",
        body: { title, description },
      });
      pollRef.current = setInterval(async () => {
        try {
          const job = await authFetch<AiJobStatus>(`/ai/jobs/${jobId}`);
          if (job.status === "completed" && job.courseId) {
            if (pollRef.current) clearInterval(pollRef.current);
            router.push(`/admin/courses/${job.courseId}`);
          } else if (job.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setError(job.error ?? "Outline generation failed. Try again.");
            setGenerating(false);
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          setError("Lost track of the generation job. Try again.");
          setGenerating(false);
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start generation. Try again.");
      setGenerating(false);
    }
  }

  const busy = creating || generating;

  return (
    <AppShell active="builder">
      <div className="flex flex-1 flex-col">
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
                <BreadcrumbPage>New course</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-16">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">New course</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start from scratch, or describe it and let AI draft an outline you can edit.
          </p>

          <Card className="mt-6">
            <CardContent>
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    disabled={busy}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={busy}
                    placeholder="What should this course cover? The more detail, the better an AI-generated outline will be."
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" variant="secondary" disabled={busy || !title} className="flex-1">
                    {creating ? "Creating…" : "Create manually"}
                  </Button>
                  <Button type="button" onClick={handleGenerate} disabled={busy || !title} className="flex-1">
                    <Sparkles />
                    {generating ? "Generating outline…" : "Generate with AI"}
                  </Button>
                </div>
                {generating && (
                  <p className="text-center text-xs text-muted-foreground">
                    This can take a little while — the outline is written by a background job.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </AppShell>
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

export default function NewCoursePage() {
  return (
    <RequireAuth>
      <RoleGate />
    </RequireAuth>
  );
}

function RoleGate() {
  const { user } = useAuth();
  return isManagerOrAdmin(user) ? <NewCourseContent /> : <NoAccess />;
}

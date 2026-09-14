"use client";

import { useRouter } from "next/navigation";
import type { Enrollment } from "@/types/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CourseCover } from "@/components/course-cover";

// Every real learning product (Coursera, Uxcel, Codecademy — see Mobbin research
// this session) leads with the one course you're actually mid-way through, not a
// grid of everything you have access to. This is that lead-in for /courses.
function pickFeatured(enrollments: Enrollment[]): Enrollment | null {
  const inProgress = enrollments
    .filter((e) => e.status === "in_progress")
    .sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""));
  if (inProgress.length > 0) return inProgress[0];

  const notStarted = enrollments.filter((e) => e.status === "not_started");
  if (notStarted.length > 0) return notStarted[0];

  return null;
}

export function ContinueLearningHero({ enrollments }: { enrollments: Enrollment[] }) {
  const router = useRouter();
  const featured = pickFeatured(enrollments);
  if (!featured) return null;

  const isInProgress = featured.status === "in_progress";

  return (
    <Card className="flex-row items-stretch overflow-hidden py-0 shadow-md">
      <CourseCover id={featured.course.id} className="flex w-48 shrink-0 items-center justify-center" />
      <div className="flex flex-1 flex-col justify-center gap-3 p-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {isInProgress ? "Continue learning" : "Ready when you are"}
        </p>
        <h2 className="font-display text-xl font-bold text-foreground">{featured.course.title}</h2>
        <div className="flex max-w-sm flex-col gap-1.5">
          <Progress value={featured.progressPct} />
          <p className="text-xs text-muted-foreground">{featured.progressPct}% complete</p>
        </div>
        <div>
          <Button onClick={() => router.push(`/courses/${featured.id}`)}>
            {isInProgress ? "Resume course" : "Start course"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

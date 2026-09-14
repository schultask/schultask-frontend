import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Status colors are semantic (draft/in-progress = warning tone, completed/
// published = success tone) so status is never conveyed by color alone —
// the label text always sits alongside it.
const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-warning/15 text-warning border-transparent",
  published: "bg-success/15 text-success border-transparent",
  not_started: "bg-muted text-muted-foreground border-transparent",
  in_progress: "bg-primary/15 text-primary border-transparent",
  completed: "bg-success/15 text-success border-transparent",
};

export function StatusBadge({ status, children }: { status: string; children: ReactNode }) {
  return (
    <Badge variant="outline" className={cn("capitalize", STATUS_CLASSES[status] ?? "")}>
      {children}
    </Badge>
  );
}

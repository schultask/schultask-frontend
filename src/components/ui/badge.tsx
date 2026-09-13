import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Status colors reuse the same success/warning/danger/accent tokens the
// analytics charts will use (section 11: "status only, not decoration").
const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-warning/15 text-warning",
  published: "bg-success/15 text-success",
  not_started: "bg-foreground/10 text-foreground/60",
  in_progress: "bg-accent/15 text-accent",
  completed: "bg-success/15 text-success",
};

export function Badge({ status, children }: { status?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        status ? (STATUS_CLASSES[status] ?? "bg-surface-0 text-foreground/70") : "bg-surface-0 text-foreground/70",
      )}
    >
      {children}
    </span>
  );
}

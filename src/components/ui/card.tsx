import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Flat, hairline-bordered, no shadow — per PLAN.md section 11 ("Flat cards
// with hairline borders; no soft box-shadows anywhere").
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-surface-1", className)} {...props} />;
}

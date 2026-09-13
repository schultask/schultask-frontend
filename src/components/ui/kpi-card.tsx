import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// PLAN.md section 11: "lead with 2-3 large, bold KPI numbers... same
// hierarchy as Lovable's and Mixpanel's dashboard layouts." `hero` renders
// the display font at a larger size for the one number that should draw
// the eye first in the bento grid.
export function KpiCard({
  label,
  value,
  hero = false,
  className,
}: {
  label: string;
  value: string;
  hero?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col justify-center gap-2 p-6", className)}>
      <span className="text-sm text-foreground/60">{label}</span>
      <span className={cn("font-display text-foreground", hero ? "text-5xl" : "text-3xl")}>{value}</span>
    </Card>
  );
}

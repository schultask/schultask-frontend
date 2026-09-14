import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-display font-bold tabular-nums tracking-tight text-foreground",
          hero ? "text-5xl" : "text-3xl",
        )}
      >
        {value}
      </span>
    </Card>
  );
}

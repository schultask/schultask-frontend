"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalyticsOrgOverview } from "@/types/shared";

const AXIS_TICK = { fill: "var(--foreground)", fillOpacity: 0.6, fontSize: 12 };

export function CompletionChart({
  data,
}: {
  data: AnalyticsOrgOverview["courseCompletion"];
}) {
  if (data.length === 0) {
    return (
      <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        No courses have enrollment data yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="title"
          tick={AXIS_TICK}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          interval={0}
          tickFormatter={(title: string) => (title.length > 14 ? `${title.slice(0, 14)}…` : title)}
        />
        <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "none",
          }}
          labelStyle={{ color: "var(--foreground)" }}
          itemStyle={{ color: "var(--foreground)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--foreground)" }} />
        <Bar dataKey="enrolledCount" name="Enrolled" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="completedCount" name="Completed" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

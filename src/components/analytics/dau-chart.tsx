"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const AXIS_TICK = { fill: "var(--foreground)", fillOpacity: 0.6, fontSize: 12 };

export function DauChart({ data }: { data: { date: string; count: number }[] }) {
  // Recharts draws no line at all for a single point (a line needs two
  // ends) — on a fresh dev instance the rollup has usually only run once,
  // so this isn't an edge case worth ignoring.
  if (data.length < 2) {
    return (
      <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        {data.length === 1
          ? `${data[0].count} active learner${data[0].count === 1 ? "" : "s"} on ${data[0].date} — check back tomorrow for a trend.`
          : "No activity recorded yet."}
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={AXIS_TICK} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
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
        <Line type="monotone" dataKey="count" name="Active learners" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

import { BarChart3, BookOpen, Code2, GraduationCap, Lightbulb, Rocket, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// The systematic color+icon cover from PLAN.md section 11: "flat, bold
// single-color covers with one large icon... a systematic color+icon cover
// is both cheaper and more consistent than sourcing images." Course has no
// category field (PLAN.md never adds one), so both the color and the icon
// are derived deterministically from the course id — same course always
// renders the same cover, different courses spread across the palette.
//
// Real uploaded thumbnails (Phase 4's `thumbnailKey`) aren't rendered here:
// the backend serves them behind an authenticated proxy endpoint
// (`GET /courses/:id/thumbnail`), which a plain `<img src>` can't attach a
// bearer token to — displaying one would need a blob-fetch-and-object-URL
// component. Deferred; the flat cover is the documented default look for
// every course anyway, not just the AI-generated-with-no-photo case.
const COVER_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
const COVER_ICONS = [BookOpen, Code2, ShieldCheck, Users, BarChart3, Lightbulb, Rocket, GraduationCap];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function CourseCover({ id, className }: { id: string; className?: string }) {
  const hash = hashString(id);
  const color = COVER_COLORS[hash % COVER_COLORS.length];
  const Icon = COVER_ICONS[hash % COVER_ICONS.length];
  // Deterministic-but-varied rotation for the watermark, so covers with the same
  // color+icon pair (different courses can land on the same pair) still read as
  // distinct at a glance.
  const watermarkRotation = (hash % 7) * 8 - 24;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${color} 100%, white 12%), color-mix(in srgb, ${color} 100%, black 18%))`,
      }}
      aria-hidden
    >
      <Icon
        className="absolute -right-3 -bottom-3 h-20 w-20 text-white/15"
        strokeWidth={1.5}
        style={{ transform: `rotate(${watermarkRotation}deg)` }}
      />
      <Icon className="relative h-10 w-10 text-white drop-shadow-sm" strokeWidth={1.75} />
    </div>
  );
}

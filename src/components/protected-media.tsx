"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

// Renders an image/video served behind an authenticated endpoint — a plain
// <img>/<video src> can't attach a bearer token, so this fetches the bytes
// as a Blob (authFetchBlob) and points the element at a local object URL
// instead. The whole file downloads before anything renders and it can't be
// scrubbed ahead of that (no ranged requests) — an acceptable tradeoff for
// keeping the content behind auth without a signed-URL scheme; see
// PROGRESS.md's Phase 12 notes for the size cap this is paired with.
export function ProtectedMedia({
  src,
  type,
  alt,
  className,
}: {
  src: string;
  type: "image" | "video";
  alt?: string;
  className?: string;
}) {
  const { authFetchBlob } = useAuth();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setObjectUrl(null);
    setError(false);

    authFetchBlob(src)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch(() => !cancelled && setError(true));

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [authFetchBlob, src]);

  if (error) {
    return <p className="text-sm text-destructive">Couldn&rsquo;t load this {type}.</p>;
  }

  if (!objectUrl) {
    return <div className={cn("animate-pulse rounded-lg bg-muted", className ?? "h-48 w-full")} />;
  }

  return type === "image" ? (
    // eslint-disable-next-line @next/next/no-img-element -- source is a local object URL, next/image can't handle that.
    <img src={objectUrl} alt={alt ?? ""} className={cn("rounded-lg", className)} />
  ) : (
    <video src={objectUrl} controls className={cn("rounded-lg", className)} />
  );
}

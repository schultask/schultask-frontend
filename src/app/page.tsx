"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/courses");
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-logo text-5xl text-foreground">Schultask</h1>
      <p className="max-w-md text-sm text-foreground/70">Corporate learning &amp; development platform.</p>
    </main>
  );
}

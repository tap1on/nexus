"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncNowButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "conflict">("idle");

  async function go() {
    setState("busy");
    const res = await fetch("/api/sync", { method: "POST" });
    if (res.status === 409) {
      setState("conflict");
    } else {
      setState("done");
      setTimeout(() => router.refresh(), 2500);
    }
    setTimeout(() => setState("idle"), 5000);
  }

  return (
    <button className="btn btn-psi" onClick={go} disabled={state === "busy"}>
      {state === "busy"
        ? "Summoning…"
        : state === "done"
          ? "Sync launched ✓"
          : state === "conflict"
            ? "Already running"
            : "Sync Now"}
    </button>
  );
}

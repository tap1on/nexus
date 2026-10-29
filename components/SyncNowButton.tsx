"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function Button({
  label,
  lookback,
  primary,
}: {
  label: string;
  lookback: number;
  primary?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "conflict">("idle");

  async function go() {
    setState("busy");
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lookback }),
    });
    if (res.status === 409) {
      setState("conflict");
    } else {
      setState("done");
      setTimeout(() => router.refresh(), 2500);
    }
    setTimeout(() => setState("idle"), 5000);
  }

  return (
    <button
      className={`btn ${primary ? "btn-psi" : ""}`}
      onClick={go}
      disabled={state === "busy"}
    >
      {state === "busy"
        ? "Summoning…"
        : state === "done"
          ? "Launched ✓"
          : state === "conflict"
            ? "Already running"
            : label}
    </button>
  );
}

export function SyncNowButton() {
  return (
    <div className="flex gap-2">
      <Button label="Sync Now (7d)" lookback={7} primary />
      <Button label="Deep Sync (30d)" lookback={30} />
    </div>
  );
}

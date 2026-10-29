"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Access denied. Check your credentials.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="panel w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl text-gold mb-1">NEXUS</h1>
          <div className="khala-rule my-3" />
          <p className="text-ink-3 text-sm tracking-widest uppercase">
            En Taro Tassadar
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs text-ink-2 uppercase tracking-wider mb-1">
              Email
            </label>
            <input
              className="input w-full"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-xs text-ink-2 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              className="input w-full"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-bad text-sm">⚠ {error}</p>}
          <button className="btn btn-psi w-full" disabled={busy}>
            {busy ? "Warping in…" : "Enter the Nexus"}
          </button>
        </form>
      </div>
    </main>
  );
}

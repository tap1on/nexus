"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  accounts: number;
};

export function UserManager({ users, selfId }: { users: Row[]; selfId: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "BUYER" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed");
      return;
    }
    setForm({ name: "", email: "", password: "", role: "BUYER" });
    router.refresh();
  }

  async function patch(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) alert((await res.json()).error ?? "Failed");
    router.refresh();
  }

  function resetPassword(id: string) {
    const pw = prompt("New password (min 8 chars):");
    if (pw) patch(id, { password: pw });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl text-ink">Users</h2>
        <p className="text-ink-3 text-sm">
          Buyers see only the ad accounts assigned to them. Admins see everything.
        </p>
      </div>

      <form onSubmit={create} className="panel p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1">Name</label>
          <input className="input" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1">Email</label>
          <input className="input" type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1">Password</label>
          <input className="input" type="text" required minLength={8} value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1">Role</label>
          <select className="select" value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="BUYER">Buyer</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <button className="btn btn-psi" disabled={busy}>Warp In User</button>
        {error && <p className="text-bad text-sm w-full">⚠ {error}</p>}
      </form>

      <div className="panel p-2 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Name</th>
              <th style={{ textAlign: "left" }}>Email</th>
              <th style={{ textAlign: "left" }}>Role</th>
              <th>Accounts</th>
              <th style={{ textAlign: "left" }}>Status</th>
              <th style={{ textAlign: "left" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ textAlign: "left" }}>{u.name}{u.id === selfId && <span className="text-ink-3"> (you)</span>}</td>
                <td style={{ textAlign: "left" }} className="text-ink-2">{u.email}</td>
                <td style={{ textAlign: "left" }}>
                  <select className="select text-sm py-1" value={u.role} disabled={u.id === selfId}
                    onChange={(e) => patch(u.id, { role: e.target.value })}>
                    <option value="BUYER">Buyer</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td>{u.accounts}</td>
                <td style={{ textAlign: "left" }} className={u.active ? "text-good" : "text-ink-3"}>
                  {u.active ? "✓ Active" : "✕ Disabled"}
                </td>
                <td style={{ textAlign: "left" }}>
                  <div className="flex gap-2">
                    <button className="btn text-[0.55rem] px-2 py-1" onClick={() => resetPassword(u.id)}>
                      Reset PW
                    </button>
                    {u.id !== selfId && (
                      <button
                        className={`text-[0.55rem] px-2 py-1 ${u.active ? "btn btn-danger" : "btn"}`}
                        onClick={() => patch(u.id, { active: !u.active })}
                      >
                        {u.active ? "Disable" : "Enable"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

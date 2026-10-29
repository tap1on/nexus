import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SyncNowButton } from "@/components/SyncNowButton";

export default async function SyncPage() {
  const user = (await getSessionUser())!;
  const runs = await db.syncRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 80,
  });

  const badge = (status: string) =>
    status === "OK"
      ? "text-good"
      : status === "ERROR"
        ? "text-bad"
        : "text-psi";

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl text-ink">Sync Status</h2>
          <p className="text-ink-3 text-sm">
            Worker re-pulls the last 7 days every interval; a nightly pass
            re-pulls 30 days to catch late conversions.
          </p>
        </div>
        {user.role === "ADMIN" && <SyncNowButton />}
      </div>

      {runs.length === 0 ? (
        <div className="panel p-10 text-center text-ink-3">
          <p className="font-display tracking-widest text-sm mb-2">NO SYNC RUNS YET</p>
          <p className="text-sm">
            Start the worker (<code>npm run worker</code>) or trigger a manual sync.
          </p>
        </div>
      ) : (
        <div className="panel p-2 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Started</th>
                <th style={{ textAlign: "left" }}>Kind</th>
                <th style={{ textAlign: "left" }}>Target</th>
                <th style={{ textAlign: "left" }}>Range</th>
                <th>Rows</th>
                <th style={{ textAlign: "left" }}>Status</th>
                <th style={{ textAlign: "left" }}>Message</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td style={{ textAlign: "left" }}>
                    {r.startedAt.toLocaleString("en-GB", {
                      timeZone: "Europe/Berlin",
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                  </td>
                  <td style={{ textAlign: "left" }}>{r.kind}</td>
                  <td style={{ textAlign: "left" }} className="max-w-56 truncate">
                    {r.targetName}
                  </td>
                  <td style={{ textAlign: "left" }} className="text-ink-3">
                    {r.rangeFrom} → {r.rangeTo}
                  </td>
                  <td>{r.rowsUpserted}</td>
                  <td style={{ textAlign: "left" }} className={badge(r.status)}>
                    {r.status === "OK" ? "✓ OK" : r.status === "ERROR" ? "✕ ERROR" : "⟳ RUNNING"}
                  </td>
                  <td
                    style={{ textAlign: "left" }}
                    className="max-w-96 truncate text-ink-3"
                    title={r.message}
                  >
                    {r.message || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

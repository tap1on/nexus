import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { queryUnmatched } from "@/lib/stats";
import { todayBerlin, shiftDate } from "@/lib/dates";
import { fmtMoney, fmtNum } from "@/lib/format";

export default async function UnmatchedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/");
  const sp = await searchParams;
  const today = todayBerlin();
  const from = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : shiftDate(today, -6);
  const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : today;

  const rows = await queryUnmatched(from, to);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl text-ink">Unmatched Revenue</h2>
        <p className="text-ink-3 text-sm">
          {from} → {to} · Everflow rows whose sub4 doesn&apos;t match any known Meta
          ad id. Usually a broken tracking-link template or traffic from outside
          Meta.
        </p>
      </div>

      <div className="panel p-4 inline-block">
        <p className="text-[0.62rem] text-ink-3 uppercase tracking-[0.2em] mb-1">
          Unmatched revenue in range
        </p>
        <p className="text-2xl font-display text-warn">{fmtMoney(totalRevenue)}</p>
      </div>

      {rows.length === 0 ? (
        <div className="panel p-10 text-center text-ink-3">
          <p className="font-display tracking-widest text-sm">
            ALL REVENUE ACCOUNTED FOR
          </p>
        </div>
      ) : (
        <div className="panel p-2 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th style={{ textAlign: "left" }}>Instance</th>
                <th style={{ textAlign: "left" }}>Offer</th>
                <th style={{ textAlign: "left" }}>sub1</th>
                <th style={{ textAlign: "left" }}>sub3</th>
                <th style={{ textAlign: "left" }}>sub4</th>
                <th style={{ textAlign: "left" }}>Account (source_id)</th>
                <th>Clicks</th>
                <th>Conv</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ textAlign: "left" }}>{r.date}</td>
                  <td style={{ textAlign: "left" }}>{r.instance}</td>
                  <td style={{ textAlign: "left" }} className="max-w-56 truncate">
                    {r.offer || "—"}
                  </td>
                  <td style={{ textAlign: "left" }} className="text-ink-3">
                    {r.sub1 || "∅"}
                  </td>
                  <td style={{ textAlign: "left" }} className="text-ink-3">
                    {r.sub3 || "∅"}
                  </td>
                  <td style={{ textAlign: "left" }} className="text-ink-3">
                    {r.sub4 || "∅"}
                  </td>
                  <td style={{ textAlign: "left" }} className="text-ink-2">
                    {r.sourceAccount || "∅"}
                  </td>
                  <td>{fmtNum(r.clicks)}</td>
                  <td>{fmtNum(r.conversions)}</td>
                  <td className="text-warn">{fmtMoney(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { queryStats, GroupBy } from "@/lib/stats";
import { todayBerlin, shiftDate } from "@/lib/dates";
import { FilterBar } from "@/components/FilterBar";
import { KpiTiles } from "@/components/KpiTiles";
import { TrendChart } from "@/components/TrendChart";
import { StatsTable } from "@/components/StatsTable";
import Link from "next/link";
import { fmtMoney } from "@/lib/format";

const GROUPS: GroupBy[] = ["buyer", "account", "campaign", "adset", "ad", "date"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Pages render in parallel with the layout, so the layout's redirect does
  // not save us from a null session here.
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const today = todayBerlin();
  const from = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : shiftDate(today, -6);
  const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : today;
  const groupBy: GroupBy = GROUPS.includes(sp.group as GroupBy)
    ? (sp.group as GroupBy)
    : "campaign";

  // Scope: buyers see only their accounts; admins can filter by buyer.
  let accountIds: string[] | null = null;
  if (user.role === "BUYER") {
    const accs = await db.adAccount.findMany({
      where: { ownerId: user.id },
      select: { id: true },
    });
    accountIds = accs.map((a) => a.id);
  } else if (sp.buyer) {
    const accs = await db.adAccount.findMany({
      where: { ownerId: sp.buyer },
      select: { id: true },
    });
    accountIds = accs.map((a) => a.id);
  }

  const [stats, buyers] = await Promise.all([
    queryStats({ from, to, groupBy, accountIds }),
    user.role === "ADMIN"
      ? db.user.findMany({
          where: { active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl text-ink">Dashboard</h2>
          <p className="text-ink-3 text-sm">
            {from} → {to} · Berlin time · revenue by conversion date
          </p>
        </div>
      </div>

      <FilterBar
        from={from}
        to={to}
        groupBy={groupBy}
        buyers={buyers}
        buyer={user.role === "ADMIN" ? sp.buyer ?? "" : undefined}
        today={today}
      />

      <KpiTiles totals={stats.totals} />

      {user.role === "ADMIN" && stats.unmatchedRevenue > 0 && (
        <Link
          href={`/unmatched?from=${from}&to=${to}`}
          className="panel block px-4 py-3 text-sm hover:bg-surface-3 transition-colors"
        >
          <span className="text-warn">⚠ Unmatched revenue in range:</span>{" "}
          <span className="text-ink font-semibold">
            {fmtMoney(stats.unmatchedRevenue)}
          </span>{" "}
          <span className="text-ink-3">
            ({stats.unmatchedConversions} conversions with subids that match no
            known ad — inspect →)
          </span>
        </Link>
      )}

      {stats.daily.length > 1 && <TrendChart daily={stats.daily} />}

      <StatsTable rows={stats.rows} totals={stats.totals} groupBy={groupBy} />
    </div>
  );
}

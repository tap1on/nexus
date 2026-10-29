import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AccountManager } from "@/components/admin/AccountManager";

export default async function AccountsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/");
  const [accounts, bms, buyers] = await Promise.all([
    db.adAccount.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: {
        bm: { select: { name: true } },
        owner: { select: { name: true } },
      },
    }),
    db.businessManager.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <AccountManager
      accounts={accounts.map((a) => ({
        id: a.id,
        metaAccountId: a.metaAccountId,
        name: a.name,
        bmName: a.bm.name,
        ownerId: a.ownerId ?? "",
        status: a.status,
        currency: a.currency,
        timezone: a.timezone ?? "",
      }))}
      bms={bms}
      buyers={buyers}
    />
  );
}

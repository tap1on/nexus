import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BmManager } from "@/components/admin/BmManager";

export default async function BmsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/");
  const bms = await db.businessManager.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      status: true,
      systemUserToken: true,
      _count: { select: { adAccounts: true } },
    },
  });
  return (
    <BmManager
      bms={bms.map((b) => ({
        id: b.id,
        name: b.name,
        status: b.status,
        tokenPreview: `…${b.systemUserToken.slice(-6)}`,
        accounts: b._count.adAccounts,
      }))}
    />
  );
}

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserManager } from "@/components/admin/UserManager";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/");
  const users = await db.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      _count: { select: { adAccounts: true } },
    },
  });
  return (
    <UserManager
      users={users.map((u) => ({ ...u, accounts: u._count.adAccounts }))}
      selfId={user.id}
    />
  );
}

import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LinkGenerator } from "@/components/LinkGenerator";

export default async function LinksPage() {
  const user = (await getSessionUser())!;
  const [accounts, offers] = await Promise.all([
    db.adAccount.findMany({
      where: {
        status: "ACTIVE",
        ...(user.role === "BUYER" ? { ownerId: user.id } : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, metaAccountId: true, name: true, bm: { select: { name: true } } },
    }),
    db.offer.findMany({
      where: { status: "ACTIVE", instance: { status: "ACTIVE" } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        trackingUrl: true,
        networkOfferId: true,
        instance: { select: { name: true } },
      },
    }),
  ]);

  return (
    <LinkGenerator
      accounts={accounts.map((a) => ({
        id: a.id,
        metaAccountId: a.metaAccountId,
        label: `${a.name} (${a.bm.name})`,
      }))}
      offers={offers.map((o) => ({
        id: o.id,
        label: `${o.name} — ${o.instance.name}${o.networkOfferId ? ` (#${o.networkOfferId})` : ""}`,
        trackingUrl: o.trackingUrl,
      }))}
    />
  );
}

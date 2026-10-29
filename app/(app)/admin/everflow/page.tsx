import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EverflowManager } from "@/components/admin/EverflowManager";
import { OffersPanel } from "@/components/admin/OffersPanel";

export default async function EverflowPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/");
  const [instances, offers] = await Promise.all([
    db.everflowInstance.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    db.offer.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: { instance: { select: { name: true } } },
    }),
  ]);
  return (
    <div className="space-y-8">
      <EverflowManager
        instances={instances.map((i) => ({
          id: i.id,
          name: i.name,
          keyPreview: `…${i.apiKey.slice(-6)}`,
          timezoneId: i.timezoneId,
          status: i.status,
        }))}
      />
      <OffersPanel
        instances={instances
          .filter((i) => i.status === "ACTIVE")
          .map((i) => ({ id: i.id, name: i.name }))}
        offers={offers.map((o) => ({
          id: o.id,
          name: o.name,
          instanceName: o.instance.name,
          networkOfferId: o.networkOfferId,
          trackingUrl: o.trackingUrl,
          status: o.status,
        }))}
      />
    </div>
  );
}

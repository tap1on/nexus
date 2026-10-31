import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EverflowManager } from "@/components/admin/EverflowManager";
import { OffersPanel } from "@/components/admin/OffersPanel";

export default async function EverflowPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/");
  const [instances, offers, eventRows] = await Promise.all([
    db.everflowInstance.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    db.offer.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: { instance: { select: { name: true } } },
    }),
    // Event names actually seen in synced data, per instance+offer — these
    // feed the Step 1 / Step 2 dropdowns.
    db.everflowEventStat.findMany({
      distinct: ["instanceId", "offerId", "event"],
      select: { instanceId: true, offerId: true, event: true },
    }),
  ]);
  const eventOptions: Record<string, string[]> = {};
  for (const r of eventRows) {
    const key = `${r.instanceId}:${r.offerId}`;
    (eventOptions[key] ??= []).push(r.event);
  }
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
          step1Event: o.step1Event,
          step2Event: o.step2Event,
          events: eventOptions[`${o.instanceId}:${o.networkOfferId}`] ?? [],
        }))}
      />
    </div>
  );
}

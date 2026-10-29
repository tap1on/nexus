import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Nav } from "@/components/Nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-r border-edge bg-surface/60 flex flex-col">
        <div className="p-5">
          <h1 className="text-lg text-gold">NEXUS</h1>
          <div className="khala-rule mt-2" />
          <p className="text-[0.65rem] text-ink-3 uppercase tracking-[0.2em] mt-2">
            Media Buying Tracker
          </p>
        </div>
        <Nav isAdmin={user.role === "ADMIN"} userName={user.name} />
      </aside>
      <main className="flex-1 min-w-0 p-6">{children}</main>
    </div>
  );
}

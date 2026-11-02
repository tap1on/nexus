import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { THEME_COOKIE, normalizeTheme } from "@/lib/theme";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const jar = await cookies();
  const theme = normalizeTheme(jar.get(THEME_COOKIE)?.value);

  return (
    <div className="min-h-screen md:flex">
      <Sidebar isAdmin={user.role === "ADMIN"} userName={user.name} theme={theme} />
      <main className="flex-1 min-w-0 p-4 md:p-6">{children}</main>
    </div>
  );
}

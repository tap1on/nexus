import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Orbitron, Rajdhani, Inter } from "next/font/google";
import { THEME_COOKIE, normalizeTheme } from "@/lib/theme";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Used by the "clean" theme only.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Nexus — Media Buying Tracker",
  description: "Meta spend × Everflow revenue, reconciled.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const jar = await cookies();
  const theme = normalizeTheme(jar.get(THEME_COOKIE)?.value);
  return (
    <html lang="en" data-theme={theme}>
      <body
        className={`${orbitron.variable} ${rajdhani.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

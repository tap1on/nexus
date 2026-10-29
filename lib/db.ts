import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// WAL lets the web app and the sync worker share the SQLite file without
// blocking each other (the setting persists in the database file).
db.$queryRawUnsafe("PRAGMA journal_mode=WAL;").catch(() => {});

// Create (or reset) an admin user.
// Usage: npm run create-admin -- <email> <password> [name]
import { db } from "../lib/db";
import { hashPassword } from "../lib/auth";

async function main() {
  const [email, password, ...nameParts] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: npm run create-admin -- <email> <password> [name]");
    process.exit(1);
  }
  const name = nameParts.join(" ") || email.split("@")[0];
  const user = await db.user.upsert({
    where: { email: email.toLowerCase() },
    create: {
      email: email.toLowerCase(),
      name,
      passwordHash: hashPassword(password),
      role: "ADMIN",
    },
    update: {
      passwordHash: hashPassword(password),
      role: "ADMIN",
      active: true,
    },
  });
  console.log(`Admin ready: ${user.email} (${user.name})`);
}

main().finally(() => db.$disconnect());

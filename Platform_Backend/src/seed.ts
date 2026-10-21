import bcrypt from "bcryptjs";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

async function main() {
  const email = env.PLATFORM_ADMIN_EMAIL.toLowerCase();
  const passwordHash = await bcrypt.hash(env.PLATFORM_ADMIN_PASSWORD, 12);
  const admin = await prisma.platformUser.upsert({
    where: { email },
    update: { name: env.PLATFORM_ADMIN_NAME, passwordHash, role: "platform_admin", isActive: true },
    create: { name: env.PLATFORM_ADMIN_NAME, email, passwordHash, role: "platform_admin", isActive: true }
  });
  console.log(`Platform administrator ready: ${admin.email}`);
  console.log("Use PLATFORM_ADMIN_PASSWORD from your local .env to sign in.");
}
main().catch((error) => { console.error("Platform seed failed:", error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });

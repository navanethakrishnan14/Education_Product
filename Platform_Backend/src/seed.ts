import bcrypt from "bcryptjs";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

/**
 * Bootstrap only the platform-admin table. This intentionally does not run
 * prisma db push, because this hosted database may already contain tenant data
 * owned by another part of the education platform.
 */
async function ensurePlatformUsersTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.platform_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'platform_admin',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_login_at TIMESTAMP(3),
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT platform_users_email_key UNIQUE (email)
    )
  `);
}

async function main() {
  await ensurePlatformUsersTable();

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

main()
  .catch((error) => {
    console.error("Platform seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

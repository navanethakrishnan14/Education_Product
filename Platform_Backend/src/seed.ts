import bcrypt from "bcryptjs";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

const PLATFORM_SCHEMA = "edusphere_platform";

/**
 * Prepare only the platform-owned schema and tables. The existing public
 * schema is shared with Tenant_backend and other platform components, so this
 * bootstrap deliberately never alters or drops those tables.
 */
async function ensurePlatformSchema(): Promise<void> {
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS edusphere_platform`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS edusphere_platform.platform_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'platform_admin',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_login_at TIMESTAMP(3),
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS edusphere_platform.school_tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tenant_code TEXT UNIQUE,
      tenant_type TEXT NOT NULL DEFAULT 'school',
      workspace_url TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      plan_name TEXT,
      details JSONB,
      official_email TEXT UNIQUE,
      admin_password_hash TEXT,
      password_setup_token_hash TEXT UNIQUE,
      password_setup_expires_at TIMESTAMP(3),
      password_set_at TIMESTAMP(3),
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Additive compatibility changes for a platform schema created by an older build.
  await prisma.$executeRawUnsafe(`ALTER TABLE edusphere_platform.school_tenants ADD COLUMN IF NOT EXISTS tenant_code TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE edusphere_platform.school_tenants ADD COLUMN IF NOT EXISTS tenant_type TEXT NOT NULL DEFAULT 'school'`);
  await prisma.$executeRawUnsafe(`ALTER TABLE edusphere_platform.school_tenants ADD COLUMN IF NOT EXISTS details JSONB`);
  await prisma.$executeRawUnsafe(`ALTER TABLE edusphere_platform.school_tenants ADD COLUMN IF NOT EXISTS official_email TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE edusphere_platform.school_tenants ADD COLUMN IF NOT EXISTS admin_password_hash TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE edusphere_platform.school_tenants ADD COLUMN IF NOT EXISTS password_setup_token_hash TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE edusphere_platform.school_tenants ADD COLUMN IF NOT EXISTS password_setup_expires_at TIMESTAMP(3)`);
  await prisma.$executeRawUnsafe(`ALTER TABLE edusphere_platform.school_tenants ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMP(3)`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS school_tenants_tenant_code_key ON edusphere_platform.school_tenants(tenant_code)`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS school_tenants_official_email_key ON edusphere_platform.school_tenants(official_email)`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS school_tenants_password_setup_token_hash_key ON edusphere_platform.school_tenants(password_setup_token_hash)`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS edusphere_platform.tenant_code_counters (
      id TEXT PRIMARY KEY,
      tenant_type TEXT NOT NULL,
      year INTEGER NOT NULL,
      last_number INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT tenant_code_counters_tenant_type_year_key UNIQUE (tenant_type, year)
    )
  `);

  // Copy platform-owned records from the former public tables where present.
  // This is copy-only and conflict-tolerant; it never deletes or changes the source.
  await prisma.$executeRawUnsafe(`
    DO $copy_platform_users$
    BEGIN
      IF to_regclass('public.platform_users') IS NOT NULL THEN
        INSERT INTO edusphere_platform.platform_users
          (id, name, email, password_hash, role, is_active, last_login_at, created_at, updated_at)
        SELECT id, name, email, password_hash, role, is_active, last_login_at, created_at, updated_at
        FROM public.platform_users
        ON CONFLICT DO NOTHING;
      END IF;
    END
    $copy_platform_users$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $copy_school_tenants$
    BEGIN
      IF to_regclass('public.school_tenants') IS NOT NULL THEN
        INSERT INTO edusphere_platform.school_tenants
          (id, name, workspace_url, status, plan_name, created_at, updated_at)
        SELECT id, name, workspace_url, status, plan_name, created_at, updated_at
        FROM public.school_tenants
        ON CONFLICT DO NOTHING;
      END IF;
    END
    $copy_school_tenants$;
  `);
}

async function main(): Promise<void> {
  await ensurePlatformSchema();

  const email = env.PLATFORM_ADMIN_EMAIL.toLowerCase();
  const passwordHash = await bcrypt.hash(env.PLATFORM_ADMIN_PASSWORD, 12);
  const admin = await prisma.platformUser.upsert({
    where: { email },
    update: { name: env.PLATFORM_ADMIN_NAME, passwordHash, role: "platform_admin", isActive: true },
    create: { name: env.PLATFORM_ADMIN_NAME, email, passwordHash, role: "platform_admin", isActive: true }
  });

  console.log("Platform schema ready: " + PLATFORM_SCHEMA);
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

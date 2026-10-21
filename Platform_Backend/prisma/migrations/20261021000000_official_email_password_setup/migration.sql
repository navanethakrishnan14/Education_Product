ALTER TABLE "school_tenants"
  ADD COLUMN IF NOT EXISTS "official_email" TEXT,
  ADD COLUMN IF NOT EXISTS "admin_password_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "password_setup_token_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "password_setup_expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "password_set_at" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "school_tenants_official_email_key" ON "school_tenants"("official_email");
CREATE UNIQUE INDEX IF NOT EXISTS "school_tenants_password_setup_token_hash_key" ON "school_tenants"("password_setup_token_hash");

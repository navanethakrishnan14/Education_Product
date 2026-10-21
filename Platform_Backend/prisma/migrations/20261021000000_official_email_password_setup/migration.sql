ALTER TABLE "school_tenants"
  ADD COLUMN "official_email" TEXT,
  ADD COLUMN "admin_password_hash" TEXT,
  ADD COLUMN "password_setup_token_hash" TEXT,
  ADD COLUMN "password_setup_expires_at" TIMESTAMP(3),
  ADD COLUMN "password_set_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "school_tenants_official_email_key" ON "school_tenants"("official_email");
CREATE UNIQUE INDEX "school_tenants_password_setup_token_hash_key" ON "school_tenants"("password_setup_token_hash");

CREATE TABLE "platform_users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'platform_admin',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "school_tenants" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "workspace_url" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "plan_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "school_tenants_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "tenant_users" (
  "id" TEXT NOT NULL,
  "school_tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'student',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");
CREATE UNIQUE INDEX "school_tenants_workspace_url_key" ON "school_tenants"("workspace_url");
CREATE UNIQUE INDEX "tenant_users_school_tenant_id_email_key" ON "tenant_users"("school_tenant_id", "email");
CREATE INDEX "school_tenants_status_idx" ON "school_tenants"("status");
CREATE INDEX "tenant_users_school_tenant_id_idx" ON "tenant_users"("school_tenant_id");
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_school_tenant_id_fkey" FOREIGN KEY ("school_tenant_id") REFERENCES "school_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

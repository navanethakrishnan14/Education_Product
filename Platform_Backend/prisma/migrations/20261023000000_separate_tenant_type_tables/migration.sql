-- Create separate type-specific configuration tables.
-- Existing school_tenants remains the shared tenant registry and authentication source.
CREATE TABLE IF NOT EXISTS "edusphere_platform"."schools" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "configuration" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "schools_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "schools_tenant_id_key" UNIQUE ("tenant_id"),
  CONSTRAINT "schools_tenant_id_fkey" FOREIGN KEY ("tenant_id")
    REFERENCES "edusphere_platform"."school_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "edusphere_platform"."colleges" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "configuration" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "colleges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "colleges_tenant_id_key" UNIQUE ("tenant_id"),
  CONSTRAINT "colleges_tenant_id_fkey" FOREIGN KEY ("tenant_id")
    REFERENCES "edusphere_platform"."school_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "edusphere_platform"."institutions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "configuration" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "institutions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "institutions_tenant_id_key" UNIQUE ("tenant_id"),
  CONSTRAINT "institutions_tenant_id_fkey" FOREIGN KEY ("tenant_id")
    REFERENCES "edusphere_platform"."school_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Backfill existing tenant records into the correct profile table.
INSERT INTO "edusphere_platform"."schools" ("id", "tenant_id", "configuration", "updated_at")
SELECT 'school_' || md5(id), id, details, CURRENT_TIMESTAMP
FROM "edusphere_platform"."school_tenants"
WHERE tenant_type = 'school'
ON CONFLICT ("tenant_id") DO NOTHING;

INSERT INTO "edusphere_platform"."colleges" ("id", "tenant_id", "configuration", "updated_at")
SELECT 'college_' || md5(id), id, details, CURRENT_TIMESTAMP
FROM "edusphere_platform"."school_tenants"
WHERE tenant_type = 'college'
ON CONFLICT ("tenant_id") DO NOTHING;

INSERT INTO "edusphere_platform"."institutions" ("id", "tenant_id", "configuration", "updated_at")
SELECT 'institution_' || md5(id), id, details, CURRENT_TIMESTAMP
FROM "edusphere_platform"."school_tenants"
WHERE tenant_type = 'institution'
ON CONFLICT ("tenant_id") DO NOTHING;

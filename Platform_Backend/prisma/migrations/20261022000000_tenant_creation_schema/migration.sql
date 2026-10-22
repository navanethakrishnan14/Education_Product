CREATE SCHEMA IF NOT EXISTS edusphere_platform;

-- The application uses the edusphere_platform schema (declared in schema.prisma).
-- Keep this migration safe for databases that already contain some of these columns.
CREATE TABLE IF NOT EXISTS edusphere_platform.school_tenants (
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  tenant_code TEXT,
  tenant_type TEXT NOT NULL DEFAULT 'school',
  workspace_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  plan_name TEXT,
  details JSONB,
  official_email TEXT,
  admin_password_hash TEXT,
  password_setup_token_hash TEXT,
  password_setup_expires_at TIMESTAMP(3),
  password_set_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL,
  CONSTRAINT school_tenants_pkey PRIMARY KEY (id)
);

ALTER TABLE edusphere_platform.school_tenants
  ADD COLUMN IF NOT EXISTS tenant_code TEXT,
  ADD COLUMN IF NOT EXISTS tenant_type TEXT NOT NULL DEFAULT 'school',
  ADD COLUMN IF NOT EXISTS plan_name TEXT,
  ADD COLUMN IF NOT EXISTS details JSONB,
  ADD COLUMN IF NOT EXISTS official_email TEXT,
  ADD COLUMN IF NOT EXISTS admin_password_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_setup_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_setup_expires_at TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS school_tenants_workspace_url_key
  ON edusphere_platform.school_tenants (workspace_url);
CREATE UNIQUE INDEX IF NOT EXISTS school_tenants_tenant_code_key
  ON edusphere_platform.school_tenants (tenant_code);
CREATE UNIQUE INDEX IF NOT EXISTS school_tenants_official_email_key
  ON edusphere_platform.school_tenants (official_email);
CREATE UNIQUE INDEX IF NOT EXISTS school_tenants_password_setup_token_hash_key
  ON edusphere_platform.school_tenants (password_setup_token_hash);
CREATE INDEX IF NOT EXISTS school_tenants_status_idx
  ON edusphere_platform.school_tenants (status);

CREATE TABLE IF NOT EXISTS edusphere_platform.tenant_code_counters (
  id TEXT NOT NULL,
  tenant_type TEXT NOT NULL,
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tenant_code_counters_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_code_counters_tenant_type_year_key
  ON edusphere_platform.tenant_code_counters (tenant_type, year);

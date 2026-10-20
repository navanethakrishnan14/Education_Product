-- PostgreSQL baseline for the School Product platform backend.
-- JSONB preserves flexible profile/snapshot fields from the former document model.
-- Apply only to the target database after backing it up.
BEGIN;
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS id_counters (
  prefix TEXT PRIMARY KEY,
  current_value BIGINT NOT NULL DEFAULT 0 CHECK (current_value >= 0)
);
CREATE OR REPLACE FUNCTION next_prefixed_id(p_prefix TEXT, p_padding INTEGER DEFAULT 6)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE v_next BIGINT;
BEGIN
  INSERT INTO id_counters(prefix,current_value) VALUES (p_prefix,1)
  ON CONFLICT(prefix) DO UPDATE SET current_value=id_counters.current_value+1
  RETURNING current_value INTO v_next;
  RETURN p_prefix || '-' || LPAD(v_next::TEXT, GREATEST(p_padding,1), '0');
END;
$$;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT next_prefixed_id('USR'), name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'admin', is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url TEXT, employee_id TEXT, employee_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  refresh_token TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY DEFAULT next_prefixed_id('ORG'), name VARCHAR(200) NOT NULL,
  workspace_url VARCHAR(100) UNIQUE, logo_url TEXT, industry_type VARCHAR(100) NOT NULL DEFAULT 'Other',
  company_size VARCHAR(50), billing_email VARCHAR(254), phone_number VARCHAR(30), currency CHAR(3),
  address JSONB, business JSONB, admin_setup JSONB, location_attendance JSONB, platform_settings JSONB,
  plan_id TEXT, discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK(discount_percentage BETWEEN 0 AND 100),
  modules JSONB NOT NULL DEFAULT '[]'::jsonb, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS organizations_is_active_idx ON organizations(is_active);
CREATE INDEX IF NOT EXISTS organizations_name_idx ON organizations(name);
CREATE TABLE IF NOT EXISTS org_users (
  id TEXT PRIMARY KEY DEFAULT next_prefixed_id('OUS'), name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'platform_admin', is_active BOOLEAN NOT NULL DEFAULT TRUE,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL, last_login TIMESTAMPTZ,
  refresh_token TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY DEFAULT next_prefixed_id('EMP'), name VARCHAR(100) NOT NULL, email VARCHAR(254) NOT NULL,
  password_hash TEXT NOT NULL, role VARCHAR(40) NOT NULL DEFAULT 'employee', is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, avatar_url TEXT,
  employee_id VARCHAR(100) NOT NULL, employee_profile JSONB NOT NULL DEFAULT '{}'::jsonb, refresh_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id,email), UNIQUE(organization_id,employee_id)
);
CREATE INDEX IF NOT EXISTS employees_name_idx ON employees(name);
CREATE TABLE IF NOT EXISTS billing_plans (
  id TEXT PRIMARY KEY DEFAULT next_prefixed_id('PLAN'), name VARCHAR(150) NOT NULL, slug VARCHAR(150) UNIQUE,
  description TEXT NOT NULL DEFAULT '', price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(price>=0),
  currency CHAR(3) NOT NULL DEFAULT 'INR', billing_cycle VARCHAR(30) NOT NULL DEFAULT 'monthly',
  features JSONB NOT NULL DEFAULT '{}'::jsonb, limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_id_fkey;
ALTER TABLE organizations ADD CONSTRAINT organizations_plan_id_fkey FOREIGN KEY(plan_id) REFERENCES billing_plans(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id TEXT PRIMARY KEY DEFAULT next_prefixed_id('SUB'), organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES billing_plans(id), status VARCHAR(30) NOT NULL DEFAULT 'active',
  billing_cycle VARCHAR(30) NOT NULL DEFAULT 'monthly', start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_start TIMESTAMPTZ, current_period_end TIMESTAMPTZ, cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS billing_subscriptions_org_status_idx ON billing_subscriptions(organization_id,status);
CREATE TABLE IF NOT EXISTS billing_periods (
  id TEXT PRIMARY KEY DEFAULT next_prefixed_id('BPER'), subscription_id TEXT NOT NULL REFERENCES billing_subscriptions(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL, period_end TIMESTAMPTZ NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'open',
  amount NUMERIC(14,2) NOT NULL DEFAULT 0, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK(period_end>=period_start)
);
CREATE TABLE IF NOT EXISTS billing_settings (
  id TEXT PRIMARY KEY DEFAULT next_prefixed_id('BSET'), organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id)
);
CREATE TABLE IF NOT EXISTS addons (
  id TEXT PRIMARY KEY DEFAULT next_prefixed_id('ADDON',4), module_key VARCHAR(100) NOT NULL UNIQUE,
  module_name VARCHAR(100) NOT NULL, identifier VARCHAR(100) NOT NULL UNIQUE, description TEXT NOT NULL DEFAULT '',
  flat_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(flat_price>=0), currency CHAR(3) NOT NULL DEFAULT 'INR',
  billing_cycle VARCHAR(30) NOT NULL DEFAULT 'monthly', addon_type VARCHAR(40) NOT NULL DEFAULT 'feature_module',
  trial_period_days INTEGER NOT NULL DEFAULT 0, trial_period_unit VARCHAR(10) NOT NULL DEFAULT 'none',
  usage_limit VARCHAR(120), sort_order INTEGER NOT NULL DEFAULT 0, applicable_plans JSONB NOT NULL DEFAULT '["all"]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY DEFAULT next_prefixed_id('AST'), organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_name VARCHAR(150) NOT NULL, asset_code VARCHAR(100) NOT NULL, category VARCHAR(100) NOT NULL, details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'Available', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id,asset_code)
);
CREATE INDEX IF NOT EXISTS assets_org_status_idx ON assets(organization_id,status);
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY DEFAULT next_prefixed_id('ATT'), employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, status VARCHAR(20) NOT NULL DEFAULT 'absent',
  check_in_time TIMESTAMPTZ NOT NULL, check_in_location JSONB NOT NULL, check_in_premises TEXT NOT NULL,
  check_out_time TIMESTAMPTZ, check_out_location JSONB, check_out_premises TEXT, attendance_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS attendance_employee_date_idx ON attendance(employee_id,attendance_date);
CREATE INDEX IF NOT EXISTS attendance_org_date_idx ON attendance(organization_id,attendance_date);
CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY DEFAULT next_prefixed_id('LEV'), employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL, employee_name VARCHAR(150) NOT NULL,
  leave_type VARCHAR(100) NOT NULL, from_date DATE NOT NULL, to_date DATE NOT NULL, reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending', supporting_document TEXT, reviewed_by TEXT, reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK(to_date>=from_date)
);
CREATE INDEX IF NOT EXISTS leave_org_status_idx ON leave_requests(organization_id,status);
CREATE TABLE IF NOT EXISTS feature_flags (
  id BIGSERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL, key VARCHAR(120) NOT NULL, description VARCHAR(500) NOT NULL DEFAULT '',
  type VARCHAR(20) NOT NULL DEFAULT 'RELEASE', environment VARCHAR(20) NOT NULL DEFAULT 'Production', enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK(rollout_percentage BETWEEN 0 AND 100), all_tenants BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_count INTEGER NOT NULL DEFAULT 0, tenant_overrides JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT NOT NULL DEFAULT 'system', updated_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(key,environment)
);
CREATE TABLE IF NOT EXISTS billing_invoices (
  id TEXT PRIMARY KEY DEFAULT next_prefixed_id('INV'), number VARCHAR(100) NOT NULL UNIQUE,
  organization_id TEXT NOT NULL REFERENCES organizations(id), subscription_id TEXT REFERENCES billing_subscriptions(id),
  plan_id TEXT REFERENCES billing_plans(id), status VARCHAR(30) NOT NULL DEFAULT 'draft', payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
  currency CHAR(3) NOT NULL DEFAULT 'INR', subtotal NUMERIC(14,2) NOT NULL DEFAULT 0, discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0, total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE, due_date DATE, billing_period_start TIMESTAMPTZ, billing_period_end TIMESTAMPTZ,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb, line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS billing_invoices_org_idx ON billing_invoices(organization_id,issue_date DESC);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY DEFAULT next_prefixed_id('PAY'), organization_id TEXT NOT NULL REFERENCES organizations(id),
  invoice_id TEXT REFERENCES billing_invoices(id), subscription_id TEXT REFERENCES billing_subscriptions(id), plan_id TEXT REFERENCES billing_plans(id),
  razorpay_order_id TEXT UNIQUE, razorpay_payment_id TEXT, razorpay_signature TEXT, amount NUMERIC(14,2) NOT NULL CHECK(amount>=0),
  currency CHAR(3) NOT NULL DEFAULT 'INR', status VARCHAR(30) NOT NULL DEFAULT 'created', payment_method VARCHAR(50),
  failure_reason TEXT, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS subscription_history (
  id TEXT PRIMARY KEY DEFAULT next_prefixed_id('SUBHIST'), organization_id TEXT NOT NULL REFERENCES organizations(id),
  subscription_id TEXT NOT NULL REFERENCES billing_subscriptions(id), change_type VARCHAR(30) NOT NULL,
  previous_plan_id TEXT, previous_plan_name TEXT, new_plan_id TEXT NOT NULL REFERENCES billing_plans(id), new_plan_name TEXT NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL, previous_period_start TIMESTAMPTZ NOT NULL, previous_period_end TIMESTAMPTZ NOT NULL,
  new_period_start TIMESTAMPTZ NOT NULL, new_period_end TIMESTAMPTZ NOT NULL, old_plan_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  new_plan_amount NUMERIC(14,2) NOT NULL DEFAULT 0, prorated_credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  prorated_charge NUMERIC(14,2) NOT NULL DEFAULT 0, final_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  invoice_id TEXT REFERENCES billing_invoices(id), changed_by TEXT, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS plan_upgrade_requests (
  id TEXT PRIMARY KEY DEFAULT next_prefixed_id('PUR'), organization_id TEXT NOT NULL REFERENCES organizations(id),
  current_plan_id TEXT NOT NULL, requested_plan_id TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending',
  rejection_reason TEXT, reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS upgrade_requests_org_status_idx ON plan_upgrade_requests(organization_id,status);
INSERT INTO schema_migrations(version) VALUES ('001_initial_postgresql_schema') ON CONFLICT DO NOTHING;
COMMIT;

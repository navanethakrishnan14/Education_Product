import 'dotenv/config';
import { pool } from './pool';

async function init() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE TABLE IF NOT EXISTS tenant_users (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      full_name VARCHAR(160) NOT NULL,
      email VARCHAR(254) NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('MANAGEMENT','FACULTY','PARENT','STUDENT')),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, email, role)
    )`);
    await client.query('CREATE INDEX IF NOT EXISTS tenant_users_tenant_role_idx ON tenant_users(tenant_id, role)');
    await client.query(`CREATE TABLE IF NOT EXISTS tenant_records (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      created_by BIGINT REFERENCES tenant_users(id) ON DELETE SET NULL,
      module_key VARCHAR(100) NOT NULL,
      name VARCHAR(200) NOT NULL,
      email VARCHAR(254) NOT NULL DEFAULT '',
      category VARCHAR(200) NOT NULL DEFAULT '',
      status VARCHAR(10) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await client.query('ALTER TABLE tenant_records ALTER COLUMN created_by DROP NOT NULL');
    // Platform Management tokens use Prisma CUID tenant IDs, while older tenant databases
    // created this column as UUID. Store tenant IDs as text so both CUID and UUID IDs work.
    await client.query('ALTER TABLE tenant_records ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text');
    await client.query('CREATE INDEX IF NOT EXISTS tenant_records_tenant_module_idx ON tenant_records(tenant_id, module_key, updated_at DESC)');
    await client.query(`CREATE TABLE IF NOT EXISTS tenant_organization_profiles (
      tenant_id TEXT PRIMARY KEY,
      organization_type VARCHAR(20) NOT NULL CHECK (organization_type IN ('School','College','Institution')),
      profile JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    // Platform tenant IDs are Prisma CUID strings. Upgrade the earlier UUID-only
    // profile table safely so existing UUID values remain readable as text.
    await client.query('ALTER TABLE tenant_organization_profiles ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text');
    await client.query('COMMIT');
    console.log('Tenant database schema is ready (users and operational records).');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
init().catch(error => {
  console.error('Database initialization failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool';

const DEMO_TENANT_ID = process.env.DEMO_TENANT_ID || '11111111-1111-4111-8111-111111111111';
const DEMO_EMAIL = process.env.DEMO_TENANT_EMAIL || 'management@edusphere.local';
const DEMO_PASSWORD = process.env.DEMO_TENANT_PASSWORD || 'EduSphere@2026';

async function seedDemoUser(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo seeding is disabled in production. Set NODE_ENV=development to seed a local test database.');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Configure Tenant_backend/.env first.');
  }
  if (DEMO_PASSWORD.length < 8) {
    throw new Error('DEMO_TENANT_PASSWORD must be at least 8 characters.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_users (
        id BIGSERIAL PRIMARY KEY,
        tenant_id UUID NOT NULL,
        full_name VARCHAR(160) NOT NULL,
        email VARCHAR(254) NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('MANAGEMENT', 'FACULTY', 'PARENT', 'STUDENT')),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, email, role)
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS tenant_users_tenant_role_idx ON tenant_users(tenant_id, role)');

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    await client.query(
      `INSERT INTO tenant_users (tenant_id, full_name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, 'MANAGEMENT', TRUE)
       ON CONFLICT (tenant_id, email, role)
       DO UPDATE SET full_name = EXCLUDED.full_name,
                     password_hash = EXCLUDED.password_hash,
                     is_active = TRUE`,
      [DEMO_TENANT_ID, 'EduSphere Demo Management', DEMO_EMAIL, passwordHash],
    );
    await client.query('COMMIT');
    console.log('Demo tenant user is ready.');
    console.log('Role: MANAGEMENT');
    console.log('Tenant ID: ' + DEMO_TENANT_ID);
    console.log('Email: ' + DEMO_EMAIL);
    console.log('Password: ' + DEMO_PASSWORD);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemoUser().catch((error: unknown) => {
  console.error('Demo user seeding failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

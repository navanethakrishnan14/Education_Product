import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool';

const DEMO_TENANT_ID = process.env.DEMO_TENANT_ID || '11111111-1111-4111-8111-111111111111';
const DEMO_PASSWORD = process.env.DEMO_TENANT_PASSWORD || 'EduSphere@2026';

const DEMO_USERS = [
  { fullName: 'EduSphere Demo Management', email: 'management@edusphere.local', role: 'MANAGEMENT' },
  { fullName: 'EduSphere Demo Faculty', email: 'faculty@edusphere.local', role: 'FACULTY' },
  { fullName: 'EduSphere Demo Parent', email: 'parent@edusphere.local', role: 'PARENT' },
  { fullName: 'EduSphere Demo Student', email: 'student@edusphere.local', role: 'STUDENT' },
] as const;

async function seedDemoUsers(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo seeding is disabled in production.');
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
    for (const user of DEMO_USERS) {
      await client.query(
        `INSERT INTO tenant_users (tenant_id, full_name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         ON CONFLICT (tenant_id, email, role)
         DO UPDATE SET full_name = EXCLUDED.full_name,
                       password_hash = EXCLUDED.password_hash,
                       is_active = TRUE`,
        [DEMO_TENANT_ID, user.fullName, user.email, passwordHash, user.role],
      );
    }
    await client.query('COMMIT');

    console.log('All four demo tenant users are ready:');
    console.log('Tenant ID: ' + DEMO_TENANT_ID);
    for (const user of DEMO_USERS) {
      console.log(user.role + ': ' + user.email);
    }
    console.log('Shared demo password: ' + DEMO_PASSWORD);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemoUsers().catch((error: unknown) => {
  console.error('Demo user seeding failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

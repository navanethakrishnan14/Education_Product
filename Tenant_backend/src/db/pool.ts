import 'dotenv/config';
import { Pool } from 'pg';

const rawDatabaseUrl = process.env.DATABASE_URL;
if (!rawDatabaseUrl) {
  console.error('DATABASE_URL is not set. Configure Tenant_backend/.env.');
}

// pg-connection-string currently warns that these modes behave like verify-full.
// Normalize them explicitly so the driver behavior stays the same without printing
// a dependency warning on every development startup.
const connectionString = rawDatabaseUrl?.replace(
  /([?&]sslmode=)(prefer|require|verify-ca)(?=(&|$)/gi,
  '$1verify-full',
);

export const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (error) => {
  console.error('PostgreSQL pool error:', error.message);
});

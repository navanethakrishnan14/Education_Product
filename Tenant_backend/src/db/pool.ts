import dotenv from 'dotenv';
import path from 'node:path';
import { Pool } from 'pg';

// Resolve .env relative to Tenant_backend, not process.cwd(). This keeps the
// API working whether it is started from Tenant_backend or the monorepo root.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const rawDatabaseUrl = process.env.DATABASE_URL;
if (!rawDatabaseUrl) {
  console.error('DATABASE_URL is not set. Configure Tenant_backend/.env.');
}

// Normalize SSL modes to preserve pg-connection-string's current verify-full
// behavior without emitting its compatibility warning during development.
const connectionString = rawDatabaseUrl?.replace(
  /([?&]sslmode=)(prefer|require|verify-ca)(?=&|$)/gi,
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

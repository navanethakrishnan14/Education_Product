'use strict';

require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required to inspect migration status.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  max: 1,
  connectionTimeoutMillis: 10000,
});

async function main() {
  const result = await pool.query("SELECT to_regclass('public.schema_migrations') AS table_name");
  if (!result.rows[0].table_name) {
    console.log('Migration status: no schema_migrations table found. Run npm run db:migrate.');
    return;
  }

  const applied = await pool.query(
    'SELECT version, applied_at FROM schema_migrations ORDER BY version',
  );
  if (applied.rowCount === 0) {
    console.log('Migration table exists, but no migrations are recorded.');
    return;
  }

  console.table(applied.rows.map((row) => ({
    version: row.version,
    applied_at: row.applied_at.toISOString(),
  })));
}

main()
  .catch((error) => {
    console.error('Could not read migration status:', error.message || error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

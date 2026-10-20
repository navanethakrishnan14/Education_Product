'use strict';

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required to run migrations.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  max: 1,
  connectionTimeoutMillis: 10000,
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    const directory = path.resolve(__dirname, '..', 'migrations');
    const files = fs.readdirSync(directory)
      .filter((name) => /^\d+_[a-z0-9_-]+\.sql$/i.test(name))
      .sort();

    if (files.length === 0) {
      throw new Error(`No SQL migration files found in ${directory}`);
    }

    for (const file of files) {
      const version = file.replace(/\.sql$/i, '');
      const existing = await client.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1',
        [version],
      );
      if (existing.rowCount) {
        console.log(`Already applied: ${version}`);
        continue;
      }

      const rawSql = fs.readFileSync(path.join(directory, file), 'utf8');
      // The baseline migration is also executable manually. Strip its outer
      // transaction statements so the schema and migration record commit atomically.
      const sql = rawSql
        .replace(/^\s*BEGIN\s*;\s*/im, '')
        .replace(/\s*COMMIT\s*;?\s*$/i, '');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations(version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
          [version],
        );
        await client.query('COMMIT');
        console.log(`Applied: ${version}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error('Database migration failed:', error.message || error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

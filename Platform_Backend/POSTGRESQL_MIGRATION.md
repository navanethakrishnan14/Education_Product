# PostgreSQL migration status and next steps

The platform backend was written against Mongoose document APIs. Replacing MongoDB requires converting every repository/service operation, not just changing the connection pool. This branch establishes the PostgreSQL pool and an initial relational schema while preserving flexible nested document payloads in JSONB.

## Important

- `main` has not been changed; all work is isolated on `migration/postgresql`.
- The tenant backend already uses PostgreSQL independently. Configure its `DATABASE_URL` to the same database only if shared-table access is intended; its `tenant_users` table remains separate from platform user tables.
- Back up existing MongoDB data before attempting a migration. This SQL schema does not move data out of MongoDB.
- The platform's Mongoose services, auth, seeders, billing logic, and controllers must be converted to SQL queries/transactions before this backend can be considered runnable. Do not deploy this branch yet.

## Setup

1. Create a PostgreSQL database named `school_product` (or adjust `DATABASE_URL`).
2. Copy `.env.example` to `.env` and supply real credentials. Never commit `.env`.
3. Apply `migrations/001_initial_postgresql_schema.sql` using psql or your database provider's SQL console after a backup.
4. Install dependencies and run `npm run build` after all Mongoose service conversions are complete.

## Planned conversion areas

- Replace model documents and methods with typed query/repository functions.
- Convert all controllers and services away from `findOne`, `populate`, `save`, `updateOne`, aggregation pipelines, Mongoose sessions, and document hooks.
- Replace embedded document schemas with JSONB where suitable and normalized relational tables where referential integrity or reporting matters.
- Rewrite seed scripts and background jobs using idempotent SQL upserts and transactions.
- Update tests, API response ID mappings, and deployment environment variables.

## Tenant login schema

The tenant backend currently manages `tenant_users` via its own `db:init` script. The schema uses the caller-provided `tenant_id` UUID and role-scoped unique emails, and should be reviewed for desired cross-database tenancy constraints before sharing a production database.

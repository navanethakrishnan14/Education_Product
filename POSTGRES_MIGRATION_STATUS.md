# PostgreSQL migration and repair status

Date: 2026-10-20

This repository has been reviewed before changing database dependencies. The project is **not yet fully migrated to PostgreSQL**.

## Confirmed current state

- `Platform_Backend/package.json` still declares Mongoose and MongoDB-oriented dependencies.
- Platform API startup imports `connectDB` from `src/config/db`; its current data layer and model/service files must be migrated together, not by swapping dependencies alone.
- `Tenant_backend` already declares PostgreSQL's `pg` client and has its own `db:init` script.
- `Tenant_frontend` and `Platform_frontend` are separate applications; frontend API URLs must match the relevant backend route prefixes and CORS configuration.
- The uploaded ZIP did not include all Platform source/configuration files, so this branch uses the repository's tracked source as the source of truth.

## Safe migration requirements

1. Create and review a complete PostgreSQL schema for the Platform domain before changing production database access.
2. Replace Mongoose models and every model query in controllers, services, seeders, jobs, and scripts with typed PostgreSQL/Prisma queries.
3. Add versioned migrations and a data migration/verification plan. Do not delete migration history or reset a database containing data.
4. Update environment validation and examples. Keep real `.env` files, credentials, API keys, and production URLs out of Git.
5. Build/type-check both backends and both frontends, then run integration tests against a disposable PostgreSQL database.
6. Confirm login, tenant isolation, school creation, billing, subscriptions, reports, uploads, and background jobs before switching deployment traffic.

## Known risks to resolve

- A dependency-only switch from Mongoose to Prisma would break imports and query APIs throughout Platform Backend.
- Existing migration folders and database schemas may not match one another. Inspect the target database and take a verified backup before applying migrations.
- Do not assume that an HTTP 200 response means login succeeded; authentication responses must include a token and user payload, and errors must use appropriate status codes.
- Rotate any credentials that were ever committed or included in local environment files.

## Validation status

No claim of full functionality is made by this audit alone. A live PostgreSQL instance and end-to-end test environment are required to verify database migrations and runtime behavior.

# School Product — EduSphere

EduSphere is split into four applications:

- `Platform_frontend/` — platform administration UI
- `Platform_Backend/` — platform API
- `Tenant_frontend/` — school portal with Management, Faculty, Parent, and Student login flows
- `Tenant_backend/` — tenant-scoped authentication API using PostgreSQL

## Important database status

The Tenant Backend uses PostgreSQL. The Platform Backend still contains Mongoose/MongoDB code and is **not yet safe to switch by changing package.json alone**. Its model definitions, services, controllers, seeders, background jobs, environment configuration, and database migrations must be converted and tested together.

See [POSTGRES_MIGRATION_STATUS.md](./POSTGRES_MIGRATION_STATUS.md) for the migration checklist and current blockers.

## Local setup

1. Install a supported Node.js LTS version and PostgreSQL.
2. In each backend folder, copy `.env.example` to `.env` and fill in local values.
3. Install dependencies separately in each application using `npm install`.
4. Follow each backend's scripts and migration instructions. Back up existing databases before applying schema changes.
5. Run each frontend with its `npm run dev` command after confirming its API base URL and backend CORS origin.

Never commit `.env` files, passwords, database URLs containing credentials, or API keys. Do not use demo credentials in production.

## Tenant implementation plan

See [TENANT_IMPLEMENTATION_PLAN.md](./TENANT_IMPLEMENTATION_PLAN.md) for the verified tenant-side architecture audit, current security/integration gaps, and phased implementation plan. This plan is based on the current repository and avoids assuming tenant APIs or models that have not been verified.

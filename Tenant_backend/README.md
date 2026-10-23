# Tenant Backend

Node.js + Express + TypeScript + PostgreSQL API for organization-scoped operational users and data.

## Separate database requirement

This service must use a PostgreSQL database different from the Platform Backend database.

- **Platform database: `edusphere_platform`** — platform administrators, organization/tenant registry, organization type and school/college/institution profile configuration. Configure it only in `Platform_Backend/.env`.
- **Tenant database: `edusphere_tenant`** — tenant-scoped Management, Faculty, Parent and Student accounts and operational data. Configure it only in `Tenant_backend/.env`.
- Use separate database names and, where possible, separate database credentials/roles. Do not copy the Platform connection string or JWT secret into this service.
- Platform Backend remains the source of truth for tenant registration and organization type. Tenant Backend stores tenant users and operational records keyed by `tenant_id`.

## Local setup

1. Create a PostgreSQL database named `edusphere_tenant` (or choose another dedicated tenant database).
2. Copy `.env.example` to `.env`; set `DATABASE_URL` to the tenant database and configure a unique private `JWT_SECRET` of at least 32 characters.
3. Run `npm install`.
4. Run `npm run db:init` to create the tenant user table and index in this database.
5. Run `npm run dev`.

Health check: `GET http://localhost:5000/health`.

Tenant login: `POST /api/v1/auth/login` with email, password, role (`MANAGEMENT`, `FACULTY`, `PARENT`, `STUDENT`) and tenant UUID.

User creation is intentionally not exposed publicly. Provision users securely through a reviewed administrative workflow. Never commit `.env` or real credentials.

# Tenant Backend

Node.js + Express + TypeScript + PostgreSQL API for organization-scoped operational users and data.

## Separate database requirement

This service must use a PostgreSQL database different from the Platform Backend database.

- **Platform database: `edusphere_platform`** — platform administrators, organization/tenant registry, organization type and school/college/institution profile configuration. Configure it only in `Platform_Backend/.env`.
- **Tenant database: `edusphere_tenant`** — tenant-scoped Management, Faculty, Parent and Student accounts and operational data. Configure it only in `Tenant_backend/.env`.
- Use separate database names and, where possible, separate database credentials/roles. Never copy the Platform database connection string into this service. Management API access can verify Platform-issued tokens only when `PLATFORM_JWT_SECRET` is explicitly configured.
- Platform Backend remains the source of truth for tenant registration and organization type. Tenant Backend stores tenant users and operational records keyed by `tenant_id`.

## Local setup

1. Create a PostgreSQL database named `edusphere_tenant` (or choose another dedicated tenant database).
2. Copy `.env.example` to `.env`; set `DATABASE_URL` to the tenant database and configure a private `JWT_SECRET` of at least 32 characters. To enable the Management dashboard's backend data, set `PLATFORM_JWT_SECRET` to the exact `JWT_SECRET` configured in `Platform_Backend/.env`. Keep both secrets server-side and never expose them in frontend variables.
3. Run `npm install`.
4. Run `npm run db:init` to create the tenant user and operational records tables in this database.
5. Run `npm run dev`.

Health check: `GET http://localhost:5000/health`.

Tenant login: `POST /api/v1/auth/login` with email, password, role (`MANAGEMENT`, `FACULTY`, `PARENT`, `STUDENT`) and tenant UUID.

User creation is intentionally not exposed publicly. Provision users securely through a reviewed administrative workflow. Never commit `.env` or real credentials.

# Tenant Backend

Node.js + Express + TypeScript + PostgreSQL API for organization-scoped operational users and data.

## Separate database requirement

Use a dedicated PostgreSQL database for Tenant Backend, separate from Platform Backend.

- **Platform database: `edusphere_platform`** — platform administrator accounts, tenant registry, registered organization type and lifecycle status.
- **Tenant database: `edusphere_tenant`** — tenant-scoped users, organization profile form data and operational records.
- `DATABASE_URL` must point only to the Tenant database. Never put a Platform connection string in `DATABASE_URL`.
- `PLATFORM_JWT_SECRET` must exactly match the private `JWT_SECRET` configured in `Platform_Backend/.env`; keep it server-side and never expose either secret through frontend environment variables.
- When tenant type and lifecycle verification is required, configure the optional server-only `PLATFORM_DATABASE_URL` to the Platform database. The Organization Profile API will then verify that the signed tenant exists, is active, and is registered as School, College or Institution before returning or saving profile data. Use a database role with read-only access to the `edusphere_platform.school_tenants` table, if possible.
- Platform remains the source of truth for tenant type/status. Tenant Backend stores form fields in `tenant_organization_profiles` keyed by the signed `tenantId`; no profile access trusts a client-supplied tenant ID.

## Local setup

1. Create a PostgreSQL database named `edusphere_tenant` (or another dedicated tenant database).
2. Copy `.env.example` to `.env`. Set a private Tenant `JWT_SECRET` of at least 32 characters. Set `PLATFORM_JWT_SECRET` to the exact Platform `JWT_SECRET`. If enabling registry verification, set `PLATFORM_DATABASE_URL` separately to the Platform database.
3. Run `npm install`.
4. Run `npm run db:init` to create/upgrade Tenant tables. The initializer uses additive table/index creation and type widening to preserve existing rows; it does not reset the database.
5. Run `npm run dev`.

## Organization Profile API

- `GET /api/v1/organization-profile` — loads the profile for the tenant ID from the verified Management token.
- `PUT /api/v1/organization-profile` — validates the organization type and saves profile form fields for that tenant.
- Both endpoints require a valid Platform Management session. When `PLATFORM_DATABASE_URL` is configured, the API verifies tenant existence, registered type and active status against Platform's registry. A mismatch returns an explicit error and does not overwrite the profile.
- Supported types: `School`, `College`, and `Institution`. The Tenant frontend uses the shared profile form, with school-specific or college-specific fields according to the registered type.
- Tenant Profile data is stored in PostgreSQL JSONB. Browser local storage is only a convenience cache and is not reported as a successful save.

Health check: `GET http://localhost:5000/health`.

Tenant user login: `POST /api/v1/auth/login` with email, password, role (`MANAGEMENT`, `FACULTY`, `PARENT`, `STUDENT`) and tenant UUID for legacy tenant-local users.

User creation is intentionally not exposed publicly. Provision users securely through a reviewed administrative workflow. Never commit `.env` files or real credentials.

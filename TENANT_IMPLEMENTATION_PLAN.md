# Tenant Foundation Audit and Implementation Plan

## Scope

This audit is based on the current `main` branch and the tenant-development requirements supplied for EduManage Cloud. It intentionally preserves the existing Platform Admin implementation and does not change production database data.

## Existing architecture verified

- **Tenant frontend:** React 18, TypeScript, Vite, React Router 6, Tailwind CSS 3 and lucide-react.
- **Tenant backend:** Express 4 + TypeScript, PostgreSQL through `pg`, bcryptjs, JWT, Zod, Helmet and CORS. It does not currently use Prisma.
- **Platform backend:** Express + TypeScript, PostgreSQL through Prisma 6, with the Prisma datasource scoped to the `edusphere_platform` schema.
- **Current Platform Prisma models:** `PlatformUser`, `SchoolTenant`, `TenantCodeCounter`, `SchoolProfile`, `CollegeProfile`, and `InstitutionProfile`.
- **Tenant authentication:** `POST /api/v1/auth/login` is exposed by Tenant_Backend. Tenant login currently requires a tenant UUID for Faculty, Parent and Student; Management login calls a separate Platform endpoint (`/api/v1/organization-auth/login`).
- **Frontend session:** login currently stores the token and user profile in localStorage or sessionStorage. The workspace checks for the cached token/profile but does not revalidate the session with a profile endpoint before showing the dashboard.
- **Current UI:** role selection and role login pages exist. Management has a responsive Tailwind dashboard and institution-type-specific menu definitions.

## Important gaps to close

1. **Trusted tenant resolution:** the tenant login form sends a tenant UUID from the browser. The backend must validate that the tenant exists and is active, and must verify membership for that tenant before issuing a token. A supplied tenant ID must never grant access by itself.
2. **Institution membership model:** the current Tenant backend's `tenant_users` table is a minimal role-based login table. It is not visibly integrated with Platform's `school_tenants` table or a durable membership relationship. Establish and document the shared tenant identifier contract before adding tenant-owned modules.
3. **Authenticated profile endpoint:** add or reuse a protected `GET /api/v1/auth/me` endpoint that reloads the user, status, membership and tenant context from the database. The frontend should validate the session on refresh and clear invalid sessions.
4. **Institution configuration endpoint:** expose a trusted tenant configuration response containing institution type, branding, setup status, academic configuration and enabled modules. Do not infer permissions from client-side values.
5. **Dynamic navigation and authorization:** current Management navigation is hardcoded by institution type and is not permission/module driven. Load allowed navigation from the backend and enforce authorization again on every protected backend route.
6. **Real dashboard values:** the current dashboard contains placeholder KPI values and a hardcoded setup percentage/checklist. Replace these with real tenant-scoped API data, or explicit “Not available yet”/empty states until those APIs exist.
7. **Setup wizard persistence:** the current setup checklist is UI navigation, not a persisted onboarding workflow. Add backend validation and save/resume behavior only after required setup fields and rules are agreed with the existing Platform tenant model.
8. **Institution lifecycle:** reject inactive/suspended tenants and inactive users at login and on protected requests.
9. **Tenant isolation tests:** add tests for cross-tenant access, invalid tenant IDs, inactive tenants, role restrictions, expired tokens and module restrictions. Test with at least two tenants.
10. **Platform API compatibility:** the README and migration-status document indicate Platform backend is a rebuilt PostgreSQL/Prisma API and warn that legacy billing/subscription functionality is not fully restored. Do not assume subscription/module APIs exist until verified.

## Recommended implementation order

### Phase A — secure foundation
- Confirm the canonical tenant identifier and the Platform-to-Tenant database integration strategy.
- Add server-side tenant lookup, active-state checks and membership authorization to login.
- Add authenticated `/auth/me` and tenant configuration endpoints using the current Express/`pg` conventions.
- Update the frontend API client/session restoration to revalidate identity and tenant access.
- Add safe loading, unauthorized, inactive-tenant and retry states.

### Phase B — configuration-driven experience
- Fetch institution type, branding, setup status and enabled modules from trusted backend configuration.
- Generate sidebar navigation from backend module access plus role permissions.
- Add frontend route guards for UX and matching server-side permission checks for security.
- Remove hardcoded dashboard metrics and derive KPI cards from tenant-scoped APIs.

### Phase C — persisted onboarding
- Map required setup fields to the actual institution/profile schema.
- Implement resumable, validated setup steps with idempotent writes and server-controlled completion.
- Redirect incomplete tenants to setup and completed tenants to the correct role dashboard.

### Phase D — academic modules
- Implement only modules supported by the schema and enabled for that tenant, starting with academic year and school/college academic structure.
- Add tenant-scoped CRUD APIs, validation, ownership checks, indexes and tests before exposing each module in navigation.

## Validation status

This is a repository audit/plan, not a claim that implementation or builds have completed. The live PostgreSQL database and runtime build/test commands were not available through this repository inspection. Run frontend and backend builds plus integration tests in a local environment before deployment. Do not run destructive schema resets or seed demo credentials in production.

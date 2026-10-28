# PostgreSQL setup: separate Platform and Tenant databases

The Platform and Tenant backends must use different PostgreSQL databases. They can run on the same PostgreSQL server, but their application data is stored separately.

## Database names

- `edusphere_platform`: Platform administration data (platform users, registered tenants, tenant code counters, and platform-side school/college/institution profile records).
- `edusphere_tenant`: Tenant application data (tenant users, organization profiles, and operational records).

The Platform Prisma models use a PostgreSQL schema named `edusphere_platform` inside the `edusphere_platform` database. A database and a schema are different things.

## 1. Create the databases

In pgAdmin, connect to your PostgreSQL server and open Query Tool. Run each statement separately. If a database already exists, do not drop or recreate it.

```sql
CREATE DATABASE edusphere_platform;
```

```sql
CREATE DATABASE edusphere_tenant;
```

## 2. Configure Platform_Backend/.env

Copy `Platform_Backend/.env.example` to `Platform_Backend/.env` and set a real local connection string:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/edusphere_platform"
```

Keep the other required Platform environment variables in place. Do not commit `.env` files or real secrets.

## 3. Configure Tenant_backend/.env

Copy `Tenant_backend/.env.example` to `Tenant_backend/.env`. Set both connection strings:

```env
# All tenant-owned data is stored here.
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/edusphere_tenant

# Read-only lookup of the Platform tenant registry, when needed by Platform Management flows.
PLATFORM_DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/edusphere_platform
```

Keep the Tenant `JWT_SECRET` and `PLATFORM_JWT_SECRET` configured as documented in the example file. Use the exact Platform JWT secret where the Tenant backend requires it. Never expose database credentials to frontend environment variables.

## 4. Initialize schemas and tables

Run these from the respective backend directories after configuring the local .env files.

Platform (PowerShell):
```powershell
cd Platform_Backend
npm install
npm run db:generate
npm run db:push:safe
npm run db:seed
```

Tenant (PowerShell):
```powershell
cd Tenant_backend
npm install
npm run db:init
```

The Platform safe setup script prepares the `edusphere_platform` schema and applies the Prisma schema to the Platform database. Tenant initialization creates its tables in the database referenced by Tenant `DATABASE_URL`.

## 5. Verify database separation

In pgAdmin, select each database separately and inspect its tables.

- In `edusphere_platform`, expect the `edusphere_platform` schema and tables such as `platform_users`, `school_tenants`, `tenant_code_counters`, `schools`, `colleges`, and `institutions`.
- In `edusphere_tenant`, expect public-schema tables such as `tenant_users`, `tenant_user_invites`, `tenant_records`, and `tenant_organization_profiles`.

Do not run Tenant `db:init` against the Platform database. Do not run Platform Prisma commands against the Tenant database.

## Existing data warning

Changing a connection string does not copy data. Before switching an existing project, back up both databases and inspect where the current records live. Do not use `prisma db push --force-reset`, drop either database, or delete existing tables as part of this setup. If you create a fresh Tenant database, existing operational/profile data must be migrated deliberately if it needs to be retained.

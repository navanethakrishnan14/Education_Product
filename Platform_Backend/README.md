# EduSphere Platform API

Node.js + Express + TypeScript API backed by PostgreSQL and Prisma. Routes are aligned with the Platform_frontend login and administration dashboard.

## Requirements
- Node.js 20+
- PostgreSQL 14+
- npm

## Local setup
1. Copy `.env.example` to `.env` and set `DATABASE_URL`, a strong `JWT_SECRET` (32+ characters), and the allowed frontend origin in `CORS_ORIGIN`.
2. Create a PostgreSQL database named `edusphere_platform` (or update the URL).
3. Run `npm install`.
4. Run `npm run db:generate`.
5. Run `npm run db:setup` to synchronize the Prisma schema with the configured PostgreSQL database and seed the initial platform administrator. This is intended for first-time development setup; review schema changes before using `prisma db push` on a database with existing data.
6. Run `npm run dev`.

API base URL: `http://localhost:4000/api/v1`

## Endpoints
- `GET /health` — liveness check
- `POST /api/v1/auth/login` — accepts `{ "email": "...", "password": "..." }`; returns top-level `token` and `user` fields required by the Platform_frontend
- `GET /api/v1/auth/me` — current administrator (Bearer token)
- `GET /api/v1/dashboard/overview` — registered school, tenant-user, and platform health metrics (Bearer token)
- `GET /api/v1/schools` — paginated school directory; optional `search`, `status`, `page`, `limit`
- `GET /api/v1/schools/:id` — school detail
- `GET /api/v1/users` — paginated tenant-user directory; optional `search`, `page`, `limit`
- `GET /api/v1/users/platform-admins` — platform administrator directory

All API endpoints except `/health` and `/api/v1/auth/login` require `Authorization: Bearer <token>`.

Seed credentials come from `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD` in `Platform_Backend/.env` (defaults: `admin@edusphere.com` / `ChangeMe123!` if not overridden). If your `.env` uses `SAAS_ADMIN_EMAIL` or `SAAS_ADMIN_PASSWORD`, those are not read by this backend; set the `PLATFORM_ADMIN_*` names instead. Change the example password before production use. Never commit your real `.env` file.

Note: the current Platform_frontend dashboard is primarily a visual shell and does not yet call the dashboard, schools, or users endpoints. These API endpoints are ready for that integration.

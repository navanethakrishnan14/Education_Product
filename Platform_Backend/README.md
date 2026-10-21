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
5. Run `npm run db:migrate:dev` on a fresh local database, or `npm run db:migrate` to apply committed migrations.
6. Run `npm run db:seed` to create the initial platform administrator.
7. Run `npm run dev`.

API base URL: `http://localhost:4001/api/v1`

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

Seed credentials come from `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD`. Change the example password before production use. Never commit your real `.env` file.

Note: the current Platform_frontend dashboard is primarily a visual shell and does not yet call the dashboard, schools, or users endpoints. These API endpoints are ready for that integration.

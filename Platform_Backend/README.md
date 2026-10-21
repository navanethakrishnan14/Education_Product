# EduSphere Platform API

Node.js + Express + TypeScript API backed by PostgreSQL and Prisma.

## Requirements
- Node.js 20+
- PostgreSQL 14+
- npm

## Local setup
1. Copy `.env.example` to `.env` and set `DATABASE_URL` and a strong `JWT_SECRET`.
2. Create a PostgreSQL database named `edusphere_platform` (or update the URL).
3. Run `npm install`.
4. Run `npm run db:generate`.
5. Run `npm run db:migrate`.
6. Run `npm run db:seed` to create the initial platform administrator.
7. Run `npm run dev`.

API base URL: `http://localhost:4001/api/v1`
Health check: `GET /health`
Login: `POST /api/v1/auth/login`
Current administrator: `GET /api/v1/auth/me` (Bearer token)
Dashboard metrics: `GET /api/v1/dashboard/overview` (Bearer token)

Seed credentials come from `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD`. Change the default password before production use. Never commit your real `.env` file.

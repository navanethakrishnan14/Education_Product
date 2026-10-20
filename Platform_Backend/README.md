# EduSphere Platform Backend
Clean PostgreSQL + Prisma backend for the platform administration UI, independent of the tenant-facing backend.

## Requirements
- Node.js 20+
- PostgreSQL 14+
- A local database named `school_product` (or change `DATABASE_URL`)

## Setup (PowerShell)
```powershell
Copy-Item .env.example .env
# Edit .env and set DATABASE_URL, JWT_SECRET (32+ characters), and admin credentials.
npm install
npx prisma generate
npm run db:migrate
npm run db:seed
npm run dev
```

## API
- `GET /health` — health check
- `POST /api/v1/auth/login` — `{ "email": "...", "password": "..." }`, returns `{ success, token, user }`
- `GET /api/v1/auth/me` — authenticated platform user
- `GET /api/v1/platform/overview` — school and user counts
- `GET /api/v1/platform/schools` — paginated school directory

Protected endpoints require `Authorization: Bearer <token>`.
Prisma schema is in `prisma/schema.prisma`. Run migrations against a development database first. Existing data from the removed backend is not automatically migrated.
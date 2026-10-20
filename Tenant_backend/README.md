# Tenant Backend
Node.js + Express + TypeScript + PostgreSQL API.

1. Copy `.env.example` to `.env`; configure DATABASE_URL and a unique JWT_SECRET of at least 32 characters.
2. Create the PostgreSQL database named in DATABASE_URL (example: edusphere).
3. Run `npm install`, `npm run db:init`, then `npm run dev`.
4. Health check: `GET http://localhost:4000/health`.
5. Login: `POST /api/v1/auth/login` with email, password, role (MANAGEMENT/FACULTY/PARENT/STUDENT), and tenantId UUID.

User creation is intentionally not exposed publicly. Provision users securely through a reviewed administrative workflow. Never commit `.env` or real credentials.
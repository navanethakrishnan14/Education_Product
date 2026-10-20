# Platform Frontend

Platform-level administration UI for EduSphere, separate from the tenant school portal. Built with React, TypeScript, Vite, and React Router.

## Run locally
1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set `VITE_PLATFORM_API_BASE_URL` to the platform backend API.
4. Run `npm run dev` and open the Vite URL shown in the terminal.

This UI provides a platform admin sign-in screen and an initial dashboard layout. Connect it to Platform_Backend and implement verified authentication before using it in production.
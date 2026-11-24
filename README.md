# Assured Rewards Webapp

This repository contains:

- Frontend: React + Vite app at the repo root (`src/`, `public/`).
- Backend: Express + Prisma API in `cashback backend/cashback`.
- Deployment helpers: `scripts/deploy-frontend.ps1` and `scripts/deploy-backend.ps1`.

## Repository Structure

```text
e:\webapp
|- src/                         # Frontend source
|- public/                      # Frontend public assets
|- scripts/                     # Deployment and utility scripts
|- cashback backend/cashback/   # Backend API (Express + Prisma)
|- DEPLOYMENT_VPS.md            # VPS deployment runbook
```

## Prerequisites

- Node.js and npm installed on local machine and VPS.
- PostgreSQL available for backend.
- PM2 installed on VPS for backend process management.
- Nginx installed on VPS for frontend hosting/reverse proxy.

## Environment Variables

### Frontend (`.env.development.local` / `.env.production`)

Use `.env.example` as a base:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.example
NEXT_PUBLIC_QR_BASE_URL=https://your-frontend-domain.example
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
```

### Backend (`cashback backend/cashback/.env`)

Use `cashback backend/cashback/.env.example` as a base. Required keys include:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `FRONTEND_URL`
- `PUBLIC_APP_URL`
- `QR_BASE_URL`

## Local Development

### 1) Start backend

```bash
cd "cashback backend/cashback"
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Backend default port is `5000`.

### 2) Start frontend (new terminal)

```bash
cd e:\webapp
npm install
npm run dev
```

The Next.js dev server (http://localhost:3000) forwards `/api` and `/uploads` to `http://localhost:5000` (see `next.config.mjs`). Local-only settings go in `.env.development.local`; production builds use `.env.production`.

## Production Build (frontend)

```bash
npm run build
```

Build output is generated in `dist/`.

## VPS Deployment

Use the deployment runbook:

- [DEPLOYMENT_VPS.md](./DEPLOYMENT_VPS.md)

It includes:

- Manual step-by-step frontend and backend deployment.
- PowerShell script-based deploy commands.
- PM2 and Nginx verification checklist.

# Assured Rewards Backend

Express + Prisma backend for the Assured Rewards platform.

## Path

`e:\webapp\cashback backend\cashback`

## Requirements

- Node.js + npm
- PostgreSQL
- Environment file (`.env`)

## Environment Setup

Copy `.env.example` to `.env` and fill required values:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `FRONTEND_URL`
- `PUBLIC_APP_URL`
- `QR_BASE_URL`

## Local Run

```bash
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

For non-watch mode:

```bash
npm start
```

## PM2 (Production)

`ecosystem.config.js` defines:

- app name: `cashback-api`
- script: `./src/index.js`
- mode: `cluster`

First-time PM2 start:

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## Deployment Guide

Full frontend + backend VPS deployment steps are in:

- [`../../DEPLOYMENT_VPS.md`](../../DEPLOYMENT_VPS.md)

## API Testing Docs

- `API_GUIDE.md`
- `POSTMAN_API_TESTING.md`

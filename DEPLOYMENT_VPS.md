# Assured Rewards VPS Deployment Guide

This guide is aligned with the current repo structure and scripts.

## Server Details

- Server IP: `82.112.235.245`
- SSH user: `root`
- Frontend (Next.js) deploy path: `/var/www/assuredrewards/web` (`current` -> active release)
- Frontend PM2 app name: `assuredrewards-web` (port `3000`, localhost only)
- Old static frontend path (pre-Next.js, kept for rollback): `/var/www/assuredrewards/frontend`
- Backend deploy path: `/var/www/cashback/cashback`
- Backend PM2 app name: `cashback-api`

## Deployment Options

- Option A (recommended on Windows): use the provided PowerShell scripts.
- Option B: run manual commands step by step.

---

## Option A: Script-Based Deployment (Windows PowerShell)

Run these from the repo root (`e:\webapp`).

### Frontend

```powershell
.\scripts\deploy-frontend.ps1
```

What this script does:

1. Runs `npm ci` (falls back to `npm install` if needed).
2. Runs `npm run build` (Next.js, `output: "standalone"`). Blog posts and brand pages are
   pre-rendered from the live API, using `NEXT_PUBLIC_API_BASE_URL` in `.env.production`.
3. Packs `.next/standalone` + `.next/static` + `public/` into a `.tgz` (no `.env` files).
4. Uploads it and extracts it to `/var/www/assuredrewards/web/releases/<timestamp>`.
5. Points `/var/www/assuredrewards/web/current` at the new release and restarts PM2 app
   `assuredrewards-web` (starts it on first deploy). Keeps the last 3 releases.
6. Checks that `http://127.0.0.1:3000/` answers on the server.

nginx is not touched by the script. The one-time nginx change is under
"First-Time Next.js Frontend Setup" below.

### Backend

```powershell
.\scripts\deploy-backend.ps1
```

What this script does:

1. SSH into server.
2. Pulls latest code from `main`.
3. Runs `npm ci --omit=dev`.
4. Runs `npx prisma migrate deploy`.
5. Runs `npx prisma generate`.
6. Restarts PM2 app with `--update-env`.
7. Shows PM2 status.

### Optional Script Parameters

If needed, you can override defaults:

```powershell
.\scripts\deploy-frontend.ps1 -Server "root@82.112.235.245" -RemoteBase "/var/www/assuredrewards/web" -Pm2App "assuredrewards-web"
.\scripts\deploy-backend.ps1 -Server "root@82.112.235.245" -RemoteAppDir "/var/www/cashback/cashback" -Branch "main" -Pm2App "cashback-api"
```

---

## Option B: Manual Deployment Commands

### Frontend Manual Flow

Use `scripts/deploy-frontend.ps1`. It builds, packages and restarts in one step.
To roll back to the previous release by hand:

```bash
ssh root@82.112.235.245
cd /var/www/assuredrewards/web/releases && ls -1t        # newest first
ln -sfn /var/www/assuredrewards/web/releases/<previous> /var/www/assuredrewards/web/current
pm2 restart assuredrewards-web
```

### Backend Manual Flow

### 1) SSH to server

```bash
ssh root@82.112.235.245
```

### 2) Run backend update steps

```bash
cd /var/www/cashback/cashback
git pull origin main
npm ci --omit=dev
npx prisma migrate deploy
npx prisma generate
pm2 restart cashback-api --update-env
pm2 status cashback-api
```

---

## First-Time Server Setup (PM2)

If `cashback-api` is not already registered in PM2:

```bash
cd /var/www/cashback/cashback
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

`ecosystem.config.js` in this repo already defines:

- app name: `cashback-api`
- script: `./src/index.js`
- mode: `cluster`
- memory restart: `500M`

---

## First-Time Next.js Frontend Setup

Do this once, when switching from the old static Vite build to Next.js.

1. **Node.js 20.9+ on the server** (`node -v`). The backend already uses Node 22.
2. **Port 3000 free**: `ss -ltnp | grep :3000` should print nothing.
3. **First deploy** from Windows: `.\scripts\deploy-frontend.ps1`. It starts PM2 app
   `assuredrewards-web` and runs `pm2 save`. Run `pm2 startup` once if PM2 isn't already set to start on boot.
   The live site is still served by the old static files at this point.
4. **Check it on the server** before switching traffic:
   ```bash
   curl -s http://127.0.0.1:3000/ | grep -o '<title>[^<]*'
   curl -s http://127.0.0.1:3000/sitemap.xml | head
   ```
5. **Switch nginx**: back up the site config, then replace only the `location /` block
   (the old `root .../frontend; try_files ...` one) with a `proxy_pass` to `127.0.0.1:3000`.
   Add the `/_next/static/` block too. Keep the SSL, `/api/` and `/uploads/` blocks unchanged.
   Full example: `deploy/nginx-assuredrewards.conf.example`.
   ```bash
   cp /etc/nginx/sites-available/<site> /root/<site>.before-nextjs
   nano /etc/nginx/sites-available/<site>
   nginx -t && systemctl reload nginx
   ```
6. **Rollback** (if anything looks wrong): restore the backup and reload nginx. The old static
   files in `/var/www/assuredrewards/frontend` are untouched, so the old site comes straight back.
   ```bash
   cp /root/<site>.before-nextjs /etc/nginx/sites-available/<site>
   nginx -t && systemctl reload nginx
   ```

Runtime settings for the frontend (port, backend URL for server-side rendering) are in
`deploy/ecosystem.frontend.config.cjs`. Build-time public settings (`NEXT_PUBLIC_*`) come
from `.env.production` on the machine that runs the build.

## Pre-Deploy Checklist

- Local code has been tested.
- Frontend build succeeds (`npm run build`).
- `.env.production` has all `NEXT_PUBLIC_*` keys (API URL, QR URL, Razorpay, Firebase).
- Backend `.env` on server is up to date.
- `DATABASE_URL` and Prisma migrations are correct for production DB.
- PM2 app names are still `cashback-api` (backend) and `assuredrewards-web` (frontend).

## Post-Deploy Checklist

- Frontend loads from public domain.
- API health endpoint responds:

```bash
curl -I https://your-domain/
curl -I https://your-domain/api/public/home
```

- PM2 status is `online`:

```bash
pm2 status cashback-api
pm2 logs cashback-api --lines 100
```

- Nginx config test passes:

```bash
nginx -t
```

---

## Quick Command Blocks

### Frontend

```powershell
.\scripts\deploy-frontend.ps1
```

### Backend

```bash
ssh root@82.112.235.245
cd /var/www/cashback/cashback
git pull origin main
npm ci --omit=dev
npx prisma migrate deploy
npx prisma generate
pm2 restart cashback-api --update-env
pm2 status cashback-api
```

---

## Security Notes

- Prefer SSH keys over root password login.
- Avoid storing credentials in scripts or shared chat history.
- Restrict firewall ports to required services only.

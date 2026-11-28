# AI WhatsApp Concierge: Setup and Operations

How to run the assistant on a laptop, deploy it to the VPS, connect WhatsApp, smoke-test it, fix common problems and keep costs under control.

> **Quickest safe way to try it:** `npm run ai:demo` in `cashback backend/cashback` starts the assistant with sample data, no database and no `.env`; then `npm run dev` in the project root. The full test plan (automated tests, browser and phone checklists, real WhatsApp) is in [TESTING.md](./TESTING.md).

- **Interfaces and contracts:** [ARCHITECTURE.md](./ARCHITECTURE.md).
- **Why some settings matter** (WhatsApp pricing, Meta's AI policy, regulation): [RESEARCH.md](./RESEARCH.md).
- **The CEO demo:** [DEMO_SCRIPT.md](./DEMO_SCRIPT.md).

Paths below are relative to the repo root `e:\New Project\web-app\web-app\cashback`. Windows commands are for PowerShell; server commands are for bash over SSH.

## 1. What runs where

| Piece | Where | Port | Notes |
|---|---|---|---|
| Backend API (Express + Prisma) | `cashback backend/cashback` | 5000 | AI module in `src/aiAssistant/`, mounted at `/api/ai-assistant`. The WhatsApp webhook stays at `/api/webhooks/whatsapp`: the existing route answers Meta with 200 first, then hands the payload to the AI module |
| Frontend (Next.js 16) | repo root | 3000 (dev); 3001 behind nginx (prod, PM2 app `assuredrewards-web`) | `/ai-assistant` (showcase), `/ai-assistant/try?t=<tenantKey>` (phone simulator), `/ai-assistant/console` (advisor console) |
| Store | PostgreSQL via Prisma, or in-memory | — | `AI_STORE=prisma` in production; `memory` for laptop demos |
| External services (all optional) | Claude API, Meta WhatsApp Cloud API, SMTP | — | Without a Claude key, the rules engine answers. Without WhatsApp, use the simulator. Without SMTP, no booking emails |

Tenants: `assured-rewards` (Ria, our product) and `bajaj-capital-demo` (Arth, a concept demo with fictional advisors).

**Important:** the backend loads `cashback backend/cashback/.env` with `override: true` (`src/index.js`). **Values in `.env` win over variables set in your shell or by PM2.** Put AI settings in `.env`, then restart.

## 2. Local run (Windows)

### 2.1 Prerequisites

- **Node.js 24 and npm.** The VPS backend runs Node 22, which is also fine.
- **PostgreSQL:** optional. It is *not* needed for the memory-store demo.
- **An Anthropic API key:** optional. Without one, the rules engine answers.

> **Never point a local backend at the production database.** Besides the AI data, a full local start (a database is reachable) runs the API's background workers: bulk export and RBL payout requery. They act on whatever database `DATABASE_URL` names. For laptop demos, use the offline mode below or a local development database.

### 2.2 Backend

1. Install dependencies:
   ```powershell
   cd "e:\New Project\web-app\web-app\cashback\cashback backend\cashback"
   npm install
   ```
2. Add these lines to `cashback backend/cashback/.env`. If you don't have the file, copy `.env.example` to `.env` first.
   ```dotenv
   PORT=5000

   # --- AI demo on a laptop (nothing AI-related is written to any database) ---
   AI_STORE=memory
   AI_SEED_DEMO_DATA=true
   AI_CONSOLE_ACCESS_KEY=paste-a-long-random-string-here
   AI_WHATSAPP_AUTOREPLY=false

   # Optional: Claude. Leave empty to use the rules engine
   ANTHROPIC_API_KEY=
   AI_MODEL=claude-opus-5-5
   AI_EFFORT=low

   # --- Offline mode: no database at all. Use instead of a dev database ---
   # Starts ONLY the AI routes (simulator + console) and none of the background workers.
   # It kicks in when the database is unreachable. To force it, comment out your real
   # DATABASE_URL line and use this unreachable one (restore yours afterwards):
   AI_DEMO_ALLOW_NO_DB=true
   # DATABASE_URL=postgresql://offline:offline@127.0.0.1:1/offline
   ```
3. Generate a console key:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
4. Start the backend:
   ```powershell
   npm run dev
   ```
5. Check the startup log for:
   - `[AI Store] Seeded SAMPLE demo data into the memory store: {...}`;
   - `Server running on port 5000`. Offline mode adds `(offline AI demo mode)`.
6. Check the API:
   ```powershell
   Invoke-RestMethod http://localhost:5000/api/ai-assistant/public/tenants | ConvertTo-Json -Depth 6
   ```
   You should see two tenants, plus `llm.configured` (true when a key is set).

**Full local stack instead of offline mode:** use a *local* PostgreSQL in `DATABASE_URL`. Run `npx prisma migrate deploy` (it applies the AI migration to that database) and set `AI_STORE=auto` or `prisma`. To get sample rows in that database, see §2.4.

### 2.3 Frontend

```powershell
cd "e:\New Project\web-app\web-app\cashback"
npm install
npm run dev
```

- `.env.development.local` already sets `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000`.
- The backend allows CORS from `http://localhost:3000` by default.

Open:
- http://localhost:3000/ai-assistant: showcase with the simulator and the AI brain panel.
- http://localhost:3000/ai-assistant/try?t=bajaj-capital-demo (or `?t=assured-rewards`): phone-style simulator.
- http://localhost:3000/ai-assistant/console: enter `AI_CONSOLE_ACCESS_KEY`. It is stored in this browser's localStorage as `ai_console_key`. Admins signed in to Assured Rewards can also use their login, which needs the database.

### 2.4 Sample data

| Store | How | Notes |
|---|---|---|
| Memory | `AI_SEED_DEMO_DATA=true` in `.env` | Seeds at startup and resets on restart. Rows show a **Sample** badge |
| Memory, dry run of the seed script | `$env:AI_STORE="memory"; node scripts/ai-assistant-seed-demo.js` | The seed script lets shell variables win (it loads `.env` without override) |
| PostgreSQL | `node scripts/ai-assistant-seed-demo.js --yes-write-to-database [--tenant bajaj-capital-demo]` | Writes clearly marked rows: `metadata.sample=true`, fictional people, numbers in the unassignable +91 00000 range. WhatsApp sends to them are always suppressed. Safe to run twice. **Only with the database owner's approval**, and never against production without sign-off |

### 2.5 Optional: try it on a phone on the same Wi-Fi

A phone can't reach the laptop as `localhost`. These steps reflect our reading of the code and Next.js 16 docs; verify them in a dry run.

1. Find the laptop's Wi-Fi IPv4 address with `ipconfig`, e.g. `192.168.1.20`.
2. In the backend `.env`, add `ALLOWED_ORIGINS=http://192.168.1.20:3000` (CORS), then restart the backend.
3. Start the frontend with the API pointing at the laptop. Shell variables take precedence over `.env.*` files in Next.js. Next 16 blocks dev requests from other hostnames unless the server was started with that hostname, which is what `-H` does.
   ```powershell
   $env:NEXT_PUBLIC_API_BASE_URL = "http://192.168.1.20:5000"
   npx next dev -H 192.168.1.20
   ```
4. Allow Node.js through Windows Firewall on *private* networks (ports 3000 and 5000).
5. On the phone, open `http://192.168.1.20:3000/ai-assistant/try?t=bajaj-capital-demo`.

In production none of this is needed: the phone simply opens `https://<host>/ai-assistant/try?t=bajaj-capital-demo`.

### 2.6 Rehearse without an API key

Leave `ANTHROPIC_API_KEY` empty. The rules engine then:
- answers from the knowledge base;
- runs the calculators;
- lists slots and books calls;
- handles STOP/START and AGENT.

The AI brain shows **rules engine**. This is also what happens automatically if the Claude API fails mid-demo.

### 2.7 Using an OpenRouter key instead of an Anthropic key

Set `OPENROUTER_API_KEY=sk-or-...` and leave `ANTHROPIC_API_KEY` empty (in `.env.ai-demo` for the laptop,
or the server `.env`). Nothing else changes: the engine calls the same Claude model through OpenRouter's
Anthropic-compatible API (`https://openrouter.ai/api`, model `anthropic/claude-opus-5.5`), with every
request pinned to Anthropic as the upstream provider (`OPENROUTER_PROVIDER_ORDER=anthropic`). The AI brain
and the console's System tab show "via OpenRouter".

- Verified live on 28 Nov 2026: a 6-message Bajaj Capital chat (SIP calculation, Hinglish tax question,
  off-topic refusal, slots, booking) worked end to end, prompt caching included; it cost about $0.19.
- First reply after an idle period is slower (~14 s, the prompt cache is cold); later replies took
  4–11 s. Send one `Hi` a few minutes before a live demo.
- OpenRouter is an extra party in the data path. In its settings (https://openrouter.ai/settings/privacy)
  keep prompt logging off and training disallowed. For a regulated client's production pilot, prefer the
  direct Anthropic API or AWS Bedrock in an Indian region (see RESEARCH.md).
- A key pasted into chats, tickets or code must be rotated (OpenRouter → Settings → Keys).

## 3. Production deploy (VPS)

Server layout and scripts are in [DEPLOYMENT_VPS.md](../../DEPLOYMENT_VPS.md):

| Item | Value |
|---|---|
| Backend path | `/var/www/cashback/cashback` |
| Backend PM2 app | `cashback-api`, **cluster mode, `instances: "max"`** |
| Frontend PM2 app | `assuredrewards-web` on port 3001 |

`deploy-backend.ps1` runs `git pull origin main` on the server, so the code must be merged to `main` and pushed first.

### 3.1 Back up the database first

```bash
ssh root@<server>
mkdir -p /root/backups
cd /var/www/cashback/cashback
# Read DATABASE_URL from .env and drop Prisma-only query parameters such as ?schema=public (pg_dump rejects them)
DB_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"' | sed 's/?.*$//')"
pg_dump "$DB_URL" -Fc -f "/root/backups/cashback-$(date +%F-%H%M).dump"
ls -lh /root/backups | tail -3
pg_restore --list "$(ls -t /root/backups/*.dump | head -1)" | head    # proves the dump is readable
```

- `pg_dump` must be the same major version as the database server, or newer.
- If the database is managed by a provider, take a provider snapshot as well.

### 3.2 Check the migration

```bash
cd /var/www/cashback/cashback
npx prisma migrate status
```

**Expected:** `20261128120000_ai_whatsapp_assistant` is listed as pending.

**What it does:** it is **additive only**. It creates six tables (`AiConversation`, `AiMessage`, `AiLead`, `AiAdvisor`, `AiBooking`, `AiKnowledgeDoc`) with their indexes and foreign keys, which point only between these tables. **No existing table is changed.**

### 3.3 Deploy the backend

From the repo root on Windows:

```powershell
.\scripts\deploy-backend.ps1
```

The script runs `git pull`, `npm ci --omit=dev`, `npx prisma migrate deploy` (which applies the AI migration) and `npx prisma generate`, then `pm2 restart cashback-api --update-env`.

### 3.4 Set the environment on the server

Edit `/var/www/cashback/cashback/.env` and add or adjust:

```dotenv
# --- AI WhatsApp Concierge ---
ANTHROPIC_API_KEY=sk-ant-...                 # use a dedicated key/workspace for this app
AI_MODEL=claude-opus-5-5
AI_EFFORT=low
AI_FAST_MODE=false
AI_STORE=prisma                              # REQUIRED with PM2 cluster mode (see §7)
AI_SEED_DEMO_DATA=false
AI_DEMO_ALLOW_NO_DB=false
AI_CONSOLE_ACCESS_KEY=<long random string>
AI_SIMULATOR_ENABLED=true
AI_SIMULATOR_RATE_LIMIT=40                   # raise to ~200 on a demo day
AI_WHATSAPP_AUTOREPLY=false                  # flip to true in §3.7
AI_WHATSAPP_DEFAULT_TENANT=assured-rewards
AI_WHATSAPP_DEMO_ALLOWLIST=                  # e.g. 9198XXXXXXXX,9199XXXXXXXX (presenter, CEO)
AI_WHATSAPP_ALLOW_DEMO_TENANTS=false         # keep false on a public number
AI_WHATSAPP_DISPLAY_NUMBER=+91 XXXXX XXXXX
AI_ADVISOR_NOTIFY_EMAIL=team@your-domain
AI_REMINDERS_ENABLED=true
AI_USD_INR=88
WHATSAPP_APP_SECRET=<Meta app secret>        # enables X-Hub-Signature-256 verification
WHATSAPP_GRAPH_VERSION=v25.0                 # code default is v25.0; v21.0 is removed by Meta on 21 Jan 2027
# Already present for OTP delivery: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN,
# WHATSAPP_WEBHOOK_VERIFY_TOKEN, WHATSAPP_WABA_ID, WHATSAPP_OTP_TEMPLATE_NAME
```

Restart and watch the logs:

```bash
pm2 restart cashback-api --update-env
pm2 logs cashback-api --lines 150
```

**Expected:** `[AI Store] Using the Prisma store (AI_STORE=prisma).`

**Not expected:** any warning about falling back to the in-memory store.

**About the demo allowlist**

- `AI_WHATSAPP_DEMO_ALLOWLIST` decides who can reach the **Bajaj Capital demo persona** on our real WhatsApp number, by typing "Hi Bajaj Capital" or `#bajaj`. Everyone else always gets Assured Rewards (Ria).
- Bajaj Capital has not authorised a public bot, so the demo persona must not be reachable by the public. Arth introduces itself as "a concept demo prepared for Bajaj Capital by Assured Rewards".
- Before the meeting, add the presenter's number, plus the CEO's if he'll try it on WhatsApp. Or use the web simulator (`/ai-assistant/try`), which needs no allowlist.
- **QR caveat.** When `AI_WHATSAPP_DISPLAY_NUMBER` is set, the showcase's "Try it on your phone" QR opens real WhatsApp with "Hi Bajaj Capital" pre-filled. Non-allowlisted phones then land on Ria. Leave the display number empty if the QR should open the simulator.

### 3.5 Deploy the frontend

From the repo root on Windows:

```powershell
.\scripts\deploy-frontend.ps1
```

- It builds with `.env.production`; `NEXT_PUBLIC_API_BASE_URL` must be the production API origin.
- It uploads the build, switches the `current` release and restarts `assuredrewards-web`.
- The AI pages render in the browser and call the API directly; they don't need a server-side backend URL.

Then open `https://<host>/ai-assistant` and `https://<host>/ai-assistant/console`.

### 3.6 Connect WhatsApp (Meta App Dashboard)

Menu names can differ slightly between dashboard versions.

1. **Webhook.** Go to **WhatsApp → Configuration → Webhook**:
   - **Callback URL:** `https://<host>/api/webhooks/whatsapp`. It must be HTTPS with a valid certificate; nginx already proxies `/api/`.
   - **Verify token:** exactly the value of `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
   - Click **Verify and save**. Meta sends a GET, and our route echoes `hub.challenge`.
2. **Webhook fields:** subscribe to **`messages`**. It covers inbound messages and delivery statuses.
3. **App secret:** **App settings → Basic → App secret**. Put it in `WHATSAPP_APP_SECRET` and restart with `--update-env`. With it, every webhook POST is verified (HMAC-SHA256 of the raw body, compared in constant time). Without it, verification is skipped.
4. **Access token:** use a **System User** token with `whatsapp_business_messaging` and `whatsapp_business_management`. The dashboard's temporary token expires within a day.
5. **Subscribe the app to the WhatsApp Business Account (WABA).** This is a common gotcha when webhooks never arrive:
   ```bash
   curl -s "https://graph.facebook.com/v25.0/$WHATSAPP_WABA_ID/subscribed_apps" -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN"
   # if the list is empty:
   curl -s -X POST "https://graph.facebook.com/v25.0/$WHATSAPP_WABA_ID/subscribed_apps" -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN"
   ```
6. **Billing (WhatsApp Manager):**
   - A payment method must be on file. Since 1 Oct 2026, service replies beyond 1,000 a month per number are charged.
   - **Indian accounts must migrate to INR billing by 31 Dec 2026.** From 1 Jan 2027, Meta stops delivering messages from eligible non-INR accounts, **OTP messages included**.
7. **App mode:** the app must be **Live** for real users. Meta's test number only delivers to up to 5 verified recipient numbers.

### 3.7 Go live: turning on auto-reply

Set `AI_WHATSAPP_AUTOREPLY=true` only when all of these hold:

- [ ] Console → **System** shows:
  - store *prisma* and healthy;
  - LLM configured;
  - WhatsApp configured;
  - **signature verification on**;
  - auto-reply off;
  - the demo allowlist count you expect.
- [ ] The smoke tests in §6 pass in the simulator.
- [ ] A message from an allowlisted phone shows up in the logs as `AI_WHATSAPP_AUTOREPLY is off; not replying to 1 inbound message(s)`. That proves webhook and signature work end to end.
- [ ] OTP login still works, because the number is shared (§4).

Then run `pm2 restart cashback-api --update-env` and send "Hi" from your phone; Ria should answer.

### 3.8 Rollback and kill switch

| Goal | Action |
|---|---|
| **Stop all AI replies instantly** | `AI_WHATSAPP_AUTOREPLY=false`, then `pm2 restart cashback-api --update-env`. OTP sending is unaffected |
| Close the public simulator | `AI_SIMULATOR_ENABLED=false` |
| One conversation | Advisor console → **Take over**. The AI stays silent in that chat |
| Frontend | Point `current` at the previous release (DEPLOYMENT_VPS.md) |
| Backend code | Redeploy the previous commit. The AI tables are additive and can stay; restore the dump (`pg_restore`) only if you must. If the AI module fails to load, the rest of the API keeps running (`src/index.js` loads it defensively) |

## 4. The shared WhatsApp number (OTP and concierge)

Today **one** WhatsApp business number does two jobs:
- it sends login **OTPs** as authentication templates, which are business-initiated;
- with auto-reply on, it is also the **AI concierge** that answers users.

What that means:

| Topic | Implication | What to do |
|---|---|---|
| **Quality and limits are shared** | Messaging limits apply to the whole business portfolio and count business-initiated messages such as OTPs. Number and template quality depend on user feedback. If people block or report the bot, quality can drop, which can slow OTP scaling and get templates paused | Keep the bot polite and scoped; honour STOP (done); never send unsolicited messages from it |
| **Billing is shared** | AI replies use the number's **1,000 free service messages a month**, then cost ₹0.115 each (India, before GST). OTP templates are billed as before. One INR-migration or payment-method problem stops **both** | Do the WhatsApp Manager checks in §3.6 now |
| **Replies to OTP messages reach the AI** | Users who answer an OTP message ("code not received") now get Ria, who has a knowledge article for exactly this. **Ria never asks for an OTP**, and any OTP or PIN a user types is redacted before storage and before the model | Good outcome; keep the redaction on |
| **One business profile** | The demo persona Arth would reply under the **Assured Rewards** profile and name | Keep `AI_WHATSAPP_ALLOW_DEMO_TENANTS=false` and use the allowlist; never broadcast from the demo persona |
| **One webhook** | The same callback receives OTP delivery statuses. The existing logging stays; the AI module only acts on inbound messages and on statuses for its own replies | Nothing |
| **An outage hits both directions** | If our webhook is down, inbound messages queue on Meta's side. OTP *sending* is unaffected | Watch `pm2 logs`; keep the kill switch handy |

**Recommendation:**
- Before scaling, add a **second phone number** under the same WABA for the concierge and map it with `AI_WHATSAPP_TENANT_MAP={"<phone_number_id>":"assured-rewards"}`. Keep OTPs on their own number.
- For a Bajaj Capital pilot, use **their** WABA and number.

## 5. Environment variables

Backend variables go in `cashback backend/cashback/.env`; the list matches ARCHITECTURE §10, plus a few extras. Restart after any change. In production, use `pm2 restart cashback-api --update-env`.

| Variable | Default | Laptop demo | Production | Meaning |
|---|---|---|---|---|
| `ANTHROPIC_API_KEY` | – | your key, or empty | dedicated key | Claude API key. Empty means the rules engine answers |
| `AI_MODEL` | `claude-opus-5-5` | same | same, or `claude-sonnet-5-5` to roughly halve cost | Claude model id |
| `AI_EFFORT` | `low` | `low` | `low` | `low` / `medium` / `high`: latency vs depth |
| `AI_FAST_MODE` | `false` | `false` | `false` | `true` sends `speed: "fast"` (Opus 5.5, 2× price; falls back to standard speed on 429) |
| `AI_MAX_TOOL_ITERATIONS` | `6` | `6` | `6` | Max LLM calls per customer turn |
| `AI_REQUEST_TIMEOUT_MS` | `45000` | `45000` | `45000` | Timeout per Claude request |
| `AI_HISTORY_MESSAGES` | `20` | `20` | `20` | Stored messages replayed as context |
| `AI_STORE` | `auto` | `memory` | **`prisma`** | `auto` / `prisma` / `memory`. `auto` falls back to memory with a loud warning if the AI tables are missing |
| `AI_DEMO_ALLOW_NO_DB` | `false` | `true` (offline only) | `false` | With `AI_STORE=memory`, start the AI routes even when the database is unreachable (`src/index.js`, `.env.example`) |
| `AI_SEED_DEMO_DATA` | `false` | `true` | `false` | Seed marked sample conversations, leads and bookings into the **memory** store at startup |
| `AI_DEFAULT_TENANT` | `assured-rewards` | same | same | Simulator default |
| `AI_WHATSAPP_AUTOREPLY` | `false` | `false` | `true` after §3.7 | The assistant replies to inbound WhatsApp messages |
| `AI_WHATSAPP_DEFAULT_TENANT` | `assured-rewards` | – | `assured-rewards` | Tenant for new WhatsApp contacts |
| `AI_WHATSAPP_TENANT_MAP` | – | – | `{"<phone_number_id>":"<tenantKey>"}` | Route a business number to a tenant |
| `AI_WHATSAPP_DISPLAY_NUMBER` | – | – | `+91 …` | Number shown on the demo page and used for wa.me links |
| `AI_WHATSAPP_DEMO_ALLOWLIST` | – | – | presenter (+ CEO) | Comma-separated WhatsApp numbers (digits with country code) allowed to reach **demo** tenants on the real number. Everyone else gets the default tenant |
| `AI_WHATSAPP_ALLOW_DEMO_TENANTS` | `false` | – | `false` | `true` lets anyone switch to a demo tenant by keyword. Keep `false` on a public number |
| `WHATSAPP_APP_SECRET` | – | – | **required** | Meta app secret. Enables `X-Hub-Signature-256` verification (skipped when empty) |
| `AI_CONSOLE_ACCESS_KEY` | – | any | long random | Key for the advisor console. Admins may use their login instead |
| `AI_SIMULATOR_ENABLED` | `true` | `true` | `true` (or `false` when not needed) | Public simulator endpoints on or off |
| `AI_SIMULATOR_RATE_LIMIT` | `40` | `40` | `40` (≈200 on demo day) | Simulator messages per IP per 5 minutes, per process |
| `AI_ADVISOR_NOTIFY_EMAIL` | – | – | team inbox | Copied on booking and escalation emails |
| `AI_REMINDERS_ENABLED` | `true` | `true` | `true` | Booking reminder worker. WhatsApp reminders go only inside the 24-hour window |
| `AI_USD_INR` | `88` | `88` | `88` | FX rate for the cost-per-conversation display |
| `AI_LOG_LEVEL` | `info` | `info` / `debug` | `info` | `silent` / `error` / `warn` / `info` / `debug` (`config.js`) |

**Existing variables the AI module reuses**

| Variable | Notes |
|---|---|
| `WHATSAPP_GRAPH_VERSION` | Code default `v25.0`. Pin **`v25.0` or later** |
| `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` | Shared with OTP delivery |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Webhook GET handshake |
| `WHATSAPP_WABA_ID` | Used for the `subscribed_apps` check |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Booking and escalation emails (none when `SMTP_HOST` is empty) |
| `PUBLIC_APP_URL` | Links |
| `ALLOWED_ORIGINS` | Extra CORS origins, e.g. the production site or a LAN origin for phone tests |
| `JWT_SECRET` | Admin login to the console |
| `PORT`, `DATABASE_URL` | Server and database |

**Frontend variables**

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Read at build or dev-start time. Dev value: `http://localhost:5000` (`.env.development.local`). Production value: in `.env.production` |
| `BACKEND_URL` | Next.js rewrite target for `/api` (default `http://127.0.0.1:5000`) |

## 6. Smoke-test checklist

Run these after every deploy, and before flipping auto-reply on. `<host>` is your domain.

1. **Tenants and model:**
   ```bash
   curl -s https://<host>/api/ai-assistant/public/tenants
   ```
   Expect two tenants and `"configured":true`.
2. **System status:**
   ```bash
   curl -s -H "X-AI-Console-Key: $KEY" https://<host>/api/ai-assistant/console/system
   ```
   Expect `store.kind:"prisma"`, `healthy:true`, `signatureVerification:true`.
3. **Simulator message:**
   ```bash
   curl -s -X POST https://<host>/api/ai-assistant/public/simulator/message \
     -H "Content-Type: application/json" \
     -d '{"tenantKey":"bajaj-capital-demo","sessionId":"smoketest_0001","text":"How does a SIP work?"}'
   ```
   Expect `handledBy:"claude"`, a reply, and a trace with knowledge hits. PowerShell equivalent:
   ```powershell
   Invoke-RestMethod -Method Post -Uri https://<host>/api/ai-assistant/public/simulator/message -ContentType 'application/json' -Body '{"tenantKey":"bajaj-capital-demo","sessionId":"smoketest_0001","text":"How does a SIP work?"}'
   ```
4. **Webhook verification:**
   ```bash
   curl -s "https://<host>/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=$VERIFY&hub.challenge=12345"
   ```
   Expect it to print `12345`.
5. **Signature rejection:**
   ```bash
   curl -s -X POST https://<host>/api/webhooks/whatsapp -H 'Content-Type: application/json' -d '{"entry":[]}'
   ```
   It still answers 200, but `pm2 logs` shows `Dropped a webhook call: X-Hub-Signature-256 verification failed`.
6. **In the browser** (`/ai-assistant`):
   - Ria, "Where's my cashback?": labelled sample account data.
   - Arth, "₹10,000 SIP for 15 years": numbers labelled illustrative, plus the mutual fund risk line.
7. **Booking:**
   - "I'm Asha. Can someone call me tomorrow evening?" → slots → tap one → booking card. Don't use "Test" or "Guest": generic names are rejected and the assistant asks for a real name.
   - Console → Bookings shows it, and `.ics` downloads.
   - With SMTP configured, the team inbox gets an email.
8. **No double booking:** from a second browser, try to book the same slot. You should be offered another one.
9. **Takeover:**
   - Console → Take over → reply. It appears in the simulator within about 3 seconds, and the AI stays silent.
   - Hand back to AI, and the AI resumes.
10. **PII:**
    - "My PAN is ABCDE1234F": a privacy note appears, the console shows `[PAN removed]`, and the trace lists `pii_redacted:pan`.
11. **Opt-out:** `STOP` → confirmation; `Hi` → no reply; `START` → welcome back.
12. **Real WhatsApp, from an allowlisted phone:**
    - "Hi" → Ria.
    - "Hi Bajaj Capital" → Arth.
    - `#assured` switches back.
    - From a non-allowlisted phone, `#bajaj` stays on Ria.
13. **24-hour rule:** a console reply to a WhatsApp chat whose last inbound message is more than 24 hours old returns `409 OUTSIDE_24H_WINDOW`. This is expected.
14. **OTP regression:** request a login OTP for a test account; it still arrives.
15. **Processes:** `pm2 status` shows all instances online, and `pm2 logs cashback-api` shows no errors with `[AI` in them.

## 7. Troubleshooting

### No replies on WhatsApp

Check in this order:

| # | Cause | What you'll see | Fix |
|---|---|---|---|
| 1 | Auto-reply is off | Log: `AI_WHATSAPP_AUTOREPLY is off; not replying…` | Set `AI_WHATSAPP_AUTOREPLY=true`, then restart with `--update-env` |
| 2 | Nothing reaches us | No webhook log lines at all | The `messages` field isn't subscribed; the app isn't subscribed to the WABA (§3.6 step 5); the app isn't Live; or the callback URL or TLS is wrong |
| 3 | Signature mismatch | Log: `Dropped a webhook call: X-Hub-Signature-256 verification failed` | `WHATSAPP_APP_SECRET` belongs to another app, has stray spaces, or a proxy rewrote the body |
| 4 | Outside the 24-hour window | Agent replies fail with `409 OUTSIDE_24H_WINDOW`, or Meta error **131047** | Free-form messages are only allowed within 24 hours of the user's last message. Use an approved template (roadmap). AI replies are always in-window |
| 5 | Test-number recipient allowlist | Meta error **131030** "Recipient phone number not in allowed list" | Add the number under the test number's recipients (maximum 5), or use the production number |
| 6 | Expired token | Error **190** | Use a System User token |
| 7 | Billing | Error **131042** (payment issue), or nothing delivered after 1 Jan 2027 | Add a payment method; migrate to INR billing (§3.6 step 6) |
| 8 | Throughput | Error **130429** | Slow down bursts |
| 9 | The user opted out | The user typed STOP | Silent until they type START |
| 10 | An advisor took over | Console shows **human takeover** | Hand back to AI |
| 11 | Arth doesn't answer | Persona keyword ignored | The sender's number isn't in `AI_WHATSAPP_DEMO_ALLOWLIST` (digits with country code, no `+`), or no keyword was used ("Hi Bajaj Capital", `#bajaj`). A contact stays on its last tenant; `#assured` switches back |
| 12 | Username-only users | Never get a reply | Messages that carry a business-scoped user ID but **no phone number** are dropped by our parser today. Known gap; see RESEARCH §2.10 |
| 13 | Old Graph API version | Errors after 21 Jan 2027 | `WHATSAPP_GRAPH_VERSION` is still `v21.0`. Set `v25.0` or later |
| 14 | Unsupported message type | Images or voice notes get "I can only read text messages", at most once every 10 minutes per contact | By design |

### Console problems

**Console returns 401 or keeps asking for the key**
- `AI_CONSOLE_ACCESS_KEY` isn't set on the server, or doesn't match (stray spaces, an old key).
- Clear the stored key: browser devtools → Application → Local Storage → `ai_console_key`.
- An admin JWT only works for active users with role `admin`, and needs the database.

**Memory store under PM2 cluster mode**

| Symptom | Cause | Fix |
|---|---|---|
| The console shows different data on each refresh; conversations "disappear"; 404s on conversation IDs | `cashback-api` runs one process per CPU, and each has its own memory store and its own sample data | **Use `AI_STORE=prisma` in production.** For a quick memory demo on the server, run a single instance instead |
| The System tab warns that data "isn't shared between PM2 cluster workers" | Same as above | Same as above |
| Logs: `falling back to the IN-MEMORY store (AI_STORE=auto)` | The migration isn't applied, or the database check failed | Run `npx prisma migrate deploy` and restart. Prefer an explicit `AI_STORE=prisma`, which fails loudly instead of silently |

**Cluster side effects to know about**
- The simulator rate limit applies per process, so the effective limit is roughly instances × the limit.
- Per-contact WhatsApp ordering is guaranteed within one process only.
- Duplicate webhooks are still deduplicated by message ID in the database.

### Other issues

**Settings don't take effect**
- Restart: PM2 needs `--update-env`.
- Remember that `.env` overrides shell and PM2 variables.

**"rules engine" in the AI brain instead of Claude**

The trace shows a reason:

| Reason | Fix |
|---|---|
| `no_api_key` | Set `ANTHROPIC_API_KEY` |
| `api_error` | Check the key, credit and network |
| `timeout` | Raise `AI_REQUEST_TIMEOUT_MS` or lower the effort |

**Slow replies**
- Keep `AI_EFFORT=low`.
- Check the latency and the number of LLM calls in the trace.
- Optionally try `AI_MODEL=claude-sonnet-5-5`, or `AI_FAST_MODE=true` (2× price).

**Simulator shows "Too many requests" (429)**
- The limits are: messages, `AI_SIMULATOR_RATE_LIMIT` per IP per 5 minutes; 120 per session per hour; history polling, 900 per IP per 5 minutes.
- Everyone in an office shares one public IP. Raise the limit for demo days.

**CORS error in the browser**
- Add the page's origin to `ALLOWED_ORIGINS` in the backend `.env`, then restart.

**Phone can't load the local simulator**
- See §2.5: LAN IP, `-H`, `ALLOWED_ORIGINS`, Windows Firewall.

**Simulator link opens the wrong assistant**
- The try page reads **`?t=<tenantKey>`**, e.g. `/ai-assistant/try?t=bajaj-capital-demo`.

**No booking slots**
- Bajaj demo advisors: Mon–Sat 10:00–13:30 and 14:30–19:00 IST.
- Assured Rewards: Mon–Fri 10:00–18:00, Sat 10:00–14:00.
- No Sundays, at least 60 minutes' notice, and the advisor must be active (console → Advisors).

**No booking emails**
- `SMTP_HOST` is empty.
- The shipped fictional demo advisors are never emailed, by design. `AI_ADVISOR_NOTIFY_EMAIL` gets a copy.

**No WhatsApp reminder**
- Reminders go only to chats inside the 24-hour window. Outside it, they need a utility template (roadmap).

## 8. Cost controls

**LLM**

| Setting | Effect |
|---|---|
| `AI_EFFORT=low` (default) | Fewer thinking tokens, faster replies |
| `AI_MODEL` | Opus 5.5 ($4/$20 per MTok; cache reads $0.20) is the default. Sonnet 5.5 is half the price; Haiku 5.5 ($0.10/$0.50) suits FAQ-only use. Evaluate quality per tenant before switching |
| `AI_FAST_MODE` | Keep `false` (2× price) |
| `AI_MAX_TOOL_ITERATIONS` (6), `AI_HISTORY_MESSAGES` (20) | Lower values mean less input per turn |
| Prompt caching | Automatic for the static tenant prompt: cache reads cost 5% of the input price |

**Public simulator**
- It is the only unauthenticated thing that spends tokens.
- Use `AI_SIMULATOR_RATE_LIMIT` (per IP, per process), and `AI_SIMULATOR_ENABLED=false` when you don't need it.
- **Client IPs.** The limiter trusts `X-Real-IP` (your nginx config sets it to `$remote_addr`), then the last `X-Forwarded-For` hop, so clients cannot spoof their way past it. Keep `proxy_set_header X-Real-IP $remote_addr;` in the `/api` location; an nginx `limit_req` rule adds a second layer.

**Anthropic account**
- Use a dedicated API key, and ideally a dedicated workspace for this app, so its spend is visible on its own.
- Set the spend limits and alerts your Claude Console plan offers (check the Console's limits page).

**WhatsApp**
- The first 1,000 service messages a month per number are free. After that, ₹0.115 each (India, before GST).
- Each outbound message is billed, so keep replies to 1–2 messages per turn.
- Conversations that start from Click-to-WhatsApp ads are free for up to 7 days.
- Templates: utility ₹0.115, marketing ₹0.8631.

**Watch it**
- The console's **Overview → Cost per conversation** shows LLM cost only.
- The trace and the AI brain show each turn's tokens and cost.

**Rough budget:** 10,000 conversations a month cost about ₹70,000 on Opus 5.5, or about ₹40,000 on Sonnet 5.5, including WhatsApp fees (RESEARCH §6).

## 9. Security checklist

**Secrets and access**
- [ ] Secrets live only in the server `.env`. They are never committed, and never pasted in chat.
- [ ] `AI_CONSOLE_ACCESS_KEY` is long and random, shared through a password manager, and rotated after demos.
- [ ] `WHATSAPP_APP_SECRET` is set (signature verification), and the site uses HTTPS only.

**Exposure and abuse**
- [ ] The public simulator is rate-limited, nginx sets `X-Real-IP` (§8), and the simulator is disabled when not needed.
- [ ] Demo tenants stay off the public number (`AI_WHATSAPP_ALLOW_DEMO_TENANTS=false` plus the allowlist).

**Personal data**
- [ ] Everyone knows the limits of PII redaction. It is pattern-based: PAN, Aadhaar, card numbers (Luhn-checked), CVV, OTP and PIN. It does **not** catch names, addresses or bank account numbers, so the assistant must never ask for them.
- [ ] Logs mask phone numbers (built in). Don't add logging of message bodies.

**Data handling**
- [ ] Sample data stays marked (`metadata.sample=true`), and it is never sent on WhatsApp.
- [ ] A local backend never points at the production database (§2.1).
- [ ] The database is backed up before every migration (§3.1).

## 10. Dates to remember

| Date | What | Action |
|---|---|---|
| **31 Dec 2026** | WhatsApp INR billing migration deadline for Indian accounts | Migrate in WhatsApp Manager. Otherwise, from 1 Jan 2027, messages stop, **including OTPs** |
| **21 Jan 2027** | Graph API v21.0 removed | Set `WHATSAPP_GRAPH_VERSION` to v25.0 or later |
| 1 Jan, 1 Apr, 1 Jul, 1 Oct | Meta's only pricing-change dates | Check the INR rate card |
| ~Apr 2027 | SEBI Common Advertisement Code takes effect | Review assistant wording with compliance |
| **13/14 May 2027** | Main DPDP Rules duties apply | Consent notice, retention and erasure, rights requests, breach runbook |
| Each Budget (Feb); quarterly; monthly | Tax rules; small-savings rates; AMFI data | Refresh the knowledge base (documents carry `asOf` dates) |

# Testing the AI WhatsApp Concierge

There are four layers. Run them in this order; each one builds confidence for the next.

| # | Layer | Time | Needs |
|---|---|---|---|
| 1 | Automated tests (unit, end-to-end, PostgreSQL) | ~5 min | Nothing — no database, no API key, no WhatsApp |
| 2 | Manual test in the browser (laptop) | ~20 min | Optional Claude API key |
| 3 | Manual test on your phone (same Wi-Fi) | ~10 min | Layer 2 running |
| 4 | Real WhatsApp test (on the server) | ~20 min | Deployed backend, Meta webhook, allowlisted phone |

All commands below run from the folder named in each step. Nothing here writes to your real database:
the test and demo servers never read `.env` and never connect to it.

---

## 1. Automated tests

### Backend (from `cashback backend/cashback`)

```bash
npm run test:ai          # 129 unit tests, ~10 s
npm run test:ai:e2e      # full chat flows over HTTP, ~1 min
npm run test:ai:prisma   # database migration + Prisma storage on a throwaway PostgreSQL, ~2 min
```

| Command | What it proves |
|---|---|
| `test:ai` | Calculators, lead scoring, guardrails (PAN/Aadhaar/card/OTP redaction, STOP/START), tenant switching and the demo allowlist, slot generation in IST, double-booking protection, WhatsApp message parsing/rendering and signature checks, every console route |
| `test:ai:e2e` | Starts the assistant three times — with **no API key** (rules engine), wired to a **strict fake of the Claude API** that rejects anything the real API would reject, and wired the same way **through OpenRouter** (Bearer auth, `anthropic/claude-opus-5.5`, provider pinned to Anthropic) — and runs 53+ scenario checks on each: greeting → SIP → "I'm ready" → slot list → tap → booking card, no double booking, privacy redaction, opt-out, advisor takeover and reply, leads, bookings + `.ics`, knowledge add/search/delete, WhatsApp webhook (signature, allowlist, username contacts). Prints `E2E PASSED` |
| `test:ai:prisma` | Applies **all 20 migrations** (yours + `20261128120000_ai_whatsapp_assistant`) to a fresh in-memory PostgreSQL, seeds sample data through Prisma, then runs the same scenario checks on the Prisma store. Prints `PRISMA TEST PASSED` |

Add `--verbose` to see every check: `node tests/aiAssistant/e2e/run.js --verbose`.

### Frontend (from the project root `cashback/`)

```bash
npx eslint src/components/ai-assistant src/lib/aiAssistantApi.js src/app/ai-assistant
npx next build --experimental-build-mode compile     # compiles every page without calling the live site
```

Both must finish without errors (the compile takes a few minutes on Windows).

---

## 2. Manual test in the browser

### Start it

**Terminal 1 — backend** (`cashback backend/cashback`):

```bash
# Settings come from the AI_/OPENROUTER_/ANTHROPIC_/WHATSAPP_ lines of .env (never its database lines):
#   OPENROUTER_API_KEY=sk-or-...  or  ANTHROPIC_API_KEY=sk-ant-...   (both empty = rules engine)
#   AI_CONSOLE_ACCESS_KEY=<your console key>
# (Optional: a separate .env.ai-demo overrides them for the laptop only.)
npm run ai:demo
```

It prints the engine (Claude or rules engine), the console key and the URLs. Stop any other backend on
port 5000 first. Sample conversations, leads and bookings are pre-loaded (set `AI_SEED_DEMO_DATA=false`
in `.env.ai-demo` for an empty start); everything resets when you stop it.

**Terminal 2 — frontend** (project root):

```bash
npm run dev
```

Open:

- http://localhost:3000/ai-assistant — pitch page with the live simulator and the "AI brain" panel
- http://localhost:3000/ai-assistant/console — advisor console (enter the console key)
- http://localhost:3000/ai-assistant/try?t=bajaj-capital-demo — full-screen phone view

### Checklist

Do it once **without** an API key (rules engine) and once **with** your key. In the "AI brain"
panel the engine badge must say **Claude** when the key is set.

| # | Do this | Expect |
|---|---|---|
| A | Open the pitch page, switch between "Assured Rewards" and "Bajaj Capital" | Each has its own chat, colours and starter buttons |
| B | Bajaj: send `Hi` | Arth introduces itself as a *concept demo prepared for Bajaj Capital by Assured Rewards*, offers buttons, says it's an AI and how to opt out |
| C | `I can invest 10000 per month in a SIP for 15 years` | SIP estimate in ₹ (lakh/crore format), labelled illustrative, MF risk line; AI brain shows `SIP calculator`; lead card gains amount + horizon |
| D | `What if returns are 18%?` | Rate is capped at 13% with the AMFI 2–13% note |
| E | `I'm 34, I want to save tax and retire by 55` | Answers from the knowledge base (Section 80C, now s.123 of the Income-tax Act, 2025), may run the retirement calculator; lead score rises |
| F | `I'm ready to start, can someone call me tomorrow evening?` | "View slots" list with real advisor times (IST, no Sundays) |
| G | Tap a slot | Confirmation card (advisor, time, mode, meeting link, Add to calendar); lead stage → **Call booked** |
| H | `my PAN is ABCDE1234F` | Warning not to share it; in the console the stored message shows it masked |
| I | `STOP`, then `hello`, then `START` | Confirmation, then silence, then replies again |
| J | Claude only: `Mujhe tax bachana hai, kya options hain?` | Reply in Hinglish |
| K | Claude only: `Write a poem about cricket` | Politely declines — it only helps with financial planning (WhatsApp policy) |
| L | Claude only: `Are you really Bajaj Capital?` | Says it is a concept demo and an advisor confirms firm-specific details |
| M | Assured Rewards: `Where is my cashback?` | Wallet/cashback answer marked as **demo data** (simulator never shows real accounts) |
| N | Assured Rewards: `I run a snacks brand, how do QR campaigns work?` | Explains campaigns/pricing from the knowledge base and offers a demo call |

**Console (keep the simulator open in another window):**

| # | Do this | Expect |
|---|---|---|
| O | Overview tab | KPI tiles, charts, funnel, live activity feed (sample data plus your chats) |
| P | Live inbox → open your conversation | Full thread; expand **"Why the AI said this"** on an AI message → tools, inputs/outputs, knowledge hits, latency, tokens, cost |
| Q | Click **Take over**, type a message, send | Within ~3 s it appears in the simulator with a "joined the chat" notice; the customer's next message gets **no** AI reply |
| R | Click **Hand back to AI** | "You're back with Arth" notice; the AI answers again |
| S | Leads tab | Your lead with score and stage; change the stage → it sticks |
| T | Bookings tab | Your booking under Today/Tomorrow; **Download .ics** opens in your calendar; the video link opens a Jitsi room; **Mark completed** works |
| U | Knowledge base → Add: title `Weekend advisor desk`, content `Advisors take video calls on Saturdays 10 am–2 pm IST.` → **Test retrieval** with `weekend call` | The new doc ranks first. Then ask the bot `Can I get a call on Saturday?` (Claude) — it uses the new doc |
| V | Advisors tab → change someone's hours | The slots offered in the chat change accordingly |
| W | System tab | Engine (Claude/rules), storage = memory, WhatsApp status, go-live checklist |

---

## 3. Manual test on your phone (same Wi-Fi)

1. In `cashback/.env.development.local`, temporarily change the line to `NEXT_PUBLIC_API_BASE_URL=`
   (empty). The phone then calls the API through the Next.js server instead of `localhost`.
2. Keep `npm run ai:demo` running and start the frontend on your network:
   `npx next dev -H 0.0.0.0`
3. Find your laptop's IP (`ipconfig` → IPv4, e.g. `192.168.1.20`) and open
   `http://192.168.1.20:3000/ai-assistant` **on the laptop**. Allow Node through the Windows firewall
   for private networks if asked.
4. Scan the "Try it on your phone" QR code with the phone — it opens the full-screen simulator.
   Run checklist rows B–I on the phone; watch the console on the laptop update live.
5. Put `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000` back when you're done.

---

## 4. Real WhatsApp test (on the server)

Real WhatsApp needs a public HTTPS webhook, so test it on the deployed backend (see
[SETUP.md](./SETUP.md) for the deploy steps). Your WhatsApp number is shared with OTP logins: once
auto-reply is on, **every** message people send to it gets an AI reply.

1. Server `.env`: `ANTHROPIC_API_KEY`, `AI_CONSOLE_ACCESS_KEY`, `WHATSAPP_APP_SECRET`,
   `WHATSAPP_GRAPH_VERSION=v25.0`, `AI_WHATSAPP_DEMO_ALLOWLIST=91XXXXXXXXXX` (your number),
   `AI_WHATSAPP_AUTOREPLY=true`. Run `npx prisma migrate deploy` (after a backup) and restart PM2.
2. Meta App → WhatsApp → Configuration: webhook `https://<your-domain>/api/webhooks/whatsapp`,
   subscribed to the **messages** field.
3. From your phone, message the business number:

| Send | Expect |
|---|---|
| `Hi` | Ria (Assured Rewards) answers within a few seconds, with tappable buttons |
| `Where is my cashback?` | If your number is registered in Assured Rewards: your real wallet balance and recent cashback |
| `Hi Bajaj Capital` | Arth (concept demo) — only because your number is on the allowlist |
| Same from a phone **not** on the allowlist | Ria answers instead (the demo persona is never shown to the public) |
| `I want to invest, call me tomorrow` → tap a slot | Booking card on WhatsApp; booking + lead in the console |
| Console → Take over → type | Your message arrives on WhatsApp as a normal chat message |
| `STOP` | Opt-out confirmation, then silence |

4. Watch the log while testing: `pm2 logs cashback-api | grep "AI WhatsApp"`.

## 4a. One-way real WhatsApp test from your laptop (no tunnel, no Meta change)

Your laptop can **send** WhatsApp messages with the current credentials; only **receiving** needs Meta's
webhook. So you type the customer's message in a terminal, and the AI's real reply (buttons, slot list,
booking card) arrives on your phone's WhatsApp. Production is not touched.

1. `.env.ai-demo` has `AI_DEMO_ALLOW_WHATSAPP_SEND=true`, `AI_WHATSAPP_AUTOREPLY=true` and your
   WhatsApp ID/token. Start (or restart) `npm run ai:demo`.
2. From your phone, send any message (e.g. `Hi`) to the business number. WhatsApp only lets a business
   send free-form replies to someone who messaged it in the last 24 hours.
3. In a second terminal (`cashback backend/cashback`):
   ```bash
   npm run ai:wa-send -- --to 919812345678 --chat      # your number, with 91
   ```
   Type messages (`Hi`, `How do QR campaigns work?`, `Book a demo call`, …) and `/tap 1` to press an
   option of the last buttons/list; `/quit` to stop. Each reply prints `✔ sent to WhatsApp` and appears on
   your phone; failures print Meta's reason and a fix (e.g. code 131047 = 24-hour window closed).
4. What you type **on the phone** still goes to production, so keep the conversation in the terminal.
   The chat also shows up in the advisor console (WhatsApp icon); **Take over** there to send yourself an
   advisor message.

## 4b. Real WhatsApp from your laptop (before deploying)

Meta delivers messages to ONE webhook URL per app, today your production server. For a quick laptop test
you point it at your laptop through a tunnel for a few minutes, then point it back.

> While Meta points at your laptop: every message anyone sends to the number is answered from your laptop;
> OTP messages are still **sent** normally (sending does not use the webhook) but production does not see
> their delivery statuses; "my cashback" cannot show real balances (the demo server has no database); and
> each message spends LLM credit. Do it at a quiet time and switch back right after.

1. In `cashback backend/cashback/.env.ai-demo` set (keep your existing WhatsApp ID/token/verify-token lines):
   ```
   AI_DEMO_ALLOW_WHATSAPP_SEND=true
   AI_WHATSAPP_AUTOREPLY=true
   WHATSAPP_GRAPH_VERSION=v25.0
   WHATSAPP_APP_SECRET=<Meta App Dashboard -> App settings -> Basic -> App secret>
   AI_WHATSAPP_DEMO_ALLOWLIST=91XXXXXXXXXX        # your own number, for the Bajaj demo persona
   ```
   Restart `npm run ai:demo`. The banner must say
   `WhatsApp  sending ON · auto-reply ON · signature check ON`.
2. Install a tunnel once: `winget install --id Cloudflare.cloudflared` (open a new terminal afterwards).
3. Start it: `cloudflared tunnel --url http://127.0.0.1:5000` and copy the `https://….trycloudflare.com`
   address it prints (it changes every time you start it).
4. Check the handshake in a browser:
   `https://<tunnel>/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=<your verify token>&hub.challenge=123`
   must show `123`.
5. Meta App Dashboard → WhatsApp → Configuration → Webhook → **Edit**. First **write down the current
   callback URL** (production). Then set Callback URL `https://<tunnel>/api/webhooks/whatsapp`, Verify token
   = your `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, **Verify and save**. The `messages` field must be subscribed.
6. From your phone, message the business number:

   | Send | Expect |
   |---|---|
   | `Hi` | Ria (Assured Rewards) replies with buttons within a few seconds |
   | `I run a snacks brand, how do QR campaigns work?` | Explanation from the knowledge base + an offer to book a demo |
   | `Book a demo call` → tap a slot | WhatsApp list of slots, then a booking confirmation |
   | `Hi Bajaj Capital` | Arth, the concept-demo persona (because your number is allowlisted) |
   | Console → Live inbox → your WhatsApp chat → **Take over** → type | Arrives on your phone as a normal message |
   | `STOP` | Opt-out confirmation, then silence (`START` resumes) |

   The console shows the chat with a WhatsApp icon, and the ticks update as delivery statuses arrive.
7. **Switch back:** Meta → Webhook → Edit → the production callback URL you wrote down → Verify and save.
   Stop the tunnel (Ctrl+C) and set `AI_DEMO_ALLOW_WHATSAPP_SEND=false`.

---

## Before demo day (5-minute check)

1. `npm run test:ai:e2e` → `E2E PASSED`.
2. `npm run ai:demo` with your API key → banner says **Claude**.
3. Run checklist rows B, C, F, G and Q once; the AI brain badge says Claude and the booking shows in the console.
4. If anything fails on the day: remove the API key and restart `npm run ai:demo` — the rules engine
   still runs the whole demo (answers, calculators, booking, takeover).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Port 5000 is busy` | Another backend is running — stop it, or `PORT=5001` in `.env.ai-demo` and point the frontend at it |
| Console asks for a key again and again | The key must match `AI_CONSOLE_ACCESS_KEY` printed by `npm run ai:demo` |
| Badge says "Rules engine" although the key is set | Check the key in `.env.ai-demo`; the server log shows the API error. One rejected optional feature is retried automatically |
| Simulator: "Couldn't reach the assistant" | `npm run ai:demo` isn't running, or the frontend points at another port |
| Phone can't load the page | Same Wi-Fi? Firewall allowed? `NEXT_PUBLIC_API_BASE_URL` empty and `next dev -H 0.0.0.0`? |
| WhatsApp gets no reply | `AI_WHATSAPP_AUTOREPLY=true`? Webhook subscribed to `messages`? `WHATSAPP_APP_SECRET` correct (bad signatures are dropped)? Customer messaged within 24 h? |

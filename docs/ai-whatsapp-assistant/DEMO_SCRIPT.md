# CEO Demo Script: AI WhatsApp Concierge (10–12 minutes)

A run-of-show for the Bajaj Capital meeting: checklists, exact messages to type, what you should see, what to say, and answers to likely questions.

**Before anything else**

- **Read [BAJAJ_CAPITAL_BRIEF.md](./BAJAJ_CAPITAL_BRIEF.md):**
  - §0 for who you're meeting;
  - §A3 for leadership;
  - §A8 for the name-collision warning: Bajaj Capital is *not* Bajaj Finserv;
  - §B6 for questions to ask them.
- **Confirm which CEO is in the room.** Per Bajaj Capital's site:
  - Rajiv Bajaj, Chairman & MD;
  - Sanjiv Bajaj, Joint Chairman & MD;
  - Jai Bajaj, CEO & MD since 1 Apr 2026.
  - Separately, Samir Dewan was announced as Group CEO in Sep 2026.
- **Numbers and regulation behind the talking points:** [RESEARCH.md](./RESEARCH.md).
- **How to run and deploy:** [SETUP.md](./SETUP.md).

**Three things the room must hear**
1. **Arth is a concept demo.** Arth introduces itself as "a concept demo prepared for Bajaj Capital by Assured Rewards". It is built from public information, and its advisors (Priya Nair, Rohit Verma, Sana Qureshi) are fictional.
2. **Nothing claims to be an official Bajaj Capital channel.**
3. **Ria is real.** Ria, the Assured Rewards assistant, is our own production use case.

---

## 0. The story in one breath

> "Your clients already live on WhatsApp. Ask a money question at 11 pm and get an instant, compliant answer. When they're ready, a real call with your advisor is booked. Your advisors see every conversation and can step in at any moment. We run this ourselves, for our own customers."

## 1. Setup at a glance

| Device | What's open | Why |
|---|---|---|
| **Laptop (projected), Tab 1** | `/ai-assistant`, the showcase page. Scroll to the live demo: a WhatsApp-style phone plus the **AI brain** panel | Acts 1 and 2. The brain shows each turn's intent, tool calls, knowledge hits, latency, tokens, cost and lead score |
| **Laptop, Tab 2** | `/ai-assistant/console`, the advisor console: Overview, Live inbox, Leads, Bookings, Knowledge base, Advisors, System | Takeover, leads and bookings, KPIs, live knowledge |
| **Phone** | `/ai-assistant/try?t=bajaj-capital-demo`, or real WhatsApp from an **allowlisted** number | Lets the CEO try it at the end; optional real-WhatsApp moment |
| **Paste file** | The messages in [§5](#5-paste-file-every-message-in-order), in a text editor on the laptop and in Notes on the phone | No typos under pressure |

URLs:
- **Production (Mode A):** `https://<your-host>/ai-assistant`, e.g. the `assuredrewards.in` host behind nginx.
- **Laptop (Mode B):** `http://localhost:3000/ai-assistant`.

**Roles**
- Presenter: talks and types.
- Optional driver: works the console.
- Solo: keep the tabs in the order above and use `Ctrl+Tab`.

## 2. Pre-flight checklist

### T-1 day

| # | Check | How |
|---|---|---|
| 1 | **Pick a mode and rehearse both.** **Mode A, production** (preferred): live data, real WhatsApp possible. **Mode B, laptop**: the fallback, with rich sample dashboards and no dependence on the venue network except for the Claude API | SETUP.md [§3](./SETUP.md#3-production-deploy-vps) (A), [§2](./SETUP.md#2-local-run-windows) (B) |
| 2 | **Claude works** | Console → **System**: LLM *configured*, `claude-opus-5-5`, effort `low`. Send "How does a SIP work?": the brain must show **Claude**, not "rules engine" |
| 3 | **Settings for the day** (backend `.env`, then restart) | `AI_MODEL=claude-opus-5-5`, `AI_EFFORT=low`, `AI_CONSOLE_ACCESS_KEY=<long random>`, `AI_SIMULATOR_ENABLED=true`, **`AI_SIMULATOR_RATE_LIMIT=200`** (the whole meeting room shares one public IP; the default of 40 per 5 minutes can run out) |
| 4 | **Real WhatsApp (optional, Mode A only)** | See the box below |
| 5 | **Sample data** | Mode B: `AI_STORE=memory` + `AI_SEED_DEMO_DATA=true` give populated dashboards, with every sample row badged **Sample**. Mode A: dashboards show live data only, unless the product owner approves writing clearly marked sample rows to the production database (`node scripts/ai-assistant-seed-demo.js --yes-write-to-database`). **Never** use the memory store under PM2 cluster mode |
| 6 | **Calendar sanity** | Bajaj demo advisors work Mon–Sat 10:00–13:30 and 14:30–19:00 IST; "evening" means slots from 17:00; booking needs at least 60 minutes' notice. **If the meeting is on a Saturday, "tomorrow" is Sunday and has no slots: say "Monday evening".** Assured Rewards team: Mon–Fri 10:00–18:00, Sat 10:00–14:00 |
| 7 | **Two timed dry runs** | Target 11 minutes or less. Note a typical reply time (usually a few seconds; tool-heavy turns take longer) |
| 8 | **Record a backup video** | One clean full run with audio, saved locally |
| 9 | **Paste file ready** | §5, on the laptop and the phone |
| 10 | **Know the room** | Brief §0, §A3, §A8, §B6. Print §7 of this file |
| 11 | **Numbers in your head** | RESEARCH §6: about ₹6 AI + ₹1 WhatsApp ≈ **₹7 per conversation**. A human chat costs ₹25–110; an RM's first qualification ₹95–250 |
| 12 | **Hardware** | Chargers, HDMI/USB-C adapter, phone hotspot with data, a clean phone browser |
| 13 | **Console identity** | Set the agent name you'll use for takeover, e.g. "Priya – Advisor Desk" |
| 14 | **Phone** | Bookmark `/ai-assistant/try?t=bajaj-capital-demo` and add it to the home screen |
| 15 | **The "Try it on your phone" QR** | By default the QR for Arth opens the **phone simulator** (`/ai-assistant/try`), which works for anyone and needs no allowlist: a demo tenant publishes no WhatsApp link unless `AI_WHATSAPP_ALLOW_DEMO_TENANTS=true`. Only set that (for the meeting window) if you want guests to reach Arth on **real WhatsApp** from any phone; otherwise allowlisted numbers can still message "Hi Bajaj Capital" to the real number |

> **Real WhatsApp checklist (T-1 day, item 4)**
>
> - **Smoke tests first.** Set `AI_WHATSAPP_AUTOREPLY=true` only after the smoke tests in SETUP.md pass.
> - **Signatures.** `WHATSAPP_APP_SECRET` must be set.
> - **Allowlist.** Set `AI_WHATSAPP_DEMO_ALLOWLIST` to the presenter's number, plus the CEO's if he'll try it. Use digits with country code, comma-separated, e.g. `9198XXXXXXXX,9199XXXXXXXX`. Keep `AI_WHATSAPP_ALLOW_DEMO_TENANTS=false`.
>
> **Why the allowlist exists**
> - Bajaj Capital has not authorised a public bot, so the Arth persona must not be reachable by the public on our WhatsApp number.
> - Allowlisted senders switch to Arth by typing "Hi Bajaj Capital" or "#bajaj". Everyone else always gets Ria.
> - If you'd rather not touch the allowlist, use the web simulator (`/ai-assistant/try`) on the phone. It needs no allowlist.

### T-30 minutes

1. **Network.** Connect to the venue Wi-Fi and check that the phone hotspot works as a backup.
2. **Tabs.** Open them in order:
   - Tab 1: `/ai-assistant`, scrolled to the live demo.
   - Tab 2: `/ai-assistant/console` → Overview.
   - Tab 3: console → Knowledge base.
   - Keep the backup video one click away.
3. **Console checks.**
   - The access key is accepted.
   - **System** shows: LLM configured (model and effort); store healthy (*prisma* in Mode A, *memory* in Mode B); WhatsApp auto-reply and signature verification as you intended; the demo allowlist count.
4. **Health check.**
   - Send "Hi" to Ria and to Arth. Confirm each reply comes from Claude and arrives in under about 10 seconds.
   - Reset both chats (**⋮ → Reset chat** in the simulator header).
   - Repeat this 2–3 minutes before you start: it warms the prompt cache, which lasts 5 minutes.
5. **Phone.** Open the try page. If you're using real WhatsApp, send "Hi Bajaj Capital" from the allowlisted phone and confirm Arth answers.
6. **Distractions.**
   - Do Not Disturb on laptop and phone.
   - Close mail and chat apps.
   - Browser zoom 110–125%, full screen.
7. **Paste file** open.

### Backup plans

| If… | You'll notice | Do this | Say |
|---|---|---|---|
| Venue Wi-Fi fails | Pages don't load | Phone hotspot. If it's still failing, switch to Mode B on the laptop | "Let me switch to my local copy: same engine." |
| WhatsApp or Meta has an issue | No reply on real WhatsApp within about 15 s | Switch to the simulator on the phone (`/ai-assistant/try?t=bajaj-capital-demo`) or Tab 1 | "This is the same engine that sits behind WhatsApp." |
| The Claude API key fails, or the API is slow or down | The brain shows **rules engine** / fallback | Carry on. The rules engine answers FAQs, runs calculators, lists slots and books | "Resilience by design: if the AI provider is down, clients still get answers and can book." |
| Replies are slow (over 15 s) | Long typing indicator | Narrate the brain panel. Afterwards, consider `AI_FAST_MODE=true` or `AI_MODEL=claude-sonnet-5-5` (needs a restart) | "It's checking calendars and running the numbers; here's what it's doing." |
| The console shows a key prompt (401) | Console asks for the access key | Re-enter `AI_CONSOLE_ACCESS_KEY` | — |
| No evening slots | Arth offers other days | Accept "Monday evening" (Sunday has no slots) | "It only offers real availability." |
| "Too many requests" (429) | Error in the simulator | Switch to the phone hotspot (different IP), or raise `AI_SIMULATOR_RATE_LIMIT` | — |
| Everything fails | — | Play the backup video and offer a live session on their premises | "I'd rather show you live; let's set that up this week." |

## 3. Run of show

| Time | Segment | Screen | Key moment |
|---|---|---|---|
| 0:00–0:45 | Opening | Tab 1, hero | The promise and the concept-demo disclaimer |
| 0:45–2:45 | **Act 1: "We run this ourselves"** (Ria) | Tab 1, live demo, Assured Rewards | Live account lookup; a brand demo booked |
| 2:45–7:45 | **Act 2: "Built for Bajaj Capital"** (Arth) | Tab 1, Bajaj Capital tenant → Tab 2, console | Knowledge, calculators, risk profile and lead score building; booking; advisor takeover |
| 7:45–10:15 | **Act 3: "You stay in control"** | Tab 2, Overview and Knowledge base → Tab 1 | Cost per conversation; knowledge added live; PAN masked; STOP |
| 10:15–11:45 | **Close** | Tab 1, "Pilot plan" section and the phone QR | Six-week pilot ask |
| 11:45+ | Q&A | — | §7 |

## 4. Script

Legend: **DO** = action, **EXPECT** = what should appear, **SAY** = suggested words. The reply wording is generated live, so it will vary; the tools and outcomes won't.

### Opening (0:00–0:45)

**SAY**
> "Thank you for the time. In ten minutes I'll show you three things:
> - an AI assistant we already run on WhatsApp for our own customers;
> - the same engine, shaped for Bajaj Capital, answering a client's planning questions and booking a call with your advisor;
> - the controls your team gets: live takeover, compliance guardrails, and the cost of every conversation.
>
> Everything is live, not a video. One note: 'Arth', the Bajaj Capital assistant, is a concept we built from your public information. The advisors in it are fictional."

### Act 1: "We run this ourselves" (0:45–2:45)

**DO** In Tab 1, in the live demo, pick **Assured Rewards** in the tenant switcher (assistant **Ria**). Paste:
```
Where's my cashback? I scanned a QR on a pack yesterday.
```
**EXPECT**
- Ria answers with wallet balance, recent cashback and any pending UPI payout, labelled as **demo data**: in the simulator, the account tool returns marked sample data.
- The brain panel shows the intent, the step **Looked up rewards account**, a knowledge hit such as *"Cashback kab aayega? When is my cashback credited?"*, latency, tokens and cost.

**SAY**
> "This is our own support assistant for Assured Rewards customers. On real WhatsApp it reads the customer's *live* account. The identity comes from their verified WhatsApp number, never from anything they type. Here in the simulator it uses labelled sample data."

**DO** Paste. Pick a weekday 1–3 days ahead, Mon–Fri, and replace *Thursday* if needed:
```
I'm Neha from Crunchy Bites, a snacks brand. We sell about 50,000 packs a month. What would a QR cashback campaign cost, and can your team show me a demo on Thursday morning?
```
**EXPECT**
- Pricing explained from the knowledge base: cashback budget plus a per-QR fee plus GST.
- The brand is captured as a lead.
- A list of morning slots appears. **Tap one.** A **booking card** appears, with a video link and "Add to calendar".

**SAY**
> "Same assistant, now doing sales. It answered from our pricing content, qualified the brand, and booked our partnerships team into a real calendar slot. Two people can never get the same slot. That's how we use it every day."

*(Optional, if time allows: paste `cashback kab aayega?` to show Hinglish.)*

### Act 2: "Built for Bajaj Capital" (2:45–7:45)

**DO** Switch the tenant to **Bajaj Capital** (assistant **Arth**) and point at the concept-demo label.

**SAY**
> "Now the same engine, with your knowledge, your brand and your journey: a client planning their money, all the way to a call with your advisor."

**Message 1.** **DO** Paste:
```
Hi, I'm 34, earn ₹1.5L a month, want to save tax and retire by 55
```
**EXPECT**
- A one-line welcome: Arth as an AI assistant, a concept demo prepared for Bajaj Capital by Assured Rewards, with STOP/AGENT.
- Help on tax saving: old vs new regime. Under the **Income-tax Act 2025, in force from 1 Apr 2026, old section 80C is now section 123**, with the ₹1.5 lakh limit in the old regime.
- A single follow-up question, such as monthly expenses.
- The brain shows knowledge hits from the tax documents and the step **Updated lead profile**. The lead score starts moving.

**SAY**
> "It picks up what matters (age, income, goals) without turning the chat into a form. And it's current: 80C became section 123 this April, which is exactly what will confuse your clients this tax season."

**Message 2, Hinglish.** **DO** Paste:
```
Mera monthly kharcha around ₹70,000 hai aur EPF mein ₹9 lakh hain. Retirement ke liye kitna corpus chahiye?
```
**EXPECT**
- The reply comes **in Hinglish**, after the step **Estimated retirement corpus**.
- With the default assumptions it shows roughly:
  - expenses of about ₹2.4 lakh a month by age 55;
  - a corpus need of about **₹7.5 crore**;
  - EPF growing to about ₹97 lakh;
  - an illustrative SIP of about **₹57,000 a month**, or about ₹60 lakh invested today, to close the gap.
- Default assumptions: 6% inflation, 12% return before retirement and 7% after, planning to age 85. Exact figures depend on the defaults the model passes, and it states them.
- The results are labelled illustrative. The SEBI mutual fund risk line is appended at most once per 24 hours, so it may already have appeared after message 1.

**SAY**
> "The numbers come from a calculator tool, not the model's mental arithmetic, and every assumption is on screen. It answered in the client's own Hinglish. This is the conversation your advisors want, and the client now arrives with the numbers."

*(Optional, if the mood is right: "Creating Crorepatis since 1964": here's a 34-year-old who now knows he needs ₹7.5 crore.)*

**Message 3.** **DO** Paste:
```
If markets fell 20% I'd hold. My income is stable, I've done a few SIPs, and I have 2 dependents.
```
**EXPECT**
- The step **Scored risk profile** runs.
- It gives a score of about **79/100, "aggressive"**, with an illustrative mix of roughly 70% equity, 20% debt and 10% gold, labelled educational, not a recommendation.
- The lead score rises, typically to stage **engaged**. The scoring rubric: +4 per known fact, plus engagement and intent points.

**SAY**
> "A risk profile the way your RMs start one. It's a starting point the advisor confirms on the call, never a product pick. It never names a fund."

**Message 4.** **DO** Paste. If tomorrow is Sunday, write "Monday evening":
```
I'm Rohan. I'm ready to start — can someone call me tomorrow evening?
```
**EXPECT**
- The step **Checked advisor calendar** runs and lists evening slots (17:00–18:30 IST) with the fictional advisors.
- **Tap one**, e.g. Rohit Verma, Tax & Retirement Specialist.
- The step **Booked advisor call** runs and a **booking card** appears: phone call, time, topic and "Add to calendar".
- The score jumps twice: +25 for the readiness signal ("ready to start, call me"), which makes the lead **qualified**, then +25 for the booking. The stage becomes **booked**.

**SAY**
> "That's a real booking against the advisor's working hours. If someone else takes that slot first, Arth offers the next one. The advisor gets an email and a calendar invite."

**DO** Tab 2, console:
1. **Leads.** Rohan is at the top, with score, stage *booked*, goals, age, income and risk profile.
2. **Bookings.** Tomorrow's call is on the agenda; click **.ics** to download the invite.
3. **Live inbox.** Open Rohan's conversation. Each AI turn shows its trace: tools, knowledge, guardrails, tokens and cost.

**SAY**
> "This is your advisor's screen: every conversation as it happens, with the lead already qualified."

**DO** Click **Take over** (agent name "Priya – Advisor Desk"). Type, or paste:
```
Hi Rohan, Priya from the Advisor Desk here. I've seen your goals: tax saving now and retiring at 55. Rohit will call you tomorrow evening — anything you'd like us to prepare?
```
Send it, then switch to **Tab 1**.

**EXPECT** The advisor's message appears in the client's chat within about 3 seconds. If Act 2 ran on real WhatsApp, it arrives on the phone: hand the phone to the CEO. While a human owns the chat, the AI stays silent.

**SAY**
> "The moment a human takes over, the AI goes quiet. Your people are always in control."

**DO** Back in the console, click **Hand back to AI**.

> **Real-WhatsApp variant** (Mode A, allowlisted phone)
>
> - Run Act 2 on the phone itself. Start with "Hi Bajaj Capital", then paste messages 1–4 from the phone's Notes.
> - Keep the console's Live inbox on the projector. Its trace panel shows the same "brain" data.
> - The takeover message then lands on a real phone.

### Act 3: "You stay in control" (7:45–10:15)

**1. Overview.** **DO** Tab 2 → **Overview**.

**EXPECT** KPIs:
- conversations, AI resolution rate, average response time;
- leads and qualified leads, bookings and booking conversion;
- human takeovers;
- **cost per conversation (₹)**.

If sample data is loaded, those rows carry a **Sample** badge.

**SAY**
> "This is the business view. The cost per conversation is measured from real turns: about ₹6 of AI at today's prices, about ₹7 including WhatsApp fees. A human chat costs ₹25 to ₹110."
>
> (If sample data is visible:) "Some of these are clearly marked sample conversations, so you can see a populated dashboard. The one we just had is live."

**2. Add knowledge live.** **DO** Tab 3, **Knowledge base**:
1. Click **Add knowledge** and paste the document from §5 (title, category, content).
2. Save.
3. In **Test retrieval**, type `How does the RTR check work on WhatsApp?`. The new document ranks first.
4. In Tab 1 (Arth), paste the same question.

**EXPECT** The answer uses the new document, and the brain shows it as a knowledge hit.

**SAY**
> "No retraining and no developer. Your compliance team approves content, and the assistant uses it from the very next message."

**3. PII guardrail.** **DO** Tab 1 (Arth). Paste:
```
My PAN is ABCDE1234F, can you check my KYC status?
```
**EXPECT**
- Arth starts with a privacy note: it has hidden the PAN and asks the client not to share PAN, Aadhaar, card numbers or OTPs on chat.
- It then explains KYC statuses and the official ways to check them.
- The brain's **Guardrails fired** list shows **PII redacted · PAN**.
- In the console, the stored message reads **"[PAN removed]"**.

**SAY**
> "The PAN never reached the AI model or our database. It's removed before either sees it."

**4. Scope lock (optional, 15 s).** **DO** Paste `Write a poem about cricket`.

**EXPECT** A one-line polite refusal saying it only helps with financial planning and Bajaj Capital's services.

**SAY**
> "That's deliberate. Meta allows business assistants on WhatsApp, not general-purpose chatbots. It stays in its lane."

**5. Opt-out.** **DO** Paste `STOP`, then `Hi`, then `START`.

**EXPECT**
- `STOP`: an unsubscribe confirmation.
- `Hi`: **no reply**.
- `START`: "Welcome back".

**SAY**
> "Opt-out is instant and stays until the client says START, in English, Hindi or Hinglish."

### Close (10:15–11:45)

**DO** Tab 1 → scroll to the Bajaj Capital section, **"Pilot plan: Live with real clients in six weeks"**.

**SAY**
> "Here's what we propose: a six-week pilot on one journey."

**The pilot** (matches the page)

| Weeks | Phase | What happens |
|---|---|---|
| 1–2 | Set up | Your approved product content and FAQs go into the knowledge base. A compliance review of tone, disclaimers and hand-off rules. Advisor calendars, branches and working hours mapped |
| 3–4 | Integrate | Your WhatsApp Business number and branding. Lead export to your CRM. Console access for a pilot team. User acceptance testing with your advisors |
| 5–6 | Go live | One campaign or region live and monitored daily. A weekly review of answers, bookings and cost per conversation. A go/no-go decision on scaling |

**Success measures, agreed in week 1** (targets to agree, not promises):
- median first response under 10 seconds;
- share of conversations resolved without a human;
- qualified leads and booked calls, plus show-up rate;
- advisor hours saved;
- CSAT and opt-out rate;
- **zero compliance incidents**;
- cost per conversation in ₹.

**Integration roadmap, after the pilot:**
- CRM and calendars;
- KRA/KYC status checks;
- transactions through **BSE StAR MF / NSE NMF II / MF Central**;
- telephony and click-to-call (1600-series numbers for service calls);
- **WhatsApp Flows** for in-chat booking and risk forms;
- WhatsApp calling;
- an India-resident deployment (Claude on Amazon Bedrock's India inference profile).

**Suggested first journey:** "Ready to Retire" on WhatsApp ending in an advisor booking, or two-way insurance-renewal reminders. See brief §B1/§B4.

**The ask**
> "Can we agree on one journey and a pilot owner today? We'd start with a compliance workshop next week."

**DO** Leave the **"Try it on your phone"** QR (Bajaj Capital selected) on screen and invite the CEO to scan it.
- By default the Bajaj Capital QR opens the simulator, which needs no allowlist (demo tenants publish no WhatsApp link unless `AI_WHATSAPP_ALLOW_DEMO_TENANTS=true`).
- With a display number configured, it opens real WhatsApp. That only works if his number is allowlisted (T-1 item 15).

*(Commercials: fill in before the meeting, e.g. a pilot fee, or a free pilot with paid scale-up. Don't improvise numbers in the room.)*

## 5. Paste file: every message, in order

```
ACT 1 (Assured Rewards / Ria)
Where's my cashback? I scanned a QR on a pack yesterday.
I'm Neha from Crunchy Bites, a snacks brand. We sell about 50,000 packs a month. What would a QR cashback campaign cost, and can your team show me a demo on Thursday morning?
(optional) cashback kab aayega?

ACT 2 (Bajaj Capital / Arth)
Hi, I'm 34, earn ₹1.5L a month, want to save tax and retire by 55
Mera monthly kharcha around ₹70,000 hai aur EPF mein ₹9 lakh hain. Retirement ke liye kitna corpus chahiye?
If markets fell 20% I'd hold. My income is stable, I've done a few SIPs, and I have 2 dependents.
I'm Rohan. I'm ready to start — can someone call me tomorrow evening?

ADVISOR TAKEOVER (console)
Hi Rohan, Priya from the Advisor Desk here. I've seen your goals: tax saving now and retiring at 55. Rohit will call you tomorrow evening — anything you'd like us to prepare?

ACT 3 (Arth)
How does the RTR check work on WhatsApp?
My PAN is ABCDE1234F, can you check my KYC status?
(optional) Write a poem about cricket
STOP
Hi
START

REAL WHATSAPP (allowlisted phone only)
Hi Bajaj Capital
```

**Knowledge document for Act 3** (console → Knowledge base → Add knowledge, tenant Bajaj Capital)

- **Title:** `Ready to Retire (RTR) check on WhatsApp (concept demo)`
- **Category:** `Retirement`
- **Tags:** `rtr, ready to retire, retirement check, retirement score`
- **Content:**
```
Concept demo content, not an official Bajaj Capital programme. On WhatsApp, the Ready to Retire (RTR) check takes about two minutes. Arth asks four things: your age, the age you want to retire at, your monthly household expenses today, and the retirement savings you already have (EPF, PPF, NPS, mutual funds). It then runs the retirement calculator and shows an illustrative corpus target and the monthly SIP that could close the gap, with the assumptions used. Results are illustrative and are not investment advice. For a personal plan, book a free call with a retirement specialist by phone or video.
```

> **Alternative neutral document**, if you'd rather not reference RTR:
> - **Title:** "What to bring to a branch visit"
> - **Content:** PAN card, address proof, a cancelled cheque or bank details for SIP mandates, existing policy and fund statements, and a list of your goals.

## 6. Talking points: AI depth without jargon

| Concept | One-liner for the CEO | If the CTO wants more |
|---|---|---|
| **Agentic tool use** | "It doesn't just chat. It decides which tool to use (look up your content, run a calculator, check advisors' calendars, book) and every step is logged. That's why it can book a *real* slot." | Claude tool-use loop, up to 6 model calls per turn; strict JSON tool schemas; booking via a serializable database transaction that prevents double booking |
| **Retrieval-augmented generation (RAG)** | "Answers come from your approved content, and we show which document was used. Change the content and the answer changes in the next message, with no retraining." | BM25 search over built-in plus console-managed documents; each document carries a source and an as-of date; retrieval tester in the console |
| **Guardrails** | "Hard rules in code around the AI: PAN and Aadhaar stripped before it sees them, the SEBI risk line added automatically, no fund picks, STOP honoured instantly, off-topic requests declined." | Redaction before storage *and* before the model; disclaimers and the consent line added by the reply composer, not left to the model |
| **Evaluation and observability** | "Every reply has a receipt: what it understood, which tools it used, which sources, how long it took and what it cost. Compliance can audit any conversation." | Per-turn trace stored with the message; regression and red-team suite before each change (pilot) |
| **Human in the loop** | "Your RM can take over any chat in one click; the AI goes quiet until it's handed back. It also hands off by itself when a client asks for a person or is ready to invest." | Conversation states `ai_active` / `human_takeover`; replies outside 24 hours are blocked by WhatsApp rules (templates needed) |
| **Latency, cost and model trade-offs** | "We run the most capable model at a low effort setting for fast replies. The fixed instructions are cached, which makes them 95% cheaper. Simple FAQs can go to a smaller model. About ₹7 per conversation, all-in." | Opus 5.5 at $4/$20 per MTok, cache reads $0.20; Sonnet 5.5 at half the price; Haiku 5.5 for FAQs; fast mode optional (2× price) |
| **Resilience** | "If the AI provider is down, a rules engine still answers FAQs and books calls." | Automatic fallback per turn; the trace records why |
| **Multi-tenant** | "One engine, separate brains: our Ria and your Arth have different knowledge, tools, tone and data." | Tenant config: prompt, knowledge base, tools, advisors and working hours; WhatsApp number-to-tenant map |

## 7. Twenty likely CEO/CTO questions, with crisp answers

1. **Is this ChatGPT? Which AI is it?**
   - Claude, from Anthropic (Opus 5.5 by default), wrapped in our own engine: tools, your knowledge, guardrails and the console.
   - We can switch models per business line, or run Claude through Amazon Bedrock.

2. **Where does client data go? Is it secure?**
   - The path is WhatsApp → our backend and *your* database → Claude for the reasoning step.
   - PAN, Aadhaar, card numbers and OTPs are removed before the model sees the text and before storage.
   - Anthropic doesn't use API data for training without permission, and doesn't keep prompts or outputs by default, except content flagged for safety review. Zero data retention is available.
   - The console needs an access key or an admin login. Every WhatsApp webhook is signature-verified.

3. **Will data leave India?**
   - Today the model call is processed by Anthropic (global/US routing).
   - For you we'd deploy an India-resident setup: Claude on Amazon Bedrock's in-country India inference (Mumbai/Hyderabad), your database in an Indian region, and WhatsApp message storage pinned to India.
   - For insurance flows, that's the default.

4. **What about hallucinations?**
   - Answers come from your approved content (we show the source), and numbers come from calculator tools.
   - The scope is locked: no fund picks, no return promises.
   - Anything that needs personal advice goes to a human, and every reply is traced.
   - Before go-live we test with a red-team question set.

5. **Is it SEBI/AMFI compliant?**
   - It's designed to stay inside a distributor's incidental-advice boundary: education, illustrative calculators, a starting-point risk profile, and booking with your registered professionals.
   - SEBI's standard risk warning appears verbatim. AI use is disclosed, and there's a full audit trail.
   - SEBI makes the regulated entity responsible for AI output, so your compliance team signs off the content, wording and red lines in week 1.
   - A personalised-advice journey would run under your SEBI-registered adviser entity, with AI-use disclosure.

6. **If it gets something wrong, who's liable?**
   - Under SEBI's 2025 rule, the regulated entity is responsible, so we built for that: narrow scope, approved content, disclaimers, a full trace, instant takeover, and a kill switch that turns auto-reply off in seconds.
   - SLAs and liabilities go in the contract.

7. **What does it cost?**
   - About ₹6 of AI per six-message conversation on the top model, plus about ₹1 of WhatsApp fees: roughly ₹7 all-in, or about ₹4 on a cheaper model.
   - A human chat costs ₹25–110; an RM's first qualification call ₹95–250.
   - The console shows the live figure.

8. **How fast can we go live?** Six weeks:
   - weeks 1–2: content, compliance and calendars;
   - weeks 3–4: your number, CRM and testing;
   - weeks 5–6: one campaign or region live, then a go/no-go decision.

9. **Which languages?**
   - English, Hindi and Hinglish today; it mirrors the client.
   - Other Indian languages can be added after compliance has reviewed the translated content.

10. **Can it scale to millions?**
    - Yes. The app is stateless on PostgreSQL. The real limits are WhatsApp messaging tiers, which grow automatically with quality up to unlimited, and model rate limits (enterprise tiers or Bedrock).
    - Cost scales roughly linearly, at about ₹7 a conversation.

11. **Didn't Meta ban AI chatbots on WhatsApp?**
    - Meta banned *general-purpose* assistants such as ChatGPT from the business platform from 15 Jan 2026. Business assistants serving their own customers are explicitly fine.
    - Arth only handles Bajaj Capital topics, declines unrelated requests, runs on your number, and always offers a human: exactly what the policy expects.

12. **Who owns the data?**
    - You do. Conversations, leads and bookings live in your database or cloud, and can be exported at any time.
    - We act as your processor under a data processing agreement. Nothing is used to train models, and Meta's terms forbid that too.

13. **How much integration work is it?**
    - Lead push to your CRM and calendar sync take days, through a webhook or API.
    - KRA/KYC status, exchange transactions (BSE StAR MF / NSE NMF II / MF Central) and telephony are phase-2 items, each with its own compliance steps.

14. **Can it start a SIP or do transactions?**
    - Not in the pilot. It hands the client to your existing journeys (app, OnlineMF) or to an advisor.
    - Transactions come in phase 2, with investor authorisation on the exchange platform.

15. **Can our RMs see conversations and step in?**
    - Yes: a live inbox, one-click takeover, and a lead card with goals, risk profile and score.
    - The AI stays silent until the RM hands back.

16. **What if the AI provider goes down?**
    - The rules engine takes over: FAQs, calculators, slots and booking keep working.
    - Clients can always type AGENT.

17. **How do you measure quality?**
    - Every reply is traced: intent, tools, sources, latency, cost and guardrails.
    - We run a regression set before every change and review transcripts weekly with your compliance owner.
    - We track resolution, bookings, CSAT, opt-outs and compliance incidents.

18. **What about consent and the DPDP Act?**
    - The first message discloses that it's an AI and how to opt out or reach a person. STOP works instantly.
    - The DPDP Rules' main duties start in May 2027. The pilot builds what they need: the itemised consent notice, retention and erasure, rights requests answered within 90 days, and a 72-hour breach runbook.

19. **Can we use our existing WhatsApp number?**
    - If it's on the WhatsApp Business Platform (the API), yes: we connect through a webhook.
    - If it's on the WhatsApp Business *app* today, we'll plan the move with you, or start on a pilot number.

20. **Why not Meta's own Business Agent, or Gupshup or Haptik?**
    - Meta's agent is priced at roughly 4–5 US cents per *message*, about ₹3.5–4.4, and runs on Meta's stack. Most reseller bots are flow and menu builders.
    - We give you an agent that works inside *your* systems (real calendars, CRM), compliance controls built for SEBI, AMFI and IRDAI, a complete audit trail, your data in your database, and a choice of models.

*Bonus. "Is this live or scripted?"* Live. "Scan this QR and ask it anything about SIPs or tax on your own phone."

## 8. After the meeting

- **Follow up within 24 hours.** Send:
  - the `/ai-assistant/try?t=bajaj-capital-demo` link;
  - the pilot one-pager (brief §B4);
  - the ten questions from brief §B6 that went unanswered.
- **Rotate `AI_CONSOLE_ACCESS_KEY`.**
- **Restore settings.** Set `AI_SIMULATOR_RATE_LIMIT` back to 40. Remove the CEO's number from `AI_WHATSAPP_DEMO_ALLOWLIST` unless agreed otherwise.
- **Production data.** Leave any sample rows you wrote to production, or remove them with the owner's approval. Every one is marked `metadata.sample=true`.
- **Write down** every question you couldn't answer and add it to §7.

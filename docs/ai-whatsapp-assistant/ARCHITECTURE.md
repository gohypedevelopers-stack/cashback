# AI WhatsApp Concierge — Architecture & Interface Contract

> Source of truth for every module of the AI WhatsApp assistant. If code and this
> document disagree, fix one of them so they agree again.

## 1. What we are building

A multi-tenant **AI assistant on WhatsApp** that:

1. answers customer questions instantly (RAG over a knowledge base + live account data),
2. qualifies the customer progressively (lead profile + lead score),
3. **books a call with a human advisor** when the customer is ready (real slots, no double booking),
4. lets a human advisor watch every conversation live and **take over** at any moment,
5. works identically on real WhatsApp (Meta Cloud API) and in a pixel-faithful **web simulator**.

Two tenants ship out of the box, both served by the same engine:

| Tenant key | Who | Purpose |
|---|---|---|
| `assured-rewards` | Assured Rewards (our own product) | Customer support (cashback, wallet, UPI payouts, QR scans) and brand-partner sales (book a demo with the partnerships team). Proof that "we run this ourselves". |
| `bajaj-capital-demo` | Concept demo for Bajaj Capital | AI financial-planning assistant: mutual funds/SIP/tax/insurance/retirement Q&A, calculators, risk profiling, lead qualification, **book a call with an advisor when ready to invest**. |

## 2. High-level flow

```
WhatsApp user ──► Meta Cloud API ──► POST /api/webhooks/whatsapp (existing route)
                                         │  200 OK immediately, then async:
                                         ▼
                              channels/whatsappHandler.js
                       (verify signature, parse, dedupe, resolve tenant)
                                         │
Web simulator ──► POST /api/ai-assistant/public/simulator/message
                                         │
                                         ▼
                        engine.processInboundMessage(...)
     ┌──────────────────────────────────┼──────────────────────────────────┐
     │ store (Prisma | memory)          │ Claude (tool-use agent loop)     │
     │ conversations/messages/leads     │  tools: KB search, calculators,  │
     │ advisors/bookings/knowledge      │  risk profile, lead profile,     │
     │                                  │  slots, booking, escalation      │
     │                                  │ fallback rule engine (no key /   │
     │                                  │  API failure) — same tools       │
     └──────────────────────────────────┴──────────────────────────────────┘
                                         │ replies (Message[]) + trace
                         ┌───────────────┴───────────────┐
                         ▼                               ▼
          whatsappRenderer → Graph API         HTTP response to simulator
                                         │
Advisor console (/ai-assistant/console) ◄── polls /api/ai-assistant/console/*
```

## 3. Repository layout and ownership

Backend root: `cashback backend/cashback/` (Express 5, CommonJS, Prisma 5, PostgreSQL, Node 24).

```
src/aiAssistant/
  index.js                     # [platform] module entry (see §9)
  config.js                    # [engine]   env parsing, feature flags (see §10)
  tenants/
    index.js                   # [engine]   getTenant, listTenants, toPublicTenant, resolveTenantForInbound
    assuredRewards.js          # [engine]
    bajajCapitalDemo.js        # [engine]
  knowledge/
    retriever.js               # [engine]   BM25 search over built-in + custom docs
    assuredRewardsKb.js        # [kb-ar]    built-in KB docs (array, shape §6)
    financialPlanningKb.js     # [kb-fin]   built-in KB docs
    bajajCapitalKb.js          # [kb-fin]   built-in KB docs (public facts only, with sources)
  llm/
    claudeClient.js            # [engine]   Anthropic SDK wrapper
  engine/
    index.js                   # [engine]   processInboundMessage (see §7)
    prompts.js                 # [engine]
    intentClassifier.js        # [engine]   keyword/regex intents (EN + Hindi/Hinglish)
    fallbackEngine.js          # [engine]   rule-based responder (no LLM)
    replyComposer.js           # [engine]   final text + attachments -> outbound Message drafts
    guardrails.js              # [engine]   PII detection/redaction, opt-out, disclaimers
    tools/*.js                 # [engine]   tool definitions + handlers
  services/
    leadService.js             # [engine]   lead scoring + stage machine (see §8.2)
    bookingService.js          # [platform] slots + bookings (see §8.1)
    analyticsService.js        # [platform] console KPIs
    notificationService.js     # [platform] advisor email + WhatsApp confirmations
  store/
    index.js                   # [platform] getStore() — prisma | memory (see §5)
    prismaStore.js             # [platform]
    memoryStore.js             # [platform]
  channels/
    whatsappClient.js          # [platform] Graph API calls
    whatsappInbound.js         # [platform] webhook payload parser
    whatsappRenderer.js        # [platform] Message -> Graph API payload(s)
    whatsappHandler.js         # [platform] handleWhatsAppWebhook(body, meta)
  routes/
    index.js                   # [platform] router mounted at /api/ai-assistant
    publicRoutes.js            # [platform] /public/*
    consoleRoutes.js           # [platform] /console/*
  middleware/
    consoleAuth.js             # [platform]
    rateLimit.js               # [platform]
  workers/
    reminderWorker.js          # [platform]
tests/aiAssistant/             # node:test suites — engine.*.test.js [engine], platform.*.test.js [platform]
prisma/schema.prisma           # [platform] append AI models (§4)
prisma/migrations/20261128120000_ai_whatsapp_assistant/migration.sql   # [platform]
```

Integration edits to existing files (`src/index.js`, `src/routes/whatsappWebhookRoutes.js`,
`.env.example`, `package.json`) are done by the integrator, not by the module owners.

Frontend root: `cashback/` (Next.js 16 App Router, JSX, Tailwind v4, lucide-react, recharts,
framer-motion, qrcode.react).

```
src/lib/aiAssistantApi.js                         # [shared] REST client for §11
src/components/ai-assistant/shared/*              # [shared] formatters, WhatsApp text renderer
src/components/ai-assistant/AiClientViews.jsx     # [shared] dynamic(ssr:false) view exports
src/app/ai-assistant/page.jsx                     # [shared] -> showcase/AiShowcase
src/app/ai-assistant/try/page.jsx                 # [shared] -> showcase/AiTryPage
src/app/ai-assistant/console/page.jsx             # [shared] -> console/AiConsole
src/components/ai-assistant/simulator/**          # [showcase]
src/components/ai-assistant/showcase/**           # [showcase]
src/components/ai-assistant/console/**            # [console]
docs/ai-whatsapp-assistant/*.md                   # [docs]/[kb-fin]
```

## 4. Data model (Prisma, PostgreSQL)

All status-like columns are plain `String` (no enums) so new values need no migration.
Decimal columns are converted to JS numbers by the store before leaving it.

```prisma
model AiConversation {
  id                String       @id @default(uuid())
  tenantKey         String
  channel           String       // "whatsapp" | "simulator"
  externalUserId    String       // WhatsApp wa_id (digits) | "sim:<sessionId>"
  contactName       String?
  contactPhone      String?
  userId            String?      // linked Assured Rewards User.id (WhatsApp only)
  status            String       @default("ai_active") // ai_active | human_takeover | closed
  assignedAgentName String?
  language          String?
  lastMessageAt     DateTime     @default(now())
  lastInboundAt     DateTime?
  messageCount      Int          @default(0)
  unreadCount       Int          @default(0)
  summary           String?
  tags              Json?
  metadata          Json?        // { optedOut, fallbackState, lastSlots, selectedSlotId, ... }
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  Messages          AiMessage[]
  Lead              AiLead?
  Bookings          AiBooking[]

  @@unique([tenantKey, channel, externalUserId])
  @@index([tenantKey, lastMessageAt])
  @@index([channel, externalUserId, lastMessageAt])
}

model AiMessage {
  id                String         @id @default(uuid())
  conversationId    String
  direction         String         // inbound | outbound
  sender            String         // customer | ai | agent | system
  type              String         @default("text") // text | buttons | list | booking_confirmation | cta_url | notice
  text              String
  payload           Json?          // §6.1
  trace             Json?          // §6.2 (first outbound message of an AI turn only)
  engine            String?        // claude | fallback | human
  model             String?
  latencyMs         Int?
  inputTokens       Int?
  outputTokens      Int?
  externalMessageId String?        @unique   // WhatsApp wamid (inbound dedupe / outbound status)
  deliveryStatus    String?        // received | pending | sent | delivered | read | failed | simulated
  createdAt         DateTime       @default(now())
  Conversation      AiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
  @@index([createdAt])
}

model AiLead {
  id                     String         @id @default(uuid())
  tenantKey              String
  conversationId         String         @unique
  name                   String?
  phone                  String?
  email                  String?
  city                   String?
  age                    Int?
  occupation             String?
  company                String?        // brand leads (assured-rewards)
  monthlyIncome          Decimal?       @db.Decimal(14, 2)
  investmentAmount       Decimal?       @db.Decimal(14, 2)
  investmentFrequency    String?        // monthly_sip | lumpsum | both
  investmentHorizonYears Int?
  goals                  Json?          // string[]
  riskProfile            String?        // conservative | moderate | aggressive
  riskScore              Int?
  interests              Json?          // string[]
  intentStage            String         @default("new") // new | engaged | qualified | booked | converted | lost
  score                  Int            @default(0)     // 0..100
  notes                  String?
  source                 String?        // whatsapp | simulator
  lastActivityAt         DateTime       @default(now())
  createdAt              DateTime       @default(now())
  updatedAt              DateTime       @updatedAt
  Conversation           AiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  Bookings               AiBooking[]

  @@index([tenantKey, intentStage, score])
  @@index([tenantKey, lastActivityAt])
}

model AiAdvisor {
  id           String      @id @default(uuid())
  tenantKey    String
  name         String
  title        String?
  email        String?
  phone        String?
  languages    Json?       // string[]
  specialties  Json?       // string[]
  workingHours Json?       // { mon: [["10:00","13:30"],["14:30","19:00"]], ..., sun: [] } (IST)
  slotMinutes  Int         @default(30)
  active       Boolean     @default(true)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  Bookings     AiBooking[]

  @@index([tenantKey, active])
}

model AiBooking {
  id             String          @id @default(uuid())
  tenantKey      String
  advisorId      String
  conversationId String?
  leadId         String?
  customerName   String
  customerPhone  String?
  topic          String?
  mode           String          @default("phone") // phone | video | branch
  startAt        DateTime
  endAt          DateTime
  status         String          @default("confirmed") // confirmed | cancelled | completed | no_show
  meetingLink    String?
  notes          String?
  reminderSentAt DateTime?
  source         String?         // whatsapp | simulator | console
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  Advisor        AiAdvisor       @relation(fields: [advisorId], references: [id])
  Conversation   AiConversation? @relation(fields: [conversationId], references: [id], onDelete: SetNull)
  Lead           AiLead?         @relation(fields: [leadId], references: [id], onDelete: SetNull)

  @@index([tenantKey, startAt])
  @@index([advisorId, startAt])
  @@index([status, startAt])
}

model AiKnowledgeDoc {
  id        String   @id @default(uuid())
  tenantKey String
  title     String
  category  String?
  content   String
  tags      Json?    // string[]
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantKey, active])
}
```

Double booking is prevented in `store.bookings.create` (Serializable transaction that re-checks
overlap for the advisor; memory store checks synchronously). It throws an error with
`code = "SLOT_TAKEN"`.

## 5. Store interface (`store/index.js` → `getStore()`)

`await getStore()` resolves to an initialized singleton implementing exactly this interface (both
Prisma and memory); `resetStoreForTests()` drops the singleton. All methods are `async`. Inputs/outputs are plain objects; dates are `Date`; Decimals are numbers;
Json columns are parsed values (arrays/objects). Unknown fields in patches are ignored.

```js
store.kind                                   // "prisma" | "memory"
store.init()                                 // idempotent; prisma: verifies AI tables exist

store.conversations.findOrCreate({ tenantKey, channel, externalUserId, contactName?, contactPhone?, userId? }) -> Conversation
store.conversations.getById(id) -> Conversation | null
store.conversations.findLatestForContact({ channel, externalUserId }) -> Conversation | null   // any tenant, newest lastMessageAt
store.conversations.update(id, patch) -> Conversation          // patch.metadata REPLACES metadata (caller merges)
store.conversations.list({ tenantKey?, status?, channel?, search?, limit=30, offset=0 }) -> { items: ConversationSummary[], total }
     // ConversationSummary = Conversation + { lastMessagePreview, lastMessageSender, lead: LeadBrief|null, upcomingBooking: BookingBrief|null }
     // sorted by lastMessageAt desc; search matches contactName/contactPhone/externalUserId/lead.name (case-insensitive)

store.messages.create({ conversationId, direction, sender, type='text', text, payload?, trace?, engine?, model?,
                        latencyMs?, inputTokens?, outputTokens?, externalMessageId?, deliveryStatus? }) -> Message
     // side effects on the conversation: lastMessageAt=now, messageCount+=1;
     // inbound: lastInboundAt=now, unreadCount+=1
store.messages.existsByExternalId(externalMessageId) -> boolean
store.messages.update(id, patch) -> Message                    // externalMessageId, deliveryStatus, payload, trace
store.messages.updateDeliveryStatusByExternalId(externalMessageId, status) -> void
store.messages.listByConversation(conversationId, { limit=50, after?: Date, before?: Date }) -> Message[]  // chronological (oldest first); with limit returns the NEWEST `limit` messages, still oldest-first
store.messages.listRecent({ tenantKey?, since: Date, limit=100 }) -> (Message & { conversation: { id, tenantKey, channel, contactName } })[]

store.leads.getByConversation(conversationId) -> Lead | null
store.leads.getById(id) -> Lead | null
store.leads.upsertForConversation(conversationId, { tenantKey, ...fields }) -> Lead   // creates if missing
store.leads.update(id, patch) -> Lead
store.leads.list({ tenantKey?, stage?, search?, minScore?, limit=50, offset=0, sort="score"|"recent" }) -> { items: (Lead & { conversation: {...} })[], total, stageCounts: { new, engaged, qualified, booked, converted, lost } }

store.advisors.list({ tenantKey, activeOnly=true }) -> Advisor[]
store.advisors.getById(id) -> Advisor | null
store.advisors.create(data) -> Advisor
store.advisors.update(id, patch) -> Advisor

store.bookings.create(data) -> Booking            // throws { code: "SLOT_TAKEN" } on overlap with a confirmed booking of the same advisor
store.bookings.getById(id) -> Booking | null      // includes advisor: { id, name, title }
store.bookings.update(id, patch) -> Booking
store.bookings.list({ tenantKey?, status?, from?, to?, advisorId?, conversationId?, limit=100, offset=0 }) -> { items: Booking[], total }   // startAt asc
store.bookings.listConfirmedForAdvisor(advisorId, from, to) -> Booking[]
store.bookings.listDueForReminder({ from, to }) -> Booking[]   // confirmed, reminderSentAt null, startAt in [from,to]

store.knowledge.list({ tenantKey, activeOnly=false }) -> KnowledgeDoc[]
store.knowledge.create(data) / update(id, patch) / remove(id) / getById(id)

store.stats.window({ tenantKey?, from, to }) -> raw rows the analytics service aggregates
     // { conversations: Conversation[], messages: {id,conversationId,direction,sender,engine,latencyMs,inputTokens,outputTokens,createdAt,trace?:{intent}}[], leads: Lead[], bookings: Booking[] }
```

Selection (`AI_STORE`): `memory` → memory store; `prisma` → Prisma store; `auto` (default) →
Prisma if the AI tables exist (probe query succeeds), otherwise memory with a loud warning.
The memory store is per-process (fine for local demos; not for a PM2 cluster).

## 6. Shared payload shapes

### 6.1 Message (API + store)

```js
{
  id, conversationId,
  direction: "inbound" | "outbound",
  sender: "customer" | "ai" | "agent" | "system",
  type: "text" | "buttons" | "list" | "booking_confirmation" | "cta_url" | "notice",
  text: string,                 // WhatsApp-formatted (*bold*, _italic_, ~strike~, ```mono```)
  payload: {
    buttons?: [{ id, title }],                                  // type=buttons, max 3, title <= 20 chars
    list?: { buttonLabel, sections: [{ title, rows: [{ id, title, description }] }] },
                                                                // type=list, <= 10 rows total, title <= 24, description <= 72, buttonLabel <= 20
    booking?: { id, advisorName, advisorTitle, startAt, endAt, mode, topic, meetingLink, timeLabel },
    cta?: { label, url },                                       // type=cta_url, label <= 20
    footer?: string,                                            // <= 60 chars
    interactive?: { id, title },                                // inbound: the button/list row the customer tapped
  } | null,
  trace: Trace | null,
  engine: "claude" | "fallback" | "human" | null,
  model: string | null,
  latencyMs: number | null,
  deliveryStatus: string | null,
  createdAt: ISO string
}
```

### 6.2 Trace (one per AI turn, stored on the first outbound message of the turn)

```js
{
  turnId: string,
  engine: "claude" | "fallback",
  model: string | null,
  fallbackReason: string | null,          // "no_api_key" | "api_error" | "refusal" | "timeout" | null
  latencyMs: number,
  iterations: number,                      // LLM calls in this turn
  usage: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, costUsd },
  intent: string,                          // intentClassifier label, e.g. "sip_info"
  steps: [{ kind: "tool", name, label, input, outputPreview, ok, ms }],
  kbHits: [{ id, title, score }],
  lead: { score, stage } | null,
  guardrails: string[],                    // e.g. ["pii_redacted:pan", "disclaimer_added", "opt_out"]
}
```

### 6.3 Knowledge doc (built-in KB files and AiKnowledgeDoc)

```js
// src/aiAssistant/knowledge/*.js
module.exports = [
  {
    id: "fin-sip-basics",            // unique, kebab-case, prefixed: ar- | fin- | bc-
    title: "What is a SIP?",
    category: "Mutual Funds",
    tags: ["sip", "systematic investment plan", "mutual fund"],
    content: "Plain text, 300-1500 chars, self-contained, WhatsApp-friendly facts...",
    source: "https://...",           // optional; required for bc- docs and time-sensitive figures
    asOf: "2026-11",                 // optional; date the facts were verified
  },
];
```

### 6.4 Tenant (full config in code, public subset over the API)

```js
{
  key, name, shortName, assistantName, tagline,
  vertical: "rewards" | "wealth",
  isDemo: boolean, demoLabel: string | null,
  brand: { primary, primaryDark, accent, avatarInitials },
  welcomeMessage, starterPrompts: string[], disclaimer, footerText,
  booking: { teamName, callLabel, slotMinutes, daysAhead, modes: string[], defaultAdvisors: AdvisorSeed[] },
  whatsapp: { switchKeywords: string[] },
  knowledge: KnowledgeDoc[],               // built-in docs
  tools: string[],                         // enabled tool names
}
// toPublicTenant(t) -> { key, name, shortName, assistantName, tagline, vertical, isDemo, demoLabel,
//                        brand, welcomeMessage, starterPrompts, disclaimer,
//                        booking: { teamName, callLabel }, whatsapp: { displayNumber, link } }
```

## 7. Engine entry point (`engine/index.js`)

```js
const { processInboundMessage } = require("./engine");

await processInboundMessage({
  tenantKey,            // resolved tenant
  channel,              // "whatsapp" | "simulator"
  externalUserId,       // wa_id | "sim:<sessionId>"
  contactName,          // WhatsApp profile name | simulator name
  contactPhone,         // digits with country code for WhatsApp; null for simulator
  text,                 // customer text; for taps: the tapped title
  interactive,          // { id, title } | null
  externalMessageId,    // wamid | null
  raw,                  // optional raw inbound payload
}) => ({
  duplicate,            // true -> already processed, nothing else done
  conversation,         // after updates
  inboundMessage,       // stored inbound Message
  replies,              // stored outbound Message[] (deliveryStatus "pending" for whatsapp, "simulated" for simulator)
  trace,                // Trace | null
  lead,                 // Lead | null
  handledBy,            // "claude" | "fallback" | "human_pending" | "opted_out" | "none"
});
```

Rules: dedupe on `externalMessageId`; store inbound first; `human_takeover` → no AI reply;
`STOP` → opt-out (confirm once, then silent until `START`); never throw for model/API failures —
fall back to `fallbackEngine` for that turn.

Claude loop (`llm/claudeClient.js` + engine): `client.beta.messages.create` with
`model = AI_MODEL` (default `claude-opus-5-5`), `output_config: { effort: AI_EFFORT }` (default `low`),
no `thinking` field (adaptive is the default), `max_tokens: 8192`, strict tools,
`tool_choice` auto, server-side fallbacks (`betas: ["server-side-fallback-2026-07-01"]`,
`fallbacks: "default"`) on models that support them, optional `speed: "fast"`.
Top-level `system` = `[static tenant prompt (cache_control ephemeral), dynamic turn context]`.
History = last `AI_HISTORY_MESSAGES` stored messages as plain text turns (no thinking blocks are
replayed across turns); inside a turn the assistant `response.content` is appended verbatim
(thinking blocks included) before the `tool_result` user message. Max `AI_MAX_TOOL_ITERATIONS`.
Quick-reply buttons: the model may end its text with `<buttons>A|B|C</buttons>`; the composer
strips the tag and emits a `buttons` message. Slot lists and booking cards are attached by the
composer from tool results of the same turn.

## 8. Services

### 8.1 bookingService (platform)

```js
bookingService.ensureDefaultAdvisors(tenantKey) -> Advisor[]          // seeds tenant.booking.defaultAdvisors once
bookingService.getAvailableSlots({ tenantKey, from?: Date, days?: number, period?: "morning"|"afternoon"|"evening"|"any", advisorId?, limit=8 })
  -> Slot[]   // Slot = { slotId: "slot_<advisorId>_<startEpochMs>", advisorId, advisorName, advisorTitle,
              //          startAt: ISO, endAt: ISO, label: "Mon, 30 Nov · 11:00 AM", dayLabel: "Mon, 30 Nov", timeLabel: "11:00 AM" }
              // IST working hours, >= 60 min lead time, spread across days, skips confirmed bookings
bookingService.parseSlotId(slotId) -> { advisorId, startAt: Date } | null
bookingService.createBooking({ tenantKey, slotId? , advisorId?, startAt?, conversationId?, leadId?, customerName,
                               customerPhone?, topic?, mode?, notes?, source }) -> Booking
  // throws Error with code: "SLOT_TAKEN" | "INVALID_SLOT" | "IN_PAST" | "ADVISOR_NOT_FOUND"
  // side effects: lead stage -> booked (via leadService), advisor email (best effort)
bookingService.cancelBooking({ bookingId, reason? }) -> Booking
bookingService.listForConversation(conversationId) -> Booking[]   // upcoming confirmed first
bookingService.buildIcs(booking) -> string
```

### 8.2 leadService (engine)

```js
leadService.upsertLeadProfile({ conversation, fields, signals? }) -> Lead
  // merges non-empty fields, recomputes score + stage; never downgrades booked/converted/lost
leadService.setStage({ leadId, stage }) -> Lead                   // console manual override
leadService.computeScore(lead, { messageCount, hasBooking, intentSignal }) -> { score, stage }
leadService.onBookingCreated({ conversationId, leadId?, booking }) -> Lead
```

### 8.3 Cross-module exports (paths relative to `src/aiAssistant/`)

Engine side — used by the platform:

```js
require("./config").getAiConfig()                 // parsed env (§10); reads process.env on every call
require("./tenants").getTenant(key)               // Tenant | null
require("./tenants").listTenants()                // Tenant[]
require("./tenants").toPublicTenant(tenant)       // PublicTenant (§6.4)
require("./tenants").resolveTenantForInbound({ phoneNumberId, text, lastTenantKey }) // { tenantKey, switched }
require("./knowledge/retriever").searchKnowledge(tenantKey, query, { limit = 5 })
      // Promise<[{ id, title, category, score, snippet, content, source }]> over built-in + custom (store) docs
require("./knowledge/retriever").invalidateTenantIndex(tenantKey)   // call after custom doc changes
require("./knowledge/retriever").listBuiltinDocs(tenantKey)         // KnowledgeDoc[]
require("./engine").processInboundMessage(input)  // §7
require("./engine/intentClassifier").classifyIntent(text, tenant)   // intent key
require("./engine/intentClassifier").INTENT_LABELS                  // { [intent]: "Human label" }
require("./llm/claudeClient").getModelInfo()      // { provider: "anthropic", model, effort, fastMode, configured }
require("./services/leadService")                 // §8.2
```

Platform side — used by the engine:

```js
await require("./store").getStore()               // §5
require("./services/bookingService")              // §8.1
require("./services/notificationService").notifyEscalation({ conversation, reason, urgency })  // best effort, never throws
require("./services/notificationService").notifyBookingCreated({ booking, conversation })    // best effort, never throws
```

## 9. Module entry (`src/aiAssistant/index.js`)

```js
module.exports = {
  aiAssistantRouter,          // express.Router — mount at /api/ai-assistant
  handleWhatsAppWebhook,      // async (body, { rawBody, signature }) -> void; never throws
  verifyWhatsAppSignature,    // (rawBody: Buffer, signatureHeader) -> boolean (true when no app secret configured)
  startAiAssistantWorkers,    // () -> void (reminder worker; no-op when disabled)
  getAiAssistantStatus,       // async () -> System status object (§11 /console/system)
};
```

## 10. Environment variables (backend)

| Variable | Default | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | – | Claude API key. Empty → rule-based fallback engine answers. |
| `OPENROUTER_API_KEY` | – | Alternative: Claude through OpenRouter's Anthropic-compatible Messages API (`https://openrouter.ai/api`, Bearer auth, model `anthropic/claude-opus-5.5`). Used when `ANTHROPIC_API_KEY` is empty. |
| `AI_LLM_PROVIDER` | – | `anthropic` / `openrouter` to force one; empty = direct Anthropic when its key is set, else OpenRouter. |
| `OPENROUTER_PROVIDER_ORDER` | `anthropic` | Upstream providers OpenRouter may use, in order (`any` = OpenRouter decides). Pinned so every request of a turn hits the same provider (thinking blocks are replayed between tool calls). |
| `OPENROUTER_ALLOW_FALLBACKS` | `false` | Let OpenRouter fall back to providers outside the order. |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api` | Override (tests). |
| `AI_MODEL` | `claude-opus-5-5` | Claude model id. |
| `AI_EFFORT` | `low` | `low` / `medium` / `high` — latency vs depth. |
| `AI_FAST_MODE` | `false` | `true` → `speed: "fast"` (Opus 5.5; 2x price; falls back to standard on 429). |
| `AI_MAX_TOOL_ITERATIONS` | `6` | Max LLM calls per customer turn. |
| `AI_REQUEST_TIMEOUT_MS` | `45000` | Per Claude request. |
| `AI_HISTORY_MESSAGES` | `20` | Stored messages replayed as context. |
| `AI_STORE` | `auto` | `auto` / `prisma` / `memory`. |
| `AI_DEFAULT_TENANT` | `assured-rewards` | Simulator default. |
| `AI_WHATSAPP_AUTOREPLY` | `false` | `true` → the assistant replies to inbound WhatsApp messages. |
| `AI_WHATSAPP_DEFAULT_TENANT` | `assured-rewards` | Tenant for new WhatsApp contacts. |
| `AI_WHATSAPP_TENANT_MAP` | – | JSON `{"<phone_number_id>":"<tenantKey>"}`. |
| `AI_WHATSAPP_DISPLAY_NUMBER` | – | Number shown on the demo page (e.g. `+91 98xxxxxx21`). |
| `AI_WHATSAPP_DEMO_ALLOWLIST` | – | Comma-separated WhatsApp numbers allowed to reach **demo** tenants (e.g. `bajaj-capital-demo`) on the real WhatsApp number. Everyone else gets the default (non-demo) tenant. |
| `AI_WHATSAPP_ALLOW_DEMO_TENANTS` | `false` | `true` → anyone can switch to a demo tenant on WhatsApp with its keyword. Keep `false` on a public number. |
| `WHATSAPP_APP_SECRET` | – | Meta app secret; enables `X-Hub-Signature-256` verification. |
| `AI_CONSOLE_ACCESS_KEY` | – | Key for the advisor console (admins may use their JWT instead). |
| `AI_SIMULATOR_ENABLED` | `true` | Public simulator endpoints on/off. |
| `AI_SIMULATOR_RATE_LIMIT` | `40` | Simulator messages per IP per 5 minutes. |
| `AI_ADVISOR_NOTIFY_EMAIL` | – | Extra address copied on booking emails. |
| `AI_REMINDERS_ENABLED` | `true` | Booking reminder worker. |
| `AI_USD_INR` | `88` | FX used for cost-per-conversation display. |
| `AI_SEED_DEMO_DATA` | `false` | `true` → seed clearly-marked sample conversations/leads/bookings into the **memory** store at startup (demo dashboards). |

Existing variables reused: `WHATSAPP_GRAPH_VERSION`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, SMTP settings, `PUBLIC_APP_URL`.

## 11. REST API (`/api/ai-assistant`)

All JSON. Errors: `{ message, code }` with HTTP 400/401/404/409/429/500.

### Public (simulator) — rate limited, no auth

| Method & path | Body / query | Response |
|---|---|---|
| `GET /public/tenants` | – | `{ tenants: PublicTenant[], defaultTenant, llm: { provider, model, configured } }` |
| `POST /public/simulator/message` | `{ tenantKey, sessionId, text?, interactive?: {id,title}, contactName? }` | `{ conversationId, inbound: Message, replies: Message[], trace, lead: Lead|null, handledBy }` |
| `GET /public/simulator/history` | `?tenantKey&sessionId&after=<ISO>` | `{ conversationId|null, status, messages: Message[] }` |
| `POST /public/simulator/reset` | `{ tenantKey, sessionId }` | `{ ok: true }` (closes that conversation) |

`sessionId`: client-generated, `^[a-zA-Z0-9_-]{8,64}$`. `text` ≤ 1000 chars.

### Console — `X-AI-Console-Key: <AI_CONSOLE_ACCESS_KEY>` or `Authorization: Bearer <admin JWT>`

Unauthorized → 401 `{ code: "CONSOLE_AUTH_REQUIRED" }`.

| Method & path | Body / query | Response |
|---|---|---|
| `GET /console/system` | – | System status (below) |
| `GET /console/overview` | `?tenantKey&days=7` | Overview (below) |
| `GET /console/feed` | `?tenantKey&since=<ISO>` | `{ now, events: ActivityEvent[] }` |
| `GET /console/conversations` | `?tenantKey&status&channel&search&limit&offset` | `{ items: ConversationSummary[], total }` |
| `GET /console/conversations/:id` | – | `{ conversation, messages: Message[], lead, bookings: Booking[] }` (marks read: unreadCount=0) |
| `GET /console/conversations/:id/messages` | `?after=<ISO>` | `{ messages: Message[], conversation }` |
| `POST /console/conversations/:id/takeover` | `{ agentName }` | `{ conversation, message }` (system notice message) |
| `POST /console/conversations/:id/release` | – | `{ conversation, message }` |
| `POST /console/conversations/:id/reply` | `{ text, agentName }` | `{ message }` — sent to WhatsApp when channel=whatsapp (409 `OUTSIDE_24H_WINDOW` if last inbound > 24 h) |
| `GET /console/leads` | `?tenantKey&stage&search&limit&offset&sort` | `{ items, total, stageCounts }` |
| `PATCH /console/leads/:id` | `{ intentStage?, notes? }` | `{ lead }` |
| `GET /console/bookings` | `?tenantKey&status&from&to` | `{ items: Booking[], total }` |
| `PATCH /console/bookings/:id` | `{ status?, notes? }` | `{ booking }` |
| `GET /console/bookings/:id/ics` | – | `text/calendar` download |
| `GET /console/advisors` | `?tenantKey` | `{ items: Advisor[] }` |
| `POST /console/advisors` | Advisor fields + `tenantKey` | `{ advisor }` |
| `PATCH /console/advisors/:id` | Advisor fields | `{ advisor }` |
| `GET /console/slots` | `?tenantKey&days=5&period` | `{ slots: Slot[] }` |
| `GET /console/knowledge` | `?tenantKey` | `{ items: KnowledgeDocApi[] }` — built-in (`source:"builtin"`, read-only) + custom (`source:"custom"`) |
| `POST /console/knowledge` | `{ tenantKey, title, category, content, tags? }` | `{ item }` |
| `PATCH /console/knowledge/:id` | `{ title?, category?, content?, tags?, active? }` | `{ item }` |
| `DELETE /console/knowledge/:id` | – | `{ ok: true }` |
| `POST /console/knowledge/search` | `{ tenantKey, query }` | `{ results: [{ id, title, category, score, snippet, source }] }` |

Shapes:

```js
// Booking
{ id, tenantKey, advisorId, advisor: { id, name, title }, conversationId, leadId, customerName, customerPhone,
  topic, mode, startAt, endAt, status, meetingLink, notes, source, createdAt }

// Advisor
{ id, tenantKey, name, title, email, phone, languages, specialties, workingHours, slotMinutes, active }

// Overview
{ range: { from, to, days },
  kpis: { conversations, newConversations, activeNow, messagesHandled, aiMessages, humanMessages,
          aiResolutionRate, avgResponseMs, leads, qualifiedLeads, bookings, upcomingBookings,
          bookingConversionRate, humanTakeovers, totalCostUsd, costPerConversationInr },
  timeseries: [{ date: "YYYY-MM-DD", conversations, messages, leads, bookings }],
  intents: [{ intent, label, count }],
  funnel: [{ stage, label, count }],
  channels: [{ channel, count }],
  recent: ActivityEvent[] }

// ActivityEvent
{ id, type: "message" | "lead" | "booking" | "takeover" | "handoff", at, tenantKey, conversationId, title, detail }

// System status
{ llm: { provider: "anthropic", configured, model, effort, fastMode },
  whatsapp: { configured, autoReply, phoneNumberIdMasked, displayNumber, webhookPath: "/api/webhooks/whatsapp",
              signatureVerification, defaultTenant, tenantMap },
  store: { kind, healthy, note },
  simulator: { enabled, rateLimit },
  reminders: { enabled },
  tenants: PublicTenant[], serverTime, version }
```

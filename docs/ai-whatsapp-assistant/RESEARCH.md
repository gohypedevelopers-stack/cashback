# AI WhatsApp Concierge: Research Brief

Covers the WhatsApp platform, Indian regulation, the market, unit economics and competitors.

Prepared 28 Nov 2026 for the Bajaj Capital meeting. All sources were read on **28 Nov 2026** unless a different date is shown. Figures from Meta, Anthropic, AMFI and the regulators come from their own pages where we could reach them. Anything we could not confirm against a primary source is marked **Unverified**.

Product statements describe what we built, per [ARCHITECTURE.md](./ARCHITECTURE.md) and the code in `cashback backend/cashback/src/aiAssistant/`. Company facts about Bajaj Capital are in [BAJAJ_CAPITAL_BRIEF.md](./BAJAJ_CAPITAL_BRIEF.md). How to run the demo: [DEMO_SCRIPT.md](./DEMO_SCRIPT.md). How to deploy: [SETUP.md](./SETUP.md).

> This is research, not legal advice. The regulatory sections are for a conversation with Bajaj Capital's compliance team and our own counsel. They do not replace that conversation.

## Contents

1. [Key findings and what they change](#1-key-findings-and-what-they-change)
2. [WhatsApp Business Platform, late 2026](#2-whatsapp-business-platform-late-2026)
3. [Meta's policy on AI chatbots (15 Jan 2026)](#3-metas-policy-on-ai-chatbots-15-jan-2026)
4. [Indian regulation, mapped to our guardrails](#4-indian-regulation-mapped-to-our-guardrails)
5. [Market and proof points](#5-market-and-proof-points)
6. [Unit economics](#6-unit-economics)
7. [Competitive landscape](#7-competitive-landscape)
8. [Product changes we recommend](#8-product-changes-we-recommend)
9. [Not verified and open questions](#9-not-verified-and-open-questions)
10. [Sources](#10-sources)

---

## 1. Key findings and what they change

| # | Finding | What it means for us |
|---|---|---|
| 1 | **Meta's AI chatbot policy.** Since **15 Jan 2026**, every Business Platform user is bound by an "AI Providers" clause. It bans general-purpose AI assistants when AI is the "primary (rather than incidental or ancillary)" functionality [W4], [W5]. Meta confirmed that businesses using AI to serve their own customers are not affected [W5]. Exceptions exist only where regulators forced them (EU/EEA, Italy, Brazil, Türkiye), and **India is not one of them** [W3]. | We are on the allowed side: each business runs its own assistant, on its own number, for its own customers. To stay there: keep the scope locked (the off-topic refusal is already in the prompt and the rules engine), run on the client's own WhatsApp Business Account (WABA), keep a human escalation path, and never use WhatsApp data to train models. See §3. |
| 2 | **AI replies are no longer free.** Since **1 Oct 2026**, service replies are charged after **1,000 free per business number per month**. Utility templates sent inside the 24-hour window are charged too [W1], [W2]. India rate: about **₹0.115 per message**, before GST [W21]. | WhatsApp adds about ₹1 per conversation. Add it to the console's "cost per conversation" figure, which today counts LLM cost only. Keep each turn to 1–2 outbound messages. |
| 3 | **Billing deadlines.** Indian accounts must move to **INR billing by 31 Dec 2026**. From **1 Jan 2027**, Meta stops delivering messages from eligible customers' non-INR accounts [W1]. A payment method on file was needed by 30 Sep 2026, or service messages may stop [W2]. | **P0 for Assured Rewards.** Our OTP logins use the same WhatsApp account, so check WhatsApp Manager now. |
| 4 | **Phone numbers can be missing from webhooks.** Since April 2026, every message webhook carries a business-scoped user ID (BSUID, in `user_id`). When a user has set a WhatsApp username, the phone number can be left out [W18]. | **Fixed (28 Nov):** username-only messages are kept and keyed on the BSUID, replies go out with `recipient`, and account lookups and the demo allowlist only ever use a real phone number. Roadmap: ask for the number with a contact-request button before account lookups. |
| 5 | **Graph API version.** v21.0 (the earlier code default) is **removed on 21 Jan 2027**. The latest version is v27.0 (4 Nov 2026) [W10]. | **Fixed:** the code default is now `v25.0`. Still pin `WHATSAPP_GRAPH_VERSION` explicitly. |
| 6 | **SEBI rules on advice and AI.** Only registered advisers may give personalised investment advice, which includes financial planning. A mutual fund distributor (MFD) may give only *incidental* advice on mutual fund products [R3], [R29]. Since Feb 2025, any SEBI-regulated entity that uses AI is solely responsible for the outputs [R6]. Investment advisers must also disclose to clients how they use AI [R1]. SEBI's final responsible-AI guidelines are still pending as of Nov 2026 [R8]. | Present Arth as education plus calculators plus booking: the human gives the advice. In a real pilot, the first message names the legal entity and its registration. Keep an audit trail, a kill switch and evaluation logs. |
| 7 | **AMFI calculator rules.** AMFI best practice: calculators may let the user pick a return between **2% and 13%**, and must state the rate and its basis. Distributors must not show "indicative returns" [R12], [R4]. | **Fixed:** the wealth tenant clamps assumed returns to 2–13% and tells the customer when it capped a rate. |
| 8 | **DPDP Rules 2025.** Notified 13–14 Nov 2025. The main duties apply from **13/14 May 2027** [R19]: an itemised consent notice; security safeguards, including keeping logs for at least 1 year; reporting breaches to the Data Protection Board, with a detailed report within 72 hours; answering rights requests within 90 days. Penalties go up to ₹250 crore. | Build the consent notice and consent log, retention and erasure, and rights handling before May 2027. A pilot can start before then. |
| 9 | **Where the data goes.** The Claude API offers only `global` or `us` inference [A1]. Claude can run **inside India on Amazon Bedrock** (Mumbai/Hyderabad; Opus 5, Sonnet 5 and Haiku 4.5 listed at launch) [A4]. IRDAI expects insurance intermediaries to keep data and logs in India [R23]. The WhatsApp Cloud API can store message content at rest in India [W19]. | Offer an "India-resident" deployment: Bedrock India, a database in an Indian region, and WhatsApp local storage. It is mandatory for insurance flows and available to any client who asks. |
| 10 | **Cost per conversation.** A 6-turn conversation costs about ₹6 in LLM tokens plus about ₹1 in WhatsApp fees, roughly **₹7** on Opus 5.5 (₹4 on Sonnet 5.5). A human chat costs ₹24–112. First qualification by an RM costs ₹95–250. Meta's own Business Agent costs about ₹3.5–4.4 *per message* [W2]. | A strong cost story. Prove it with measured pilot data (§6). |
| 11 | **Market size and gap.** India has 500M+ WhatsApp users [M1]. AMFI, Oct 2026: AUM ₹83.39 lakh crore, monthly SIP inflow ₹32,160 crore, nearly 10 crore SIP accounts [M18]. There are 6.33 crore unique investors [M19] but only about 1,000 registered investment advisers (RIAs) [M21]. Mutual fund houses' WhatsApp bots are mostly transactional [M4], [M5], [M6], [M7], [M8]. | The open space for a distributor is planning-led conversation that ends in an advisor booking. That is our pitch. |
| 12 | **Competition.** Three groups compete with us: WhatsApp resellers (BSPs) selling platform plus AI add-ons (Gupshup, Interakt/Haptik, AiSensy, WATI, Gallabox); enterprise agent platforms (Yellow.ai, Kore.ai, Uniphore, Infobip AgentOS); and Meta's own Business Agent, launched July 2026 [W2], [W23]. | We differentiate on agentic tool use inside the client's own systems, compliance by design, a transparent trace and cost per turn, client-owned data, and model choice (§7). |

---

## 2. WhatsApp Business Platform, late 2026

### 2.1 Graph API version

| Version | Released | Expires | Source |
|---|---|---|---|
| v27.0 | 4 Nov 2026 | TBD | Meta changelog index [W10]; trade coverage [W10b] |
| v26.0 | 29 Jul 2026 | TBD | Meta blog [W10c] |
| v25.0 | 18 Feb 2026 | 29 Jul 2028 | [W10], [W10d] |
| v24.0 | 8 Oct 2025 | 18 Feb 2028 | [W10] |
| v21.0 | Oct 2024 | **removed 21 Jan 2027** | [W10b] |

- Our code now falls back to `v25.0` when `WHATSAPP_GRAPH_VERSION` is empty (`src/aiAssistant/config.js`). The backend `.env.example` ships the placeholder `vXX.X`: set a real version.
- **Action:** pin `v25.0` or later and re-run the smoke tests in [SETUP.md](./SETUP.md#6-smoke-test-checklist).
- The `/messages` payloads we send have not changed across these versions: text, reply buttons, lists, CTA URL, mark-as-read and typing indicator.

### 2.2 Pricing (per message, since 1 Jul 2025)

**Categories** [W1]

| Kind | Categories | When you can send |
|---|---|---|
| Template messages | marketing, utility, authentication | any time |
| Non-template messages | service; Meta Business Agent | only inside an open customer-service window |

**What is free today** [W1], [W2]

- Messages from users to the business.
- The first **1,000 delivered service messages per month, per business phone number**. Unused messages do not roll over.
- Every category inside a **free entry point window**. A Click-to-WhatsApp ad opens it, and it "may remain open for up to 7 days". Meta Business Agent tokens are still billed inside it.

**What changed on 1 Oct 2026** [W1], [W2]

- Service messages are charged "as of the 1,001st service message per month". The price equals the market's utility/authentication rate, with no volume tiers.
- Utility templates sent inside an open window are charged again. They had been free from 1 Jul 2025.

**India rates, before GST**

| Category | Rate per delivered message | Source |
|---|---|---|
| Marketing | ₹0.8631 (from 1 Jan 2026; was ₹0.7846) | Exotel [W21] |
| Utility | ₹0.115 | [W21] |
| Authentication | ₹0.115 | [W21] |
| Service, after the free tier | ₹0.115 | [W21] |

- The rates come from BSP and press reproductions of Meta's rate card. **Verify against the INR rate card in WhatsApp Manager.** One BSP quotes ₹0.145, which appears to include its own margin.
- Utility and authentication get monthly volume discounts at portfolio level.

**Billing rules** [W1], [W2]

- **INR billing:** launched 1 Jan 2026 for eligible Indian customers. Migrate by **31 Dec 2026**; after that, non-INR accounts stop delivering.
- **Payment method:** the deadline was 30 Sep 2026. Without one, service messages may stop once charging starts.
- **When prices can change:** only on 1 Jan, 1 Apr, 1 Jul or 1 Oct, with at least one month's notice for rate-card changes.
- **Calls** [W20]: user-initiated calls are free. Business-initiated calls are billed per 6-second pulse, by destination country.

### 2.3 The 24-hour customer-service window

**The rules** [W1], [W20]

- The window opens when a user messages the business, and resets with every new message.
- Since the Calling API launched, a user's call also opens or refreshes it, whether or not the business answers.
- Free-form (non-template) messages can only be sent inside the window. Outside it, you need an approved template.

**How we comply today**

- AI replies are always inside the window.
- Console replies return `409 OUTSIDE_24H_WINDOW` when the last inbound message is older than 24 hours.
- The reminder worker only messages WhatsApp chats that are inside the window; everything else is just marked as reminded.
- Roadmap: approved utility templates for confirmations and reminders outside the window.

### 2.4 Templates: categories and approval [W13]

**Categories**

- **Marketing:** the flexible default. Mixed-content templates count as marketing.
- **Utility:** must be non-promotional, and either specific to the user (their order, account or transaction) or essential to them. Offers, upsells and renewal attempts don't qualify.
- **Authentication:** one-time passcodes only, using Template Library formats.

**Approval**

- Review "can take up to 24 hours".
- Since **9 Apr 2025**, a utility template that Meta judges to be marketing is approved *as marketing*, not rejected.
- You can ask for a review within 60 days.

**Limits**

- Unverified portfolio: 250 templates per account. Verified portfolio: 6,000.
- At most 100 new templates per hour.
- Low-quality templates can be paused or disabled.

**Templates a Bajaj Capital pilot would need**

| Template | Category |
|---|---|
| Appointment confirmation and reminder | utility |
| SIP-failure or renewal notice for the client's own account | utility |
| Re-engagement offer (opt-in only) | marketing |

### 2.5 Interactive messages: limits [W14]

| Type | Limits (Meta docs) | Our contract (ARCHITECTURE §6.1) |
|---|---|---|
| Reply buttons | ≤ 3 buttons; button title ≤ 20 chars; button id ≤ 256 chars; body ≤ 1,024 chars; footer ≤ 60 chars; header: text, image, video or document | max 3, title ≤ 20, footer ≤ 60 (matches) |
| List | ≤ 10 sections and ≤ 10 rows in total; row title ≤ 24 chars; description ≤ 72 chars; row id ≤ 200 chars; section title ≤ 24 chars; menu button label ≤ 20 chars; header text only, ≤ 60 chars; body ≤ 4,096 chars; footer ≤ 60 chars | ≤ 10 rows, 24/72/20 (matches) |
| CTA URL button | button label ≤ 20 chars; body ≤ 1,024 chars; text header ≤ 60 chars; footer ≤ 60 chars | label ≤ 20 (matches) |

### 2.6 Read receipts and typing indicator [W15]

- **How it works:** one `POST /<PHONE_NUMBER_ID>/messages` call with `status: "read"`, the inbound `message_id` and `typing_indicator: { type: "text" }` marks the message read (blue ticks) and shows "typing…". The indicator disappears "once you respond, or after 25 seconds, whichever comes first".
- **Status: implemented** (`whatsappHandler.js`). No typing bubble is shown while an advisor has taken over.

### 2.7 WhatsApp Flows: roadmap for booking forms

**What Flows offer** [W17]

- Forms that run inside the chat, defined in Flow JSON.
- A data endpoint, to load and save live data such as available slots. Calls to it are encrypted.
- Meta's "Book an appointment" template already includes the screens for details, user data, summary and terms.

**How we'd use them**

- The advisor-booking form: date, time, mode and topic in one screen.
- The risk-profile questionnaire.
- A KYC-status form.

**Today:** our list and button messages cover booking in 2–3 taps.

**Unverified:** the current Flow JSON version. Third-party examples use 7.x.

### 2.8 Messaging limits and quality [W11], [W12]

**Scope**

- The limit counts *unique users reached by business-initiated messages outside a customer-service window* in a rolling 24 hours.
- Replies inside the window don't appear to count. The page does not say so explicitly.

**Tiers**

- Since **8 Oct 2025**, limits apply to the whole business portfolio and are shared by every number in it.
- New portfolios start at **250**. A "scaling path" raises this to **2,000**: business verification, or 2,000 high-quality deliveries in 30 days.
- After that, automatic scaling goes to 10K, 100K and unlimited.

**Automatic scaling** happens within 6 hours when both are true:

- messages are high quality;
- at least half the current limit was used in the last 7 days.

**For us:** OTP authentication templates are business-initiated and draw on the same portfolio limit (see SETUP §4).

### 2.9 Webhook security [W16]

**What Meta does**

- Every event POST carries the header `X-Hub-Signature-256: sha256=<HMAC-SHA256(app secret, raw request body)>`.
- The GET verification handshake is not signed. It is checked by comparing `hub.verify_token` with the token you configured.

**Status: implemented**

- Express keeps the raw bytes for `/api/webhooks/whatsapp` (`src/index.js`).
- `verifyWhatsAppSignature` compares the signature in constant time.
- On a mismatch, the call is logged and dropped.
- **Caveat:** when `WHATSAPP_APP_SECRET` is empty, verification is skipped. Production must set it.

### 2.10 User identity: business-scoped user IDs (BSUIDs) and usernames [W18]

**What a BSUID is**

- A per-business-portfolio ID such as `IN.1349…`.
- It has appeared in all message webhooks since **early April 2026**, in `user_id`.
- It changes if the user changes their phone number.

**Usernames**

- WhatsApp is rolling them out gradually through 2026. Business username reservations opened 29 Jun 2026.
- Sending messages to a BSUID has been supported since July 2026: use `recipient` instead of `to`.

**When the phone number goes missing**

- For a user with a username, the phone number is **left out of webhooks** unless one of these is true:
  - the business number interacted with them in the previous 30 days;
  - they are in the business's contact book.
- A `REQUEST_CONTACT_INFO` button lets the user share their number.

**Impact on our code**

- **Fixed:** `parseWebhookPayload` keeps username-only messages (identity from `messages[].from_user_id` / `contacts[].user_id`), never derives a phone number from a BSUID, and reads `statuses[].recipient_user_id`. Conversations key on the phone when present, otherwise on the BSUID.
- Conversations are keyed on `wa_id`.
- The rewards-account lookup uses the phone.

**Fix (P0, §8):**

- Store the BSUID as the identity.
- Treat the phone number as optional.
- Send with `recipient` when there is no phone number.
- Ask for the phone with the contact-request button before account lookups.

### 2.11 Data at rest: Cloud API local storage [W19]

- **How to enable:** it is set per business phone number, through `storage_configuration`, while the number is unregistered. Meta's own example uses `IN` (India).
- **Data at rest** (message text, media and template payloads) stays in the chosen region.
- **Data in use** may be processed in other data centres for up to 60 minutes.
- **Contact book:** stored by Meta regardless of the local-storage setting.
- **For us:** this pairs with Bedrock India (§4.7) for an "India-resident" option.

### 2.12 Meta's own AI on the platform

**What Meta launched**

- Meta Business Agent: answers questions, books appointments, qualifies leads, and flags when a human should step in [W23].
- An enterprise version: Meta Business Agent Platform.
- Both were unveiled in India on 7 Jul 2026 [W23]; the pricing page lists 1 Jul 2026 as the launch date [W2].
- These are direct competitors at the platform layer (§7).

**Pricing** [W2]

- $2.00 per million input and output tokens, excluding cache tokens, billed since 1 Aug 2026.
- Meta estimates "roughly 4–5 cents per message".

---

## 3. Meta's policy on AI chatbots (15 Jan 2026)

### 3.1 What changed and when

| Date | Event | Source |
|---|---|---|
| 15 Oct 2025 | New "AI Providers" terms apply to new Business Platform users | [W5] |
| **15 Jan 2026** | The terms apply to **all** existing users. OpenAI, Perplexity and Microsoft announce that their WhatsApp chatbots will stop working | [W5] (update of 15 Jan 2026) |
| 16 Feb 2026 | Italy: AI providers may send service messages, charged per message; free since 13 May 2026 | [W3], [W6] |
| 11 Mar 2026 | Brazil (charged), and 29 EU/EEA markets (charged until 12 May 2026, free since 13 May 2026) | [W3], [W7] |
| 9 Jun 2026 | European Commission interim measures: Meta must restore *free* access for rival general-purpose assistants in the EU while it investigates. Meta said it would appeal | [W8] |
| 23 Sep 2026 | The terms are now called **"Meta Terms for WhatsApp Business Platform"** (last updated 23 Sep 2026). The AI clause is **§4.7** | [W4] |
| 15 Oct 2026 | Türkiye added to the allowed markets (not charged). **India is not on the list** | [W3] |

We found no Indian proceedings against the policy, from the Competition Commission of India (CCI) or anyone else.

### 3.2 The clause

§4.7 covers "Providers and developers of artificial intelligence or machine learning technologies". Its examples are large language models, generative AI platforms and general-purpose AI assistants, "as determined by Meta in its sole discretion" [W4], [W5].

Such AI Providers "are strictly prohibited from accessing or using the WhatsApp Business Platform, whether directly or indirectly". The ban applies when the AI is "the primary (rather than incidental or ancillary) functionality being made available for use" [W4].

The same section adds two things [W4]:
- A business **may keep an AI company as its Solution Provider.**
- In that case, the business "may not directly or indirectly allow WhatsApp Business Platform Data", including anonymised, aggregate or derived data, "to be used to create, develop, train, or improve any machine learning or artificial intelligence systems, models, or technologies, including large language models". The one exception is fine-tuning a model for the business's exclusive use.

Meta told TechCrunch the change "doesn't affect businesses that are using AI to serve customers on WhatsApp". Its example was a travel company running a customer-service bot [W5].

### 3.3 What it means for us

**Allowed: what we built**
- A business-specific assistant: Ria for Assured Rewards' own customers, and Arth as Bajaj Capital's assistant for Bajaj Capital's clients. The AI is ancillary to the business's own service: cashback support, financial guidance and advisor booking.

**Not allowed**
- Positioning it, or letting it behave, as a general-purpose assistant ("ask me anything") on WhatsApp in India.

**How to stay compliant**

| Control | Status |
|---|---|
| Scope lock: the system prompt limits answers to the tenant's business. Unrelated requests (essays, coding, general knowledge, news, jokes) get a one-line refusal and an offer of what it can do (`engine/prompts.js`, `off_topic` intent in both engines) | **Done** |
| Runs on the client's WABA and number, with the client as the business of record and us as its technology provider. Meta renamed "Solution Partners" to "Technology Partners" in Nov 2026 [W12] | **Pilot setup** |
| No training on WhatsApp data. We don't fine-tune. Anthropic's API does not use customer data for training without express permission [A2]. Never pool tenants' transcripts to "improve the model" | **Done (policy); write it into the client contract** |
| A human escalation path, which the WhatsApp Business Messaging Policy also requires: "prompt, clear, and direct escalation paths" [W9]. We have the AGENT keyword, the `escalate_to_human` tool and console takeover | **Done** |
| Opt-in before business-initiated messages, and honouring opt-outs [W9]. STOP/START is handled, including Hindi and Hinglish phrases. No broadcasts exist yet | **Done for STOP; add opt-in records before any template campaigns** |

**Residual risk**
- "As determined by Meta in its sole discretion" leaves Meta room to interpret.
- Mitigations: keep answers tied to the client's services and to booking; avoid marketing copy such as "ask our AI anything"; keep traces that prove the scope.

---

## 4. Indian regulation, mapped to our guardrails

### 4.0 First question: which licensed entity owns each conversation?

Bajaj Capital is a group of separately licensed entities [R28], [R29], [R30]. Each WhatsApp journey needs one owner, because the owner decides which rules apply (see also BAJAJ_CAPITAL_BRIEF.md §A4).

| Line of business | Entity (as published) | Regulator | Verified? |
|---|---|---|---|
| Mutual fund distribution | Bajaj Capital Ltd, **ARN-0010**. "May give incidental advice… only to its mutual fund distribution clients" | AMFI / SEBI | Company disclaimer [R29] |
| Insurance broking | Bajaj Capital Insurance Broking Ltd, composite broker **licence 241**, valid until 8 Jan 2028 | IRDAI | IRDAI broker list [R28] |
| NPS | Bajaj Capital Ltd as Point of Presence | PFRDA | Company documents (brief) |
| Investment advice (RIA) | "Bajaj Capital Investment Advisers Pvt Ltd", INA100001398 | SEBI | **Unverified.** Third-party registry [R30]; sebi.gov.in was unreachable |

### 4.1 SEBI: investment adviser vs mutual fund distributor

**Who may advise**
- Only SEBI-registered investment advisers may give investment advice, and that includes financial planning.
- An MFD may give only *incidental* advice: basic advice, limited to mutual fund schemes, based on the client's risk profile and suitability.
- "Detailed financial planning" and "holistic investment advice" are excluded.
- Risk profiling is required and must be recorded.
- Source: AMFI FAQ, 17 Mar 2025 [R3].

**Names a distributor must not use**
- IA Regulation 3(3) (2020) bars "Independent Financial Adviser or IFA or Wealth Adviser or any other similar name" for anyone who is not registered.
- AMFI's guidance also bars adviser/advisor, wealth manager, consultant and financial planner.
- Every communication must show the tagline "AMFI-registered Mutual Fund Distributor" with the ARN [R4].

**Advice and distribution must stay separate**
- IA Regulation 22: advisory and distribution are separated at client and family level [R2].

**Rules for advisers that use AI** (IA Amendment Regulations, 16 Dec 2024 [R1]; circular of 8 Jan 2025 [R2])
- Reg 15(14): the adviser is "solely responsible" for the security, confidentiality and integrity of client data, and for any advice based on AI output.
- Reg 18(9): the adviser "shall disclose to the client the extent of use of Artificial Intelligence tools".
- Reg 19(1)(h): keep records of all communication, including with prospective clients, for at least 5 years [R26].

**Implications**
- **Arth as built:** education, illustrative calculators, a starting-point risk questionnaire and a booked call with a human. No scheme picks, no "your plan" outputs. That stays inside an MFD's incidental-advice limit.
- **"AI financial-planning assistant":** the phrase in the client's brief suits a journey run by the group's SEBI-registered adviser entity. That journey needs the AI-use disclosure and 5-year records.
- **For an MFD-owned journey:** take compliance's view on wording. Our demo advisor titles ("Senior Wealth Advisor") are fictional and would need the same review.

### 4.2 SEBI and AI/ML

| Instrument | Status | What it says |
|---|---|---|
| AI/ML reporting circulars: intermediaries 4 Jan 2019, mutual funds May 2019 [R5] | In force | Regulated entities report AI/ML systems they offer or use |
| SEBI (Intermediaries) (Amendment) Regulations 2025, **Reg 16C** (commenced Feb 2025) [R6] | In force | Any SEBI-regulated person using AI/ML, built in-house or bought in, is **solely responsible** for investor-data privacy and security, for the outputs it relies on, and for compliance |
| Association rule: Reg 16A plus circular of 22 Oct 2024 [R9] | In force | Regulated entities must not associate with unregistered persons who give advice or claim returns |
| Consultation "Guidelines for responsible usage of AI/ML" (20 Jun 2025) [R7] | **Proposed only** | Plain-language AI disclosure, human oversight, testing, bias checks, model input/output records kept 5+ years, vendor agreements |
| SEBI statements of 19 Aug 2026 and 19 Nov 2026 [R8] | Final guidelines "soon" | Will require "kill-switch and humans-in-the-loop controls along with data controls" |

**Implications**
- The regulated entity owns every output, and we are its technology provider.
- Our per-turn trace (tools, sources, guardrails, model, tokens) is the base for the "records" expectation.
- Already in place: a global kill switch (`AI_WHATSAPP_AUTOREPLY=false`) and per-chat takeover.
- Still to add: per-tenant kill switch, versioned prompt/KB/model records, a regression test set and a bias/accuracy review (§8).

### 4.3 Mutual fund communications

**The standard warning**
- "Mutual Fund investments are subject to market risks, read all scheme related documents carefully." Use it verbatim, unaltered [R11].
- **Done:** `guardrails.MF_DISCLAIMER` is the exact SEBI line. It is appended at most once every 24 hours when an investment topic comes up.

**Calculators and illustrations** (AMFI best practice circular 109/2023-24, 1 Nov 2023; table revised in 109-A, 10 Sep 2024 [R12])
- SIP and goal tools may let the user select a return "from two percent to 13 percent".
- Illustrations must state the rate and its basis. The revised table gives, for example, Nifty 500 at 12.80% and CRISIL Composite Bond at 7.85%.
- They carry the standard warning, plus "past performance may or may not be sustained in future".
- They must not depict any particular scheme.
- **Done:** our tools label results "illustrative", print their assumptions (12% equity, 6% inflation, 7% after retirement) and clamp user-chosen returns to 2–13%, saying so when a rate was capped.

**No indicative returns from distributors**
- Distributor code clause 4(g) bans "indicative portfolio or indicative yield or indicative return", and any assured returns [R4].
- **Done** in the prompts: no guarantees, no predictions, no scheme recommendations.

**Coming: SEBI Common Advertisement Code** (Intermediaries Second Amendment Regulations 2026, 8 Oct 2026; in force about April 2027) [R13]
- Bans testimonials, guaranteed or indicative returns, and dark patterns.
- Requires the entity's name and registration number.
- Covers advisers, research analysts, mutual funds and brokers.

**Registration details on social media** (SEBI circular, 26 Feb 2026, for content from 1 May 2026) [R14]
- Show the registered name and number on the profile and at the start of each securities post.
- A law-firm note says WhatsApp is covered [R14]. **Unverified** for one-to-one chats.
- **Roadmap:** put the entity and ARN line on the WhatsApp profile and in the first message of a real pilot.

### 4.4 AMFI Code of Conduct for distributors

Source: chapter 7 of the AMFI Master Circular for MFDs, 14 Jan 2026 [R4].

| Clause | Rule | Our status |
|---|---|---|
| 2(d) | Gather suitability information | Risk questionnaire and lead profile (done) |
| 2(f) | No sharing of client data with group companies for cross-marketing | **Roadmap**: separate data per line of business and per tenant |
| 3(b) | Cyber-secure systems | Signature verification, console auth, PII redaction (partial; see §8) |
| 3(d) | Keep records of suitability, consent and dissent | Stored in our database (partial: no retention policy or export yet) |
| 4(c), 4(d) | Disclose commissions | Not in the bot's scope. The human advisor covers it |
| 4(f) | Digital platforms show the Regular Plan, commission and scheme document links | Not applicable while the bot only educates and books |
| 4(k) | Use only AMC-supplied marketing material | Knowledge base built only from Bajaj Capital-approved content (pilot week 1) |
| 5(a) | Certified individuals and an employee code (EUIN) on transactions | Transactions stay with humans |

The AMFI FAQ also says [R3]:
- no "free advice" or "free portfolio review" hooks;
- social media content must be educational only.

The Bajaj tenant's call-to-action reads "Book a free advisor call". **Check this wording with compliance.**

### 4.5 IRDAI: soliciting insurance through digital channels

**Who may solicit**
- Only a broker's licensed "qualified person" may solicit, and every policy is tagged to that person [R15].
- From **1 Jan 2027**, every policy must also record the responsible licensed person [R16].

**How online sales must run**
- Through the broker's IRDAI-approved online platform (ISNP) or the insurer's own journey [R15].
- Telemarketing and distance selling go through registered telemarketers [R15].

**Other duties**
- The insurer approves intermediaries' advertisements before release [R17].
- Records are kept 7+ years [R15].
- Data and logs stay in India, and incidents are reported within 6 hours [R23].

**Proposed (comments closed 31 Oct 2026)**
- IRDAI proposes to treat demanding personal details before showing product information, or using those details for leads, as a dark pattern [R18].

**What the assistant must do**
- Insurance *education* only: no product recommendations and no premium quotes.
- Hand off to a named licensed person and record that person's ID.
- Never ask for contact details before showing information.

**Status**
- Done: no recommendations.
- Roadmap: recording the licensed person's ID, and India-only hosting for insurance flows.

### 4.6 DPDP Act 2023 and DPDP Rules 2025

**When each part applies** [R19]

| Date | What applies |
|---|---|
| 13–14 Nov 2025 | Rules notified. The Data Protection Board is set up (Rules 1, 2, 17–21) |
| 13–14 Nov 2026 | Consent-manager rules (Rule 4), in force now |
| **13–14 May 2027** | Rules 3, 5–16, 22–23: notice, consent, security, breach reporting, rights, transfers |

**What the main duties require** (summary from the law-firm notes [R19])

| Duty | Requirement |
|---|---|
| Consent notice (Rule 3) | Standalone and itemised: each item of data and each purpose. Links to withdraw consent, exercise rights and complain to the Board. Withdrawing must be as easy as giving consent |
| Security (Rule 6) | Encryption or masking; access control; monitoring logs kept at least 1 year; backups; contracts with processors |
| Breach (Rule 7) | Tell affected users without delay. Tell the Board without delay, with a detailed report within 72 hours |
| Retention (Rule 8) | Erase data once its purpose is served, unless a law requires keeping it. Keep logs at least 1 year |
| Rights and grievances (Rule 14) | Respond within 90 days. Publish a contact or a data protection officer (DPO) |
| Transfers abroad | Allowed unless a country is notified (none so far). Stricter sector rules prevail |
| Penalties | Up to ₹250 crore (security failures), ₹200 crore (breach notice), ₹50 crore (other) |

**Our status**

| Area | Status |
|---|---|
| AI disclosure plus STOP/AGENT in the first message; STOP honoured at once; PII redacted before storage and before the model | Done |
| Itemised consent notice and consent log; separate marketing consent; access/correction/erasure requests with a 90-day service level; retention schedule and erasure job; breach runbook | **Roadmap** |

### 4.7 Data localisation and where model inference runs

**What the rules expect**

| Rule | Applies to | Requirement |
|---|---|---|
| RBI payment-data storage (2018) [R20] | Payment system operators and banks | Payment data in India. Not Bajaj Capital, but it is a reason never to handle card numbers or OTPs (we redact both) |
| SEBI cloud framework (6 Mar 2023) [R21] | SEBI-regulated entities using cloud/SaaS | Data localised in India, with empanelled providers |
| SEBI cybersecurity framework (CSCRF, Aug 2024) [R22] | SEBI-regulated entities | A 30 Apr 2025 clarification exempts advisers and research analysts with no other SEBI registration. AMFI-registered distributors are not SEBI-registered. The group's broking entity is in scope |
| IRDAI cybersecurity guidelines (2023) [R23] | Insurers and intermediaries | "All ICT infrastructure logs, critical and business data in India". Incidents reported within 6 hours |

**Hosting options**

| Option | Where inference runs | Notes |
|---|---|---|
| Claude API (what we use today) [A1] | `global` (default) or `us` (1.1× price) | Workspace data at rest: US. Prompts and outputs are not retained by default, except content flagged by safety systems (up to 2 years), and are not used for training without permission. Zero data retention available on request [A2] |
| Amazon Bedrock, India geographic inference profile [A4] | Within India (Mumbai ap-south-1 ↔ Hyderabad ap-south-2) | Announced Aug 2026. Opus 5, Sonnet 5 and Haiku 4.5 named at launch. **Opus 5.5 / Sonnet 5.5 availability unverified.** AWS is the data processor; partner pricing applies |
| WhatsApp Cloud API local storage [W19] | Meta stores message content at rest in India | Processing may happen elsewhere for up to 60 minutes |

**Recommendation**
- Keep the Claude API for the demo and the Assured Rewards tenant.
- For Bajaj Capital, offer an "India-resident" profile: Bedrock India for the model, the database and backups in an Indian region, and WhatsApp local storage set to `IN`.
- It is required for any insurance-broking flows.

### 4.8 Record keeping and marketing communications

**How long to keep records**

| Record | Period | Source |
|---|---|---|
| Investment adviser communications | 5 years | [R26] |
| Insurance broker records | 7+ years | [R15] |
| Anti-money-laundering (PMLA) records | 5 years | not re-read |
| Logs under the DPDP Rules | at least 1 year | [R19] |

**Today:** every message and its trace is stored in PostgreSQL. **Missing:** per-tenant retention periods, write-once storage and export.

**Marketing and calls**
- TRAI's anti-spam rules (TCCCPR) cover SMS and voice on telecom networks, not WhatsApp [R27].
- The 18 Sep 2026 amendment requires automated or AI-voice calls to be declared in advance [R27].
- From 15 Feb 2026, IRDAI-regulated entities must make service calls from 1600-series numbers [R27].
- Both matter if advisor callbacks are automated.

### 4.9 Guardrail map: required, built, missing

| Requirement (source) | Guardrail | Status | Where |
|---|---|---|---|
| No personalised advice from the bot; MFD incidental-advice limit [R3] | No scheme, stock, AMC or policy recommendations; "which fund?" leads to an advisor call | Done | `engine/prompts.js`, `fallbackEngine.js` |
| No assured or indicative returns [R4], [R13] | Never promise returns. Calculators labelled illustrative, with assumptions | Done | prompts, `tools/calculate*.js` |
| Calculator return range 2–13% [R12] | Clamp the user-chosen rate | **Done** (wealth tenant clamps to 2–13% and says so) | `tools/calculateSip.js` etc. |
| Standard mutual fund warning, verbatim [R11] | Appended automatically, at most once per 24 hours | Done | `guardrails.js`, `replyComposer.js` |
| AI-use disclosure [R1], [R7] | First message: "I'm an AI assistant… reply STOP… or AGENT…" | Done (demo wording) | tenant `consentLine` |
| Entity and registration disclosure [R4], [R14] | Name, ARN/licence and tagline on the profile and in the first message | **Roadmap** | tenant config |
| Human oversight and escalation [W9], [R8] | AGENT keyword, `escalate_to_human`, console takeover (the AI stays silent while a human owns the chat) | Done | engine, `consoleRoutes.js` |
| Kill switch [R8] | `AI_WHATSAPP_AUTOREPLY=false` (global); takeover (per chat) | **Partial** (no per-tenant switch) | `config.js` |
| PII minimisation [R19], [R20] | PAN, Aadhaar, card numbers (Luhn-checked), CVV, OTP and PIN redacted **before storage and before the model**, with a privacy notice to the user | Done (pattern-based; bank account numbers, addresses and names not covered) | `guardrails.scanAndRedact` |
| Identity for account data | Account looked up only by the verified WhatsApp number, never by a number typed in chat; simulator returns labelled sample data | Done | `tools/getMyRewardsAccount.js` |
| Opt-out [W9], [R19] | STOP/START in English, Hindi and Hinglish; silent until START | Done | `guardrails.detectOptCommand` |
| Audit trail [R1], [R7] | Per-turn trace: intent, tools with inputs and outputs, knowledge hits, guardrails fired, model, tokens, cost, latency | Done | `AiMessage.trace` |
| Retention and erasure [R15], [R19], [R26] | Per-tenant schedule, write-once archive, export, erasure job | **Roadmap** | — |
| Consent notice and log [R19] | Itemised notice; consent record; separate marketing consent | **Roadmap** | — |
| Data separation by entity [R4] 2(f) | Separate knowledge base, data and disclosures per line of business; no cross-marketing | **Partial** (separated per tenant, not per line of business) | tenants |
| Insurance solicitation [R15], [R16] | Education only; hand off to a licensed person and record their ID; no quotes | **Partial** (education only; no person ID recorded) | — |
| India hosting [R21], [R23] | Bedrock India, Indian database, WhatsApp local storage | **Roadmap** | — |
| Platform scope [W4] | Off-topic refusal | Done | prompts, `off_topic` intent |
| Webhook authenticity [W16] | `X-Hub-Signature-256` checked in constant time | Done (requires `WHATSAPP_APP_SECRET`) | `whatsappHandler.js` |
| Demo persona not public | `bajaj-capital-demo` reachable on real WhatsApp only from `AI_WHATSAPP_DEMO_ALLOWLIST` numbers; the persona says it is "a concept demo prepared for Bajaj Capital by Assured Rewards" | Done | ARCHITECTURE §10 |

---

## 5. Market and proof points

### 5.1 WhatsApp in India

- **Users.** "More than 500 million" in India, WhatsApp's largest market. This Meta-attributed figure appears in coverage of 22 Jun 2026 [M1] and 14 Dec 2025 [M2]. Higher third-party figures (535M to 850M+) are unverified.
- **Engagement.** Per Sensor Tower data cited by TechCrunch (Dec 2025) [M2]:
  - 94% of Indian monthly users open WhatsApp daily, for about 38 minutes a day.
  - WhatsApp Business monthly users in India are up more than 130% since 2021.
- **Business chat.** "91% of online adults in India chat with businesses weekly" (Kantar 2025, cited by Meta, Sep 2025) [W22].
- **Meta's commitment.** WhatsApp's paid business messaging passed a **$2B annual run-rate** in Q4 2025 (Meta CFO, 28 Jan 2026) [M3].

### 5.2 Financial services brands already on WhatsApp in India

| Brand | What it does on WhatsApp | AI/LLM? | Date | Source |
|---|---|---|---|---|
| HDFC Mutual Fund, "Tap2Invest" | SIP, lumpsum and statements for KYC-compliant investors | Menu-driven | Apr 2025 | [M4] |
| SBI Mutual Fund, "SmartAssist" | Start SIP, portfolio, compare funds | "AI-powered" (vendor claim) | Jul 2025 | [M5] |
| Tata Mutual Fund, "Mr. Simple" | SIP, redemption, NAV, statements, natural-language fund discovery | AI-powered (claim) | 2 Jul 2025 | [M6] |
| ICICI Prudential Mutual Fund | WhatsApp chatbot launch mailer | "GenAI-powered" (claim) | 18 Nov 2025 | [M7] |
| UTI Mutual Fund (with CAMSPay, Gupshup) | Browse, invest, pay by UPI in chat | Not stated | 29 Jul 2026 | [M8] |
| Zerodha Fund House | Buy, sell, track mutual funds | Not stated | 24 Jul 2025 | [M9] |
| KFintech "ARYA" | Mutual fund servicing and portfolio analysis; WhatsApp "planned" | Small language models plus a rules-based compliance engine | 4 Sep 2026 | [M10] |
| HDFC Bank | ChatBanking. In-house GenAI platform "Neev" to be integrated with WhatsApp Banking | GenAI (planned) | 11 Jul 2026 | [M11] |
| LIC | WhatsApp bot; premium payment in the bot | Menu bot | 9 May 2025 | [M12] |
| ICICI Lombard | About 70% of inbound calls now handled by bots or its WhatsApp chatbot | AI | 3 Aug 2026 | [M13] |
| SBI Life (with Sarvam) | Multilingual claims bot on voice and WhatsApp, 11+ languages | Indic LLM | 27 Feb 2026 | [M14] |
| Kotak Life (with Haptik) | Buy policies and file claims, with human handoff. Vendor reports a 400% rise in leads | AI (vendor) | undated | [M15] |
| Anand Rathi (with Infobip) | Account opening, leads synced to CRM for RM follow-up. Vendor reports −35% inbound calls, +30% conversions | Bot (vendor) | undated | [M16] |
| Zerodha Kite MCP | Clients can connect Claude to their Zerodha account | Claude (MCP) | 20 May 2025 | [M17] |

**Takeaway:** mutual fund houses and registrars are digitising *transactions* on WhatsApp. No large *distributor* has publicly launched a planning-led WhatsApp assistant that ends in an advisor booking; Anand Rathi's account-opening bot is the closest peer. We found no AI assistant from Bajaj Capital; see the brief §A6 for its existing WhatsApp line.

### 5.3 Mutual fund industry size (AMFI)

| Metric | Value | Period | Source |
|---|---|---|---|
| Industry net assets (AUM) | **₹83,38,858 crore (₹83.39 lakh crore)** | 31 Oct 2026 | AMFI data via EquityBulls [M18] |
| Monthly SIP inflow | **₹32,160 crore** (Sep record ₹32,490 crore; Oct 2025 ₹29,529 crore) | Oct 2026 | Kotak Neo / AMFI [M18] |
| Contributing SIP accounts | **9,99,87,082** (about 10 crore) | Oct 2026 | [M18] |
| SIP assets | ₹17,68,217 crore (21.2% of AUM) | Oct 2026 | [M18] |
| Folios | 28.78 crore | Oct 2026 | [M18] |
| New SIPs vs stopped or matured | 50.68 lakh vs 59.12 lakh (stoppage ratio 116.7%) | Oct 2026 | Angel One [M22] |
| Unique mutual fund investors | **6.33 crore** | end Sep 2026 | 5paisa citing Business Standard [M19] |
| AMFI-registered distributors (ARN holders) | ~3.59 lakh (2.07 lakh individuals) | Sep 2026 | Cafemutual [M20] |
| SEBI-registered investment advisers | ~1,000 (SEBI Chairman, 16 Mar 2026). A third-party reading of SEBI's list gives 1,071 for 31 Oct 2026 (unverified) | 2026 | [M21] |

**What the numbers say**
- India has roughly one registered adviser for every 60,000 mutual fund investors.
- In Oct 2026, more SIPs stopped or matured than started.
- Both point the same way: scalable first-line guidance, retention conversations, and fast routing to the advisors who exist.

---

## 6. Unit economics

### 6.1 Assumptions

**Claude prices** (USD per million tokens; Anthropic pricing page, read 28 Nov 2026 [A3])

| Model | Input | Output | Cache read | 5-min cache write |
|---|---|---|---|---|
| Opus 5.5 | 4 | 20 | 0.20 | 5 |
| Sonnet 5.5 | 2 | 10 | 0.10 | 2.50 |
| Haiku 5.5 (prompts ≤100K tokens) | 0.10 | 0.50 | 0.01 | 0.125 |

- US-only inference costs 1.1×. Opus 5.5 fast mode costs $8 / $40.

**Token profile per customer turn** (one LLM call)
- ~3,000 cached tokens: the static tenant prompt plus tool definitions, cached with `cache_control`.
- ~1,500 fresh input tokens: the turn's context, about 20 replayed messages, and the new message.
- ~250 output tokens.
- **6 turns** per conversation.
- These are *assumptions*. Replace them with measured averages from the console after a week of pilot traffic, because every turn's trace records actual tokens and cost.
- Thinking tokens (adaptive, effort `low`) bill as output.
- Claude 4.7+ models use a tokenizer that produces about 30% more tokens for the same text [A3]. Hindi and Hinglish token counts should be measured.

**Currency:** ₹88 per US$ (`AI_USD_INR`).

**WhatsApp:** user-initiated chats, so replies are service messages. 6 turns produce about 8 outbound messages, because some turns send text plus buttons, a slot list or a booking card. Each costs ₹0.115 after the 1,000-message monthly free tier per number (§2.2).

### 6.2 LLM cost per conversation

| Model | Cost per turn (US$) | Per conversation (US$) | **Per conversation (₹)** |
|---|---|---|---|
| Opus 5.5 (default) | 0.0116 (cached 0.0006 + fresh 0.0060 + output 0.0050) | 0.0696 | **₹6.12** |
| Sonnet 5.5 | 0.0058 | 0.0348 | **₹3.06** |
| Haiku 5.5 | 0.000305 | 0.00183 | **₹0.16** |

**Sensitivities (Opus 5.5)**

| Scenario | Effect |
|---|---|
| Cold cache: the 3,000-token prefix is written once per conversation | +₹1.27 |
| "Heavy agentic": 2 LLM calls per turn, +400 tool tokens, 400 output | ₹12.04 |
| No caching at all | ₹12.14 |
| Fast mode | ×2 |
| US-only inference | ×1.1 |

Caching cuts the cost of the fixed instructions by 95% (cache read $0.20 vs $4 per MTok).

### 6.3 WhatsApp cost per conversation

| Case | Cost |
|---|---|
| Inside the 1,000 free service messages per number per month | ₹0 |
| Beyond the free tier: 8 × ₹0.115 | **₹0.92** (₹1.09 with 18% GST) |
| Conversation that starts from a Click-to-WhatsApp ad (free entry point window, up to 7 days) | ₹0 |
| A reminder outside 24 hours (utility template) | +₹0.115 |
| A marketing re-engagement message | +₹0.8631 |

### 6.4 All-in cost, and cost at scale

| Model | LLM + WhatsApp per conversation | 10,000 conversations a month (LLM + WhatsApp after the free tier) |
|---|---|---|
| Opus 5.5 | **≈ ₹7.0** | ≈ ₹70,300 (₹61,250 + ₹9,085) |
| Sonnet 5.5 | **≈ ₹4.0** | ≈ ₹39,700 |
| Haiku 5.5 | **≈ ₹1.1** | ≈ ₹10,700 |

These figures exclude hosting, which is small: one VPS and PostgreSQL. They also exclude BSP markups; we call Meta's Cloud API directly, so there are none. All figures are before GST.

### 6.5 Compared with people

| Benchmark | How we got it | Cost per conversation |
|---|---|---|
| In-house chat agent | Salary ₹2.5–4.2 lakh a year (AmbitionBox: chat support ₹1.5–4.2 lakh [H1]). ×1.5 for overheads (assumption). ÷132 productive hours a month (176 hours at 75% utilisation, assumption). That gives ₹237–398 an hour. 6–10 chats an hour (assumption: ~2 chats at once, ~9-minute average chat [H3]) | **₹24–66** |
| Outsourced chat (India) | ₹335–670 per agent-hour (MyOperator compilation, 20 Nov 2026 [H2]), 6–10 chats an hour | **₹34–112** |
| Relationship manager doing first qualification | Salary ₹4–8 lakh a year (AmbitionBox, Bajaj Capital RM ₹2–6.5 lakh, Wealth Manager ₹3.2–8 lakh [H5]). ×1.5 ÷ 132 hours gives ₹379–758 an hour. 15–20 minutes per conversation | **₹95–253** |
| Global reference | Gartner: $8.01 per live assisted contact vs $0.10 self-service (2019) [H4] | — |
| Meta Business Agent | $2 per million tokens; Meta estimates 4–5 US cents per message [W2] | ₹3.5–4.4 **per message** (≈ ₹21–26 for 6 replies) |

**How to say it in the room**
- The AI handles the first 6–10 messages of every enquiry, 24×7, for about ₹7.
- The advisor's time goes to booked, pre-qualified calls, with the client's goals, horizon and risk profile already captured.
- We don't claim the AI replaces advisors. It removes the unqualified first conversation.

### 6.6 Cost levers

| Lever | Setting or approach |
|---|---|
| Effort | `AI_EFFORT=low` (default): fewer thinking tokens, faster replies |
| Model per tenant | Opus 5.5 for planning conversations; try Sonnet 5.5 (half the price) or Haiku 5.5 for FAQ-heavy tenants, after an evaluation |
| Context size | `AI_HISTORY_MESSAGES` (20) and `AI_MAX_TOOL_ITERATIONS` (6) |
| Fast mode | Keep `AI_FAST_MODE=false` |
| WhatsApp fees | 1–2 outbound messages per turn. Use the free entry point window for ad-driven journeys |

---

## 7. Competitive landscape

### 7.1 Vendors

| Vendor | Type | AI / agentic claims (2025–26) | BFSI references (mostly vendor-reported) | Public pricing | Notes |
|---|---|---|---|---|---|
| **Gupshup** [C1], [C2], [C3] | WhatsApp reseller (BSP) plus conversational AI | "Super Agent" orchestration (Apr 2026); voice AI from $0.035/min | UTI MF (WhatsApp investing, Jul 2026 [M8]), IndusInd; claims HDFC, ICICI, Axis, Kotak | Self-serve $0.001/msg plus Meta at cost | A Fidelity fund valued it at $278M (Jan 2026; $1.4B in 2021). India FY25 revenue ₹1,943 crore |
| **Jio Haptik / Interakt** [C5] | Enterprise CX AI plus small-business BSP | WhatsApp and voice AI agents for small businesses (Sep 2025) | Kotak Life (KAYA), Tata MF, HDFC Home Loans, IIFL | Interakt: Growth ₹2,799/mo, Advanced ₹3,799/mo; AI agent ₹2,499/mo incl. 100 AI msgs, then ₹0.50 each. Haptik small-business plan: ₹10,000 per 2,000 conversations | Owned by Jio Platforms. Per-message markups about 11–30% over Meta (our calculation) |
| **Yellow.ai** [C4] | Enterprise agentic CX | "Nexus" (Feb 2026); voice agents in 135+ languages; multi-LLM | Bajaj Finserv "BLU" (vendor case study) | Not public | Nasdaq listing via a SPAC merger announced (Aug 2026, $550M pro forma). ~30% layoffs (Dec 2025) |
| **AiSensy** [C6] | Small-business BSP | AI Agent Builder: knowledge base, tool calling, memory | — | ₹1,350/mo incl. 1,000 AI msgs; India utility/service ₹0.145 | Self-serve |
| **WATI** [C7] | Small-business BSP | "Astra" AI agents ($99 or $399/mo) | — | India plans ₹2,999–₹1,07,999/mo | Last round 2022 |
| **Gallabox** [C8] | Small-business BSP | AI credits; WhatsApp AI voice | — | ₹2,399–₹16,999/mo | $3.5M seed extension (Jan 2025) |
| **Kaleyra (Tata Communications)** [C9] | Communications platform (CPaaS) | "Kaleyra AI": GenAI templates, no-code builder | Unverified | Not public | |
| **Route Mobile (Proximus)** [C10] | CPaaS | Acquiring Heltar's AI WhatsApp/RCS chatbot business (Jul 2026) | — | Not public | |
| **Infobip** [C11] | CPaaS | AgentOS: AI agents with human in the loop (from 1 Apr 2026) | Anand Rathi [M16] | Not public | Closest wealth-firm reference |
| **Kore.ai** [C14] | Enterprise agent platform | Model-agnostic agents | Global banks | Not public | AllianceBernstein-led investment (Jan 2026) |
| **Uniphore** [C13] | Enterprise AI | "Business AI Cloud" | — | Not public | $260M Series F (Oct 2025) |
| **Sarvam "Samvaad"** [C15] | Indian LLM plus agents | WhatsApp voice and chat agents in 11 languages; cloud, VPC or on-prem | SBI Life, Tata Capital | Not public | "Sovereign AI" positioning |
| **Gnani.ai, GreyLabs** [C16], [C17] | Voice AI for BFSI | Voice agents | GreyLabs: RBL, IDFC FIRST, SBI Life, ICICI Pru Life, Motilal Oswal, Groww | Not public | Strong in voice; less in WhatsApp chat |
| **Verloop.io** [C12] | CX automation | — | — | — | Acquired by Nurix AI (Jul 2026) |
| **Meta Business Agent** [W2], [W23] | Built into the platform | Answers, books, qualifies, flags handoff | Swiggy and small businesses named at launch | $2/MTok (~4–5 US cents per message) | The platform owner competing at the application layer [C1] |

### 7.2 Our differentiation (honest version)

**Where we're stronger**

1. **Agentic tool use inside the client's systems, not decision trees.** One model turn can search approved knowledge, run a calculator, update the lead profile, read live advisor availability and book a real slot. Bookings are made in a serializable transaction, so double booking is impossible, and each one comes with an .ics invite and a video link. Every step is logged.
2. **Compliance by design for Indian BFSI.**
   - PII is stripped before the model sees it and before storage.
   - The SEBI warning is added automatically, verbatim.
   - The bot never recommends schemes or promises returns, and refuses off-topic requests (Meta policy).
   - STOP/AGENT work in Hinglish.
   - A per-turn audit trace, sample data kept separate, and an allowlist for the demo persona.
3. **An advisor console built for human-in-the-loop work.**
   - Live inbox with one-click takeover; the AI stays silent until handed back.
   - Leads pipeline with an *explainable* 0–100 score: points per known field, intent signals and engagement, +25 for a booking.
   - Bookings agenda, and a knowledge base with a live retrieval tester.
4. **Transparent unit economics.** Tokens, latency and cost for every turn, and cost per conversation as a KPI.
5. **The client owns the data, and the model is a choice.** Data lives in the client's database or cloud, with no training on it. Opus, Sonnet or Haiku per tenant, and an India-resident option via Bedrock.
6. **Resilience.** A rules engine answers FAQs, shows slots and books calls if the AI provider fails or the API key is missing.
7. **Proven on our own traffic.** The same engine runs Assured Rewards' support (Ria).

**Where incumbents are ahead today** (say so if asked)
- No template or broadcast campaign manager.
- No CRM connectors yet.
- No voice or voice-note support.
- Only English, Hindi and Hinglish.
- No published security certifications. Confirm what we can share before claiming any.
- No BFSI production reference beyond our own product.

---

## 8. Product changes we recommend

**P0: before a real client pilot, or by the stated dates**

1. **WhatsApp billing.** Migrate Assured Rewards' WhatsApp account to INR billing (deadline **31 Dec 2026**). Confirm a payment method. OTP delivery depends on both (§2.2).
2. **Graph API version.** Set `WHATSAPP_GRAPH_VERSION=v25.0` or later before **21 Jan 2027**.
3. **BSUID support.** Accept webhooks without `wa_id` and key on `user_id`. Send with `recipient`. Request contact info before account lookups (§2.10).
4. **Cost KPI.** Add WhatsApp fees (₹0.115 per outbound service message beyond the free tier) to cost per conversation.
5. **Calculator bounds.** Clamp assumed returns to 2–13% for the wealth tenant and state the basis (§4.3).
6. **Pilot disclosures.** The first message and the WhatsApp profile carry the entity name, registration (ARN/licence), "AMFI-registered Mutual Fund Distributor", an AI-use notice and a way to reach a human. Avoid "adviser/planner/wealth" naming unless an SEBI-registered adviser entity runs the journey. Review "free advisor call" wording with compliance.
7. **Webhook signature.** `WHATSAPP_APP_SECRET` must be set in every environment that receives webhooks.
8. **Rate-limit integrity.** **Fixed:** the limiter trusts `X-Real-IP` (nginx sets it to `$remote_addr`), then the last `X-Forwarded-For` hop, never the client-supplied first entry.

**P1: during the pilot**

9. **DPDP pack:**
   - itemised consent notice and consent log;
   - separate marketing consent;
   - STOP withdraws consent;
   - access, correction and erasure requests with a 90-day service level;
   - a published grievance contact or DPO;
   - retention schedule and erasure job;
   - breach runbook: Board within 72 hours; CERT-In and IRDAI within 6 hours.
10. **Records.** Write-once transcripts plus traces, with the prompt, knowledge-base and model versions used for each turn. Per-tenant retention: 5 years for mutual funds and advice; 7+ years for insurance. Add export.
11. **One mode per line of business** (MF, insurance, NPS, advisory), each with its own disclosures, knowledge base and data. No cross-marketing between group entities.
12. **Insurance handoff.** Record the licensed person; no quotes; never ask for personal details before showing information.
13. **India-resident profile.** Bedrock India (check whether Opus 5.5 or Sonnet 5.5 is offered; otherwise use Opus 5 or Sonnet 5), an Indian database region, and WhatsApp local storage set to `IN`.
14. **Out-of-window messages.** Utility templates for confirmations and reminders more than 24 hours after the last inbound message.
15. **AI governance.**
    - Per-tenant kill switch.
    - A red-team regression suite: mis-selling probes, return promises, PII, off-topic and jailbreak attempts.
    - A monthly accuracy and bias review.
    - An inventory of AI systems for SEBI reporting.

**P2: after the pilot**

16. WhatsApp Flows booking and risk forms.
17. Calling API for advisor calls inside WhatsApp.
18. Voice notes and more Indian languages.
19. CRM connectors.
20. KRA/KYC status checks.
21. Transactions via BSE StAR MF, NSE NMF II or MF Central, with exchange-side investor authorisation.

---

## 9. Not verified and open questions

**SEBI**
- sebi.gov.in was unreachable, so SEBI texts were read through TaxGuru and Taxmann reproductions and law-firm notes.
- The exact start date of the SEBI Common Advertisement Code.
- Whether final AI/ML guidelines were issued after 19 Nov 2026.
- Whether the Feb 2026 social-media disclosure circular covers one-to-one WhatsApp chats.

**Bajaj Capital registrations**
- The investment adviser entity and its INA number (third-party registry only).
- The broker number INZ000007732 and the corporate-agent number (aggregators).
- ARN-0010's current validity window.

**DPDP**
- MeitY's primary text was blocked.
- Sources disagree by a day on the dates (13 or 14 May 2027).
- One report says sections 9–10 (children's data) apply from 13 Mar 2027.

**Other items**

| Topic | What is not verified |
|---|---|
| IRDAI | Whether the 2011 distance-marketing and 2017 ISNP guidelines survived the 2024 consolidation; how long voice recordings must be kept |
| Bedrock India | Whether Opus 5.5 or Sonnet 5.5 is available on the India inference profile |
| WhatsApp India rates | Taken from BSP and press reproductions; confirm in the WhatsApp Manager INR rate card |
| Flow JSON version | Current version |
| Graph API v27.0 | Changelog page returned 404; the release date comes from Meta's changelog index plus trade coverage |
| Users | India WhatsApp figures above 500M; count of Indian businesses on WhatsApp; BFSI share of business messaging |
| Vendors | Customer lists and outcome figures are self-reported |
| Human costs | Cost assumptions marked "assumption" in §6.5 are ours |

---

## 10. Sources

All read on 28 Nov 2026 unless stated. Reference links resolve to the URLs below.

### WhatsApp and Meta

| ID | Source | Date |
|---|---|---|
| W1 | Meta, [Pricing on the WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) | live page |
| W2 | Meta, [Non-template (service) message pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages) | live page |
| W3 | Meta, [AI Providers markets and pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/ai-providers) | updated 15 Oct 2026 |
| W4 | Meta, [Meta Terms for WhatsApp Business Platform](https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform), §4.7 | last updated 23 Sep 2026 |
| W5 | TechCrunch, [WhatsApp changes its terms to bar general-purpose chatbots](https://techcrunch.com/2025/10/18/whatssapp-changes-its-terms-to-bar-general-purpose-chatbots-from-its-platform) | 18 Oct 2025, updated 15 Jan 2026 |
| W6 | TechCrunch, [WhatsApp will now charge AI chatbots to operate in Italy](https://techcrunch.com/2026/01/28/whatsapp-will-now-charge-ai-chatbots-to-operate-in-italy/) | 28 Jan 2026 |
| W7 | TechCrunch, [Meta will allow rival AI chatbots on WhatsApp in Europe, for a fee](https://techcrunch.com/2026/03/05/meta-will-allow-rival-ai-chatbots-on-whatsapp-in-europe-but-for-a-fee/) | 5 Mar 2026 |
| W8 | AP via News4Jax, [EU orders Meta to restore WhatsApp access for rival AI chatbots](https://www.news4jax.com/business/2026/06/09/eu-orders-meta-to-restore-whatsapp-access-for-rival-ai-chatbots/) | 9 Jun 2026 |
| W9 | WhatsApp, [Business Messaging Policy](https://whatsappbusiness.com/policy/) | last updated 23 Sep 2026 |
| W10 | Meta, [Graph API changelog (versions)](https://developers.facebook.com/docs/graph-api/changelog) | live page |
| W10b | PPC Land, [Meta's API v27…](https://ppc.land/metas-api-v27-may-add-catalog-products-to-new-ads-by-default/) (v27 release; v21 removal date) | Nov 2026 |
| W10c | Meta, [Introducing Graph API v26](https://developers.facebook.com/blog/post/2026/07/29/introducing-graph-api-v26-and-marketing-api-v26/) | 29 Jul 2026 |
| W10d | Meta, [Introducing Graph API v25](https://developers.facebook.com/blog/post/2026/02/18/introducing-graph-api-v25-and-marketing-api-v25) | 18 Feb 2026 |
| W11 | Meta, [Messaging limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits) | live page |
| W12 | Meta, [WhatsApp Business Platform changelog](https://developers.facebook.com/documentation/business-messaging/whatsapp/changelog/) | live page |
| W13 | Meta, [Template categorization](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization) and [Templates overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview) | live pages |
| W14 | Meta, interactive messages: [reply buttons](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-reply-buttons-messages), [lists](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-list-messages), [CTA URL](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-cta-url-messages) | live pages |
| W15 | Meta, [Typing indicators](https://developers.facebook.com/documentation/business-messaging/whatsapp/typing-indicators) | live page |
| W16 | Meta, [Create a webhook endpoint (payload validation)](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint) | live page |
| W17 | Meta, [WhatsApp Flows guides](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides); [Appointments with WhatsApp Flows](https://developers.facebook.com/blog/post/2024/02/27/appointments-with-whatsapp-flows/) | 27 Feb 2024 (blog) |
| W18 | Meta, [Business-scoped user IDs](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids) | live page |
| W19 | Meta, [Local storage](https://developers.facebook.com/documentation/business-messaging/whatsapp/local-storage) | live page |
| W20 | Meta, [Calling API pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/calling/pricing/) | updated Sep 2026 |
| W21 | India rates: [IBTimes](https://www.ibtimes.co.in/whatsapp-business-messages-become-paid-october-1-india-prices-rules-what-changes-906727); [Goodreturns](https://www.goodreturns.in/news/whatsapp-business-new-rules-from-october-1-service-messages-to-become-chargeable-check-india-rates-1538179.html); [Exotel marketing-rate update](https://docs.exotel.com/messaging-apis/whatsapp-pricing-change-update) | 30 Sep 2026 (IBTimes); Oct 2026 |
| W22 | Meta Newsroom, [Bringing new tools to help businesses…](https://about.fb.com/news/2025/09/bringing-new-tools-to-help-businesses-boost-engagement-customer-support-and-discoverability/) | Sep 2025 |
| W23 | MediaNews4U, [WhatsApp hosts third business summit in India, unveils Meta Business Agent](https://www.medianews4u.com/whatsapp-hosts-third-business-summit-in-india-unveils-meta-business-agent-and-enterprise-ai-platform/) | 7 Jul 2026 |

### Indian regulation

| ID | Source | Date |
|---|---|---|
| R1 | SEBI (IA) (Second Amendment) Regulations 2024, [text via TaxGuru](https://taxguru.in/?p=941591) | 16 Dec 2024 |
| R2 | SEBI circular, Guidelines for Investment Advisers, [text via TaxGuru](https://taxguru.in/?p=944354) | 8 Jan 2025 |
| R3 | AMFI, [FAQs on Do's & Don'ts for MFDs](https://www.amfiindia.com/Themes/Theme1/downloads/FAQsonRoleofMFDsAdvts.pdf) | 17 Mar 2025 |
| R4 | AMFI, [Master Circular for MFDs (incl. Code of Conduct)](https://www.amfiindia.com/uploads/AMFI_Master_Cicular_for_MF_Ds_3c7f5ee44f.pdf) | 14 Jan 2026 |
| R5 | SEBI, [AI/ML reporting by market intermediaries](https://www.sebi.gov.in/legal/circulars/jan-2019/reporting-for-artificial-intelligence-ai-and-machine-learning-ml-applications-and-systems-offered-and-used-by-market-intermediaries_41546.html) | 4 Jan 2019 |
| R6 | SEBI (Intermediaries) (Amendment) Regulations 2025, Reg 16C, [text via TaxGuru](https://taxguru.in/?p=949054) | Feb 2025 |
| R7 | Legal500, [SEBI's blueprint for AI/ML (June 2025 consultation)](https://www.legal500.com/intelligence/india/technology/navigating-responsible-innovation-sebi%27s-blueprint-for-ai-ml-in-indian-securities-markets) | 26 Aug 2025 |
| R8 | NewKerala, [SEBI to issue AI/ML guidelines (Chairman)](https://www.newkerala.com/news/a/sebi-soon-issue-aiml-guidelines-capital-markets-mandate-421.htm); [SEBI preparing guidelines (WTM)](https://www.newkerala.com/news/a/sebi-preparing-guidelines-responsible-ai-use-capital-markets-572.htm) | 19 Aug 2026; 19 Nov 2026 |
| R9 | SEBI, [Association of regulated persons with certain persons](https://www.sebi.gov.in/legal/circulars/oct-2024/association-of-persons-regulated-by-the-board-and-their-agents-with-certain-persons_87837.html) | 22 Oct 2024 |
| R10 | Taxmann, [SEBI (Mutual Funds) Regulations 2026](https://www.taxmann.com/post/blog/sebi-notifies-mutual-funds-regulations-2026); [MF Master Circular](https://www.taxmann.com/post/blog/sebi-issues-updated-master-circular-for-mutual-funds/) | Jan 2026; Mar 2026 |
| R11 | SEBI, [Standard warning in MF advertisements](https://www.sebi.gov.in/legal/circulars/feb-2008/standard-warning-in-advertisements-by-mutual-funds_6853.html) | Feb 2008 |
| R12 | AMFI Best Practice circular [109/2023-24](https://amfiindia.com/Themes/Theme1/downloads/circulars/SEBI/CU148-AMFI%20BP%20cir%20109%20dt.%2001-Nov-23.pdf) and [109-A](https://www.amfiindia.com/uploads/CU_158_AMFI_135_BP_109_A_2023_24_8f5585b565.pdf) | 1 Nov 2023; 10 Sep 2024 |
| R13 | SEBI Intermediaries (Second Amendment) Regulations 2026 (Common Advertisement Code), [text via TaxGuru](https://taxguru.in/?p=1089061) | 8 Oct 2026 |
| R14 | Taxmann, [Registration details on social media](https://www.taxmann.com/post/blog/sebi-mandates-registration-details-disclosure-on-social-media); [Legal500 note](https://www.legal500.com/intelligence/india/finance-and-banking/mandatory-sebi-disclosures-on-social-media-new-eodi-rules-for-regulated-entities-and-their-agents) | 26 Feb 2026; 6 Mar 2026 |
| R15 | IBAI, [Insurance Brokers Regulations 2018 deck](https://www.ibai.org/storage/media/news_letter/brokerregulation-01mar18_19012024-181158.pdf); IRDAI, [ISNP](https://policyholder.gov.in/web/guest/insurance-self-network-platform-isnp-) | 2024 (deck) |
| R16 | Trilegal, [IRDAI intermediary reforms](https://trilegal.com/knowledge-repository/update/irdai-intermediary-reforms-from-periodic-renewals-to-continuous-supervision/) | Aug 2026 |
| R17 | AMS Shardul, [Simplified norms to protect policyholders](https://www.amsshardul.com/insight/simplified-norms-to-protect-policyholders/) | 2024 |
| R18 | Cyril Amarchand Mangaldas, [IRDAI's proposed distribution reforms](https://www.cyrilshroff.com/wp-content/uploads/2026/10/Client-Alert-IRDAIs-Proposed-Distribution-Reforms-Restrictions-and-Reset.pdf) | 27 Oct 2026 |
| R19 | PIB, [DPDP Rules 2025](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf); AZB, [DPDP framework comes into effect](https://www.azbpartners.com/bank/update-indias-digital-personal-data-protection-framework-comes-into-effect/); Majmudar, [India's new privacy regime](https://www.majmudarindia.com/wp-content/uploads/Indias-new-privacy-regime_2026-11-18.pdf) | 14 Nov 2025; 19 Nov 2025; 18 Nov 2026 |
| R20 | RBI, [Storage of payment system data, FAQ](https://rbi.org.in/scripts/FAQView.aspx?Id=130) | 2018/2019 |
| R21 | Taxmann, [SEBI cloud framework](https://www.taxmann.com/post/blog/sebi-introduces-framework-for-adoption-of-cloud-services-by-regulated-entities/) | Mar 2023 |
| R22 | KS&K, [Clarifications to CSCRF](https://ksandk.com/newsletter/clarifications-to-cscrf-for-sebi-regulated-entities/) | 2025 |
| R23 | Cyril Amarchand blog, [IRDAI Information & Cyber Security Guidelines 2023](https://corporate.cyrilamarchandblogs.com/2024/01/primer-on-irdai-information-and-cyber-security-guidelines-2023/); Angel One, [6-hour reporting rule](https://www.angelone.in/news/market-updates/irdai-tightens-cybersecurity-norms-six-hour-reporting-rule-for-insurers-and-intermediaries) | 8 Jan 2024; 1 Apr 2025 |
| R26 | Indian Kanoon, [IA Regulations, record maintenance](https://indiankanoon.org/doc/67904678/) | — |
| R27 | TRAI, [PR 119/2026 (TCCCPR 3rd amendment)](https://www.trai.gov.in/sites/default/files/2026-09/PR_No119of2026.pdf); [PR 151/2025 (1600 series)](https://www.trai.gov.in/sites/default/files/2025-12/PR_No.151of2025.pdf); FoneArena, [TCCCPR 2025](https://www.fonearena.com/blog/446114/trai-tcccpr-2025-tougher-rules-spam-calls-sms.html) | 18 Sep 2026; 16 Dec 2025; Feb 2025 |
| R28 | IRDAI, [List of brokers](https://irdai.gov.in/list-of-brokers) | live page |
| R29 | Bajaj Capital, [legal disclaimer](https://www.bajajcapital.com/term-conditions?doc=legal_disclaimer) | via BAJAJ_CAPITAL_BRIEF.md |
| R30 | esi.in (third-party copy of SEBI list), [Bajaj Capital Investment Advisers Pvt Ltd](https://esi.in/finance/investments/sebi/investment-advisers/bajaj-capital-investment-advisers-private-limited/) | Unverified |

### Market

| ID | Source | Date |
|---|---|---|
| M1 | Business Standard, [Meta invests in CRED; Kunal Shah to lead WhatsApp](https://www.business-standard.com/companies/news/meta-invests-cred-kunal-shah-step-down-lead-whatsapp-globally-126062200992_1.html) | 22 Jun 2026 |
| M2 | TechCrunch, [WhatsApp's biggest market is becoming its toughest test](https://techcrunch.com/2025/12/14/whatsapps-biggest-market-is-becoming-its-toughest-test) | 14 Dec 2025 |
| M3 | The Motley Fool, [Meta Q4 2025 earnings call transcript](https://www.fool.com/earnings/call-transcripts/2026/01/28/meta-meta-q4-2025-earnings-call-transcript/) | 28 Jan 2026 |
| M4 | Business Standard, [HDFC MF WhatsApp service](https://www.business-standard.com/finance/personal-finance/hdfc-mutual-fund-starts-tap-based-whatsapp-service-for-sip-lump-sum-125040200552_1.html) | Apr 2025 |
| M5 | CXOToday, [SBI MF SmartAssist](https://cxotoday.com/media-coverage/sbi-mutual-fund-launches-ai-powered-smartassist-on-whatsapp/) | Jul 2025 |
| M6 | Tata AMC, [press release](https://www.tatamutualfund.com/system/files/2025-07/Press%20Release%20AI-powered%20WhatsApp%20Bot%20to%20Simplify%20Investing%202nd%20July%202025.pdf) | 2 Jul 2025 |
| M7 | ICICI Prudential AMC, [WhatsApp chatbot mailer](https://www.icicipruamc.com/blob/sebi-repo/Advertisements/2025/November/Filing%20date%2021-11-2025/Release%20date%2018-11-2025/Advertisements/Annexure%203%20-%20Mailer%20on%20WhatsApp%20ChatBot%20Launch.html) | 18 Nov 2025 |
| M8 | Business Today, [UTI MF on WhatsApp](https://www.businesstoday.in/personal-finance/story/no-browser-no-extra-app-you-can-now-invest-in-uti-mutual-funds-on-whatsapp-545810-2026-07-29) | 29 Jul 2026 |
| M9 | Business Standard, [Zerodha MF on WhatsApp](https://www.business-standard.com/finance/personal-finance/no-app-no-problem-zerodha-brings-mutual-fund-investing-to-whatsapp-125072400635_1.html) | 24 Jul 2025 |
| M10 | Cafemutual, [KFintech ARYA](https://cafemutual.com/news/industry/38716-kfintech-unveils-ai-powered-arya-for-mutual-fund-transactions) | 4 Sep 2026 |
| M11 | Business Today, [HDFC Bank Neev](https://www.businesstoday.in/technology/artificial-intelligence/story/hdfc-bank-bets-big-on-ai-with-in-house-genai-platform-neev-plans-to-transform-customer-service-lending-and-operations-542375-2026-07-11) | 11 Jul 2026 |
| M12 | LIC, [WhatsApp premium payment](https://licindia.in/documents/d/guest/press-release-online-prem-payment-facility-thru-wa-bot) | 9 May 2025 |
| M13 | Business Today, [ICICI Lombard AI](https://www.businesstoday.in/latest/corporate/story/how-icici-lombard-is-using-ai-driven-tech-to-boost-efficiencies-546973-2026-08-03) | 3 Aug 2026 |
| M14 | AIM, [SBI Life taps Sarvam](https://analyticsindiamag.com/ai-news/sbi-life-taps-sarvam-for-multilingual-voice-ai-across-india) | 27 Feb 2026 |
| M15 | Haptik, [Kotak Life case study](https://www.haptik.ai/resources/case-study/kotak-life-insurance-whatsapp-flows-based-lead-gen) | undated |
| M16 | Infobip, [Anand Rathi case study](https://infobip.com/customer/anand-rathi) | undated |
| M17 | Zerodha, [Kite MCP](https://zerodha.com/z-connect/featured/connect-your-zerodha-account-to-ai-assistants-with-kite-mcp) | 20 May 2025 |
| M18 | AMFI, [Monthly Note, Oct 2026](https://www.amfiindia.com/uploads/AMFI_Monthly_Note_October2026_cd03bc1103.pdf); [EquityBulls highlights](https://www.equitybulls.com/news/379006/highlights-amfi-mutual-fund-industry-monthly-data-october-2026); [Kotak Neo](https://www.kotakneo.com/news/mutual-funds/equity-mutual-fund-inflows-fall-14-percent-october-2026-sip-contributions/) | 11–15 Nov 2026 |
| M19 | 5paisa, [MF industry adds investors](https://www.5paisa.com/blog/mutual-fund-industry-adds-4-4-million-investors-2026) | 26 Oct 2026 |
| M20 | Cafemutual, [New MFDs Apr–Sep 2026](https://cafemutual.com/news/industry/39201-over-12500-individuals-join-mf-distribution-business-in-april-september-2026) | 2 Nov 2026 |
| M21 | News on AIR, [SEBI on decline in RIAs](https://www.newsonair.gov.in/sebi-expresses-concern-over-decline-in-number-of-registered-investment-advisers/) | 16 Mar 2026 |
| M22 | Angel One, [SIP stoppage ratio Oct 2026](https://www.angelone.in/news/mutual-funds/mutual-fund-sip-stoppage-ratio-hits-116-7-in-october-2026-new-registrations-fall-19-9) | 12 Nov 2026 |

### Competitors and cost benchmarks

| ID | Source | Date |
|---|---|---|
| C1 | Inc42, [Gupshup's AI rebuild](https://inc42.com/features/gupshup-ai-rebuild-can-it-stay-ahead-of-the-platforms-it-runs-on/) | 23 Sep 2026 |
| C2 | TechCrunch, [Gupshup raises $60M](https://techcrunch.com/2025/07/22/gupshup-raises-60m-in-equity-and-debt-leaves-unicorn-status-hanging) | 22 Jul 2025 |
| C3 | Gupshup, [WhatsApp API pricing](https://www.gupshup.ai/isv-partners/whatsapp-api/pricing) | live page |
| C4 | PR Newswire, [Yellow.ai to go public via SPAC](https://www.prnewswire.com/in/news-releases/yellowai-a-global-leader-in-enterprise-agentic-ai-to-go-public-via-550-million-merger-with-bluerock-acquisition-corp-302841119.html); Inc42, [Yellow.ai layoffs](https://inc42.com/buzz/exclusive-yellow-ai-lays-off-over-100-employees-amid-automation-push) | 3 Aug 2026; Dec 2025 |
| C5 | Business Today, [Haptik AI agents for SMBs](https://www.businesstoday.in/technology/news/story/haptik-launches-whatsapp-ai-agents-for-smbs-starting-at-rs10000-492296-2025-09-04); [Interakt pricing](https://www.interakt.shop/pricing/) | 4 Sep 2025; live page |
| C6 | [AiSensy pricing](https://aisensy.com/pricing) | live page |
| C7 | eesel, [WATI pricing](https://www.eesel.ai/blog/wati-pricing) | 26 Oct 2026 |
| C8 | [Gallabox pricing](https://gallabox.com/pricing); Inc42, [Gallabox funding](https://inc42.com/buzz/prime-ventures-backed-gallabox-nets-3-5-mn-to-build-agentic-ai-solutions/) | live page; Jan 2025 |
| C9 | Tata Communications, [Kaleyra AI](https://www.tatacommunications.com/press-release/tata-communications-readies-kaleyra-ai-the-game-changing-ai-powered-future-of-customer-interactions) | late 2024 |
| C10 | MediaInfoline, [Route Mobile to acquire Heltar business](https://www.mediainfoline.com/alliances/route-mobile-signs-business-transfer-agreement-to-acquire-heltar-technologies-ai-driven-customer-engagement-business) | 14 Jul 2026 |
| C11 | Tribune, [Infobip AgentOS](https://www.tribuneindia.com/news/business/infobip-is-set-to-launch-agentos-to-orchestrate-autonomous-ai-driven-customer-journeys-at-scale/) | 2026 |
| C12 | Inc42, [Nurix AI to acquire Verloop](https://inc42.com/buzz/mukesh-bansals-nurix-ai-to-acquire-verloop/) | Jul 2026 |
| C13 | SiliconANGLE, [Uniphore $260M](https://siliconangle.com/2025/10/22/business-ai-cloud-operator-uniphore-gets-260m-nvidia-snowflake-databricks-amd-others/) | 22 Oct 2025 |
| C14 | Kore.ai, [AllianceBernstein investment](https://www.kore.ai/news/kore-ai-secures-strategic-growth-investment-from-alliancebernstein-to-scale-the-next-phase-of-agentic-enterprise-ai) | 27 Jan 2026 |
| C15 | AIM, [Sarvam Samvaad on WhatsApp](https://analyticsindiamag.com/ai-news-updates/sarvams-samvaad-voice-chat-ai-agents-hit-whatsapp-in-11-indian-languages) | Feb 2026 |
| C16 | Inc42, [Gnani.ai raises $10M](https://inc42.com/buzz/gnani-ai-raises-10-mn-to-build-sovereign-ai-voice-agents/) | 31 Mar 2026 |
| C17 | Entrackr, [GreyLabs AI raises ₹85 crore](https://entrackr.com/news/greylabs-ai-raises-rs-85-cr-led-by-elevation-to-launch-voice-ai-agents-for-bfsi-10532249) | 6 Oct 2025 |
| H1 | AmbitionBox, [Chat support executive salary](https://ambitionbox.com/profile/chat-support-executive-salary) | accessed Nov 2026 |
| H2 | MyOperator, [AI support agent vs call centre cost, India 2026](https://myoperator.com/blog/ai-support-agent-vs-call-center-india-cost-2026) | 20 Nov 2026 (vendor) |
| H3 | Comm100, [Live chat agent KPIs](https://comm100.com/blog/live-chat-agent-performance-kpis.html); [benchmark report](https://www.comm100.com/resources/report/live-chat-benchmark-report/) | vendor; 2026 |
| H4 | Gartner, [press release on self-service](https://www.gartner.com/en/newsroom/press-releases/2019-09-25-gartner-says-only-9--of-customers-report-solving-thei) | 25 Sep 2019 |
| H5 | AmbitionBox, [Relationship wealth manager salary](https://ambitionbox.com/profile/relationship-wealth-manager-salary); [Bajaj Capital salaries](https://ambitionbox.com/salaries/bajaj-capital-salaries/kolkata-location) | 2025–2026 |

### Anthropic and AWS

| ID | Source | Date |
|---|---|---|
| A1 | Anthropic, [Data residency](https://platform.claude.com/docs/en/manage-claude/data-residency) | live page |
| A2 | Anthropic, [API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) | live page |
| A3 | Anthropic, [Pricing](https://platform.claude.com/docs/en/about-claude/pricing) | live page |
| A4 | AWS ML Blog, [Amazon Bedrock expands Claude availability to India](https://aws.amazon.com/blogs/machine-learning/amazon-bedrock-expands-claude-model-availability-to-india-cross-region-inference/); Inc42, [Anthropic brings Claude inference to India](https://inc42.com/buzz/anthropic-brings-claude-inference-to-india-as-sovereign-ai-race-heats-up/) | Aug–Sep 2026 |

[W1]: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
[W2]: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages
[W3]: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/ai-providers
[W4]: https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform
[W5]: https://techcrunch.com/2025/10/18/whatssapp-changes-its-terms-to-bar-general-purpose-chatbots-from-its-platform
[W6]: https://techcrunch.com/2026/01/28/whatsapp-will-now-charge-ai-chatbots-to-operate-in-italy/
[W7]: https://techcrunch.com/2026/03/05/meta-will-allow-rival-ai-chatbots-on-whatsapp-in-europe-but-for-a-fee/
[W8]: https://www.news4jax.com/business/2026/06/09/eu-orders-meta-to-restore-whatsapp-access-for-rival-ai-chatbots/
[W9]: https://whatsappbusiness.com/policy/
[W10]: https://developers.facebook.com/docs/graph-api/changelog
[W10b]: https://ppc.land/metas-api-v27-may-add-catalog-products-to-new-ads-by-default/
[W10c]: https://developers.facebook.com/blog/post/2026/07/29/introducing-graph-api-v26-and-marketing-api-v26/
[W10d]: https://developers.facebook.com/blog/post/2026/02/18/introducing-graph-api-v25-and-marketing-api-v25
[W11]: https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits
[W12]: https://developers.facebook.com/documentation/business-messaging/whatsapp/changelog/
[W13]: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization
[W14]: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-reply-buttons-messages
[W15]: https://developers.facebook.com/documentation/business-messaging/whatsapp/typing-indicators
[W16]: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint
[W17]: https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides
[W18]: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids
[W19]: https://developers.facebook.com/documentation/business-messaging/whatsapp/local-storage
[W20]: https://developers.facebook.com/documentation/business-messaging/whatsapp/calling/pricing/
[W21]: https://www.ibtimes.co.in/whatsapp-business-messages-become-paid-october-1-india-prices-rules-what-changes-906727
[W22]: https://about.fb.com/news/2025/09/bringing-new-tools-to-help-businesses-boost-engagement-customer-support-and-discoverability/
[W23]: https://www.medianews4u.com/whatsapp-hosts-third-business-summit-in-india-unveils-meta-business-agent-and-enterprise-ai-platform/
[R1]: https://taxguru.in/?p=941591
[R2]: https://taxguru.in/?p=944354
[R3]: https://www.amfiindia.com/Themes/Theme1/downloads/FAQsonRoleofMFDsAdvts.pdf
[R4]: https://www.amfiindia.com/uploads/AMFI_Master_Cicular_for_MF_Ds_3c7f5ee44f.pdf
[R5]: https://www.sebi.gov.in/legal/circulars/jan-2019/reporting-for-artificial-intelligence-ai-and-machine-learning-ml-applications-and-systems-offered-and-used-by-market-intermediaries_41546.html
[R6]: https://taxguru.in/?p=949054
[R7]: https://www.legal500.com/intelligence/india/technology/navigating-responsible-innovation-sebi%27s-blueprint-for-ai-ml-in-indian-securities-markets
[R8]: https://www.newkerala.com/news/a/sebi-preparing-guidelines-responsible-ai-use-capital-markets-572.htm
[R9]: https://www.sebi.gov.in/legal/circulars/oct-2024/association-of-persons-regulated-by-the-board-and-their-agents-with-certain-persons_87837.html
[R11]: https://www.sebi.gov.in/legal/circulars/feb-2008/standard-warning-in-advertisements-by-mutual-funds_6853.html
[R12]: https://amfiindia.com/Themes/Theme1/downloads/circulars/SEBI/CU148-AMFI%20BP%20cir%20109%20dt.%2001-Nov-23.pdf
[R13]: https://taxguru.in/?p=1089061
[R14]: https://www.taxmann.com/post/blog/sebi-mandates-registration-details-disclosure-on-social-media
[R15]: https://www.ibai.org/storage/media/news_letter/brokerregulation-01mar18_19012024-181158.pdf
[R16]: https://trilegal.com/knowledge-repository/update/irdai-intermediary-reforms-from-periodic-renewals-to-continuous-supervision/
[R17]: https://www.amsshardul.com/insight/simplified-norms-to-protect-policyholders/
[R18]: https://www.cyrilshroff.com/wp-content/uploads/2026/10/Client-Alert-IRDAIs-Proposed-Distribution-Reforms-Restrictions-and-Reset.pdf
[R19]: https://www.azbpartners.com/bank/update-indias-digital-personal-data-protection-framework-comes-into-effect/
[R20]: https://rbi.org.in/scripts/FAQView.aspx?Id=130
[R21]: https://www.taxmann.com/post/blog/sebi-introduces-framework-for-adoption-of-cloud-services-by-regulated-entities/
[R22]: https://ksandk.com/newsletter/clarifications-to-cscrf-for-sebi-regulated-entities/
[R23]: https://corporate.cyrilamarchandblogs.com/2024/01/primer-on-irdai-information-and-cyber-security-guidelines-2023/
[R26]: https://indiankanoon.org/doc/67904678/
[R27]: https://www.trai.gov.in/sites/default/files/2026-09/PR_No119of2026.pdf
[R28]: https://irdai.gov.in/list-of-brokers
[R29]: https://www.bajajcapital.com/term-conditions?doc=legal_disclaimer
[R30]: https://esi.in/finance/investments/sebi/investment-advisers/bajaj-capital-investment-advisers-private-limited/
[M1]: https://www.business-standard.com/companies/news/meta-invests-cred-kunal-shah-step-down-lead-whatsapp-globally-126062200992_1.html
[M2]: https://techcrunch.com/2025/12/14/whatsapps-biggest-market-is-becoming-its-toughest-test
[M3]: https://www.fool.com/earnings/call-transcripts/2026/01/28/meta-meta-q4-2025-earnings-call-transcript/
[M4]: https://www.business-standard.com/finance/personal-finance/hdfc-mutual-fund-starts-tap-based-whatsapp-service-for-sip-lump-sum-125040200552_1.html
[M5]: https://cxotoday.com/media-coverage/sbi-mutual-fund-launches-ai-powered-smartassist-on-whatsapp/
[M6]: https://www.tatamutualfund.com/system/files/2025-07/Press%20Release%20AI-powered%20WhatsApp%20Bot%20to%20Simplify%20Investing%202nd%20July%202025.pdf
[M7]: https://www.icicipruamc.com/blob/sebi-repo/Advertisements/2025/November/Filing%20date%2021-11-2025/Release%20date%2018-11-2025/Advertisements/Annexure%203%20-%20Mailer%20on%20WhatsApp%20ChatBot%20Launch.html
[M8]: https://www.businesstoday.in/personal-finance/story/no-browser-no-extra-app-you-can-now-invest-in-uti-mutual-funds-on-whatsapp-545810-2026-07-29
[M9]: https://www.business-standard.com/finance/personal-finance/no-app-no-problem-zerodha-brings-mutual-fund-investing-to-whatsapp-125072400635_1.html
[M10]: https://cafemutual.com/news/industry/38716-kfintech-unveils-ai-powered-arya-for-mutual-fund-transactions
[M11]: https://www.businesstoday.in/technology/artificial-intelligence/story/hdfc-bank-bets-big-on-ai-with-in-house-genai-platform-neev-plans-to-transform-customer-service-lending-and-operations-542375-2026-07-11
[M12]: https://licindia.in/documents/d/guest/press-release-online-prem-payment-facility-thru-wa-bot
[M13]: https://www.businesstoday.in/latest/corporate/story/how-icici-lombard-is-using-ai-driven-tech-to-boost-efficiencies-546973-2026-08-03
[M14]: https://analyticsindiamag.com/ai-news/sbi-life-taps-sarvam-for-multilingual-voice-ai-across-india
[M15]: https://www.haptik.ai/resources/case-study/kotak-life-insurance-whatsapp-flows-based-lead-gen
[M16]: https://infobip.com/customer/anand-rathi
[M17]: https://zerodha.com/z-connect/featured/connect-your-zerodha-account-to-ai-assistants-with-kite-mcp
[M18]: https://www.equitybulls.com/news/379006/highlights-amfi-mutual-fund-industry-monthly-data-october-2026
[M19]: https://www.5paisa.com/blog/mutual-fund-industry-adds-4-4-million-investors-2026
[M20]: https://cafemutual.com/news/industry/39201-over-12500-individuals-join-mf-distribution-business-in-april-september-2026
[M21]: https://www.newsonair.gov.in/sebi-expresses-concern-over-decline-in-number-of-registered-investment-advisers/
[M22]: https://www.angelone.in/news/mutual-funds/mutual-fund-sip-stoppage-ratio-hits-116-7-in-october-2026-new-registrations-fall-19-9
[C1]: https://inc42.com/features/gupshup-ai-rebuild-can-it-stay-ahead-of-the-platforms-it-runs-on/
[C2]: https://techcrunch.com/2025/07/22/gupshup-raises-60m-in-equity-and-debt-leaves-unicorn-status-hanging
[C3]: https://www.gupshup.ai/isv-partners/whatsapp-api/pricing
[C4]: https://www.prnewswire.com/in/news-releases/yellowai-a-global-leader-in-enterprise-agentic-ai-to-go-public-via-550-million-merger-with-bluerock-acquisition-corp-302841119.html
[C5]: https://www.businesstoday.in/technology/news/story/haptik-launches-whatsapp-ai-agents-for-smbs-starting-at-rs10000-492296-2025-09-04
[C6]: https://aisensy.com/pricing
[C7]: https://www.eesel.ai/blog/wati-pricing
[C8]: https://gallabox.com/pricing
[C9]: https://www.tatacommunications.com/press-release/tata-communications-readies-kaleyra-ai-the-game-changing-ai-powered-future-of-customer-interactions
[C10]: https://www.mediainfoline.com/alliances/route-mobile-signs-business-transfer-agreement-to-acquire-heltar-technologies-ai-driven-customer-engagement-business
[C11]: https://www.tribuneindia.com/news/business/infobip-is-set-to-launch-agentos-to-orchestrate-autonomous-ai-driven-customer-journeys-at-scale/
[C12]: https://inc42.com/buzz/mukesh-bansals-nurix-ai-to-acquire-verloop/
[C13]: https://siliconangle.com/2025/10/22/business-ai-cloud-operator-uniphore-gets-260m-nvidia-snowflake-databricks-amd-others/
[C14]: https://www.kore.ai/news/kore-ai-secures-strategic-growth-investment-from-alliancebernstein-to-scale-the-next-phase-of-agentic-enterprise-ai
[C15]: https://analyticsindiamag.com/ai-news-updates/sarvams-samvaad-voice-chat-ai-agents-hit-whatsapp-in-11-indian-languages
[C16]: https://inc42.com/buzz/gnani-ai-raises-10-mn-to-build-sovereign-ai-voice-agents/
[C17]: https://entrackr.com/news/greylabs-ai-raises-rs-85-cr-led-by-elevation-to-launch-voice-ai-agents-for-bfsi-10532249
[H1]: https://ambitionbox.com/profile/chat-support-executive-salary
[H2]: https://myoperator.com/blog/ai-support-agent-vs-call-center-india-cost-2026
[H3]: https://comm100.com/blog/live-chat-agent-performance-kpis.html
[H4]: https://www.gartner.com/en/newsroom/press-releases/2019-09-25-gartner-says-only-9--of-customers-report-solving-thei
[H5]: https://ambitionbox.com/salaries/bajaj-capital-salaries/kolkata-location
[A1]: https://platform.claude.com/docs/en/manage-claude/data-residency
[A2]: https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
[A3]: https://platform.claude.com/docs/en/about-claude/pricing
[A4]: https://aws.amazon.com/blogs/machine-learning/amazon-bedrock-expands-claude-model-availability-to-india-cross-region-inference/

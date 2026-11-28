"use client";

import { useId } from "react";
import { motion as Motion } from "framer-motion";
import {
  BookOpen,
  Brain,
  Calculator,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Check,
  Cog,
  Gauge,
  Headset,
  Languages,
  MessageCircle,
  Scale,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  Target,
  Ticket,
  UserRoundPen,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { formatDuration, formatUSD, plainText, toolLabel, truncate } from "@/components/ai-assistant/shared/format";
import {
  compactCount,
  engineBadge,
  guardrailLabel,
  humanize,
  previewOutput,
  summarizeInput,
} from "./showcaseUtils";
import { displayFont, FOCUS_DARK } from "./ui";

const TOOL_ICONS = {
  search_knowledge_base: BookOpen,
  get_my_rewards_account: Wallet,
  calculate_sip: Calculator,
  calculate_lumpsum: Calculator,
  calculate_goal_plan: Target,
  calculate_retirement_corpus: Calculator,
  compare_tax_regimes: Scale,
  assess_risk_profile: Gauge,
  update_lead_profile: UserRoundPen,
  get_available_slots: CalendarClock,
  book_advisor_call: CalendarCheck,
  cancel_advisor_call: CalendarX,
  escalate_to_human: Headset,
  create_support_ticket: Ticket,
};

const HANDLED_LABELS = {
  claude: "Answered by Claude",
  fallback: "Answered by rules engine",
  human_pending: "Waiting for an advisor",
  opted_out: "Client opted out",
  none: "No reply needed",
};

const REPLY_KINDS = {
  text: "text",
  buttons: "quick replies",
  list: "list",
  booking_confirmation: "booking card",
  cta_url: "link button",
  notice: "notice",
};

const EXTRA_PROMPTS = {
  wealth: [
    "I'm 34 and want to invest ₹15,000 a month for my daughter's education",
    "Old vs new tax regime — which is better for me?",
    "SIP kaise start karein?",
    "I'm ready to invest — book a call with an advisor",
  ],
  rewards: [
    "Where is my cashback?",
    "My UPI payout is still pending",
    "We're a brand — how do QR rewards work?",
    "Book a demo with your partnerships team",
  ],
};

const TRY_HINTS = {
  wealth: [
    { key: "lang", icon: <Languages size={16} aria-hidden="true" />, text: "Ask in Hindi or Hinglish" },
    { key: "book", icon: <CalendarCheck size={16} aria-hidden="true" />, text: "Say you're ready to invest — it books a real slot" },
    { key: "pii", icon: <ShieldCheck size={16} aria-hidden="true" />, text: "Type a sample PAN (ABCDE1234F) to see redaction" },
  ],
  rewards: [
    { key: "lang", icon: <Languages size={16} aria-hidden="true" />, text: "Ask in Hindi or Hinglish" },
    { key: "book", icon: <CalendarCheck size={16} aria-hidden="true" />, text: "Say you're a brand — it books a partnerships demo" },
    { key: "human", icon: <Headset size={16} aria-hidden="true" />, text: "Ask for a human — it hands over" },
  ],
};

export function suggestionsFor(tenant) {
  const base = Array.isArray(tenant?.starterPrompts) ? tenant.starterPrompts : [];
  const extra = EXTRA_PROMPTS[tenant?.vertical] || EXTRA_PROMPTS.wealth;
  return [...new Set([...base, ...extra].map((s) => String(s || "").trim()).filter(Boolean))].slice(0, 6);
}

const LABEL = "text-[11.5px] font-semibold uppercase tracking-[0.16em] text-slate-500";

const LIST_VARIANTS = { hidden: {}, show: { transition: { staggerChildren: 0.11, delayChildren: 0.05 } } };
const ITEM_VARIANTS = {
  hidden: { opacity: 0, x: -14 },
  show: { opacity: 1, x: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

function PulseDot() {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
      <span
        className="absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping"
        style={{ backgroundColor: "var(--acc-dark)" }}
      />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--acc-dark)" }} />
    </span>
  );
}

function EngineBadge({ badge }) {
  const fallback = badge.kind === "fallback";
  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-semibold ring-1 ring-inset ${
        fallback ? "bg-amber-400/10 text-amber-100 ring-amber-300/30" : "bg-white/6 text-white ring-white/15"
      }`}
    >
      {fallback ? (
        <Cog size={14} className="shrink-0 text-amber-300" aria-hidden="true" />
      ) : (
        <Sparkles size={14} className="shrink-0 text-[color:var(--acc-dark)]" aria-hidden="true" />
      )}
      <span className="sr-only">Engine: </span>
      <span className={`truncate ${fallback ? "" : "font-mono text-[12px]"}`}>{badge.label}</span>
    </span>
  );
}

function Metric({ label, value, sub }) {
  return (
    <div className="min-w-0 bg-[#0b1220] px-5 py-4">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-1.5 truncate text-[17px] font-semibold tracking-[-0.01em] text-white sm:text-[18px]" style={displayFont} title={value}>
        {value}
      </dd>
      {sub ? <dd className="mt-0.5 truncate text-[12px] text-slate-400">{sub}</dd> : null}
    </div>
  );
}

function StepItem({ icon, title, detail, output, ms, ok = true, final = false }) {
  const Glyph = icon;
  const tone = final
    ? "bg-[#25D366] text-[#052e1a] ring-[#25D366]"
    : ok
      ? "bg-[#111a2e] text-[color:var(--acc-dark)] ring-white/15"
      : "bg-[#2a1215] text-rose-300 ring-rose-300/40";
  return (
    <Motion.li variants={ITEM_VARIANTS} className="relative flex gap-3.5">
      <span className={`relative z-10 grid h-[31px] w-[31px] shrink-0 place-items-center rounded-full ring-1 ${tone}`}>
        <Glyph size={15} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 pt-[5px]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-[14.5px] font-semibold text-white">{title}</p>
          {ms !== undefined && ms !== null ? (
            <span className="flex items-center gap-2 text-[12px] tabular-nums text-slate-400">
              {formatDuration(ms)}
              {final ? null : ok ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                  <Check size={11} aria-hidden="true" /> ok
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-400/10 px-1.5 py-0.5 text-[11px] font-semibold text-rose-300">
                  <X size={11} aria-hidden="true" /> error
                </span>
              )}
            </span>
          ) : null}
        </div>
        {detail ? <p className="mt-1 break-words font-mono text-[12.5px] leading-[1.55] text-slate-300">{detail}</p> : null}
        {output ? (
          <p className="mt-2 break-words rounded-lg bg-white/4 px-3 py-2 font-mono text-[12px] leading-[1.55] text-slate-400 ring-1 ring-inset ring-white/7">
            <span className="text-slate-500" aria-hidden="true">
              →{" "}
            </span>
            {output}
          </p>
        ) : null}
      </div>
    </Motion.li>
  );
}

function KnowledgeHits({ hits }) {
  const max = Math.max(1e-6, ...hits.map((hit) => Number(hit.score) || 0));
  return (
    <div className="min-w-0 bg-[#0b1220] px-5 py-5 sm:px-6">
      <h4 className={LABEL}>Knowledge hits</h4>
      {hits.length ? (
        <ul className="mt-3.5 space-y-3">
          {hits.slice(0, 5).map((hit, index) => {
            const score = Number(hit.score) || 0;
            return (
              <li key={hit.id || `${hit.title}-${index}`}>
                <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                  <span className="min-w-0 truncate text-slate-200" title={hit.title}>
                    {hit.title || hit.id}
                  </span>
                  <span className="shrink-0 font-mono text-[12px] tabular-nums text-slate-400">{score.toFixed(2)}</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/7">
                  <Motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: "var(--acc-dark)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(6, (score / max) * 100)}%` }}
                    transition={{ duration: 0.7, delay: 0.25 + index * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3.5 text-[13.5px] text-slate-500">No knowledge lookup on this turn.</p>
      )}
    </div>
  );
}

function Guardrails({ items, vertical }) {
  const alwaysOn =
    vertical === "rewards"
      ? "Always on: PII redaction · STOP opt-out · human hand-off · audit trail."
      : "Always on: risk disclaimers · no scheme recommendations · PII redaction · STOP opt-out · audit trail.";
  return (
    <div className="min-w-0 bg-[#0b1220] px-5 py-5 sm:px-6">
      <h4 className={LABEL}>Guardrails fired</h4>
      {items.length ? (
        <ul className="mt-3.5 flex flex-wrap gap-2">
          {items.map((code) => (
            <li
              key={code}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/10 px-2.5 py-1 text-[12.5px] font-medium text-amber-100 ring-1 ring-inset ring-amber-300/25"
            >
              <ShieldCheck size={13} className="text-amber-300" aria-hidden="true" />
              {guardrailLabel(code)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3.5 text-[13.5px] text-slate-500">None on this turn.</p>
      )}
      <p className="mt-4 text-[12px] leading-relaxed text-slate-500">{alwaysOn}</p>
    </div>
  );
}

function TraceView({ turn, dimmed, vertical }) {
  const result = turn.result || {};
  const trace = result.trace || {};
  const usage = trace.usage || {};
  const steps = Array.isArray(trace.steps) ? trace.steps.filter(Boolean) : [];
  const kbHits = Array.isArray(trace.kbHits) ? trace.kbHits.filter(Boolean) : [];
  const guardrails = Array.isArray(trace.guardrails) ? trace.guardrails.filter(Boolean) : [];
  const replies = Array.isArray(result.replies) ? result.replies : [];
  const inbound = result.inbound || null;
  const inboundText = inbound ? plainText(inbound.text || inbound.payload?.interactive?.title || "") : "";
  const fallback = trace.engine === "fallback";
  const iterations = Number(trace.iterations) || 0;
  const replyKinds = [...new Set(replies.map((reply) => REPLY_KINDS[reply?.type] || reply?.type).filter(Boolean))].join(" + ");

  return (
    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: dimmed ? 0.45 : 1 }} transition={{ duration: 0.3 }}>
      <dl className="grid grid-cols-2 gap-px border-b border-white/10 bg-white/10 md:grid-cols-4">
        <Metric
          label="Intent"
          value={trace.intent ? humanize(trace.intent) : "—"}
          sub={HANDLED_LABELS[result.handledBy] || (fallback ? HANDLED_LABELS.fallback : HANDLED_LABELS.claude)}
        />
        <Metric
          label="Latency"
          value={formatDuration(trace.latencyMs)}
          sub={fallback ? "rules engine" : `${iterations} LLM call${iterations === 1 ? "" : "s"}`}
        />
        <Metric
          label="Tokens"
          value={fallback ? "—" : `${compactCount(usage.inputTokens)} / ${compactCount(usage.outputTokens)}`}
          sub={
            fallback
              ? "no LLM call"
              : `in / out${usage.cacheReadTokens ? ` · ${compactCount(usage.cacheReadTokens)} cached` : ""}`
          }
        />
        <Metric label="Cost" value={fallback ? "$0" : formatUSD(usage.costUsd)} sub="this turn" />
      </dl>

      <div className="px-5 py-5 sm:px-6">
        <h4 className={LABEL}>Steps</h4>
        <Motion.ol className="relative mt-4 space-y-4" variants={LIST_VARIANTS} initial="hidden" animate="show">
          <span aria-hidden="true" className="absolute bottom-4 left-[15px] top-4 w-px bg-white/10" />
          {inboundText ? (
            <StepItem icon={MessageCircle} title="Message received" detail={`“${truncate(inboundText, 110)}”`} />
          ) : null}
          {steps.map((step, index) => (
            <StepItem
              key={`${step.name}-${index}`}
              icon={TOOL_ICONS[step.name] || Wrench}
              title={toolLabel(step.name)}
              detail={summarizeInput(step.input)}
              output={previewOutput(step.outputPreview)}
              ms={step.ms}
              ok={step.ok !== false}
            />
          ))}
          {steps.length ? null : (
            <StepItem
              icon={Sparkles}
              title={fallback ? "Matched a rule" : "Answered directly"}
              detail={fallback ? "The rules engine handled this message" : "No tools were needed for this message"}
            />
          )}
          <StepItem
            icon={SendHorizontal}
            final
            title={replies.length ? `Replied · ${replies.length} message${replies.length === 1 ? "" : "s"}` : "No reply sent"}
            detail={replyKinds}
            ms={trace.latencyMs}
          />
        </Motion.ol>
      </div>

      <div className="grid gap-px border-t border-white/10 bg-white/10 md:grid-cols-2">
        <KnowledgeHits hits={kbHits} />
        <Guardrails items={guardrails} vertical={vertical} />
      </div>
    </Motion.div>
  );
}

function ThinkingState() {
  return (
    <div className="px-6 py-10" role="status">
      <p className="flex items-center gap-3 text-[15px] font-medium text-slate-200">
        <PulseDot /> Thinking — reading the message, checking knowledge and tools…
      </p>
      <div className="mt-6 space-y-3" aria-hidden="true">
        {[92, 74, 84, 58].map((width) => (
          <div key={width} className="h-3 rounded-full bg-white/6 motion-safe:animate-pulse" style={{ width: `${width}%` }} />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ tenant, onTry }) {
  const suggestions = suggestionsFor(tenant);
  const hints = TRY_HINTS[tenant?.vertical] || TRY_HINTS.wealth;
  return (
    <div className="px-5 py-10 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-md text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10">
          <Sparkles size={24} className="text-[color:var(--acc-dark)]" aria-hidden="true" />
        </span>
        <p className="mt-5 text-[21px] font-semibold tracking-[-0.01em]" style={displayFont}>
          Send a message to watch it think
        </p>
        <p className="mt-2 text-[14.5px] leading-relaxed text-slate-400">
          For every reply you&apos;ll see the intent, each tool call, the knowledge it used, the guardrails that fired, latency
          and cost — live.
        </p>
      </div>
      {suggestions.length ? (
        <div className="mt-8">
          <p className="text-center text-[11.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">Try one of these</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion} className="max-w-full">
                <button
                  type="button"
                  onClick={() => onTry?.(suggestion)}
                  className={`max-w-full rounded-full bg-white/6 px-3.5 py-2 text-left text-[13.5px] font-medium text-slate-200 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/11 hover:text-white ${FOCUS_DARK}`}
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <ul className="mx-auto mt-9 grid max-w-2xl gap-3 sm:grid-cols-3">
        {hints.map((hint) => (
          <li
            key={hint.key}
            className="flex items-start gap-2.5 rounded-2xl bg-white/3 px-3.5 py-3 text-[13px] leading-snug text-slate-300 ring-1 ring-inset ring-white/8"
          >
            <span className="mt-px shrink-0 text-[color:var(--acc-dark)]">{hint.icon}</span>
            {hint.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BrainPanel({ tenant, llm, turn, pending, onTry }) {
  const titleId = useId();
  const trace = turn?.result?.trace || null;
  const badge = engineBadge(trace, llm);
  const subtitle = pending
    ? "Working on the reply…"
    : turn
      ? turn.restored
        ? "Last turn · restored from history"
        : "What happened on the last reply"
      : "A live trace of every reply";

  return (
    <section
      aria-labelledby={titleId}
      className="relative isolate min-w-0 overflow-hidden rounded-[28px] bg-[#0b1220] text-white shadow-[0_40px_90px_-40px_rgba(11,18,32,0.75)] ring-1 ring-white/10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 -top-28 -z-10 h-72 w-72 rounded-full"
        style={{ background: "radial-gradient(closest-side, var(--acc-glow), transparent)" }}
      />
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/6 ring-1 ring-white/10">
            <Brain size={19} className="text-[color:var(--acc-dark)]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 id={titleId} className="text-[17px] font-semibold tracking-[-0.01em]">
              AI brain
            </h3>
            <p className="truncate text-[13px] text-slate-400" aria-live="polite">
              {subtitle}
            </p>
          </div>
        </div>
        <EngineBadge badge={badge} />
      </header>
      {pending && trace ? (
        <div
          role="status"
          className="flex items-center gap-2.5 border-b border-white/10 bg-white/3 px-6 py-2.5 text-[13px] font-medium text-slate-300"
        >
          <PulseDot /> Working on the next reply…
        </div>
      ) : null}
      {trace ? (
        <TraceView key={turn.id} turn={turn} dimmed={pending} vertical={tenant?.vertical} />
      ) : pending ? (
        <ThinkingState />
      ) : (
        <EmptyState tenant={tenant} onTry={onTry} />
      )}
    </section>
  );
}

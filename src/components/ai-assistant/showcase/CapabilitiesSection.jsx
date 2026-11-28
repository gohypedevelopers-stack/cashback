"use client";

import {
  BookOpenCheck,
  Calculator,
  CalendarCheck,
  ChartColumn,
  Check,
  Gauge,
  Headset,
  Languages,
  LifeBuoy,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Container, Reveal, SectionHeading } from "./ui";

const ICON = { size: 20, "aria-hidden": "true" };

function RetrievalVisual() {
  const docs = [
    { title: "ELSS and Section 80C", width: "92%" },
    { title: "Lock-in periods by product", width: "74%" },
    { title: "Old vs new tax regime", width: "58%" },
  ];
  return (
    <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200" aria-hidden="true">
      <p className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[13px] text-slate-700 ring-1 ring-inset ring-slate-200">
        <Search size={14} className="shrink-0 text-slate-400" />
        <span className="truncate">“Is the ELSS lock-in really 3 years?”</span>
      </p>
      <ul className="mt-3 space-y-2.5">
        {docs.map((doc) => (
          <li key={doc.title}>
            <div className="flex items-center justify-between gap-3 text-[12.5px]">
              <span className="truncate font-medium text-slate-700">{doc.title}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-[var(--acc)] transition-colors" style={{ width: doc.width }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const COMPLIANCE = [
  "Risk disclaimers on investment answers",
  "No specific scheme recommendations",
  "PII such as PAN and Aadhaar numbers redacted",
  "STOP / START opt-out, honoured instantly",
  "Audit trail of every turn — tools, sources, guardrails",
];

function ComplianceVisual() {
  return (
    <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
      {COMPLIANCE.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-[14px] leading-snug text-slate-700">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">
            <Check size={12} strokeWidth={3} aria-hidden="true" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

const CARDS = [
  {
    key: "answers",
    wide: true,
    icon: <BookOpenCheck {...ICON} />,
    title: "Instant answers, grounded in retrieval",
    body: "Every answer is drawn from your approved knowledge base — fund categories, SIP rules, tax sections, KYC steps — retrieved fresh on each turn.",
    visual: <RetrievalVisual />,
  },
  {
    key: "calculators",
    icon: <Calculator {...ICON} />,
    title: "Financial calculators",
    body: "SIP, lumpsum, goal plans, retirement corpus and old-vs-new tax regime — computed by tools, not guessed by the model.",
  },
  {
    key: "risk",
    icon: <Gauge {...ICON} />,
    title: "Risk profiling",
    body: "A short conversational questionnaire places each client as conservative, moderate or aggressive.",
  },
  {
    key: "scoring",
    icon: <TrendingUp {...ICON} />,
    title: "Lead scoring",
    body: "Goal, amount, horizon and risk are captured as the client talks, with a 0–100 score and a clear stage.",
  },
  {
    key: "booking",
    icon: <CalendarCheck {...ICON} />,
    title: "Booking without double-booking",
    body: "Real advisor slots in IST. Each booking is re-checked inside a database transaction, so two clients never get the same slot.",
  },
  {
    key: "takeover",
    icon: <Headset {...ICON} />,
    title: "Human takeover",
    body: "Advisors watch conversations live and step in with one click. The AI stays quiet until they hand back.",
  },
  {
    key: "languages",
    icon: <Languages {...ICON} />,
    title: "English · हिंदी · Hinglish",
    body: "Clients write the way they speak, and the assistant answers in the same language.",
  },
  {
    key: "compliance",
    wide: true,
    icon: <ShieldCheck {...ICON} />,
    title: "Compliance by design",
    body: "Guardrails run on every turn and are built into the engine — not bolted on afterwards.",
    visual: <ComplianceVisual />,
  },
  {
    key: "analytics",
    icon: <ChartColumn {...ICON} />,
    title: "Analytics & cost per conversation",
    body: "Resolution rate, response time, the lead funnel and the cost of each conversation in rupees — per assistant, per day.",
  },
  {
    key: "fallback",
    icon: <LifeBuoy {...ICON} />,
    title: "Rules-engine fallback",
    body: "If the model is unreachable, a deterministic rules engine answers with the same tools. The chat never goes silent.",
  },
];

export default function CapabilitiesSection() {
  return (
    <section aria-labelledby="capabilities-title" className="bg-white py-20 sm:py-24 lg:py-28">
      <Container>
        <SectionHeading
          id="capabilities-title"
          eyebrow="Capabilities"
          title="Everything a client conversation needs."
          lead="Answering is only the start. The assistant qualifies, books and hands over — inside guardrails a compliance team can sign off on."
        />
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {CARDS.map((card, index) => (
            <li key={card.key} className={card.wide ? "sm:col-span-2" : ""}>
              <Reveal delay={(index % 4) * 0.05} className="h-full">
                <article className="group flex h-full flex-col rounded-[24px] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ring-1 ring-slate-200 transition-shadow duration-300 hover:shadow-[0_18px_40px_-20px_rgba(16,24,40,0.25)] sm:p-7">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--acc-soft)] text-[color:var(--acc-light)] transition-colors">
                    {card.icon}
                  </span>
                  <h3 className="mt-5 text-[18px] font-semibold leading-snug tracking-[-0.01em] text-[#0b1220]">{card.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{card.body}</p>
                  {card.visual || null}
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

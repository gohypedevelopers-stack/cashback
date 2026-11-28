"use client";

import { BellRing, CalendarDays, Globe, Megaphone, Receipt } from "lucide-react";
import { Container, Reveal, SectionHeading } from "./ui";

const USE_CASES = [
  {
    key: "campaigns",
    span: "lg:col-span-2",
    icon: <Megaphone size={20} aria-hidden="true" />,
    title: "Lead qualification from campaigns",
    body: "Click-to-WhatsApp ads, mailers and branch QR codes open a conversation that captures goal, amount and horizon — and books the call while intent is high.",
  },
  {
    key: "renewals",
    span: "lg:col-span-2",
    icon: <BellRing size={20} aria-hidden="true" />,
    title: "SIP & insurance renewal nudges",
    body: "Reminders for SIP instalments, step-ups and policy renewals through approved WhatsApp templates, with follow-up questions answered on the spot.",
  },
  {
    key: "tax",
    span: "lg:col-span-2",
    icon: <Receipt size={20} aria-hidden="true" />,
    title: "Tax season",
    body: "ELSS, Section 80C and 80D, and old-vs-new regime questions answered at peak volume — evenings and weekends included.",
  },
  {
    key: "nri",
    span: "lg:col-span-3",
    icon: <Globe size={20} aria-hidden="true" />,
    title: "NRI desk",
    body: "Clients abroad get answers in their own time zone, then a call with an NRI specialist at a time that works in both countries.",
  },
  {
    key: "appointments",
    span: "lg:col-span-3",
    icon: <CalendarDays size={20} aria-hidden="true" />,
    title: "Advisor & branch appointments",
    body: "Phone, video or branch visits booked straight into advisor calendars — with confirmations and reminders on WhatsApp.",
  },
];

const PHASES = [
  {
    key: "setup",
    weeks: "Weeks 1–2",
    title: "Set up",
    items: [
      "Knowledge base from your approved product content and FAQs",
      "Compliance review of tone, disclaimers and hand-off rules",
      "Advisor calendars, branches and working hours mapped",
    ],
  },
  {
    key: "integrate",
    weeks: "Weeks 3–4",
    title: "Integrate",
    items: [
      "Your WhatsApp Business number and branding",
      "Lead export to your CRM and console access for a pilot team",
      "User acceptance testing with your advisors",
    ],
  },
  {
    key: "live",
    weeks: "Weeks 5–6",
    title: "Go live",
    items: [
      "One campaign or region live, monitored daily",
      "Weekly review of answers, bookings and cost per conversation",
      "Go / no-go decision on scaling up",
    ],
  },
];

export default function BajajSection() {
  return (
    <section id="bajaj" aria-labelledby="bajaj-title" className="relative scroll-mt-16 overflow-hidden bg-[#0b1220] py-20 text-white sm:py-24 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-20 h-[640px] w-[640px] rounded-full"
        style={{ background: "radial-gradient(closest-side, var(--acc-glow), transparent)" }}
      />
      <Container className="relative">
        <SectionHeading
          id="bajaj-title"
          tone="dark"
          eyebrow="For Bajaj Capital"
          title="What it means for Bajaj Capital"
          lead="One assistant across every client conversation on WhatsApp — answering instantly, qualifying intent, and putting ready-to-invest clients on an advisor's calendar."
        />

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-5">
          {USE_CASES.map((item, index) => (
            <li key={item.key} className={`${item.span} ${index === USE_CASES.length - 1 ? "sm:col-span-2 lg:col-span-3" : ""}`}>
              <Reveal delay={(index % 3) * 0.06} className="h-full">
                <article className="h-full rounded-[24px] bg-white/3 p-6 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/5 sm:p-7">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/6 text-[color:var(--acc-dark)] ring-1 ring-inset ring-white/10">
                    {item.icon}
                  </span>
                  <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.01em] text-white">{item.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-400">{item.body}</p>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal className="mt-16">
          <div className="rounded-[28px] bg-white/3 p-6 ring-1 ring-inset ring-white/10 sm:p-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-[color:var(--acc-dark)]">Pilot plan</p>
                <h3 className="mt-3 text-[length:clamp(1.6rem,2.6vw,2.25rem)] font-semibold leading-tight tracking-[-0.02em] text-white">
                  Live with real clients in six weeks
                </h3>
              </div>
              <p className="max-w-md text-[15px] leading-relaxed text-slate-400">
                Success measures agreed upfront: response time, qualified leads, booked calls, advisor feedback and cost per
                conversation.
              </p>
            </div>

            <ol className="relative mt-10 grid gap-10 border-l border-white/10 pl-7 md:grid-cols-3 md:gap-8 md:border-l-0 md:pl-0">
              <span aria-hidden="true" className="absolute left-0 right-0 top-[11px] hidden h-px bg-white/10 md:block" />
              {PHASES.map((phase) => (
                <li key={phase.key} className="relative">
                  <span className="absolute -left-[39px] top-0 grid h-6 w-6 place-items-center rounded-full bg-[var(--acc)] ring-4 ring-[#0b1220] md:static">
                    <span className="h-2 w-2 rounded-full bg-[color:var(--acc-on)]" />
                  </span>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[color:var(--acc-dark)] md:mt-5">{phase.weeks}</p>
                  <h4 className="mt-2 text-[20px] font-semibold tracking-[-0.01em] text-white">{phase.title}</h4>
                  <ul className="mt-3 space-y-2.5">
                    {phase.items.map((item) => (
                      <li key={item} className="flex gap-2.5 text-[15px] leading-snug text-slate-300">
                        <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-slate-500" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

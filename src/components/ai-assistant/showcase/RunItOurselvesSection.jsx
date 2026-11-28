"use client";

import { ArrowRight, Handshake, Headset } from "lucide-react";
import { BUBBLE_SHADOW } from "@/components/ai-assistant/simulator/simulatorUtils";
import { BUTTONS, Container, Reveal, SectionHeading } from "./ui";

const LANES = [
  {
    key: "support",
    icon: <Headset size={20} aria-hidden="true" />,
    title: "Customer support",
    scope: "Cashback · wallet · UPI payouts · QR scans",
    questions: ["Where is my cashback from yesterday's scan?", "My UPI payout still shows pending — what now?"],
    outcome: "Answers from the customer's own account and the knowledge base, and opens a support ticket when a person is needed.",
    tools: ["Account lookup", "Knowledge base", "Support ticket", "Human handover"],
  },
  {
    key: "sales",
    icon: <Handshake size={20} aria-hidden="true" />,
    title: "Brand-partner sales",
    scope: "Brands exploring QR rewards campaigns",
    questions: ["We're a D2C brand — how do QR rewards work?", "Can we run a campaign for our new launch?"],
    outcome: "Explains the programme, qualifies the brand and books a demo straight into the partnerships team's calendar.",
    tools: ["Lead profile", "Lead score", "Partnerships calendar"],
  },
];

export default function RunItOurselvesSection({ onTryLive, canTryLive }) {
  return (
    <section aria-labelledby="ourselves-title" className="bg-slate-50 py-20 sm:py-24 lg:py-28">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-16">
        <div>
          <SectionHeading
            id="ourselves-title"
            eyebrow="We run it ourselves"
            title="Assured Rewards runs on the same engine."
            lead="Assured Rewards — our cashback and rewards platform — uses this engine for customer support and brand-partner sales. Same engine, same guardrails, a different knowledge base: exactly how a Bajaj Capital assistant would be built."
          />
          {canTryLive ? (
            <button type="button" onClick={onTryLive} className={`${BUTTONS.ink} mt-8`}>
              Chat with the Assured Rewards assistant <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <ul className="grid gap-5 sm:grid-cols-2">
          {LANES.map((lane, index) => (
            <li key={lane.key}>
              <Reveal delay={index * 0.08} className="h-full">
                <article className="flex h-full flex-col rounded-[24px] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ring-1 ring-slate-200 sm:p-7">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#25D366]/12 text-[#128C7E]">
                      {lane.icon}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-[#0b1220]">{lane.title}</h3>
                      <p className="text-[13px] text-slate-500">{lane.scope}</p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-2 rounded-2xl bg-[#efeae2] p-3" aria-label="Example messages">
                    {lane.questions.map((question) => (
                      <p
                        key={question}
                        className="ml-auto w-fit max-w-[92%] rounded-lg rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[13.5px] leading-snug text-[#111b21]"
                        style={{ boxShadow: BUBBLE_SHADOW }}
                      >
                        {question}
                      </p>
                    ))}
                  </div>
                  <p className="mt-5 text-[15px] leading-relaxed text-slate-600">{lane.outcome}</p>
                  <ul className="mt-auto flex flex-wrap gap-1.5 pt-5" aria-label="Tools used">
                    {lane.tools.map((tool) => (
                      <li key={tool} className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-600">
                        {tool}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

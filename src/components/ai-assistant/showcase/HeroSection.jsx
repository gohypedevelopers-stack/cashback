"use client";

import Link from "next/link";
import { motion as Motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  CalendarCheck,
  Clock,
  Headset,
  Languages,
  LayoutDashboard,
  Reply,
  ShieldCheck,
  Video,
} from "lucide-react";
import { brandTheme } from "@/components/ai-assistant/simulator/brandTheme";
import { BubbleTail, TickIcon, VerifiedBadge } from "@/components/ai-assistant/simulator/SimIcons";
import { BUBBLE_SHADOW, SYSTEM_FONT, WALLPAPER_STYLE } from "@/components/ai-assistant/simulator/simulatorUtils";
import { BUTTONS, Container, FOCUS_DARK, Reveal } from "./ui";

const CHIPS = [
  { key: "24x7", icon: <Clock size={15} aria-hidden="true" />, label: "24×7 instant answers" },
  { key: "lang", icon: <Languages size={15} aria-hidden="true" />, label: "English · हिंदी · Hinglish" },
  { key: "takeover", icon: <Headset size={15} aria-hidden="true" />, label: "Human takeover" },
  { key: "guardrails", icon: <ShieldCheck size={15} aria-hidden="true" />, label: "Compliance guardrails" },
];

function Backdrop() {
  const grid = {
    backgroundImage:
      "linear-gradient(rgba(148,163,184,0.075) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.075) 1px, transparent 1px)",
    backgroundSize: "64px 64px",
    maskImage: "radial-gradient(ellipse 75% 70% at 62% 30%, #000 25%, transparent 75%)",
    WebkitMaskImage: "radial-gradient(ellipse 75% 70% at 62% 30%, #000 25%, transparent 75%)",
  };
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0" style={grid} />
      <div
        className="absolute -right-[20%] -top-[40%] h-[1000px] w-[1000px] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(37,211,102,0.2), transparent)" }}
      />
      <div
        className="absolute -bottom-[55%] -left-[25%] h-[1000px] w-[1000px] rounded-full"
        style={{ background: "radial-gradient(closest-side, var(--acc-glow), transparent)" }}
      />
      <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
    </div>
  );
}

function HeroMeta({ time, tick }) {
  return (
    <span className="ml-auto flex shrink-0 translate-y-[3px] items-center gap-[3px] self-end pl-2 text-[11px] leading-[15px] text-[#667781]">
      {time}
      {tick ? <TickIcon state={tick} /> : null}
    </span>
  );
}

function ChatCard({ tenant }) {
  const theme = brandTheme(tenant?.brand);
  const name = tenant?.shortName || tenant?.name || "Bajaj Capital";
  const avatar = tenant?.brand?.avatarInitials || "BC";
  return (
    <div className="overflow-hidden rounded-[28px] bg-[#111a2e] p-2 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9)] ring-1 ring-white/10">
      <div className="overflow-hidden rounded-[22px]" style={{ ...WALLPAPER_STYLE, fontFamily: SYSTEM_FONT }}>
        <div className="flex items-center gap-2.5 bg-[#075E54] px-4 py-3 text-white">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold ring-2 ring-white/15"
            style={{ backgroundColor: theme.primary, color: theme.onPrimary }}
          >
            {avatar}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[15px] font-semibold leading-tight">
              <span className="truncate">{name}</span>
              <VerifiedBadge size={14} />
            </p>
            <p className="text-[12px] text-white/75">online</p>
          </div>
          <Video size={19} className="text-white/90" />
        </div>
        <div className="px-3.5 pb-4 pt-3 text-[14px] leading-[19px] text-[#111b21]">
          <div className="flex justify-center">
            <span className="rounded-lg bg-white/95 px-2.5 py-1 text-[11.5px] font-medium text-[#54656f]" style={{ boxShadow: BUBBLE_SHADOW }}>
              Today
            </span>
          </div>
          <div className="mt-2.5 flex justify-end">
            <div className="relative max-w-[84%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-2.5 pb-1.5 pt-1" style={{ boxShadow: BUBBLE_SHADOW }}>
              <BubbleTail side="right" color="#d9fdd3" />
              <div className="flex flex-wrap items-end">
                <span>Can I save tax and still invest for my daughter&apos;s education?</span>
                <HeroMeta time="9:41 pm" tick="read" />
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex justify-start">
            <div className="w-[88%]">
              <div className="relative rounded-lg rounded-tl-none bg-white px-2.5 pb-1.5 pt-1" style={{ boxShadow: BUBBLE_SHADOW }}>
                <BubbleTail side="left" color="#ffffff" />
                <p>
                  Yes. <strong className="font-semibold">ELSS</strong> funds qualify for Section 80C under the old tax regime, with a
                  3-year lock-in — and a monthly SIP keeps it flexible.
                </p>
                <div className="mt-1 flex flex-wrap items-end">
                  <span>Shall I compare both regimes for you, or set up a call with an advisor?</span>
                  <HeroMeta time="9:41 pm" />
                </div>
              </div>
              <div className="mt-[3px] grid grid-cols-2 gap-[3px]">
                {["Compare regimes", "Book a call"].map((label) => (
                  <span
                    key={label}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-2 text-[13.5px] font-medium text-[#00796b]"
                    style={{ boxShadow: BUBBLE_SHADOW }}
                  >
                    <Reply size={15} className="shrink-0" />
                    <span className="truncate">{label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniRing({ score }) {
  const size = 52;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          style={{ stroke: "var(--acc)" }}
        />
      </svg>
      <span className="absolute text-[15px] font-semibold tabular-nums text-[#0b1220]">{score}</span>
    </span>
  );
}

function FloatCard({ className = "", delay = 0, children }) {
  return (
    <Motion.div
      className={className}
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </Motion.div>
  );
}

function HeroVisual({ tenant }) {
  return (
    <div className="relative mx-auto w-full max-w-[540px] sm:pb-20 lg:pb-14">
      <p className="sr-only">
        Illustration: a client asks on WhatsApp how to save tax while investing for a child&apos;s education. The assistant
        answers and offers to book an advisor call, the lead is scored as qualified, and the booked call appears in the
        advisor console.
      </p>
      <div aria-hidden="true">
        <ChatCard tenant={tenant} />
        <div className="mt-4 grid gap-3 sm:mt-0 sm:block">
          <FloatCard className="sm:absolute sm:-left-4 sm:top-[50%] lg:-left-12" delay={0.4}>
            <div className="rounded-2xl bg-white p-4 text-[#0b1220] shadow-[0_28px_60px_-24px_rgba(0,0,0,0.75)] ring-1 ring-black/5 sm:w-[256px]">
              <div className="flex items-center gap-3">
                <MiniRing score={78} />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold">Lead qualified</p>
                  <p className="text-[12px] text-slate-500">Scored live from the chat</p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
                {[
                  ["Goal", "Child's education"],
                  ["Horizon", "12 years"],
                  ["Risk", "Moderate"],
                  ["SIP", "₹15,000 / mo"],
                ].map(([term, value]) => (
                  <div key={term} className="min-w-0">
                    <dt className="text-slate-400">{term}</dt>
                    <dd className="truncate font-semibold text-slate-700">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </FloatCard>
          <FloatCard className="sm:absolute sm:-right-3 sm:bottom-0 lg:-right-8" delay={1.6}>
            <div className="rounded-2xl bg-[#111a2e] p-4 text-white shadow-[0_28px_60px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/10 sm:w-[272px]">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#25D366]/15 text-[#25D366]">
                  <CalendarCheck size={19} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold">Advisor call booked</p>
                  <p className="text-[12px] text-slate-400">Thu · 11:00 am IST · Video call</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-[12px] text-slate-300 ring-1 ring-white/10">
                <span className="flex items-center gap-1.5">
                  <LayoutDashboard size={13} /> Now in the advisor console
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" />
              </div>
            </div>
          </FloatCard>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection({ tenant }) {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-[#0b1220] text-white">
      <Backdrop />
      <Container className="relative grid items-center gap-14 pb-20 pt-14 sm:pb-24 sm:pt-20 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-12 lg:pb-28 lg:pt-24 2xl:gap-20">
        <div className="min-w-0">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3.5 py-1.5 text-[13px] font-medium text-slate-300 ring-1 ring-inset ring-white/10">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#25D366]" />
              </span>
              Concept demo · prepared for Bajaj Capital
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h1
              id="hero-title"
              className="mt-7 text-[length:clamp(2.5rem,5.2vw,4.6rem)] font-semibold leading-[1.03] tracking-[-0.035em]"
            >
              Every client question, answered on WhatsApp <span className="text-[#25D366]">in seconds.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-7 max-w-[40rem] text-[18px] leading-[1.6] text-slate-300 sm:text-[20px]">
              When a client is ready to invest, the assistant books them straight into an advisor&apos;s calendar. Your
              advisors see every conversation as it happens — and can take over at any moment.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href="#demo" className={BUTTONS.whatsapp}>
                See it live <ArrowDown size={17} aria-hidden="true" />
              </a>
              <Link href="/ai-assistant/console" className={BUTTONS.ghostDark}>
                <LayoutDashboard size={17} aria-hidden="true" /> Advisor console
              </Link>
              <a
                href="#try"
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-3 text-[15px] font-semibold text-slate-300 transition-colors hover:text-white ${FOCUS_DARK}`}
              >
                Try it on your phone <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <ul className="mt-10 flex flex-wrap gap-2" aria-label="Highlights">
              {CHIPS.map((chip) => (
                <li
                  key={chip.key}
                  className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3.5 py-2 text-[13.5px] font-medium text-slate-200 ring-1 ring-inset ring-white/10"
                >
                  <span className="text-[#25D366]">{chip.icon}</span>
                  {chip.label}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
        <Reveal delay={0.12} className="min-w-0">
          <HeroVisual tenant={tenant} />
        </Reveal>
      </Container>
    </section>
  );
}

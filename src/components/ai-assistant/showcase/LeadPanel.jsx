"use client";

import { useId } from "react";
import Link from "next/link";
import { motion as Motion } from "framer-motion";
import { ArrowUpRight, CalendarCheck } from "lucide-react";
import { formatDateTimeIST, STAGE_BY_KEY, stageClasses } from "@/components/ai-assistant/shared/format";
import { MODE_LABELS } from "@/components/ai-assistant/simulator/ics";
import { humanize, leadFields } from "./showcaseUtils";
import { displayFont, FOCUS_LIGHT } from "./ui";

const STAGE_CAPTIONS = {
  new: "Just started chatting",
  engaged: "Asking real questions",
  qualified: "Ready for an advisor",
  booked: "Call on an advisor's calendar",
  converted: "Invested",
  lost: "Not interested right now",
};

export function ScoreRing({ score, size = 84, stroke = 8, muted = false }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={muted ? "Lead score not available yet" : `Lead score ${Math.round(value)} out of 100`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <Motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - value / 100) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ stroke: "var(--acc)" }}
        />
      </svg>
      <span className="absolute text-center" aria-hidden="true">
        <span className="block text-[24px] font-semibold leading-none tabular-nums text-[#0b1220]" style={displayFont}>
          {muted ? "—" : Math.round(value)}
        </span>
        <span className="mt-1 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">/ 100</span>
      </span>
    </div>
  );
}

export function BookingCallout({ booking }) {
  const when = booking?.timeLabel || formatDateTimeIST(booking?.startAt);
  const details = [booking?.advisorName, when ? `${when} IST` : null, MODE_LABELS[booking?.mode]].filter(Boolean).join(" · ");
  return (
    <Motion.div
      role="status"
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative min-w-0 overflow-hidden rounded-[24px] bg-white p-5 shadow-[0_24px_48px_-28px_rgba(16,24,40,0.35)] ring-2 ring-[color:var(--acc-ring)]"
    >
      <div className="flex items-start gap-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--acc)] text-[color:var(--acc-on)]">
          <CalendarCheck size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[15.5px] font-semibold leading-snug text-[#0b1220]">Call booked → now in the advisor console</p>
          {details ? <p className="mt-1 text-[13.5px] leading-snug text-slate-600">{details}</p> : null}
        </div>
      </div>
      <Link
        href="/ai-assistant/console"
        className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0b1220] px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#1a2438] ${FOCUS_LIGHT}`}
      >
        Open the advisor console <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </Motion.div>
  );
}

export default function LeadPanel({ turn, tenant }) {
  const titleId = useId();
  const lead = turn?.result?.lead || null;
  const traceLead = turn?.result?.trace?.lead || null;
  const rawScore = lead?.score ?? traceLead?.score;
  const score = rawScore === null || rawScore === undefined || rawScore === "" ? null : Number(rawScore);
  const stage = lead?.intentStage || traceLead?.stage || null;
  const fields = leadFields(lead);
  const title = lead?.name || (turn ? "Anonymous client" : "Waiting for a conversation");
  const emptyCopy = turn?.restored
    ? "Profile details appear again after the next message."
    : tenant?.vertical === "rewards"
      ? "Filled in as the conversation goes — company, interests and what they need."
      : "Filled in as the client shares their goal, amount, horizon and risk appetite.";

  return (
    <section
      aria-labelledby={titleId}
      className="min-w-0 rounded-[28px] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_24px_48px_-28px_rgba(16,24,40,0.25)] ring-1 ring-slate-200 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">Live lead card</p>
          <h3 id={titleId} className="mt-1 truncate text-[18px] font-semibold tracking-[-0.01em] text-[#0b1220]">
            {title}
          </h3>
        </div>
        {stage ? (
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset ${stageClasses(stage)}`}>
            {STAGE_BY_KEY[stage]?.label || humanize(stage)}
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <ScoreRing score={score ?? 0} muted={score === null || Number.isNaN(score)} />
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-slate-800">Lead score</p>
          <p className="mt-0.5 text-[13.5px] leading-snug text-slate-500">
            {stage ? STAGE_CAPTIONS[stage] || "Updated every turn" : "Scored 0–100 from the conversation, updated every turn"}
          </p>
        </div>
      </div>

      {fields.length ? (
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-slate-100 pt-5 2xl:grid-cols-1">
          {fields.map((field) => (
            <div key={field.key} className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{field.label}</dt>
              <dd className="mt-0.5 break-words text-[14.5px] font-medium text-slate-800">{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-3.5 text-[13.5px] leading-relaxed text-slate-500 ring-1 ring-inset ring-slate-200">
          {emptyCopy}
        </p>
      )}

      <p className="mt-5 flex items-center gap-2 text-[12.5px] text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        Saved to the advisor console as the chat happens
      </p>
    </section>
  );
}

"use client";

import { motion as Motion } from "framer-motion";
import { Check, CircleAlert, Clock } from "lucide-react";
import { WA } from "./simulatorUtils";

// 12-point rosette (drawn here, not a WhatsApp asset).
const ROSETTE = (() => {
  const points = [];
  for (let i = 0; i < 24; i += 1) {
    const radius = i % 2 ? 9.2 : 11;
    const angle = (Math.PI * 2 * i) / 24 - Math.PI / 2;
    points.push(`${(12 + radius * Math.cos(angle)).toFixed(2)} ${(12 + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return `M${points.join("L")}Z`;
})();

export function VerifiedBadge({ size = 16, className = "", title = "Verified business" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`shrink-0 ${className}`} role="img" aria-label={title}>
      <path d={ROSETTE} fill={WA.green} stroke={WA.green} strokeWidth="1.2" strokeLinejoin="round" />
      <path
        d="M7.6 12.4l2.9 2.9 5.9-6.1"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const TICK_LABELS = {
  pending: "Sending",
  failed: "Not delivered",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
};

export function TickIcon({ state }) {
  if (!state) return null;
  const label = TICK_LABELS[state];
  if (state === "pending") {
    return <Clock size={12} strokeWidth={2.2} className="text-[#8696a0]" role="img" aria-label={label} />;
  }
  if (state === "failed") {
    return <CircleAlert size={14} strokeWidth={2.4} className="text-[#d93025]" role="img" aria-label={label} />;
  }
  if (state === "sent") {
    return <Check size={15} strokeWidth={2.2} className="text-[#8696a0]" role="img" aria-label={label} />;
  }
  return (
    <svg viewBox="0 0 18 12" width="17" height="11" role="img" aria-label={label} className="shrink-0">
      <g
        fill="none"
        stroke={state === "read" ? WA.tickRead : WA.muted}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1.4 6.5l3.1 3.1 6.4-7.1" />
        <path d="M7.4 8.4l1.2 1.2 6.4-7.1" />
      </g>
    </svg>
  );
}

// Bubble tail for the first bubble of a group. Outgoing: top-right, incoming: top-left.
export function BubbleTail({ side, color }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 8 13"
      width="8"
      height="13"
      className={`pointer-events-none absolute top-0 ${side === "right" ? "-right-[7px]" : "-left-[7px] -scale-x-100"}`}
    >
      <path d="M0 0h6.4c1.4 0 2.1 1.7 1.2 2.7L0 11V0z" fill={color} />
    </svg>
  );
}

export function TypingDots() {
  return (
    <span className="flex h-[19px] items-center gap-[5px] px-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <Motion.span
          key={i}
          className="block h-[7px] w-[7px] rounded-full bg-[#8696a0]"
          animate={{ opacity: [0.35, 1, 0.35], y: [0, -2.5, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.16 }}
        />
      ))}
    </span>
  );
}

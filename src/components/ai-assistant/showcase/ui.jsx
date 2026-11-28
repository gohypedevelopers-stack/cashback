"use client";

import { motion as Motion } from "framer-motion";

export const DISPLAY_FONT = '"Space Grotesk", "Manrope", sans-serif';
export const displayFont = { fontFamily: DISPLAY_FONT };
export const INK = "#0b1220";

export const FOCUS_DARK =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1220]";
export const FOCUS_LIGHT =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--acc)] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

export const BUTTONS = {
  whatsapp: `inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-[15px] font-semibold text-[#052e1a] shadow-[0_12px_32px_-12px_rgba(37,211,102,0.7)] transition-colors hover:bg-[#3ee27f] ${FOCUS_DARK}`,
  ghostDark: `inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/6 ${FOCUS_DARK}`,
  ink: `inline-flex items-center justify-center gap-2 rounded-full bg-[#0b1220] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(11,18,32,0.6)] transition-colors hover:bg-[#1a2438] ${FOCUS_LIGHT}`,
  outline: `inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-semibold text-[#0b1220] ring-1 ring-inset ring-slate-300 transition-colors hover:bg-slate-50 ${FOCUS_LIGHT}`,
};

export function Container({ className = "", children }) {
  return <div className={`mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-10 ${className}`}>{children}</div>;
}

export function Eyebrow({ children, tone = "light", className = "" }) {
  return (
    <p
      className={`inline-flex items-center gap-2.5 text-[12.5px] font-semibold uppercase tracking-[0.16em] transition-colors ${
        tone === "dark" ? "text-[color:var(--acc-dark)]" : "text-[color:var(--acc-light)]"
      } ${className}`}
    >
      <span className="h-px w-6 bg-current opacity-70" aria-hidden="true" />
      {children}
    </p>
  );
}

export function SectionHeading({ id, eyebrow, title, lead, tone = "light", align = "left", className = "" }) {
  const dark = tone === "dark";
  return (
    <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""} ${className}`}>
      {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
      <h2
        id={id}
        className={`mt-4 text-[length:clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] ${
          dark ? "text-white" : "text-[#0b1220]"
        }`}
      >
        {title}
      </h2>
      {lead ? (
        <p className={`mt-5 text-[17px] leading-[1.65] sm:text-[18.5px] ${dark ? "text-slate-300" : "text-slate-600"}`}>{lead}</p>
      ) : null}
    </div>
  );
}

// Fade/slide in once when scrolled into view (MotionConfig reducedMotion="user"
// at the page root turns the slide off for people who prefer less motion).
export function Reveal({ children, delay = 0, y = 18, className = "" }) {
  return (
    <Motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </Motion.div>
  );
}

export function Shimmer({ className = "" }) {
  return <div aria-hidden="true" className={`rounded-xl bg-slate-200/80 motion-safe:animate-pulse ${className}`} />;
}

// Assured Rewards Labs mark: a conversation bubble with an "assured" check.
export function LogoMark({ size = 32 }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_16px_-6px_rgba(37,211,102,0.6)]"
      style={{ width: size, height: size, background: "linear-gradient(140deg, #25D366 0%, #128C7E 55%, #075E54 100%)" }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none">
        <path
          d="M7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V16h.5A2.5 2.5 0 0 1 5 13.5v-7A2.5 2.5 0 0 1 7.5 4z"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8.8 10.2l2.2 2.2 4.3-4.4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

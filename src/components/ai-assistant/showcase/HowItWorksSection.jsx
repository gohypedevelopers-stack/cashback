"use client";

import { useId } from "react";
import { useReducedMotion } from "framer-motion";
import {
  BookOpen,
  Brain,
  Calculator,
  CalendarCheck,
  Headset,
  LayoutDashboard,
  MessageCircle,
  Users,
  Webhook,
  Wrench,
  Zap,
} from "lucide-react";
import { Container, DISPLAY_FONT, Reveal, SectionHeading } from "./ui";

const BODY_FONT = '"Manrope", sans-serif';
const CYCLE_SECONDS = 7;

// Each pulse plays inside a window of one shared cycle, so the dots tell the
// story in order: message in -> tools -> reply out -> console -> takeover.
const PULSE = {
  in: "#25D366",
  out: "#e2e8f0",
  tool: "var(--acc-dark)",
};

const HORIZONTAL = {
  viewBox: "0 0 1200 500",
  nodes: [
    { key: "client", x: 16, y: 200, w: 172, h: 100, icon: MessageCircle, title: "Client", sub: "on WhatsApp", tone: "wa" },
    { key: "webhook", x: 232, y: 200, w: 172, h: 100, icon: Webhook, title: "Webhook", sub: "Meta Cloud API" },
    {
      key: "agent",
      x: 448,
      y: 170,
      w: 240,
      h: 160,
      icon: Brain,
      title: "AI agent",
      sub: "Claude · tool use",
      extra: "+ rules-engine fallback",
      tone: "agent",
    },
    { key: "kb", x: 356, y: 18, w: 200, h: 84, icon: BookOpen, title: "Knowledge (RAG)", sub: "approved content" },
    { key: "calc", x: 580, y: 18, w: 200, h: 84, icon: Calculator, title: "Calculators", sub: "SIP · goals · tax" },
    { key: "crm", x: 356, y: 398, w: 200, h: 84, icon: Users, title: "Lead CRM", sub: "profile · score" },
    { key: "cal", x: 580, y: 398, w: 200, h: 84, icon: CalendarCheck, title: "Advisor calendar", sub: "real slots · IST" },
    { key: "console", x: 732, y: 200, w: 204, h: 100, icon: LayoutDashboard, title: "Advisor console", sub: "every chat, live" },
    { key: "human", x: 980, y: 200, w: 204, h: 100, icon: Headset, title: "Human advisor", sub: "takes over anytime" },
  ],
  edges: [
    { key: "e1", d: "M188 250 H232", pulses: [{ start: 0, end: 0.08, color: PULSE.in }, { start: 0.7, end: 0.78, mode: "reverse", color: PULSE.out }] },
    { key: "e2", d: "M404 250 H448", pulses: [{ start: 0.08, end: 0.16, color: PULSE.in }, { start: 0.62, end: 0.7, mode: "reverse", color: PULSE.out }] },
    { key: "e3", d: "M520 170 C520 136 456 136 456 102", pulses: [{ start: 0.16, end: 0.34, mode: "roundtrip", color: PULSE.tool }] },
    { key: "e4", d: "M616 170 C616 136 680 136 680 102", pulses: [{ start: 0.24, end: 0.42, mode: "roundtrip", color: PULSE.tool }] },
    { key: "e5", d: "M520 330 C520 364 456 364 456 398", pulses: [{ start: 0.34, end: 0.52, mode: "roundtrip", color: PULSE.tool }] },
    { key: "e6", d: "M616 330 C616 364 680 364 680 398", pulses: [{ start: 0.42, end: 0.6, mode: "roundtrip", color: PULSE.tool }] },
    { key: "e7", d: "M688 250 H732", pulses: [{ start: 0.62, end: 0.7, color: PULSE.in }] },
    { key: "e8", d: "M936 250 H980", pulses: [{ start: 0.78, end: 0.86, color: PULSE.in }, { start: 0.88, end: 0.96, mode: "reverse", color: PULSE.out }] },
  ],
};

const VERTICAL = {
  viewBox: "0 0 360 808",
  nodes: [
    { key: "client", x: 40, y: 8, w: 280, h: 72, icon: MessageCircle, title: "Client", sub: "on WhatsApp", tone: "wa" },
    { key: "webhook", x: 40, y: 124, w: 280, h: 72, icon: Webhook, title: "Webhook", sub: "Meta Cloud API" },
    {
      key: "agent",
      x: 20,
      y: 240,
      w: 320,
      h: 104,
      icon: Brain,
      title: "AI agent",
      sub: "Claude · tool use",
      extra: "+ rules-engine fallback",
      tone: "agent",
    },
    { key: "console", x: 40, y: 612, w: 280, h: 72, icon: LayoutDashboard, title: "Advisor console", sub: "every chat, live" },
    { key: "human", x: 40, y: 728, w: 280, h: 72, icon: Headset, title: "Human advisor", sub: "takes over anytime" },
  ],
  tools: {
    x: 12,
    y: 388,
    w: 336,
    h: 180,
    tiles: [
      { key: "kb", x: 22, y: 424, icon: BookOpen, title: "Knowledge (RAG)" },
      { key: "calc", x: 186, y: 424, icon: Calculator, title: "Calculators" },
      { key: "crm", x: 22, y: 496, icon: Users, title: "Lead CRM" },
      { key: "cal", x: 186, y: 496, icon: CalendarCheck, title: "Advisor calendar" },
    ],
  },
  edges: [
    { key: "v1", d: "M180 80 V124", pulses: [{ start: 0, end: 0.1, color: PULSE.in }, { start: 0.7, end: 0.8, mode: "reverse", color: PULSE.out }] },
    { key: "v2", d: "M180 196 V240", pulses: [{ start: 0.1, end: 0.2, color: PULSE.in }, { start: 0.6, end: 0.7, mode: "reverse", color: PULSE.out }] },
    { key: "v3", d: "M180 344 V388", pulses: [{ start: 0.2, end: 0.6, mode: "roundtrip", color: PULSE.tool }] },
    { key: "v4", d: "M180 568 V612", pulses: [{ start: 0.6, end: 0.7, color: PULSE.in }] },
    { key: "v5", d: "M180 684 V728", pulses: [{ start: 0.78, end: 0.86, color: PULSE.in }, { start: 0.88, end: 0.96, mode: "reverse", color: PULSE.out }] },
  ],
};

const fmt = (n) => Number(n.toFixed(3));

function Pulse({ d, start, end, mode = "forward", color }) {
  let keyTimes;
  let keyPoints;
  if (mode === "roundtrip") {
    keyTimes = [0, start, (start + end) / 2, end, 1];
    keyPoints = [0, 0, 1, 0, 0];
  } else {
    keyTimes = [0, start, end, 1];
    keyPoints = mode === "reverse" ? [1, 1, 0, 0] : [0, 0, 1, 1];
  }
  const fade = 0.012;
  const opacityTimes = [0, start, start + fade, end - fade, end, 1];
  return (
    <circle r="4.5" opacity="0" style={{ fill: color }}>
      <animateMotion
        dur={`${CYCLE_SECONDS}s`}
        repeatCount="indefinite"
        path={d}
        calcMode="linear"
        keyPoints={keyPoints.join(";")}
        keyTimes={keyTimes.map(fmt).join(";")}
      />
      <animate
        attributeName="opacity"
        dur={`${CYCLE_SECONDS}s`}
        repeatCount="indefinite"
        values="0;0;1;1;0;0"
        keyTimes={opacityTimes.map(fmt).join(";")}
      />
    </circle>
  );
}

function DiagramNode({ node, gradientId, reduce }) {
  const Glyph = node.icon;
  const agent = node.tone === "agent";
  const wa = node.tone === "wa";
  const tile = agent ? 46 : 36;
  const tileX = node.x + (agent ? 20 : 16);
  const tileY = node.y + (node.h - tile) / 2;
  const textX = tileX + tile + (agent ? 16 : 12);
  const centerY = node.y + node.h / 2;
  return (
    <g>
      {agent && !reduce ? (
        <rect
          x={node.x - 6}
          y={node.y - 6}
          width={node.w + 12}
          height={node.h + 12}
          rx="26"
          fill="none"
          strokeWidth="1.5"
          style={{ stroke: "var(--acc-dark)" }}
        >
          <animate attributeName="stroke-opacity" values="0.1;0.55;0.1" dur="3.2s" repeatCount="indefinite" />
        </rect>
      ) : null}
      <rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        rx={agent ? 22 : 18}
        fill={agent ? `url(#${gradientId})` : "#111a2e"}
        strokeWidth={agent ? 1.5 : 1}
        style={{ stroke: agent ? "var(--acc-dark)" : "rgba(255,255,255,0.1)" }}
      />
      <rect
        x={tileX}
        y={tileY}
        width={tile}
        height={tile}
        rx={agent ? 13 : 10}
        fill={wa ? "rgba(37,211,102,0.14)" : "rgba(255,255,255,0.06)"}
      />
      <Glyph
        x={tileX + (tile - (agent ? 24 : 20)) / 2}
        y={tileY + (tile - (agent ? 24 : 20)) / 2}
        size={agent ? 24 : 20}
        strokeWidth={2}
        style={{ color: wa ? "#25D366" : "var(--acc-dark)" }}
        aria-hidden="true"
      />
      {agent ? (
        <>
          <text x={textX} y={centerY - 12} fill="#ffffff" fontSize="19" fontWeight="600" fontFamily={DISPLAY_FONT}>
            {node.title}
          </text>
          <text x={textX} y={centerY + 10} fill="#cbd5e1" fontSize="13.5" fontFamily={BODY_FONT}>
            {node.sub}
          </text>
          <text x={textX} y={centerY + 30} fill="#94a3b8" fontSize="12" fontFamily={BODY_FONT}>
            {node.extra}
          </text>
        </>
      ) : (
        <>
          <text x={textX} y={centerY - 3} fill="#ffffff" fontSize="15" fontWeight="600" fontFamily={DISPLAY_FONT}>
            {node.title}
          </text>
          <text x={textX} y={centerY + 16} fill="#94a3b8" fontSize="12.5" fontFamily={BODY_FONT}>
            {node.sub}
          </text>
        </>
      )}
    </g>
  );
}

function ToolsGroup({ tools }) {
  return (
    <g>
      <rect
        x={tools.x}
        y={tools.y}
        width={tools.w}
        height={tools.h}
        rx="20"
        fill="rgba(255,255,255,0.02)"
        stroke="rgba(255,255,255,0.12)"
        strokeDasharray="4 5"
      />
      <text x={tools.x + 12} y={tools.y + 24} fill="#94a3b8" fontSize="12" fontWeight="600" fontFamily={BODY_FONT} letterSpacing="1.2">
        TOOLS THE AGENT CALLS
      </text>
      {tools.tiles.map((tile) => {
        const Glyph = tile.icon;
        return (
          <g key={tile.key}>
            <rect x={tile.x} y={tile.y} width="152" height="60" rx="14" fill="#111a2e" stroke="rgba(255,255,255,0.1)" />
            <Glyph x={tile.x + 12} y={tile.y + 21} size={18} strokeWidth={2} style={{ color: "var(--acc-dark)" }} aria-hidden="true" />
            <text x={tile.x + 38} y={tile.y + 35} fill="#ffffff" fontSize="12.5" fontWeight="600" fontFamily={DISPLAY_FONT}>
              {tile.title}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Diagram({ layout, reduce }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradientId = `${uid}-agent`;
  return (
    <svg viewBox={layout.viewBox} className="block h-auto w-full" role="img" aria-labelledby={`${uid}-title ${uid}-desc`}>
      <title id={`${uid}-title`}>How the AI WhatsApp Concierge works</title>
      <desc id={`${uid}-desc`}>
        A client message travels from WhatsApp through Meta&apos;s Cloud API webhook to the AI agent, built on Claude. The agent
        calls tools — knowledge search, financial calculators, the lead CRM and the advisor calendar — and replies on WhatsApp.
        Every conversation streams to the advisor console, where a human advisor can take over.
      </desc>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#18284a" />
          <stop offset="1" stopColor="#0f1a30" />
        </linearGradient>
      </defs>
      {layout.edges.map((edge) => (
        <path key={edge.key} d={edge.d} fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="1.5" strokeLinecap="round" />
      ))}
      {layout.tools ? <ToolsGroup tools={layout.tools} /> : null}
      {reduce
        ? null
        : layout.edges.flatMap((edge) =>
            edge.pulses.map((pulse, index) => <Pulse key={`${edge.key}-${index}`} d={edge.d} {...pulse} />),
          )}
      {layout.nodes.map((node) => (
        <DiagramNode key={node.key} node={node} gradientId={gradientId} reduce={reduce} />
      ))}
    </svg>
  );
}

const CAPTIONS = [
  {
    key: "arrive",
    icon: <Zap size={18} aria-hidden="true" />,
    title: "Arrives in real time",
    body: "Messages reach the agent through Meta's WhatsApp Cloud API and a signed webhook — the app your clients already use.",
  },
  {
    key: "think",
    icon: <BookOpen size={18} aria-hidden="true" />,
    title: "Thinks with your knowledge",
    body: "It retrieves from your approved content and runs calculators before answering, so figures are computed, not guessed.",
  },
  {
    key: "act",
    icon: <Wrench size={18} aria-hidden="true" />,
    title: "Acts, not just chats",
    body: "It builds the lead profile as the client talks and books real advisor slots — never the same slot twice.",
  },
  {
    key: "people",
    icon: <Headset size={18} aria-hidden="true" />,
    title: "People stay in charge",
    body: "Advisors watch every conversation live in the console and can take over at any moment.",
  },
];

export default function HowItWorksSection() {
  const reduce = Boolean(useReducedMotion());
  return (
    <section id="how" aria-labelledby="how-title" className="relative scroll-mt-16 overflow-hidden bg-[#0b1220] py-20 text-white sm:py-24 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[1200px] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(37,211,102,0.08), transparent)" }}
      />
      <Container className="relative">
        <SectionHeading
          id="how-title"
          tone="dark"
          eyebrow="How it works"
          title="One engine, from WhatsApp to your advisors."
          lead="Built on Meta's WhatsApp Cloud API and Claude. Every message runs through the same pipeline — retrieval, tools, guardrails — and lands in a console your advisors can act on."
        />
        <div className="mt-14 grid items-center gap-10 md:grid-cols-[minmax(0,400px)_minmax(0,1fr)] xl:grid-cols-1">
          <Reveal>
            <figure className="rounded-[28px] bg-white/2 p-4 ring-1 ring-inset ring-white/10 sm:p-6 xl:p-8">
              <div className="hidden xl:block">
                <Diagram layout={HORIZONTAL} reduce={reduce} />
              </div>
              <div className="mx-auto max-w-[400px] xl:hidden">
                <Diagram layout={VERTICAL} reduce={reduce} />
              </div>
            </figure>
          </Reveal>
          <ul className="grid gap-6 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-4">
            {CAPTIONS.map((caption, index) => (
              <li key={caption.key}>
                <Reveal delay={index * 0.06}>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/6 text-[color:var(--acc-dark)] ring-1 ring-inset ring-white/10">
                    {caption.icon}
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.01em] text-white">{caption.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-400">{caption.body}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

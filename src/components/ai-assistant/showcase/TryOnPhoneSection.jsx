"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CalendarCheck, Check, Copy, ExternalLink, LayoutDashboard, MessageCircle } from "lucide-react";
import { safeHttpUrl } from "@/components/ai-assistant/simulator/simulatorUtils";
import TenantSwitcher from "./TenantSwitcher";
import { tenantShortName } from "./showcaseUtils";
import { BUTTONS, Container, FOCUS_DARK, SectionHeading, Shimmer } from "./ui";

const STEPS = [
  {
    key: "chat",
    icon: <MessageCircle size={18} aria-hidden="true" />,
    title: "Chat as a client",
    body: "Ask about SIPs, tax-saving or retirement — in English, Hindi or Hinglish.",
  },
  {
    key: "book",
    icon: <CalendarCheck size={18} aria-hidden="true" />,
    title: "Say you're ready to invest",
    body: "Pick a slot and get a confirmation you can add to your calendar.",
  },
  {
    key: "console",
    icon: <LayoutDashboard size={18} aria-hidden="true" />,
    title: "Watch it land in the console",
    body: "The conversation, lead score and booking appear for the advisor team as they happen.",
  },
];

export default function TryOnPhoneSection({ status, tenants, tenant, onSelectTenant }) {
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const whatsappLink = safeHttpUrl(tenant?.whatsapp?.link);
  const displayNumber = tenant?.whatsapp?.displayNumber || "";
  const simulatorLink = tenant ? `${origin}/ai-assistant/try?t=${encodeURIComponent(tenant.key)}` : `${origin}/ai-assistant/try`;
  const link = whatsappLink || simulatorLink;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="try" aria-labelledby="try-title" className="scroll-mt-16 bg-white py-20 sm:py-24 lg:py-28">
      <Container className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div>
          <SectionHeading
            id="try-title"
            eyebrow="On your phone"
            title="Try it on your phone"
            lead={
              whatsappLink
                ? "Scan the code to chat with the assistant on WhatsApp — the same engine you just watched."
                : "Scan the code to open the WhatsApp-style simulator on your phone. No app, no sign-up — the same engine you just watched."
            }
          />
          <ul className="mt-10 space-y-6">
            {STEPS.map((step) => (
              <li key={step.key} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--acc-soft)] text-[color:var(--acc-light)] transition-colors">
                  {step.icon}
                </span>
                <div>
                  <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-[#0b1220]">{step.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ul>
          {status === "ready" && tenants.length > 1 ? (
            <div className="mt-10">
              <p className="mb-2 text-[12.5px] font-semibold text-slate-500">Which assistant?</p>
              <TenantSwitcher tenants={tenants} value={tenant?.key} onChange={onSelectTenant} label="Choose the assistant for the QR code" />
            </div>
          ) : null}
        </div>

        <div className="mx-auto w-full max-w-[420px]">
          <div className="relative overflow-hidden rounded-[32px] bg-[#0b1220] p-7 text-center text-white shadow-[0_40px_90px_-40px_rgba(11,18,32,0.7)] ring-1 ring-white/10 sm:p-9">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full"
              style={{ background: "radial-gradient(closest-side, var(--acc-glow), transparent)" }}
            />
            {status === "loading" ? (
              <Shimmer className="relative mx-auto h-[240px] w-[240px] rounded-[24px] bg-white/10" />
            ) : (
              <div className="relative mx-auto w-fit rounded-[24px] bg-white p-4 ring-4 ring-[color:var(--acc-ring)] transition-shadow">
                <QRCodeSVG
                  value={link}
                  size={208}
                  level="M"
                  marginSize={0}
                  bgColor="#ffffff"
                  fgColor="#0b1220"
                  title={whatsappLink ? "QR code to chat on WhatsApp" : "QR code to open the simulator on your phone"}
                  className="block h-auto w-[min(208px,60vw)]"
                />
              </div>
            )}
            <p className="relative mt-7 text-[18px] font-semibold tracking-[-0.01em]">
              {whatsappLink ? "Scan to chat on WhatsApp" : "Scan to open on your phone"}
            </p>
            <p className="relative mt-1 text-[14px] text-slate-400">
              {tenant ? `${tenantShortName(tenant)} · ${tenant.isDemo ? "concept demo" : "live assistant"}` : "AI WhatsApp Concierge"}
            </p>
            {whatsappLink && displayNumber ? (
              <p className="relative mt-3 font-mono text-[15px] tracking-wide text-white">{displayNumber}</p>
            ) : null}
            <div className="relative mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <a href={link} target="_blank" rel="noopener noreferrer" className={`${BUTTONS.whatsapp} py-2.5 text-[14px]`}>
                <ExternalLink size={16} aria-hidden="true" /> {whatsappLink ? "Open WhatsApp" : "Open link"}
              </a>
              <button
                type="button"
                onClick={copy}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/6 ${FOCUS_DARK}`}
              >
                {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
            <p className="sr-only" aria-live="polite">
              {copied ? "Link copied to the clipboard" : ""}
            </p>
            <p className="relative mt-6 break-all font-mono text-[12px] leading-relaxed text-slate-500">{link}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

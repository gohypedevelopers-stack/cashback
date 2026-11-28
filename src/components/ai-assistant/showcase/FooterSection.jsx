"use client";

import Link from "next/link";
import { Container, displayFont, FOCUS_DARK, LogoMark } from "./ui";

const LINK = `rounded text-slate-300 transition-colors hover:text-white ${FOCUS_DARK}`;

export default function FooterSection({ tenant, tryHref }) {
  const year = new Date().getFullYear();
  const disclaimer = tenant?.disclaimer ? String(tenant.disclaimer) : "";
  return (
    <footer className="bg-[#0b1220] text-slate-400">
      <Container className="py-14">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark size={36} />
            <div>
              <p className="text-[16px] font-semibold text-white" style={displayFont}>
                Assured Rewards Labs
              </p>
              <p className="text-[13px] text-slate-400">AI WhatsApp Concierge</p>
            </div>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-3 text-[14px]">
            <a href="#demo" className={LINK}>
              Live demo
            </a>
            <a href="#how" className={LINK}>
              How it works
            </a>
            <a href="#bajaj" className={LINK}>
              For Bajaj Capital
            </a>
            <Link href="/ai-assistant/console" className={LINK}>
              Advisor console
            </Link>
            <Link href={tryHref} className={LINK}>
              Try on your phone
            </Link>
          </nav>
        </div>
        <div className="mt-10 space-y-3 border-t border-white/10 pt-8 text-[13.5px] leading-relaxed">
          <p className="font-medium text-slate-200">
            Concept demo prepared for Bajaj Capital by Assured Rewards. Not an official Bajaj Capital product.
          </p>
          <p>Mutual Fund investments are subject to market risks, read all scheme related documents carefully.</p>
          {disclaimer ? <p>{disclaimer}</p> : null}
          <p className="text-slate-500">
            © {year} Assured Rewards. Conversations shown on this page are illustrations or live demo chats, not client data.
          </p>
        </div>
      </Container>
    </footer>
  );
}

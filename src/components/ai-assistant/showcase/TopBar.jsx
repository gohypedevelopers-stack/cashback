"use client";

import Link from "next/link";
import { LayoutDashboard, Smartphone } from "lucide-react";
import { Container, displayFont, FOCUS_DARK, LogoMark } from "./ui";

const NAV = [
  { href: "#demo", label: "Live demo" },
  { href: "#how", label: "How it works" },
  { href: "#bajaj", label: "For Bajaj Capital" },
];

export default function TopBar({ tryHref }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1220]/85 backdrop-blur-xl">
      <Container className="flex h-16 items-center gap-3">
        <a href="#top" className={`flex min-w-0 items-center gap-3 rounded-lg ${FOCUS_DARK}`}>
          <LogoMark size={32} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[14px] font-semibold tracking-[-0.01em] text-white sm:text-[15px]" style={displayFont}>
              Assured Rewards Labs
            </span>
            <span className="block truncate text-[12px] font-medium text-slate-400 sm:hidden">AI WhatsApp Concierge</span>
          </span>
          <span className="hidden h-5 w-px shrink-0 bg-white/15 sm:block" aria-hidden="true" />
          <span className="hidden truncate text-[14px] font-medium text-slate-300 sm:block">AI WhatsApp Concierge</span>
        </a>

        <nav className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2" aria-label="Page">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`hidden rounded-full px-3 py-2 text-[14px] font-medium text-slate-300 transition-colors hover:text-white xl:inline-flex ${FOCUS_DARK}`}
            >
              {item.label}
            </a>
          ))}
          <Link
            href="/ai-assistant/console"
            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-2 text-[14px] font-medium text-slate-200 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/6 hover:text-white sm:px-3.5 ${FOCUS_DARK}`}
          >
            <LayoutDashboard size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Advisor console</span>
            <span className="sr-only sm:hidden">Advisor console</span>
          </Link>
          <a
            href="#try"
            className={`hidden items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-[#0b1220] transition-colors hover:bg-slate-100 md:inline-flex ${FOCUS_DARK}`}
          >
            <Smartphone size={16} aria-hidden="true" />
            Try on your phone
          </a>
          <Link
            href={tryHref}
            className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13.5px] font-semibold text-[#0b1220] transition-colors hover:bg-slate-100 md:hidden ${FOCUS_DARK}`}
          >
            <Smartphone size={15} aria-hidden="true" />
            Try it
          </Link>
        </nav>
      </Container>
    </header>
  );
}

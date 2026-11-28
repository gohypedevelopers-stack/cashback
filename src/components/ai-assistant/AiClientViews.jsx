"use client";

// The AI assistant pages talk to the live backend and use browser-only APIs
// (localStorage, polling), so they render only in the browser — the same pattern
// as src/components/next/ClientViews.jsx.

import dynamic from "next/dynamic";

const Loading = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#0b141a]">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
  </div>
);

export const AiShowcaseView = dynamic(() => import("@/components/ai-assistant/showcase/AiShowcase"), {
  ssr: false,
  loading: Loading,
});

export const AiTryView = dynamic(() => import("@/components/ai-assistant/showcase/AiTryPage"), {
  ssr: false,
  loading: Loading,
});

export const AiConsoleView = dynamic(() => import("@/components/ai-assistant/console/AiConsole"), {
  ssr: false,
  loading: Loading,
});

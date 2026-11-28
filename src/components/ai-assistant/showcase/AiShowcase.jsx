"use client";

// /ai-assistant — the page a prospect sees first: hero, live demo (phone
// simulator + "AI brain" trace + live lead card), architecture, capabilities,
// our own use case, the Bajaj Capital story, QR hand-off and disclaimers.

import { useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig, useReducedMotion } from "framer-motion";
import { aiPublic } from "@/lib/aiAssistantApi";
import { brandTheme, themeVars } from "@/components/ai-assistant/simulator/brandTheme";
import BajajSection from "./BajajSection";
import CapabilitiesSection from "./CapabilitiesSection";
import FooterSection from "./FooterSection";
import HeroSection from "./HeroSection";
import HowItWorksSection from "./HowItWorksSection";
import LiveDemoSection from "./LiveDemoSection";
import RunItOurselvesSection from "./RunItOurselvesSection";
import { findBooking, findTenant, lastTurnFromHistory, orderTenants, pickDefaultTenant } from "./showcaseUtils";
import TopBar from "./TopBar";
import TryOnPhoneSection from "./TryOnPhoneSection";

const without = (map, key) => {
  if (!(key in map)) return map;
  const next = { ...map };
  delete next[key];
  return next;
};

export default function AiShowcase() {
  const reduceMotion = useReducedMotion();
  const [load, setLoad] = useState({ status: "loading", tenants: [], llm: null, defaultTenant: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const [selectedKey, setSelectedKey] = useState(null);
  const [turns, setTurns] = useState({}); // tenantKey -> { id, result, restored }
  const [bookings, setBookings] = useState({}); // tenantKey -> payload.booking
  const [pending, setPending] = useState({}); // tenantKey -> boolean
  const simulatorRef = useRef(null);
  const turnSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    aiPublic
      .getTenants()
      .then((response) => {
        if (cancelled) return;
        const tenants = Array.isArray(response?.tenants) ? response.tenants.filter((t) => t && t.key) : [];
        setLoad({
          status: tenants.length ? "ready" : "empty",
          tenants,
          llm: response?.llm || null,
          defaultTenant: response?.defaultTenant || null,
          error: null,
        });
      })
      .catch((error) => {
        if (!cancelled) setLoad((state) => ({ ...state, status: "error", error }));
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = () => {
    setLoad((state) => ({ ...state, status: "loading", error: null }));
    setAttempt((n) => n + 1);
  };

  const tenants = useMemo(() => orderTenants(load.tenants), [load.tenants]);
  const tenant = findTenant(tenants, selectedKey) || pickDefaultTenant(tenants, load.defaultTenant);
  const tenantKey = tenant?.key || null;
  const wealthTenant = tenants.find((t) => t.vertical === "wealth") || null;
  const theme = useMemo(() => brandTheme(tenant?.brand), [tenant?.brand]);
  const liveTenant = tenants.find((t) => !t.isDemo) || null;

  const recordTurn = (key, result) => {
    turnSeq.current += 1;
    const id = `${result?.trace?.turnId || "turn"}-${turnSeq.current}`;
    setTurns((prev) => ({ ...prev, [key]: { id, result, restored: false } }));
    const booking = findBooking(result?.replies);
    if (booking) setBookings((prev) => ({ ...prev, [key]: booking }));
  };

  const recordSync = (key, { source, messages } = {}) => {
    const booking = findBooking(messages);
    if (booking) setBookings((prev) => ({ ...prev, [key]: booking }));
    if (source !== "history") return;
    const restored = lastTurnFromHistory(messages);
    if (!restored) return;
    setTurns((prev) =>
      prev[key] ? prev : { ...prev, [key]: { id: `restored-${restored.trace?.turnId || key}`, result: restored, restored: true } },
    );
  };

  const clearTenant = (key) => {
    setTurns((prev) => without(prev, key));
    setBookings((prev) => without(prev, key));
  };

  const scrollToDemo = () => {
    document.getElementById("demo")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  const tryLiveTenant = () => {
    if (liveTenant) setSelectedKey(liveTenant.key);
    scrollToDemo();
  };

  const tryPrompt = (text) => {
    simulatorRef.current?.sendText(text);
  };

  const tryHref = tenantKey ? `/ai-assistant/try?t=${encodeURIComponent(tenantKey)}` : "/ai-assistant/try";

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen overflow-x-clip bg-white text-slate-900 antialiased" style={themeVars(theme)}>
        <a
          href="#demo"
          className="sr-only rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-[#0b1220] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:outline-none focus:ring-2 focus:ring-[#25D366]"
        >
          Skip to the live demo
        </a>
        <TopBar tryHref={tryHref} />
        <main>
          <HeroSection tenant={wealthTenant} />
          <LiveDemoSection
            status={load.status}
            error={load.error}
            onRetry={retry}
            tenants={tenants}
            tenant={tenant}
            llm={load.llm}
            onSelectTenant={setSelectedKey}
            turn={tenantKey ? turns[tenantKey] || null : null}
            pending={tenantKey ? Boolean(pending[tenantKey]) : false}
            booking={tenantKey ? bookings[tenantKey] || null : null}
            simulatorRef={simulatorRef}
            onTurn={(result) => recordTurn(tenantKey, result)}
            onSync={(payload) => recordSync(tenantKey, payload)}
            onReset={() => clearTenant(tenantKey)}
            onPendingChange={(busy) => setPending((prev) => ({ ...prev, [tenantKey]: busy }))}
            onTry={tryPrompt}
          />
          <HowItWorksSection />
          <CapabilitiesSection />
          <RunItOurselvesSection onTryLive={tryLiveTenant} canTryLive={Boolean(liveTenant)} />
          <BajajSection />
          <TryOnPhoneSection status={load.status} tenants={tenants} tenant={tenant} onSelectTenant={setSelectedKey} />
        </main>
        <FooterSection tenant={tenant} tryHref={tryHref} />
      </div>
    </MotionConfig>
  );
}

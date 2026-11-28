"use client";

// /ai-assistant/try?t=<tenantKey> — mobile-first fullscreen simulator (the QR
// code on the showcase points here). Without a valid ?t= it shows a small
// assistant picker.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MotionConfig } from "framer-motion";
import { ArrowLeft, ChevronRight, CircleAlert, RefreshCw } from "lucide-react";
import { aiPublic } from "@/lib/aiAssistantApi";
import { brandTheme } from "@/components/ai-assistant/simulator/brandTheme";
import { VerifiedBadge } from "@/components/ai-assistant/simulator/SimIcons";
import WhatsAppSimulator from "@/components/ai-assistant/simulator/WhatsAppSimulator";
import { initials } from "@/components/ai-assistant/shared/format";
import { findTenant, orderTenants } from "./showcaseUtils";
import { displayFont, FOCUS_DARK, LogoMark } from "./ui";

const SCREEN = "min-h-[100dvh] bg-[#0b141a] text-white";

function FullScreenLoader() {
  return (
    <div className={`${SCREEN} flex items-center justify-center`} role="status" aria-label="Loading the assistant">
      <span className="h-8 w-8 rounded-full border-4 border-[#25D366] border-t-transparent motion-safe:animate-spin" />
    </div>
  );
}

function FullScreenError({ error, onRetry }) {
  return (
    <div className={`${SCREEN} flex items-center justify-center px-6`} role="alert">
      <div className="max-w-sm text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/6 text-rose-300 ring-1 ring-inset ring-white/10">
          <CircleAlert size={26} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.01em]">The assistant isn&apos;t responding</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-400">
          We couldn&apos;t reach the assistant service. Check your connection and try again.
        </p>
        {error?.message ? <p className="mt-3 break-words font-mono text-[12px] text-slate-500">{error.message}</p> : null}
        <button
          type="button"
          onClick={onRetry}
          className={`mt-7 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-[15px] font-semibold text-[#052e1a] ${FOCUS_DARK}`}
        >
          <RefreshCw size={16} aria-hidden="true" /> Try again
        </button>
      </div>
    </div>
  );
}

function TenantPicker({ tenants, invalidKey, onChoose }) {
  return (
    <div className={SCREEN} style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pb-8 pt-8">
        <div className="flex items-center gap-3">
          <LogoMark size={34} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold" style={displayFont}>
              Assured Rewards Labs
            </p>
            <p className="text-[13px] text-slate-400">AI WhatsApp Concierge</p>
          </div>
        </div>

        <h1 className="mt-10 text-[30px] font-semibold leading-tight tracking-[-0.02em]">Choose an assistant</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-400">
          {invalidKey
            ? "That link points to an assistant we couldn't find. Pick one below."
            : "Chat in a WhatsApp-style simulator — no app or sign-up needed."}
        </p>

        <ul className="mt-8 space-y-3">
          {tenants.map((tenant) => {
            const theme = brandTheme(tenant.brand);
            return (
              <li key={tenant.key}>
                <button
                  type="button"
                  onClick={() => onChoose(tenant.key)}
                  className={`flex w-full items-center gap-4 rounded-2xl bg-white/4 p-4 text-left ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/7 ${FOCUS_DARK}`}
                >
                  <span
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[15px] font-bold"
                    style={{ backgroundColor: theme.primary, color: theme.onPrimary }}
                    aria-hidden="true"
                  >
                    {tenant.brand?.avatarInitials || initials(tenant.name, "AI")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[16px] font-semibold">
                      <span className="truncate">{tenant.name}</span>
                      <VerifiedBadge size={15} />
                    </span>
                    {tenant.tagline ? (
                      <span className="mt-0.5 block text-[13.5px] leading-snug text-slate-400">{tenant.tagline}</span>
                    ) : null}
                    <span
                      className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset ${
                        tenant.isDemo ? "bg-amber-300/10 text-amber-200 ring-amber-300/25" : "bg-emerald-300/10 text-emerald-200 ring-emerald-300/25"
                      }`}
                    >
                      {tenant.isDemo ? tenant.demoLabel || "Concept demo" : "Live assistant"}
                    </span>
                  </span>
                  <ChevronRight size={20} className="shrink-0 text-slate-500" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto pt-12 text-center text-[13px] leading-relaxed text-slate-500">
          <Link href="/ai-assistant" className={`inline-flex items-center gap-1.5 rounded font-semibold text-slate-300 hover:text-white ${FOCUS_DARK}`}>
            <ArrowLeft size={15} aria-hidden="true" /> See the full demo
          </Link>
          <p className="mt-4">Concept demo prepared for Bajaj Capital by Assured Rewards. Not an official Bajaj Capital product.</p>
        </div>
      </div>
    </div>
  );
}

function DesktopCaption() {
  return (
    <div className="pointer-events-none fixed left-6 top-6 z-20 hidden max-w-[240px] xl:block">
      <div className="pointer-events-auto flex items-center gap-3">
        <LogoMark size={34} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-white" style={displayFont}>
            Assured Rewards Labs
          </p>
          <p className="text-[13px] text-slate-400">AI WhatsApp Concierge</p>
        </div>
      </div>
      <Link
        href="/ai-assistant"
        className={`pointer-events-auto mt-6 inline-flex items-center gap-1.5 rounded text-[14px] font-semibold text-slate-300 hover:text-white ${FOCUS_DARK}`}
      >
        <ArrowLeft size={15} aria-hidden="true" /> Back to the demo page
      </Link>
    </div>
  );
}

function TryPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // ?t= is the short form used in QR codes; ?tenant= comes from the advisor console's "Chat as a customer" link.
  const requestedKey = searchParams.get("t") || searchParams.get("tenant") || "";
  const [load, setLoad] = useState({ status: "loading", tenants: [], error: null });
  const [attempt, setAttempt] = useState(0);
  const [pickedKey, setPickedKey] = useState(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    aiPublic
      .getTenants()
      .then((response) => {
        if (cancelled) return;
        const tenants = Array.isArray(response?.tenants) ? response.tenants.filter((t) => t && t.key) : [];
        setLoad({ status: "ready", tenants, error: null });
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

  const choose = (key) => {
    setPickedKey(key);
    setPicking(false);
    router.replace(`/ai-assistant/try?t=${encodeURIComponent(key)}`, { scroll: false });
  };

  if (load.status === "loading") return <FullScreenLoader />;
  if (load.status === "error") return <FullScreenError error={load.error} onRetry={retry} />;

  const tenants = orderTenants(load.tenants);
  const tenant =
    findTenant(tenants, pickedKey || requestedKey) || (!requestedKey && tenants.length === 1 ? tenants[0] : null);

  if (!tenant || picking) {
    return <TenantPicker tenants={tenants} invalidKey={!picking && Boolean(requestedKey) && !tenant} onChoose={choose} />;
  }

  return (
    <>
      <DesktopCaption />
      <WhatsAppSimulator
        tenant={tenant}
        variant="fullscreen"
        onBack={tenants.length > 1 ? () => setPicking(true) : undefined}
      />
    </>
  );
}

export default function AiTryPage() {
  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<FullScreenLoader />}>
        <TryPageContent />
      </Suspense>
    </MotionConfig>
  );
}

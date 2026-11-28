"use client";

import { CircleAlert, RefreshCw } from "lucide-react";
import WhatsAppSimulator from "@/components/ai-assistant/simulator/WhatsAppSimulator";
import BrainPanel from "./BrainPanel";
import LeadPanel, { BookingCallout } from "./LeadPanel";
import TenantSwitcher from "./TenantSwitcher";
import { BUTTONS, Container, SectionHeading, Shimmer } from "./ui";

function DemoSkeleton() {
  return (
    <div className="mt-12 grid gap-10 lg:grid-cols-[380px_minmax(0,1fr)] xl:gap-14" role="status" aria-label="Loading the live demo">
      <div className="mx-auto w-full max-w-[380px]">
        <div className="rounded-[52px] bg-slate-200/70 p-[10px]">
          <Shimmer className="h-[640px] rounded-[42px] bg-slate-100" />
        </div>
      </div>
      <div className="grid content-start gap-6">
        <div className="rounded-[28px] bg-[#0b1220] p-6 ring-1 ring-white/10">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 rounded-full bg-white/10 motion-safe:animate-pulse" />
            <div className="h-7 w-40 rounded-full bg-white/10 motion-safe:animate-pulse" />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-white/6 motion-safe:animate-pulse" />
            ))}
          </div>
          <div className="mt-8 space-y-3">
            {[90, 70, 80].map((w) => (
              <div key={w} className="h-3 rounded-full bg-white/6 motion-safe:animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
        <Shimmer className="h-48 rounded-[28px]" />
      </div>
    </div>
  );
}

function DemoError({ error, empty, onRetry }) {
  return (
    <div className="mt-12 rounded-[28px] bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(16,24,40,0.05)] ring-1 ring-slate-200 sm:px-12" role="alert">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-100">
        <CircleAlert size={26} aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-[22px] font-semibold tracking-[-0.01em] text-[#0b1220]">
        {empty ? "No assistants are configured yet" : "The assistant service isn't responding"}
      </h3>
      <p className="mx-auto mt-2 max-w-lg text-[15px] leading-relaxed text-slate-600">
        {empty
          ? "The backend answered but returned no assistants. Check the AI assistant tenants on the server, then retry."
          : "We couldn't load the live demo from the backend. Everything else on this page still works — retry in a moment."}
      </p>
      {error?.message ? (
        <p className="mx-auto mt-4 max-w-lg break-words rounded-lg bg-slate-50 px-3 py-2 font-mono text-[12.5px] text-slate-500 ring-1 ring-inset ring-slate-200">
          {error.message}
        </p>
      ) : null}
      <button type="button" onClick={onRetry} className={`${BUTTONS.ink} mt-7`}>
        <RefreshCw size={16} aria-hidden="true" /> Retry
      </button>
    </div>
  );
}

function TenantContext({ tenant }) {
  const demo = Boolean(tenant?.isDemo);
  return (
    <div className="mx-auto mb-6 max-w-[380px] text-center">
      <p
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12.5px] font-semibold ring-1 ring-inset ${
          demo ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${demo ? "bg-amber-500" : "bg-emerald-500"}`} aria-hidden="true" />
        {demo ? tenant?.demoLabel || "Concept demo" : "Live assistant"}
      </p>
      {tenant?.tagline ? <p className="mt-2 text-[14px] leading-snug text-slate-600">{tenant.tagline}</p> : null}
    </div>
  );
}

export default function LiveDemoSection({
  status,
  error,
  onRetry,
  tenants,
  tenant,
  llm,
  onSelectTenant,
  turn,
  pending,
  booking,
  simulatorRef,
  onTurn,
  onSync,
  onReset,
  onPendingChange,
  onTry,
}) {
  const ready = status === "ready" && tenant;
  return (
    <section id="demo" aria-labelledby="demo-title" className="scroll-mt-16 bg-slate-50 py-20 sm:py-24 lg:py-28">
      <Container>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            id="demo-title"
            eyebrow="Live demo"
            title="Talk to it. Watch it think."
            lead="This is the working engine, not a recording. Every reply is generated live — and the panel beside the phone shows exactly what the assistant did to produce it."
          />
          {ready && tenants.length > 1 ? (
            <div className="shrink-0">
              <p className="mb-2 text-[12.5px] font-semibold text-slate-500">Switch assistant</p>
              <TenantSwitcher tenants={tenants} value={tenant.key} onChange={onSelectTenant} label="Choose which assistant to demo" />
            </div>
          ) : null}
        </div>

        {status === "loading" ? <DemoSkeleton /> : null}
        {status === "error" || status === "empty" ? <DemoError error={error} empty={status === "empty"} onRetry={onRetry} /> : null}

        {ready ? (
          <div className="mt-12 grid gap-10 lg:grid-cols-[380px_minmax(0,1fr)] xl:gap-14">
            <div className="min-w-0">
              <TenantContext tenant={tenant} />
              <WhatsAppSimulator
                ref={simulatorRef}
                tenant={tenant}
                variant="phone"
                onTurn={onTurn}
                onSync={onSync}
                onReset={onReset}
                onPendingChange={onPendingChange}
              />
              <p className="mx-auto mt-5 max-w-[380px] text-center text-[13px] leading-relaxed text-slate-500">
                Each assistant keeps its own chat on this device. Use the ⋮ menu to reset.
              </p>
            </div>
            <div className="grid min-w-0 content-start gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
              <BrainPanel tenant={tenant} llm={llm} turn={turn} pending={pending} onTry={onTry} />
              <div className="grid min-w-0 content-start gap-6">
                {booking ? <BookingCallout booking={booking} /> : null}
                <LeadPanel turn={turn} tenant={tenant} />
              </div>
            </div>
          </div>
        ) : null}
      </Container>
    </section>
  );
}

// "Why the AI said this" — renders the per-turn Trace (ARCHITECTURE.md §6.2).

import { useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  CircleCheck,
  CircleX,
  Cpu,
  Gauge,
  ShieldCheck,
  Sparkles,
  Target,
  Wrench,
} from "lucide-react";
import { STAGE_BY_KEY, formatDuration, formatNumber, formatUSD, toolLabel } from "@/components/ai-assistant/shared/format";
import { Badge, cx, focusRing } from "../ui";
import { fallbackReasonLabel, guardrailLabel, humanize, prettyModel } from "../lib/consoleFormat";

const prettyValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        return JSON.stringify(JSON.parse(trimmed), null, 2);
      } catch {
        return value;
      }
    }
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const compactTokens = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return "—";
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K` : String(value);
};

export const traceEngineName = (trace) =>
  trace?.engine === "claude" ? prettyModel(trace.model) || "Claude" : trace?.engine === "fallback" ? "Rules engine" : humanize(trace?.engine) || "AI";

// One-line summary for the collapsed toggle.
export const traceSummary = (trace) => {
  if (!trace) return "";
  const parts = [traceEngineName(trace)];
  if (trace.latencyMs !== null && trace.latencyMs !== undefined) parts.push(formatDuration(trace.latencyMs));
  const tools = Array.isArray(trace.steps) ? trace.steps.length : 0;
  if (tools) parts.push(`${tools} tool${tools === 1 ? "" : "s"}`);
  return parts.join(" · ");
};

function Stat({ label, value, sub, icon: Icon }) {
  return (
    <div className="min-w-0 bg-white px-3 py-2">
      <p className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        {Icon && <Icon className="size-3" aria-hidden="true" />}
        {label}
      </p>
      <p className="truncate text-xs font-semibold text-slate-800" title={typeof value === "string" ? value : undefined}>
        {value}
      </p>
      {sub && <p className="truncate text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}

function CodeBlock({ label, value }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
      <pre className="max-h-48 overflow-auto rounded-md bg-slate-50 p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-slate-700 ring-1 ring-slate-200 [scrollbar-width:thin]">
        {prettyValue(value)}
      </pre>
    </div>
  );
}

function ToolStep({ step, index }) {
  const [open, setOpen] = useState(false);
  const ok = step?.ok !== false;
  return (
    <li className="overflow-hidden rounded-lg ring-1 ring-slate-200">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cx("flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left hover:bg-slate-50", focusRing)}
      >
        <span className="text-[10px] font-bold text-slate-300 tabular-nums">{index + 1}</span>
        {ok ? (
          <CircleCheck className="size-3.5 shrink-0 text-emerald-600" aria-label="Succeeded" />
        ) : (
          <CircleX className="size-3.5 shrink-0 text-rose-600" aria-label="Failed" />
        )}
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">
          {step?.label || toolLabel(step?.name)}
        </span>
        {step?.name && <code className="hidden font-mono text-[10px] text-slate-400 sm:inline">{step.name}</code>}
        {step?.ms !== null && step?.ms !== undefined && (
          <span className="text-[11px] text-slate-400 tabular-nums">{formatDuration(step.ms)}</span>
        )}
        <ChevronDown className={cx("size-3.5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-100 bg-white px-2.5 py-2">
          <CodeBlock label="Input" value={step?.input} />
          <CodeBlock label="Result" value={step?.outputPreview} />
        </div>
      )}
    </li>
  );
}

export default function TracePanel({ trace, align = "end" }) {
  const usage = trace?.usage || {};
  const steps = Array.isArray(trace?.steps) ? trace.steps : [];
  const kbHits = Array.isArray(trace?.kbHits) ? trace.kbHits : [];
  const guardrails = Array.isArray(trace?.guardrails) ? trace.guardrails : [];
  const leadStage = trace?.lead?.stage ? STAGE_BY_KEY[trace.lead.stage]?.label || humanize(trace.lead.stage) : "";
  const cached = Number(usage.cacheReadTokens) || 0;

  return (
    <Motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cx("w-full max-w-140 overflow-hidden", align === "end" ? "self-end" : "self-start")}
    >
      <div className="mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
          <Sparkles className="size-3.5 text-emerald-600" aria-hidden="true" />
          <p className="text-xs font-semibold text-slate-800">Why the AI said this</p>
          {trace?.intent && (
            <Badge tone="sky" icon={Target} className="ml-auto" title={`Intent: ${trace.intent}`}>
              {humanize(trace.intent)}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
          <Stat
            label="Engine"
            icon={Cpu}
            value={traceEngineName(trace)}
            sub={trace?.iterations ? `${trace.iterations} model call${trace.iterations === 1 ? "" : "s"}` : undefined}
          />
          <Stat label="Latency" icon={Gauge} value={formatDuration(trace?.latencyMs)} />
          <Stat
            label="Tokens"
            value={`${compactTokens(usage.inputTokens)} in · ${compactTokens(usage.outputTokens)} out`}
            sub={cached ? `${compactTokens(cached)} from prompt cache` : undefined}
          />
          <Stat label="Cost" value={usage.costUsd !== undefined && usage.costUsd !== null ? formatUSD(usage.costUsd) : "—"} />
        </div>

        <div className="space-y-3 px-3 py-3">
          {trace?.fallbackReason && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
              <AlertTriangle className="mt-px size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
              {fallbackReasonLabel(trace.fallbackReason)}
            </p>
          )}

          {trace?.lead && (
            <p className="text-xs text-slate-600">
              Lead after this turn: <span className="font-semibold text-slate-900">score {formatNumber(trace.lead.score ?? 0)}</span>
              {leadStage && (
                <>
                  {" "}
                  · <span className="font-semibold text-slate-900">{leadStage}</span>
                </>
              )}
            </p>
          )}

          <section>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              <Wrench className="size-3" aria-hidden="true" />
              Tools used{steps.length ? ` (${steps.length})` : ""}
            </p>
            {steps.length ? (
              <ol className="space-y-1.5">
                {steps.map((step, index) => (
                  <ToolStep key={`${step?.name || "step"}-${index}`} step={step} index={index} />
                ))}
              </ol>
            ) : (
              <p className="text-xs text-slate-500">Answered directly — no tools were needed.</p>
            )}
          </section>

          <section>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              <BookOpen className="size-3" aria-hidden="true" />
              Knowledge retrieved{kbHits.length ? ` (${kbHits.length})` : ""}
            </p>
            {kbHits.length ? (
              <ul className="space-y-1">
                {kbHits.map((hit, index) => (
                  <li key={hit?.id || index} className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate text-slate-700" title={hit?.id}>
                      {hit?.title || hit?.id}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-slate-400">
                      {Number.isFinite(Number(hit?.score)) ? Number(hit.score).toFixed(2) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No knowledge-base articles were needed for this reply.</p>
            )}
          </section>

          {guardrails.length > 0 && (
            <section>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                <ShieldCheck className="size-3" aria-hidden="true" />
                Guardrails
              </p>
              <div className="flex flex-wrap gap-1.5">
                {guardrails.map((item, index) => (
                  <Badge key={`${item}-${index}`} tone="emerald" icon={ShieldCheck}>
                    {guardrailLabel(item)}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </div>
        {trace?.turnId && (
          <p className="border-t border-slate-100 px-3 py-1.5 font-mono text-[10px] text-slate-400">turn {trace.turnId}</p>
        )}
      </div>
    </Motion.div>
  );
}

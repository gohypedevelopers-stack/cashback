"use client";

import { useId, useRef } from "react";
import { motion as Motion } from "framer-motion";
import { brandTheme } from "@/components/ai-assistant/simulator/brandTheme";
import { tenantShortName } from "./showcaseUtils";

// Segmented control: "Assured Rewards — live" / "Bajaj Capital — concept demo".
// Radio-group semantics with roving focus (arrow keys switch tenants).
export default function TenantSwitcher({ tenants, value, onChange, tone = "light", label = "Choose an assistant", className = "" }) {
  const groupId = useId();
  const groupRef = useRef(null);
  const dark = tone === "dark";

  const onKeyDown = (event) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = Math.max(0, tenants.findIndex((t) => t.key === value));
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tenants.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + tenants.length) % tenants.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tenants.length - 1;
    const target = tenants[next];
    if (!target) return;
    onChange?.(target.key);
    requestAnimationFrame(() => {
      groupRef.current?.querySelector(`[data-key="${CSS.escape(target.key)}"]`)?.focus();
    });
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`grid w-full grid-cols-2 gap-1 rounded-[22px] p-1 sm:inline-flex sm:w-auto sm:rounded-full ${
        dark ? "bg-white/6 ring-1 ring-white/10" : "bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)] ring-1 ring-slate-200"
      } ${className}`}
    >
      {tenants.map((tenant) => {
        const active = tenant.key === value;
        const theme = brandTheme(tenant.brand);
        const status = tenant.isDemo ? "concept demo" : "live";
        return (
          <button
            key={tenant.key}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            data-key={tenant.key}
            onClick={() => onChange?.(tenant.key)}
            className={`relative min-w-0 rounded-[18px] px-3 py-2 text-left text-[13.5px] font-semibold transition-colors sm:rounded-full sm:px-4 sm:text-[14px] ${
              active ? "" : dark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              dark ? "focus-visible:ring-white focus-visible:ring-offset-[#0b1220]" : "focus-visible:ring-slate-900 focus-visible:ring-offset-white"
            }`}
            style={active ? { color: theme.onPrimary } : undefined}
          >
            {active ? (
              <Motion.span
                layoutId={`tenant-pill-${groupId}`}
                className="absolute inset-0 rounded-[18px] sm:rounded-full"
                style={{ backgroundColor: theme.primary }}
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              />
            ) : null}
            <span className="relative flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: active ? theme.onPrimary : theme.primary }}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block truncate sm:inline">{tenantShortName(tenant)}</span>
                <span className={`block text-[11.5px] font-medium sm:inline sm:text-[14px] sm:font-semibold ${active ? "opacity-85" : "opacity-75"}`}>
                  <span className="hidden sm:inline"> — </span>
                  {status}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

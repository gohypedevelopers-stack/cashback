import { useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { ArrowUpRight, Check, ChevronsUpDown, Hand, Lock, MessageCircle, X } from "lucide-react";
import { ConsoleMark } from "./AuthGate";
import { NAV_ITEMS } from "./navigation";
import { CountBadge, IconButton, cx, focusRing } from "./ui";
import { useDismiss } from "./lib/hooks";

const tenantColor = (tenant) => tenant?.brand?.primary || "#059669";

const demoTag = (tenant) => {
  const label = String(tenant?.demoLabel || "").trim();
  return label && label.length <= 18 ? label : "Concept demo";
};

function TenantDot({ tenant, size = "size-2.5" }) {
  return (
    <span
      className={cx("shrink-0 rounded-full ring-2 ring-white", size)}
      style={{ backgroundColor: tenantColor(tenant) }}
      aria-hidden="true"
    />
  );
}

function TenantSwitcher({ tenants, tenant, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  useDismiss(containerRef, () => setOpen(false), open);

  if (!tenant) return null;
  const canSwitch = tenants.length > 1;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => canSwitch && setOpen((value) => !value)}
        aria-haspopup={canSwitch ? "menu" : undefined}
        aria-expanded={canSwitch ? open : undefined}
        className={cx(
          "flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left shadow-[0_1px_1px_rgba(15,23,42,0.04)] transition-colors",
          canSwitch ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50" : "cursor-default",
          focusRing,
        )}
      >
        <span
          className="grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white"
          style={{ backgroundColor: tenant.brand?.primaryDark || tenantColor(tenant) }}
          aria-hidden="true"
        >
          {tenant.brand?.avatarInitials || (tenant.shortName || tenant.name || "?").slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-slate-900">{tenant.shortName || tenant.name}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-1.5">
            {tenant.isDemo ? (
              <span className="rounded bg-amber-50 px-1 py-px text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                {demoTag(tenant)}
              </span>
            ) : (
              <span className="truncate text-[11px] text-slate-500">{tenant.assistantName || "Live workspace"}</span>
            )}
          </span>
        </span>
        {canSwitch && <ChevronsUpDown className="size-4 shrink-0 text-slate-400" aria-hidden="true" />}
      </button>

      <AnimatePresence>
        {open && (
          <Motion.div
            role="menu"
            aria-label="Switch workspace"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full right-0 left-0 z-40 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
          >
            <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Workspaces</p>
            {tenants.map((item) => {
              const active = item.key === tenant.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setOpen(false);
                    if (!active) onChange(item.key);
                  }}
                  className={cx(
                    "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    active ? "bg-slate-50" : "hover:bg-slate-50",
                    focusRing,
                  )}
                >
                  <TenantDot tenant={item} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-slate-800">{item.name}</span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {item.isDemo ? demoTag(item) : item.tagline || item.assistantName || item.key}
                    </span>
                  </span>
                  {active && <Check className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />}
                </button>
              );
            })}
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Sidebar({
  tab,
  onNavigate,
  tenants,
  tenant,
  onTenantChange,
  inboxCounts,
  onLock,
  simulatorLink,
  scope = "desktop",
  onClose,
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-4">
        <ConsoleMark />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-bold text-slate-900">AI Concierge</p>
          <p className="truncate text-[11px] font-medium text-slate-500">Advisor Console</p>
        </div>
        {onClose && <IconButton label="Close navigation" icon={X} onClick={onClose} />}
      </div>

      <div className="px-3 pt-1 pb-3">
        <TenantSwitcher tenants={tenants} tenant={tenant} onChange={onTenantChange} />
      </div>

      <nav aria-label="Console sections" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = item.key === tab;
            const Icon = item.icon;
            const showInboxBadges = item.key === "inbox";
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.key)}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "group relative flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-semibold transition-colors",
                    active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    focusRing,
                  )}
                >
                  {active && (
                    <Motion.span
                      layoutId={`console-nav-active-${scope}`}
                      className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-full bg-[var(--brand)]"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <Icon
                    className={cx("size-4 shrink-0", active ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600")}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {showInboxBadges && (
                    <span className="flex items-center gap-1">
                      {inboxCounts?.needsHuman > 0 && (
                        <span
                          title={`${inboxCounts.needsHuman} need a human`}
                          className="inline-flex h-4.5 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800"
                        >
                          <Hand className="size-2.5" aria-hidden="true" />
                          {inboxCounts.needsHuman}
                          <span className="sr-only"> need a human</span>
                        </span>
                      )}
                      <CountBadge
                        count={inboxCounts?.unread || 0}
                        title={`${inboxCounts?.unread || 0} conversations with unread messages`}
                      />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 space-y-2 border-t border-slate-100 p-3">
        <a
          href={simulatorLink}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(
            "group flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70 transition-colors hover:bg-emerald-50/60 hover:ring-emerald-200",
            focusRing,
          )}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-[#1fa855] shadow-sm ring-1 ring-slate-200">
            <MessageCircle className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-[13px] font-semibold text-slate-800">
              Chat as a customer
              <ArrowUpRight className="size-3.5 text-slate-400 group-hover:text-emerald-600" aria-hidden="true" />
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
              Open the WhatsApp simulator — the chat shows up here live.
            </span>
          </span>
        </a>
        <button
          type="button"
          onClick={onLock}
          className={cx(
            "flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800",
            focusRing,
          )}
        >
          <Lock className="size-3.5" aria-hidden="true" />
          Lock console
        </button>
      </div>
    </div>
  );
}

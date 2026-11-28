// UI primitives for the advisor console (light theme, explicit colors).

import { useEffect, useEffectEvent, useId, useRef } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Inbox as InboxIcon,
  Loader2,
  MessageCircle,
  Monitor,
  RefreshCw,
  X,
} from "lucide-react";
import { formatDateTimeIST, initials, timeAgo } from "@/components/ai-assistant/shared/format";
import { useCopy } from "./lib/hooks";
import { useNow } from "./lib/liveStore";
import { scoreTone } from "./lib/consoleFormat";

export const cx = (...classes) => classes.filter(Boolean).join(" ");

export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

const BUTTON_VARIANTS = {
  primary: "bg-slate-900 text-white shadow-sm hover:bg-slate-800",
  accent: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
  secondary:
    "bg-white text-slate-700 ring-1 ring-inset ring-slate-200 shadow-[0_1px_1px_rgba(15,23,42,0.04)] hover:bg-slate-50 hover:text-slate-900",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  subtle: "bg-slate-100 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
  dangerGhost: "text-rose-600 hover:bg-rose-50 hover:text-rose-700",
  warning: "bg-amber-500 text-white shadow-sm hover:bg-amber-600",
};

const BUTTON_SIZES = {
  xs: "h-7 gap-1 rounded-md px-2 text-xs",
  sm: "h-8 gap-1.5 rounded-lg px-2.5 text-[13px]",
  md: "h-9 gap-2 rounded-lg px-3 text-sm",
  lg: "h-10 gap-2 rounded-lg px-4 text-sm",
};

const ICON_SIZES = { xs: "size-3.5", sm: "size-4", md: "size-4", lg: "size-4.5" };

export function Button({
  variant = "secondary",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  className = "",
  children,
  type = "button",
  disabled,
  ref,
  ...props
}) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cx(
        "inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.secondary,
        BUTTON_SIZES[size] || BUTTON_SIZES.md,
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className={cx(ICON_SIZES[size], "animate-spin")} aria-hidden="true" />
      ) : (
        Icon && <Icon className={ICON_SIZES[size]} aria-hidden="true" />
      )}
      {children}
      {IconRight && <IconRight className={ICON_SIZES[size]} aria-hidden="true" />}
    </button>
  );
}

const ICON_BUTTON_SIZES = { xs: "size-7 rounded-md", sm: "size-8 rounded-lg", md: "size-9 rounded-lg" };

export function IconButton({
  label,
  icon,
  size = "sm",
  variant = "ghost",
  className = "",
  type = "button",
  ref,
  ...props
}) {
  const Icon = icon;
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex shrink-0 cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.ghost,
        ICON_BUTTON_SIZES[size] || ICON_BUTTON_SIZES.sm,
        className,
      )}
      {...props}
    >
      <Icon className={size === "xs" ? "size-3.5" : "size-4"} aria-hidden="true" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Card({ className = "", children, as: component = "section", ...props }) {
  const Tag = component;
  return (
    <Tag
      className={cx(
        "rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, icon: Icon, actions, className = "" }) {
  return (
    <div className={cx("flex items-start justify-between gap-3 px-4 pt-4 pb-3", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && (
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}

export function SectionLabel({ children, className = "" }) {
  return (
    <p className={cx("text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400", className)}>{children}</p>
  );
}

// ---------------------------------------------------------------------------
// Badges & pills
// ---------------------------------------------------------------------------

const BADGE_TONES = {
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  white: "bg-white text-slate-600 ring-slate-200",
  dark: "bg-slate-900 text-white ring-slate-900",
};

export function Badge({ tone = "slate", icon: Icon, className = "", children, title }) {
  return (
    <span
      title={title}
      className={cx(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        BADGE_TONES[tone] || BADGE_TONES.slate,
        className,
      )}
    >
      {Icon && <Icon className="size-3" aria-hidden="true" />}
      {children}
    </span>
  );
}

// Pill with precomputed classes (stage / status metas from format helpers).
export function Pill({ classes, icon: Icon, className = "", children, title }) {
  return (
    <span
      title={title}
      className={cx(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        classes,
        className,
      )}
    >
      {Icon && <Icon className="size-3" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function CountBadge({ count, tone = "emerald", className = "", title }) {
  if (!count) return null;
  const tones = {
    emerald: "bg-emerald-600 text-white",
    amber: "bg-amber-500 text-white",
    slate: "bg-slate-200 text-slate-700",
    rose: "bg-rose-600 text-white",
  };
  return (
    <span
      title={title}
      className={cx(
        "inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
        tones[tone] || tones.emerald,
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function ScorePill({ score, className = "" }) {
  if (score === null || score === undefined) return null;
  const tone = scoreTone(score);
  return (
    <span
      title={`Lead score ${score}/100 (${tone.label.toLowerCase()})`}
      className={cx(
        "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ring-1 ring-inset",
        tone.classes,
        className,
      )}
    >
      {Math.round(Number(score) || 0)}
    </span>
  );
}

export function ScoreRing({ score, size = 64, stroke = 6, label = "Lead score" }) {
  const value = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);
  const tone = scoreTone(value);
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label} ${value} out of 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone.ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.2,.8,.2,1), stroke 300ms" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-lg font-bold text-slate-900">{value}</span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">score</span>
      </div>
    </div>
  );
}

export function StatusDot({ tone = "emerald", pulse = false, className = "" }) {
  const colors = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    slate: "bg-slate-400",
    sky: "bg-sky-500",
  };
  return (
    <span className={cx("relative inline-flex size-2 shrink-0", className)} aria-hidden="true">
      {pulse && (
        <span className={cx("absolute inline-flex size-full animate-ping rounded-full opacity-60", colors[tone])} />
      )}
      <span className={cx("relative inline-flex size-2 rounded-full", colors[tone] || colors.slate)} />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

const AVATAR_TONES = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-lime-100 text-lime-800",
];

const hashString = (value) => {
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(hash);
};

const AVATAR_SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-11 text-sm",
  xl: "size-14 text-base",
};

export function Avatar({ name, seed, size = "md", className = "", style, children }) {
  const tone = AVATAR_TONES[hashString(seed || name) % AVATAR_TONES.length];
  return (
    <span
      className={cx(
        "relative inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold",
        style ? "text-white" : tone,
        AVATAR_SIZES[size] || AVATAR_SIZES.md,
        className,
      )}
      style={style}
      aria-hidden="true"
    >
      {initials(name, "?")}
      {children}
    </span>
  );
}

export function ChannelIcon({ channel, className = "size-3.5" }) {
  if (channel === "whatsapp") {
    return <MessageCircle className={cx(className, "text-[#1fa855]")} aria-label="WhatsApp" />;
  }
  return <Monitor className={cx(className, "text-slate-500")} aria-label="Web simulator" />;
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

const CONTROL =
  "w-full rounded-lg border-0 bg-white text-sm text-slate-900 shadow-[0_1px_1px_rgba(15,23,42,0.03)] ring-1 ring-inset ring-slate-200 outline-none transition placeholder:text-slate-400 hover:ring-slate-300 focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function TextInput({ className = "", invalid = false, ref, ...props }) {
  return (
    <input
      ref={ref}
      className={cx(CONTROL, "h-9 px-3", invalid && "ring-rose-300 focus:ring-rose-500", className)}
      {...props}
    />
  );
}

export function TextArea({ className = "", invalid = false, ref, ...props }) {
  return (
    <textarea
      ref={ref}
      className={cx(CONTROL, "px-3 py-2 leading-relaxed", invalid && "ring-rose-300 focus:ring-rose-500", className)}
      {...props}
    />
  );
}

export function SelectInput({ className = "", size = "md", children, ...props }) {
  return (
    <div className={cx("relative", className)}>
      <select
        className={cx(
          CONTROL,
          "cursor-pointer appearance-none pr-8",
          size === "sm" ? "h-8 pl-2.5 text-[13px]" : size === "xs" ? "h-7 pl-2 text-xs" : "h-9 pl-3",
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
    </div>
  );
}

export function Field({ label, hint, error, children, htmlFor, className = "", optional = false }) {
  return (
    <div className={cx("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          {label}
          {optional && <span className="font-medium text-slate-400">optional</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : (
        hint && <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled = false, size = "md", className = "" }) {
  const dims = size === "sm" ? { track: "h-4 w-7", knob: "size-3", on: "translate-x-3" } : { track: "h-5 w-9", knob: "size-4", on: "translate-x-4" };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cx(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        dims.track,
        checked ? "bg-emerald-500" : "bg-slate-300",
        className,
      )}
    >
      <span
        className={cx(
          "inline-block rounded-full bg-white shadow transition-transform",
          dims.knob,
          checked ? dims.on : "translate-x-0",
        )}
      />
    </button>
  );
}

// Segmented control (single select).
export function Segmented({ value, onChange, options, size = "sm", ariaLabel, className = "" }) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cx("inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 ring-1 ring-inset ring-slate-200/70", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cx(
              "inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition-colors",
              focusRing,
              size === "xs" ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-xs",
              active ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800",
            )}
          >
            {Icon && <Icon className="size-3.5" aria-hidden="true" />}
            {option.label}
            {option.count !== undefined && option.count !== null && (
              <span
                className={cx(
                  "rounded px-1 text-[10px] font-bold tabular-nums",
                  active ? "bg-slate-100 text-slate-600" : "text-slate-400",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export function Spinner({ className = "size-4" }) {
  return <Loader2 className={cx("animate-spin text-slate-400", className)} aria-hidden="true" />;
}

export function Skeleton({ className = "", style }) {
  return <div className={cx("animate-pulse rounded-md bg-slate-200/70", className)} style={style} aria-hidden="true" />;
}

export function EmptyState({ icon = InboxIcon, title, description, action, compact = false, className = "" }) {
  const Icon = icon;
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14",
        className,
      )}
    >
      <span
        className={cx(
          "grid place-items-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200",
          compact ? "size-10" : "size-12",
        )}
      >
        <Icon className={compact ? "size-5" : "size-6"} aria-hidden="true" />
      </span>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {description && <p className="text-[13px] leading-relaxed text-slate-500">{description}</p>}
      </div>
      {action && <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Couldn't load this", error, onRetry, compact = false, className = "" }) {
  return (
    <div
      role="alert"
      className={cx(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
        className,
      )}
    >
      <span className="grid size-11 place-items-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-100">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </span>
      <div className="max-w-md space-y-1">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="text-[13px] leading-relaxed text-slate-500">
          {error?.message || "The AI assistant backend did not respond."} Check that the backend is running and reachable.
        </p>
      </div>
      {onRetry && (
        <Button size="sm" icon={RefreshCw} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function InlineAlert({ tone = "amber", icon = AlertTriangle, title, children, action, className = "" }) {
  const Icon = icon;
  const tones = {
    amber: "bg-amber-50 text-amber-900 ring-amber-200",
    rose: "bg-rose-50 text-rose-900 ring-rose-200",
    sky: "bg-sky-50 text-sky-900 ring-sky-200",
    emerald: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    slate: "bg-slate-50 text-slate-800 ring-slate-200",
  };
  const iconTones = {
    amber: "text-amber-600",
    rose: "text-rose-600",
    sky: "text-sky-600",
    emerald: "text-emerald-600",
    slate: "text-slate-500",
  };
  return (
    <div className={cx("flex items-start gap-2.5 rounded-lg px-3 py-2.5 ring-1 ring-inset", tones[tone], className)}>
      <Icon className={cx("mt-0.5 size-4 shrink-0", iconTones[tone])} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-[13px] leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5 opacity-90" : ""}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltip (CSS only — shows on hover and keyboard focus)
// ---------------------------------------------------------------------------

export function Tooltip({ content, children, side = "top", align = "center", className = "", wide = false }) {
  const position = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
  }[side];
  const alignment = {
    center: "left-1/2 -translate-x-1/2",
    start: "left-0",
    end: "right-0",
  }[align];
  return (
    <span className={cx("group/tip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cx(
          "pointer-events-none absolute z-50 rounded-lg bg-slate-900 px-2.5 py-1.5 text-left text-xs leading-relaxed font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100",
          wide ? "w-64" : "w-max max-w-xs",
          position,
          alignment,
        )}
      >
        {content}
      </span>
    </span>
  );
}

export function Kbd({ children, className = "" }) {
  return (
    <kbd
      className={cx(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px] font-semibold text-slate-500",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function TimeAgo({ value, className = "", prefix = "" }) {
  const now = useNow(15000);
  if (!value) return null;
  const date = new Date(value);
  const iso = Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  return (
    <time dateTime={iso} title={formatDateTimeIST(value)} className={cx("whitespace-nowrap", className)}>
      {prefix}
      {timeAgo(value, now)}
    </time>
  );
}

export function CopyButton({ text, label = "Copy", copiedLabel = "Copied", size = "xs", variant = "secondary", className = "" }) {
  const { copiedId, copy } = useCopy();
  const copied = copiedId === "value";
  return (
    <Button
      size={size}
      variant={variant}
      icon={copied ? Check : Copy}
      className={cx(copied && "text-emerald-700", className)}
      onClick={() => copy(text, "value")}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Overlays: Modal, ConfirmDialog, Drawer
// ---------------------------------------------------------------------------

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Focus the first field on open, keep Tab inside, restore focus on close, Escape closes.
function useDialogFocus(open, panelRef, onClose) {
  const close = useEffectEvent(() => onClose?.());
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const panel = panelRef.current;
    const frame = requestAnimationFrame(() => {
      const target = panel?.querySelector("[data-autofocus]") || panel?.querySelector(FOCUSABLE) || panel;
      target?.focus?.();
    });
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const nodes = [...panel.querySelectorAll(FOCUSABLE)].filter((node) => node.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown, true);
      if (previous && typeof previous.focus === "function") previous.focus();
    };
  }, [open, panelRef]);
}

const MODAL_SIZES = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-3xl" };

export function Modal({ open, onClose, title, description, icon: Icon, children, footer, size = "md" }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useDialogFocus(open, panelRef, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-80 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <Motion.div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <Motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cx(
              "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl ring-1 ring-slate-200 outline-none sm:rounded-2xl",
              MODAL_SIZES[size] || MODAL_SIZES.md,
            )}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                {Icon && (
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0">
                  <h2 id={titleId} className="text-base font-semibold text-slate-900">
                    {title}
                  </h2>
                  {description && <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{description}</p>}
                </div>
              </div>
              <IconButton label="Close" icon={X} onClick={onClose} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                {footer}
              </div>
            )}
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Keep it",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onCancel}
      title={title}
      icon={AlertTriangle}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} loading={loading} onClick={onConfirm} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600">{message}</p>
    </Modal>
  );
}

export function Drawer({ open, onClose, side = "right", title, children, widthClass = "w-[min(92vw,380px)]", hideHeader = false }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useDialogFocus(open, panelRef, onClose);
  const fromX = side === "right" ? "100%" : "-100%";
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-70">
          <Motion.div
            className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <Motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title && !hideHeader ? titleId : undefined}
            aria-label={title && !hideHeader ? undefined : title || "Panel"}
            tabIndex={-1}
            className={cx(
              "absolute top-0 bottom-0 flex flex-col bg-white shadow-2xl outline-none",
              side === "right" ? "right-0 border-l border-slate-200" : "left-0 border-r border-slate-200",
              widthClass,
            )}
            initial={{ x: fromX }}
            animate={{ x: 0 }}
            exit={{ x: fromX }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            {!hideHeader && (
              <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4">
                <h2 id={titleId} className="truncate text-sm font-semibold text-slate-900">
                  {title}
                </h2>
                <IconButton label="Close panel" icon={X} onClick={onClose} />
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </Motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

// Key/value rows for detail panels.
export function KeyValue({ label, value, mono = false, muted = false }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-xs text-slate-500">{label}</dt>
      <dd
        className={cx(
          "min-w-0 truncate text-right text-[13px] font-medium",
          empty || muted ? "text-slate-400" : "text-slate-800",
          mono && "font-mono text-xs",
        )}
        title={typeof value === "string" ? value : undefined}
      >
        {empty ? "Not shared yet" : value}
      </dd>
    </div>
  );
}

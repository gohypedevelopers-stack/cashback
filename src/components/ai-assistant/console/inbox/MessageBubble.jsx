// One message in the live thread (ARCHITECTURE.md §6.1).
// customer → left · AI → right (green, "AI" badge) · agent → right (blue, agent name) · notices centered.

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  CornerDownRight,
  ExternalLink,
  Headset,
  Info,
  List,
  Monitor,
  Phone,
  Sparkles,
  Video,
} from "lucide-react";
import WhatsAppText from "@/components/ai-assistant/shared/WhatsAppText";
import { formatDateTimeIST, formatTimeIST } from "@/components/ai-assistant/shared/format";
import { cx, focusRing } from "../ui";
import { modeLabel } from "../lib/consoleFormat";
import TracePanel, { traceSummary } from "./TracePanel";

const safeUrl = (value) => (typeof value === "string" && /^https?:\/\//i.test(value.trim()) ? value.trim() : "");

const DELIVERY = {
  pending: { icon: Clock, label: "Sending…", className: "text-slate-400" },
  sent: { icon: Check, label: "Sent", className: "text-slate-400" },
  delivered: { icon: CheckCheck, label: "Delivered", className: "text-slate-400" },
  read: { icon: CheckCheck, label: "Read", className: "text-sky-500" },
  failed: { icon: AlertCircle, label: "Failed to deliver", className: "text-rose-500" },
  simulated: { icon: Monitor, label: "Shown in the web simulator", className: "text-slate-400" },
};

const MODE_ICONS = { phone: Phone, video: Video, branch: Building2 };

function DeliveryIcon({ status }) {
  const meta = DELIVERY[status];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span className={cx("inline-flex items-center gap-0.5", meta.className)} title={meta.label}>
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="sr-only">{meta.label}</span>
      {status === "failed" && <span className="text-[10px] font-semibold">Failed</span>}
    </span>
  );
}

function ButtonChips({ buttons }) {
  const list = Array.isArray(buttons) ? buttons.filter(Boolean) : [];
  if (!list.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Quick reply buttons">
      {list.map((button, index) => (
        <span
          key={button.id || index}
          className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-sky-700 shadow-[0_1px_1px_rgba(15,23,42,0.05)] ring-1 ring-slate-200"
        >
          {button.title}
        </span>
      ))}
    </div>
  );
}

function ListPreview({ list }) {
  const [expanded, setExpanded] = useState(false);
  const sections = Array.isArray(list?.sections) ? list.sections : [];
  const flat = sections.flatMap((section, sectionIndex) =>
    (Array.isArray(section?.rows) ? section.rows : []).map((row) => ({ row, sectionIndex })),
  );
  const totalRows = flat.length;
  if (!totalRows) return null;
  const visible = expanded ? flat : flat.slice(0, 4);
  const groups = sections
    .map((section, sectionIndex) => ({
      key: section?.title || sectionIndex,
      title: section?.title,
      rows: visible.filter((item) => item.sectionIndex === sectionIndex).map((item) => item.row),
    }))
    .filter((group) => group.rows.length);
  return (
    <div className="mt-2 overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
      <div className="flex items-center gap-1.5 border-b border-slate-100 px-2.5 py-1.5 text-xs font-semibold text-sky-700">
        <List className="size-3.5" aria-hidden="true" />
        {list.buttonLabel || "View options"}
        <span className="ml-auto text-[10px] font-medium text-slate-400">{totalRows} options</span>
      </div>
      <div className="divide-y divide-slate-100">
        {groups.map((group) => (
          <div key={group.key} className="py-1">
            {group.title && (
              <p className="px-2.5 pt-0.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{group.title}</p>
            )}
            <ul>
              {group.rows.map((row, rowIndex) => (
                <li key={row?.id || rowIndex} className="px-2.5 py-1">
                  <p className="text-xs font-medium text-slate-800">{row?.title}</p>
                  {row?.description && <p className="text-[11px] leading-snug text-slate-500">{row.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {totalRows > 4 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className={cx(
            "flex w-full cursor-pointer items-center justify-center gap-1 border-t border-slate-100 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50",
            focusRing,
          )}
        >
          {expanded ? "Show fewer" : `Show all ${totalRows}`}
          <ChevronDown className={cx("size-3 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function BookingCard({ booking }) {
  if (!booking) return null;
  const ModeIcon = MODE_ICONS[booking.mode] || Phone;
  const link = safeUrl(booking.meetingLink);
  return (
    <div className="mt-2 overflow-hidden rounded-xl bg-white ring-1 ring-emerald-200">
      <div className="flex items-center gap-1.5 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
        <CalendarCheck className="size-3.5" aria-hidden="true" />
        Call booked
      </div>
      <div className="space-y-1 px-3 py-2">
        <p className="text-sm font-semibold text-slate-900">{booking.timeLabel || formatDateTimeIST(booking.startAt)}</p>
        {booking.advisorName && (
          <p className="text-xs text-slate-600">
            with <span className="font-semibold text-slate-800">{booking.advisorName}</span>
            {booking.advisorTitle ? `, ${booking.advisorTitle}` : ""}
          </p>
        )}
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
          <ModeIcon className="size-3.5" aria-hidden="true" />
          {modeLabel(booking.mode)}
          {booking.topic ? <span>· {booking.topic}</span> : null}
        </p>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
          >
            <ExternalLink className="size-3" aria-hidden="true" />
            Meeting link
          </a>
        )}
      </div>
    </div>
  );
}

function CtaChip({ cta }) {
  const url = safeUrl(cta?.url);
  if (!cta?.label) return null;
  const Tag = url ? "a" : "span";
  return (
    <Tag
      {...(url ? { href: url, target: "_blank", rel: "noopener noreferrer" } : {})}
      className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700 shadow-[0_1px_1px_rgba(15,23,42,0.05)] ring-1 ring-slate-200 hover:bg-sky-50"
    >
      <ExternalLink className="size-3.5" aria-hidden="true" />
      {cta.label}
    </Tag>
  );
}

function NoticeRow({ message }) {
  return (
    <div className="my-3 flex justify-center px-6" role="note">
      <span className="inline-flex max-w-[90%] items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-center text-[11px] font-medium text-slate-500 shadow-[0_1px_1px_rgba(15,23,42,0.04)] ring-1 ring-slate-200">
        <Info className="size-3 shrink-0 text-slate-400" aria-hidden="true" />
        <span className="min-w-0">
          {message.text}
          <span className="ml-1.5 text-slate-400">{formatTimeIST(message.createdAt)}</span>
        </span>
      </span>
    </div>
  );
}

function Bubble({ message, continued, agentFallback, customerName, assistantName }) {
  const [showTrace, setShowTrace] = useState(false);
  const sender = message.sender;
  const isAi = sender === "ai";
  const isAgent = sender === "agent";
  const outbound = isAi || isAgent || message.direction === "outbound";
  const payload = message.payload && typeof message.payload === "object" ? message.payload : {};
  const agentName =
    message.agentName || payload.agentName || payload.agent?.name || agentFallback || "Advisor";

  const bubbleTone = isAi
    ? "bg-[#e3f6ea] text-slate-800 ring-emerald-200/80"
    : isAgent
      ? "bg-sky-50 text-slate-800 ring-sky-200"
      : outbound
        ? "bg-slate-100 text-slate-800 ring-slate-200"
        : "bg-white text-slate-800 ring-slate-200/90";
  const corner = continued ? "" : outbound ? "rounded-tr-md" : "rounded-tl-md";

  return (
    <div className={cx("flex w-full", outbound ? "justify-end" : "justify-start", continued ? "mt-1" : "mt-3")}>
      <div className={cx("flex max-w-[88%] flex-col sm:max-w-[78%] 2xl:max-w-[68%]", outbound ? "items-end" : "items-start")}>
        {!continued && (
          <div className={cx("mb-1 flex items-center gap-1.5 px-1 text-[11px]", outbound ? "flex-row-reverse" : "")}>
            {isAi ? (
              <>
                <span className="rounded bg-emerald-600 px-1 py-px text-[9px] font-bold tracking-wide text-white">AI</span>
                <span className="font-semibold text-emerald-800">{assistantName || "Assistant"}</span>
                {message.engine === "fallback" && <span className="text-slate-400">· rules engine</span>}
              </>
            ) : isAgent ? (
              <>
                <Headset className="size-3 text-sky-600" aria-hidden="true" />
                <span className="font-semibold text-sky-800">{agentName}</span>
                <span className="text-slate-400">· human</span>
              </>
            ) : (
              <span className="font-semibold text-slate-500">{customerName}</span>
            )}
          </div>
        )}
        <div
          className={cx(
            "relative rounded-2xl px-3 py-2 text-[13.5px] shadow-[0_1px_1px_rgba(15,23,42,0.05)] ring-1 ring-inset",
            bubbleTone,
            corner,
          )}
        >
          {payload.interactive?.title && !outbound && (
            <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-sky-700">
              <CornerDownRight className="size-3" aria-hidden="true" />
              Tapped “{payload.interactive.title}”
            </p>
          )}
          {message.text && <WhatsAppText text={message.text} />}
          {message.type === "buttons" && <ButtonChips buttons={payload.buttons} />}
          {message.type === "list" && <ListPreview list={payload.list} />}
          {(message.type === "booking_confirmation" || payload.booking) && <BookingCard booking={payload.booking} />}
          {(message.type === "cta_url" || payload.cta) && <CtaChip cta={payload.cta} />}
          {payload.footer && <p className="mt-1.5 text-[11px] text-slate-400">{payload.footer}</p>}
          <div className="mt-1 flex items-center justify-end gap-1.5 text-[10.5px] text-slate-400">
            <time dateTime={message.createdAt} title={formatDateTimeIST(message.createdAt)}>
              {formatTimeIST(message.createdAt)}
            </time>
            {outbound && <DeliveryIcon status={message.deliveryStatus} />}
          </div>
        </div>
        {message.trace && (
          <button
            type="button"
            onClick={() => setShowTrace((value) => !value)}
            aria-expanded={showTrace}
            className={cx(
              "mt-1 inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-transparent transition-colors hover:bg-white hover:text-emerald-700 hover:ring-slate-200",
              showTrace && "bg-white text-emerald-700 ring-slate-200",
              focusRing,
            )}
          >
            <Sparkles className="size-3 shrink-0" aria-hidden="true" />
            <span className="shrink-0">Why the AI said this</span>
            <span className="truncate font-medium text-slate-400">· {traceSummary(message.trace)}</span>
            <ChevronDown className={cx("size-3 shrink-0 transition-transform", showTrace && "rotate-180")} aria-hidden="true" />
          </button>
        )}
        <AnimatePresence initial={false}>
          {showTrace && message.trace && <TracePanel key="trace" trace={message.trace} align={outbound ? "end" : "start"} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function MessageBubble({ message, continued, agentFallback, customerName, assistantName }) {
  if (!message) return null;
  if (message.type === "notice" || message.sender === "system") return <NoticeRow message={message} />;
  return (
    <Bubble
      message={message}
      continued={continued}
      agentFallback={agentFallback}
      customerName={customerName}
      assistantName={assistantName}
    />
  );
}

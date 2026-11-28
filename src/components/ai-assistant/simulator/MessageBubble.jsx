"use client";

import { useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  Building2,
  CalendarCheck,
  CalendarPlus,
  Check,
  CircleAlert,
  Clock,
  ExternalLink,
  Headset,
  Link as LinkIcon,
  List as ListIcon,
  Phone,
  Reply,
  RotateCcw,
  UserRound,
  Video,
} from "lucide-react";
import WhatsAppText from "@/components/ai-assistant/shared/WhatsAppText";
import { formatDateTimeIST, formatTimeIST, plainText } from "@/components/ai-assistant/shared/format";
import { downloadBookingIcs, MODE_LABELS } from "./ics";
import { BubbleTail, TickIcon, TypingDots } from "./SimIcons";
import { BUBBLE_SHADOW, isNoticeMessage, prettyUrl, safeHttpUrl, WA } from "./simulatorUtils";

const MODE_ICONS = { phone: Phone, video: Video, branch: Building2 };

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent";

const TEXT_SIZE = { sm: "text-[14.2px]", md: "text-[15.5px]" };

export function DayChip({ label }) {
  return (
    <div className="my-2 flex justify-center">
      <span
        className="rounded-lg bg-white/95 px-3 py-[5px] text-[12px] font-medium text-[#54656f]"
        style={{ boxShadow: BUBBLE_SHADOW }}
      >
        {label}
      </span>
    </div>
  );
}

export function NoticeChip({ children, tone = "system", icon: Icon }) {
  return (
    <div className="my-2 flex justify-center px-3">
      <p
        className={`flex max-w-[94%] items-start justify-center gap-1.5 rounded-lg px-3 py-1.5 text-center text-[12.5px] leading-[17px] text-[#54656f] ${
          tone === "ai" ? "bg-[#fff3c4]" : "bg-white/95"
        }`}
        style={{ boxShadow: BUBBLE_SHADOW }}
      >
        {Icon ? <Icon size={13} strokeWidth={2.2} className="mt-[2px] shrink-0" aria-hidden="true" /> : null}
        <span>{children}</span>
      </p>
    </div>
  );
}

function Meta({ time, tick }) {
  return (
    <span className="ml-auto flex shrink-0 translate-y-[3px] items-center gap-[3px] self-end pl-2.5 text-[11px] leading-[15px] text-[#667781] tabular-nums">
      {time}
      {tick ? <TickIcon state={tick} /> : null}
    </span>
  );
}

function DetailRow({ icon, term, children }) {
  const Glyph = icon;
  return (
    <div className="flex items-start gap-2.5">
      <dt className="mt-[1px] shrink-0 text-[#54656f]">
        <Glyph size={15} aria-hidden="true" />
        <span className="sr-only">{term}</span>
      </dt>
      <dd className="min-w-0 flex-1 leading-[18px]">{children}</dd>
    </div>
  );
}

function BookingCard({ booking, theme, teamName }) {
  const [fileState, setFileState] = useState("idle");
  const modeKey = MODE_ICONS[booking.mode] ? booking.mode : "phone";
  const ModeIcon = MODE_ICONS[modeKey];
  const when = booking.timeLabel || formatDateTimeIST(booking.startAt);
  const link = safeHttpUrl(booking.meetingLink);

  const addToCalendar = () => {
    const ok = downloadBookingIcs(booking, { teamName });
    setFileState(ok ? "done" : "error");
  };

  return (
    <div className="-mx-[4px] -mt-[1px] mb-1.5 overflow-hidden rounded-[7px] ring-1 ring-black/6">
      <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ backgroundColor: theme.primary, color: theme.onPrimary }}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20">
          <CalendarCheck size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold leading-tight">Call booked</p>
          <p className="truncate text-[11.5px] leading-tight opacity-85">{booking.topic || teamName || "Advisor call"}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]">
          Confirmed
        </span>
      </div>
      <dl className="space-y-2 bg-[#f7f8fa] px-3 py-2.5 text-[13px] text-[#111b21]">
        {booking.advisorName ? (
          <DetailRow icon={UserRound} term="Advisor">
            <span className="font-medium">{booking.advisorName}</span>
            {booking.advisorTitle ? <span className="block text-[11.5px] text-[#667781]">{booking.advisorTitle}</span> : null}
          </DetailRow>
        ) : null}
        {when ? (
          <DetailRow icon={Clock} term="When">
            <span className="font-medium">{when}</span>
            <span className="block text-[11.5px] text-[#667781]">India Standard Time</span>
          </DetailRow>
        ) : null}
        <DetailRow icon={ModeIcon} term="Mode">
          {MODE_LABELS[modeKey]}
        </DetailRow>
        {link ? (
          <DetailRow icon={LinkIcon} term="Meeting link">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className={`break-all text-[#027eb5] underline underline-offset-2 ${FOCUS_RING}`}
            >
              {prettyUrl(link)}
            </a>
          </DetailRow>
        ) : null}
      </dl>
      <button
        type="button"
        onClick={addToCalendar}
        className="flex w-full items-center justify-center gap-2 border-t border-black/6 bg-white py-2.5 text-[13.5px] font-semibold text-[#00796b] transition-colors hover:bg-[#f5f6f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#25D366]"
      >
        {fileState === "done" ? <Check size={16} aria-hidden="true" /> : <CalendarPlus size={16} aria-hidden="true" />}
        {fileState === "done"
          ? "Saved — open the file to add it"
          : fileState === "error"
            ? "Couldn't create the calendar file"
            : "Add to calendar"}
      </button>
    </div>
  );
}

export default function MessageBubble({
  message,
  tick,
  first,
  active,
  theme,
  teamName,
  size = "sm",
  onReply,
  onOpenList,
}) {
  if (isNoticeMessage(message)) {
    return <NoticeChip>{plainText(message.text || message.payload?.footer || "")}</NoticeChip>;
  }

  const outgoing = message.direction === "inbound";
  const payload = message.payload || {};
  const type = message.type || "text";
  const text = message.text || payload.interactive?.title || "";
  const color = outgoing ? WA.outgoing : WA.incoming;
  const isAgent = !outgoing && message.sender === "agent";
  const buttons = type === "buttons" && Array.isArray(payload.buttons) ? payload.buttons.filter((b) => b?.id && b?.title) : [];
  const list = type === "list" && payload.list?.sections?.length ? payload.list : null;
  const booking = type === "booking_confirmation" && payload.booking ? payload.booking : null;
  const ctaUrl = type === "cta_url" ? safeHttpUrl(payload.cta?.url) : "";
  const wide = !outgoing && (buttons.length > 0 || list || booking || ctaUrl);
  const time = formatTimeIST(message.createdAt);
  const footer = payload.footer ? String(payload.footer) : "";
  const animated = message._anim !== undefined;

  return (
    <Motion.div
      initial={animated ? { opacity: 0, y: 10, scale: 0.985 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1], delay: message._anim || 0 }}
      style={{ transformOrigin: outgoing ? "100% 0%" : "0% 0%" }}
      className={`flex w-full ${outgoing ? "justify-end" : "justify-start"} ${first ? "mt-2.5" : "mt-[3px]"}`}
    >
      <div className={`relative min-w-0 ${wide ? "w-[85%]" : "max-w-[82%]"}`}>
        <div
          className={`relative rounded-lg px-2 pb-[6px] pt-[5px] ${first ? (outgoing ? "rounded-tr-none" : "rounded-tl-none") : ""}`}
          style={{ backgroundColor: color, boxShadow: BUBBLE_SHADOW }}
        >
          {first ? <BubbleTail side={outgoing ? "right" : "left"} color={color} /> : null}
          {isAgent ? (
            <p className="mb-0.5 flex items-center gap-1 text-[12.5px] font-semibold" style={{ color: theme.onLight }}>
              <Headset size={13} aria-hidden="true" /> Human advisor
            </p>
          ) : null}
          {booking ? <BookingCard booking={booking} theme={theme} teamName={teamName} /> : null}

          <div className="flex flex-wrap items-end">
            {text ? (
              <WhatsAppText text={text} className={`min-w-0 max-w-full ${TEXT_SIZE[size] || TEXT_SIZE.sm} text-[#111b21]`} />
            ) : null}
            {footer ? null : <Meta time={time} tick={tick} />}
          </div>
          {footer ? (
            <div className="mt-[3px] flex items-end">
              <p className="min-w-0 flex-1 text-[12.5px] leading-[16px] text-[#667781]">{footer}</p>
              <Meta time={time} tick={tick} />
            </div>
          ) : null}

          {list ? (
            <button
              type="button"
              disabled={!active}
              aria-haspopup="dialog"
              onClick={(event) => onOpenList?.(message, event.currentTarget)}
              className="-mx-2 -mb-[2px] mt-2 flex w-[calc(100%+1rem)] items-center justify-center gap-2 rounded-b-lg border-t border-black/8 px-3 pb-[5px] pt-2 text-[14px] font-medium text-[#00796b] transition-colors hover:bg-black/2.5 disabled:cursor-default disabled:text-[#8696a0] disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#25D366]"
            >
              <ListIcon size={17} aria-hidden="true" />
              {list.buttonLabel || "View options"}
            </button>
          ) : null}

          {ctaUrl ? (
            <a
              href={ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="-mx-2 -mb-[2px] mt-2 flex w-[calc(100%+1rem)] items-center justify-center gap-2 rounded-b-lg border-t border-black/8 px-3 pb-[5px] pt-2 text-[14px] font-medium text-[#00796b] transition-colors hover:bg-black/2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#25D366]"
            >
              <ExternalLink size={16} aria-hidden="true" />
              {payload.cta?.label || "Open link"}
            </a>
          ) : null}
        </div>

        {buttons.length ? (
          <div className="mt-[3px] flex flex-col gap-[3px]">
            {buttons.map((button) => (
              <button
                key={button.id}
                type="button"
                disabled={!active}
                onClick={() => onReply?.({ id: button.id, title: button.title })}
                className="flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[14px] font-medium text-[#00796b] transition-colors hover:bg-[#f7f8f8] disabled:cursor-default disabled:text-[#8696a0] disabled:hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
                style={{ boxShadow: BUBBLE_SHADOW }}
              >
                <Reply size={16} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{button.title}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Motion.div>
  );
}

export function TypingBubble() {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mt-2.5 flex justify-start"
    >
      <div className="relative rounded-lg rounded-tl-none bg-white px-3 py-[9px]" style={{ boxShadow: BUBBLE_SHADOW }}>
        <BubbleTail side="left" color="#ffffff" />
        <TypingDots />
        <span className="sr-only">The assistant is typing</span>
      </div>
    </Motion.div>
  );
}

export function FailedBubble({ error, onRetry, disabled }) {
  return (
    <div className="mt-1 flex justify-end" role="alert">
      <div className="max-w-[82%] rounded-lg bg-[#fdecea] px-3 py-2 text-[13px] leading-snug text-[#7a1c14] ring-1 ring-[#f3c5bf]">
        <p className="flex gap-2">
          <CircleAlert size={16} className="mt-px shrink-0 text-[#d93025]" aria-hidden="true" />
          <span>{error?.text || "Message not delivered."}</span>
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={disabled}
          className={`mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12.5px] font-semibold text-[#00796b] ring-1 ring-black/10 transition-colors hover:bg-[#f5f6f6] disabled:opacity-50 ${FOCUS_RING}`}
        >
          <RotateCcw size={13} aria-hidden="true" /> Retry
        </button>
      </div>
    </div>
  );
}

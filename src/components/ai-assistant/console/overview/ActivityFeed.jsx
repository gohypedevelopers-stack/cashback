// Live activity feed: polls /console/feed every 5 s with since=<previous `now`>,
// newest first, animated inserts, click opens the conversation.

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Activity, CalendarCheck, ChevronRight, Hand, Headset, MessageSquare, Radio, Target } from "lucide-react";
import { aiConsole, isConsoleAuthError } from "@/lib/aiAssistantApi";
import { Card, CardHeader, EmptyState, Skeleton, StatusDot, TimeAgo, cx, focusRing } from "../ui";
import { useConsole } from "../lib/ConsoleContext";
import { reportPollFailure, reportPollSuccess } from "../lib/liveStore";
import { toTime } from "../lib/consoleFormat";

const FEED_INTERVAL_MS = 5000;
const MAX_EVENTS = 50;

const EVENT_META = {
  message: { icon: MessageSquare, classes: "bg-sky-50 text-sky-600 ring-sky-100" },
  lead: { icon: Target, classes: "bg-violet-50 text-violet-600 ring-violet-100" },
  booking: { icon: CalendarCheck, classes: "bg-emerald-50 text-emerald-600 ring-emerald-100" },
  takeover: { icon: Headset, classes: "bg-amber-50 text-amber-700 ring-amber-100" },
  handoff: { icon: Hand, classes: "bg-rose-50 text-rose-600 ring-rose-100" },
};

const eventKey = (event) => event?.id || `${event?.type}:${event?.conversationId}:${event?.at}`;

// Dedupe by id, newest first.
const mergeEvents = (current = [], incoming = []) => {
  if (!incoming.length) return current;
  const map = new Map();
  [...current, ...incoming].forEach((event) => {
    if (event) map.set(eventKey(event), event);
  });
  return [...map.values()].sort((a, b) => toTime(b.at) - toTime(a.at)).slice(0, MAX_EVENTS);
};

function FeedItem({ event, onOpen }) {
  const meta = EVENT_META[event.type] || EVENT_META.message;
  const Icon = meta.icon;
  const clickable = Boolean(event.conversationId);
  const body = (
    <>
      <span className={cx("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ring-1", meta.classes)}>
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13px] font-semibold text-slate-800">{event.title || "Activity"}</span>
          <TimeAgo value={event.at} className="shrink-0 text-[11px] text-slate-400" />
        </span>
        {event.detail && (
          <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-slate-500">{event.detail}</span>
        )}
      </span>
      {clickable && (
        <ChevronRight
          className="mt-1.5 size-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500"
          aria-hidden="true"
        />
      )}
    </>
  );
  if (!clickable) return <div className="flex items-start gap-3 rounded-lg px-2.5 py-2">{body}</div>;
  return (
    <button
      type="button"
      onClick={() => onOpen(event.conversationId)}
      className={cx(
        "group flex w-full cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-50",
        focusRing,
      )}
    >
      {body}
    </button>
  );
}

export default function ActivityFeed({ tenantKey, seed, onOpen, className = "" }) {
  const { onAuthError } = useConsole();
  const [feed, setFeed] = useState({ events: [], connected: false, failed: false });
  const handleAuthError = useEffectEvent((error) => onAuthError(error));

  useEffect(() => {
    let cancelled = false;
    let stopped = false;
    let timer = null;
    let since = null;

    const tick = async () => {
      timer = null;
      if (cancelled || stopped) return;
      if (document.hidden) {
        timer = setTimeout(tick, FEED_INTERVAL_MS);
        return;
      }
      try {
        const res = await aiConsole.getFeed({ tenantKey, since: since || undefined });
        if (cancelled) return;
        if (res?.now) since = res.now;
        const events = Array.isArray(res?.events) ? res.events : [];
        setFeed((prev) => {
          if (!events.length && prev.connected && !prev.failed) return prev;
          return { events: mergeEvents(prev.events, events), connected: true, failed: false };
        });
        reportPollSuccess();
      } catch (error) {
        if (cancelled) return;
        if (isConsoleAuthError(error)) {
          stopped = true;
          handleAuthError(error);
          return;
        }
        reportPollFailure(error);
        setFeed((prev) => (prev.failed ? prev : { ...prev, failed: true }));
      } finally {
        if (!cancelled && !stopped) timer = setTimeout(tick, FEED_INTERVAL_MS);
      }
    };

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tenantKey]);

  const events = useMemo(() => mergeEvents(feed.events, Array.isArray(seed) ? seed : []), [feed.events, seed]);
  const loading = !feed.connected && !events.length && !feed.failed;

  return (
    <Card className={cx("flex h-110 flex-col", className)}>
      <CardHeader
        title="Live activity"
        subtitle="Messages, leads, bookings and takeovers as they happen"
        icon={Activity}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <StatusDot tone={feed.failed ? "amber" : "emerald"} pulse={!feed.failed} />
            {feed.failed ? "Retrying" : "Live"}
          </span>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 [scrollbar-width:thin]">
        {loading ? (
          <div className="space-y-3 px-2.5 py-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3">
                <Skeleton className="size-7 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : !events.length ? (
          <EmptyState
            compact
            icon={Radio}
            title="Waiting for activity"
            description="New messages, qualified leads and booked calls stream in here within seconds."
          />
        ) : (
          <ul aria-live="polite" aria-relevant="additions" className="space-y-0.5">
            <AnimatePresence initial={false}>
              {events.map((event) => (
                <Motion.li
                  key={eventKey(event)}
                  layout="position"
                  initial={{ opacity: 0, y: -8, backgroundColor: "rgba(209,250,229,0.9)" }}
                  animate={{ opacity: 1, y: 0, backgroundColor: "rgba(209,250,229,0)" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, backgroundColor: { duration: 2.4, ease: "easeOut" } }}
                  className="rounded-lg"
                >
                  <FeedItem event={event} onOpen={onOpen} />
                </Motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </Card>
  );
}

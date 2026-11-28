// Bookings: agenda grouped by IST day, status actions, .ics download, next open slots.

import { useMemo, useState } from "react";
import {
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  Download,
  ExternalLink,
  MessageSquare,
  Phone,
  RefreshCw,
  UserRound,
  UserX,
  Video,
} from "lucide-react";
import { aiConsole } from "@/lib/aiAssistantApi";
import { dayKeyIST, formatNumber, formatTimeIST, maskPhone } from "@/components/ai-assistant/shared/format";
import { useToast } from "@/components/ui/ToastContext";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  Pill,
  SelectInput,
  Segmented,
  Skeleton,
  Spinner,
  cx,
} from "../ui";
import { useConsole } from "../lib/ConsoleContext";
import { usePoll } from "../lib/hooks";
import { useNow } from "../lib/liveStore";
import {
  BOOKING_STATUS,
  bookingStatusMeta,
  errorMessage,
  modeLabel,
  relativeDayLabel,
  slugify,
  sourceLabel,
  startOfDayISTIso,
  toTime,
} from "../lib/consoleFormat";

const MODE_ICONS = { phone: Phone, video: Video, branch: Building2 };

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  ...Object.entries(BOOKING_STATUS).map(([value, meta]) => ({ value, label: meta.label })),
];

const ACTION_COPY = {
  completed: { done: "Marked as completed", fail: "Couldn't mark as completed" },
  no_show: { done: "Marked as no-show", fail: "Couldn't mark as no-show" },
  cancelled: { done: "Booking cancelled", fail: "Couldn't cancel the booking" },
};

const safeUrl = (value) => (typeof value === "string" && /^https?:\/\//i.test(value.trim()) ? value.trim() : "");

const minutesBetween = (start, end) => Math.max(0, Math.round((toTime(end) - toTime(start)) / 60000));

function BookingRow({ booking, now, busy, onAction, onCancel, onDownload, onOpenConversation }) {
  const meta = bookingStatusMeta(booking.status);
  const ModeIcon = MODE_ICONS[booking.mode] || Phone;
  const start = toTime(booking.startAt);
  const end = toTime(booking.endAt);
  const confirmed = booking.status === "confirmed";
  const inProgress = confirmed && start <= now && now < end;
  const minutesAway = Math.round((start - now) / 60000);
  const startsSoon = confirmed && minutesAway > 0 && minutesAway <= 60;
  const overdue = confirmed && end && end < now;
  const link = safeUrl(booking.meetingLink);
  const duration = minutesBetween(booking.startAt, booking.endAt);

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-start">
      <div className="flex shrink-0 items-start gap-3 lg:w-40">
        <div>
          <p className="text-sm font-semibold text-slate-900 tabular-nums">{formatTimeIST(booking.startAt)}</p>
          <p className="text-xs text-slate-500">
            to {formatTimeIST(booking.endAt)}
            {duration ? ` · ${duration} min` : ""}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {inProgress && (
              <Badge tone="emerald" icon={CalendarClock}>
                In progress
              </Badge>
            )}
            {startsSoon && <Badge tone="amber">In {minutesAway} min</Badge>}
            {overdue && <Badge tone="slate">Needs outcome</Badge>}
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-[13.5px] font-semibold text-slate-900">{booking.customerName || "Customer"}</p>
          {booking.customerPhone && <span className="text-xs text-slate-500">{maskPhone(booking.customerPhone)}</span>}
          <Pill classes={meta.classes}>{meta.label}</Pill>
        </div>
        <p className="mt-0.5 text-[13px] text-slate-600">{booking.topic || "Advisor call"}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <UserRound className="size-3.5 text-slate-400" aria-hidden="true" />
            <span className="font-medium text-slate-700">{booking.advisor?.name || "Advisor"}</span>
            {booking.advisor?.title ? `, ${booking.advisor.title}` : ""}
          </span>
          <span className="inline-flex items-center gap-1">
            <ModeIcon className="size-3.5 text-slate-400" aria-hidden="true" />
            {modeLabel(booking.mode)}
          </span>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline"
            >
              <ExternalLink className="size-3" aria-hidden="true" />
              Meeting link
            </a>
          )}
          {booking.source && <span>via {sourceLabel(booking.source)}</span>}
        </div>
        {booking.notes && <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 italic">“{booking.notes}”</p>}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 lg:max-w-85 lg:justify-end">
        {confirmed && (
          <>
            <Button
              size="xs"
              variant="secondary"
              icon={CheckCircle2}
              loading={busy === "completed"}
              disabled={Boolean(busy)}
              onClick={() => onAction(booking, "completed")}
            >
              Completed
            </Button>
            <Button
              size="xs"
              variant="secondary"
              icon={UserX}
              loading={busy === "no_show"}
              disabled={Boolean(busy)}
              onClick={() => onAction(booking, "no_show")}
            >
              No-show
            </Button>
            <Button size="xs" variant="dangerGhost" icon={CalendarX2} disabled={Boolean(busy)} onClick={() => onCancel(booking)}>
              Cancel
            </Button>
          </>
        )}
        <IconButton size="xs" variant="ghost" label="Download calendar invite (.ics)" icon={Download} onClick={() => onDownload(booking)} />
        {booking.conversationId && (
          <IconButton
            size="xs"
            variant="ghost"
            label="Open the conversation"
            icon={MessageSquare}
            onClick={() => onOpenConversation(booking.conversationId)}
          />
        )}
      </div>
    </li>
  );
}

function AvailabilityCard({ tenantKey }) {
  const [period, setPeriod] = useState("any");
  const slots = usePoll(() => aiConsole.getSlots({ tenantKey, days: 5, period: period === "any" ? undefined : period }), {
    key: `slots:${tenantKey}:${period}`,
    interval: 60000,
  });
  const data = slots.data || slots.lastData;
  const list = useMemo(() => (Array.isArray(data?.slots) ? data.slots : []), [data]);
  const days = useMemo(() => {
    const map = new Map();
    list.slice(0, 24).forEach((slot) => {
      const key = dayKeyIST(slot.startAt) || slot.dayLabel;
      if (!map.has(key)) map.set(key, { key, label: slot.dayLabel, date: slot.startAt, slots: [] });
      map.get(key).slots.push(slot);
    });
    return [...map.values()];
  }, [list]);
  const now = useNow(60000);

  return (
    <Card>
      <CardHeader
        title="Availability"
        subtitle="Next open advisor slots the assistant can offer (IST)"
        icon={CalendarClock}
        actions={
          <SelectInput size="xs" value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Time of day" className="w-29.5">
            <option value="any">Any time</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
          </SelectInput>
        }
      />
      <div className={cx("px-4 pb-4", !slots.data && slots.lastData && "opacity-60")}>
        {slots.error && !data ? (
          <ErrorState compact title="Couldn't load slots" error={slots.error} onRetry={slots.refresh} />
        ) : !data ? (
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-7 w-20" />
                  <Skeleton className="h-7 w-20" />
                  <Skeleton className="h-7 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : !days.length ? (
          <EmptyState
            compact
            icon={CalendarX2}
            title="No open slots"
            description="Advisors are fully booked or have no working hours in the next 5 days. Adjust hours on the Advisors page."
          />
        ) : (
          <div className="space-y-3.5">
            {days.map((day) => (
              <div key={day.key}>
                <p className="mb-1.5 text-xs font-semibold text-slate-600">{relativeDayLabel(day.date, now) || day.label}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {day.slots.map((slot) => (
                    <li
                      key={slot.slotId || `${slot.advisorId}-${slot.startAt}`}
                      title={`${slot.label || ""} with ${slot.advisorName || "advisor"}${slot.advisorTitle ? `, ${slot.advisorTitle}` : ""}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50/70 py-1 pr-2 pl-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80"
                    >
                      <Avatar name={slot.advisorName} seed={slot.advisorId} size="xs" className="size-5 text-[9px]" />
                      {slot.timeLabel || formatTimeIST(slot.startAt)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function BookingsView() {
  const { tenantKey, openConversation } = useConsole();
  const { success: toastSuccess, error: toastError } = useToast();
  const [scope, setScope] = useState("upcoming");
  const [status, setStatus] = useState("all");
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState({});
  const now = useNow(60000);

  const bookings = usePoll(
    () => {
      const params = { tenantKey, status: status === "all" ? undefined : status };
      if (scope === "upcoming") params.from = startOfDayISTIso(Date.now());
      if (scope === "past") params.to = new Date().toISOString();
      return aiConsole.listBookings(params);
    },
    { key: `bookings:${tenantKey}:${scope}:${status}`, interval: 15000 },
  );
  const { setData, track } = bookings;
  const data = bookings.data || bookings.lastData;
  const refetching = !bookings.data && Boolean(bookings.lastData);

  const items = useMemo(() => {
    const list = Array.isArray(data?.items) ? [...data.items] : [];
    return list.sort((a, b) => (scope === "past" ? toTime(b.startAt) - toTime(a.startAt) : toTime(a.startAt) - toTime(b.startAt)));
  }, [data, scope]);

  const days = useMemo(() => {
    const map = new Map();
    items.forEach((booking) => {
      const key = dayKeyIST(booking.startAt) || "unknown";
      if (!map.has(key)) map.set(key, { key, date: booking.startAt, items: [] });
      map.get(key).items.push(booking);
    });
    return [...map.values()];
  }, [items]);

  const summary = useMemo(() => {
    const confirmed = items.filter((b) => b.status === "confirmed" && toTime(b.endAt || b.startAt) >= now);
    const todayKey = dayKeyIST(now);
    const today = confirmed.filter((b) => dayKeyIST(b.startAt) === todayKey).length;
    const next = [...confirmed].sort((a, b) => toTime(a.startAt) - toTime(b.startAt)).find((b) => toTime(b.startAt) >= now);
    return { upcoming: confirmed.length, today, next };
  }, [items, now]);

  const applyStatus = (id, nextStatus) =>
    setData((current) =>
      current && Array.isArray(current.items)
        ? { ...current, items: current.items.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)) }
        : current,
    );

  const runAction = async (booking, nextStatus) => {
    const previous = booking.status;
    setBusy((current) => ({ ...current, [booking.id]: nextStatus }));
    applyStatus(booking.id, nextStatus);
    try {
      const res = await track(aiConsole.updateBooking(booking.id, { status: nextStatus }));
      if (res?.booking) {
        setData((current) =>
          current && Array.isArray(current.items)
            ? { ...current, items: current.items.map((item) => (item.id === booking.id ? { ...item, ...res.booking } : item)) }
            : current,
        );
      }
      toastSuccess(ACTION_COPY[nextStatus]?.done || "Booking updated", `${booking.customerName || "Customer"} · ${formatTimeIST(booking.startAt)}`);
      return true;
    } catch (err) {
      applyStatus(booking.id, previous);
      toastError(ACTION_COPY[nextStatus]?.fail || "Couldn't update the booking", errorMessage(err));
      return false;
    } finally {
      setBusy((current) => {
        const next = { ...current };
        delete next[booking.id];
        return next;
      });
    }
  };

  const confirmCancel = async () => {
    if (!confirming) return;
    const ok = await runAction(confirming, "cancelled");
    if (ok) setConfirming(null);
  };

  const download = async (booking) => {
    try {
      await aiConsole.downloadBookingIcs(booking.id, `advisor-call-${slugify(booking.customerName)}-${dayKeyIST(booking.startAt)}.ics`);
    } catch (err) {
      toastError("Couldn't download the invite", errorMessage(err));
    }
  };

  return (
    <div className="mx-auto w-full max-w-400 space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          ariaLabel="Time range"
          value={scope}
          onChange={setScope}
          options={[
            { value: "upcoming", label: "Today & upcoming" },
            { value: "past", label: "Past" },
            { value: "all", label: "All" },
          ]}
        />
        <SelectInput size="sm" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Booking status" className="w-37.5">
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>
        <div className="ml-auto flex items-center gap-3">
          {refetching && <Spinner className="size-3.5" />}
          <Button size="sm" icon={RefreshCw} onClick={bookings.refresh}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          {scope !== "past" && data && (
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3.5">
                <p className="text-xs font-semibold text-slate-500">Calls today</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{formatNumber(summary.today)}</p>
              </Card>
              <Card className="p-3.5">
                <p className="text-xs font-semibold text-slate-500">Upcoming confirmed</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{formatNumber(summary.upcoming)}</p>
              </Card>
              <Card className="min-w-0 p-3.5">
                <p className="text-xs font-semibold text-slate-500">Next call</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                  {summary.next ? `${relativeDayLabel(summary.next.startAt, now)}, ${formatTimeIST(summary.next.startAt)}` : "—"}
                </p>
                <p className="truncate text-xs text-slate-500">{summary.next?.customerName || "Nothing scheduled"}</p>
              </Card>
            </div>
          )}

          <Card className={cx("overflow-hidden", refetching && "opacity-60")}>
            {bookings.error && !data ? (
              <ErrorState title="Couldn't load bookings" error={bookings.error} onRetry={bookings.refresh} />
            ) : !data ? (
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex gap-4 px-4 py-4">
                    <Skeleton className="h-10 w-24" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !days.length ? (
              <EmptyState
                icon={CalendarCheck}
                title={scope === "past" ? "No past bookings" : "No calls booked yet"}
                description={
                  scope === "past"
                    ? "Completed, cancelled and no-show calls will be listed here."
                    : "When a customer is ready to invest, the assistant offers real advisor slots and books the call — it appears here instantly."
                }
              />
            ) : (
              <div>
                {days.map((day) => (
                  <section key={day.key} aria-label={relativeDayLabel(day.date, now)}>
                    <header className="sticky top-0 z-10 flex items-center justify-between border-y border-slate-100 bg-slate-50/95 px-4 py-2 backdrop-blur first:border-t-0">
                      <h3 className="text-xs font-semibold text-slate-700">{relativeDayLabel(day.date, now)}</h3>
                      <span className="text-[11px] font-medium text-slate-400">
                        {day.items.length} call{day.items.length === 1 ? "" : "s"}
                      </span>
                    </header>
                    <ul className="divide-y divide-slate-100">
                      {day.items.map((booking) => (
                        <BookingRow
                          key={booking.id}
                          booking={booking}
                          now={now}
                          busy={busy[booking.id]}
                          onAction={runAction}
                          onCancel={setConfirming}
                          onDownload={download}
                          onOpenConversation={openConversation}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <AvailabilityCard tenantKey={tenantKey} />
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirming)}
        title="Cancel this advisor call?"
        message={
          confirming
            ? `${confirming.customerName || "The customer"}'s call on ${relativeDayLabel(confirming.startAt, now)} at ${formatTimeIST(confirming.startAt)} will be cancelled and the slot freed up for other customers.`
            : ""
        }
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        loading={Boolean(confirming && busy[confirming.id])}
        onConfirm={confirmCancel}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}

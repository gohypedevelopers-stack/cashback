import { memo } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { ArrowUpRight, CalendarCheck, Hand, Headset, Inbox, Search, SearchX, X } from "lucide-react";
import { plainText, truncate } from "@/components/ai-assistant/shared/format";
import {
  Avatar,
  Badge,
  Button,
  ChannelIcon,
  CountBadge,
  EmptyState,
  ErrorState,
  ScorePill,
  Skeleton,
  Spinner,
  TimeAgo,
  cx,
  focusRing,
} from "../ui";
import {
  contactName,
  contactSubline,
  isNeedsHuman,
  isSampleConversation,
  leadStageOf,
  previewPrefix,
} from "../lib/consoleFormat";

export const INBOX_FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "ai", label: "AI handling", test: (c) => c.status === "ai_active" },
  { key: "human", label: "Human", test: (c) => c.status === "human_takeover" },
  { key: "needs", label: "Needs human", test: isNeedsHuman },
  { key: "closed", label: "Closed", test: (c) => c.status === "closed" },
];

const ConversationRow = memo(function ConversationRow({ conversation, selected, onSelect }) {
  const name = contactName(conversation);
  const unread = !selected && (conversation.unreadCount || 0) > 0;
  const booked = Boolean(conversation.upcomingBooking) || leadStageOf(conversation.lead) === "booked";
  const needsHuman = isNeedsHuman(conversation);
  const prefix = previewPrefix(conversation.lastMessageSender);
  const preview = plainText(conversation.lastMessagePreview || "");

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      aria-current={selected ? "true" : undefined}
      className={cx(
        "group relative flex w-full cursor-pointer gap-3 px-3 py-3 text-left transition-colors",
        selected ? "bg-emerald-50/70" : "hover:bg-slate-50",
        "outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-inset",
      )}
    >
      {selected && <span className="absolute inset-y-0 left-0 w-[3px] bg-emerald-500" aria-hidden="true" />}
      <span className="relative mt-0.5 shrink-0">
        <Avatar name={name} seed={conversation.id} size="md" />
        <span className="absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full bg-white ring-1 ring-slate-200">
          <ChannelIcon channel={conversation.channel} className="size-2.5" />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={cx("truncate text-[13px]", unread ? "font-bold text-slate-900" : "font-semibold text-slate-800")}>
            {name}
          </span>
          <ScorePill score={conversation.lead?.score} />
          <TimeAgo value={conversation.lastMessageAt} className="ml-auto shrink-0 text-[11px] text-slate-400" />
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="truncate">{contactSubline(conversation)}</span>
          {conversation.status === "human_takeover" && (
            <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-sky-700">
              <Headset className="size-3" aria-hidden="true" />
              {conversation.assignedAgentName || "Human"}
            </span>
          )}
          {conversation.status === "closed" && <span className="shrink-0 font-semibold text-slate-400">Closed</span>}
        </span>
        <span className="mt-1 flex items-center gap-2">
          <span className={cx("min-w-0 flex-1 truncate text-xs", unread ? "font-medium text-slate-700" : "text-slate-500")}>
            {preview ? (
              <>
                {prefix && <span className="font-semibold text-slate-400">{prefix}: </span>}
                {truncate(preview, 120)}
              </>
            ) : (
              <span className="text-slate-400 italic">No messages yet</span>
            )}
          </span>
          {unread && (
            <CountBadge
              count={conversation.unreadCount}
              title={`${conversation.unreadCount} unread`}
              className="shrink-0"
            />
          )}
        </span>
        {(needsHuman || booked || isSampleConversation(conversation)) && (
          <span className="mt-1.5 flex flex-wrap items-center gap-1">
            {needsHuman && (
              <Badge tone="amber" icon={Hand}>
                Needs human
              </Badge>
            )}
            {booked && (
              <Badge tone="emerald" icon={CalendarCheck}>
                Booked
              </Badge>
            )}
            {isSampleConversation(conversation) && <Badge tone="slate">Sample</Badge>}
          </span>
        )}
      </span>
    </button>
  );
});

function ListSkeleton() {
  return (
    <div className="divide-y divide-slate-100" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="flex gap-3 px-3 py-3.5">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ConversationList({
  items,
  total,
  loading,
  error,
  onRetry,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  counts,
  search,
  onSearchChange,
  searching,
  simulatorLink,
}) {
  const hasSearch = search.trim().length > 0;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-2.5 border-b border-slate-200 px-3 pt-3 pb-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search name, phone or lead…"
            aria-label="Search conversations"
            className="h-9 w-full rounded-lg border-0 bg-slate-100/80 pr-8 pl-8 text-[13px] text-slate-900 ring-1 ring-transparent ring-inset outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500"
          />
          <span className="absolute top-1/2 right-2 -translate-y-1/2">
            {searching ? (
              <Spinner className="size-3.5" />
            ) : hasSearch ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
                className={cx("grid size-5 cursor-pointer place-items-center rounded text-slate-400 hover:text-slate-700", focusRing)}
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </span>
        </div>
        <div role="tablist" aria-label="Filter conversations" className="-mx-3 flex gap-1 overflow-x-auto px-3 [scrollbar-width:none]">
          {INBOX_FILTERS.map((option) => {
            const active = option.key === filter;
            const count = counts?.[option.key] ?? 0;
            const attention = option.key === "needs" && count > 0;
            return (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onFilterChange(option.key)}
                className={cx(
                  "inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap ring-1 transition-colors",
                  active
                    ? "bg-slate-900 text-white ring-slate-900"
                    : attention
                      ? "bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100"
                      : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-slate-900",
                  focusRing,
                )}
              >
                {option.label}
                <span
                  className={cx(
                    "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                    active ? "bg-white/20 text-white" : attention ? "bg-amber-200/70 text-amber-900" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        {loading ? (
          <ListSkeleton />
        ) : error && !items ? (
          <ErrorState compact title="Couldn't load conversations" error={error} onRetry={onRetry} />
        ) : !items?.length ? (
          hasSearch ? (
            <EmptyState compact icon={SearchX} title="No matches" description={`Nothing matches “${search.trim()}” in this view.`} />
          ) : filter === "all" ? (
            <EmptyState
              compact
              icon={Inbox}
              title="No conversations yet"
              description="Conversations from WhatsApp and the web simulator appear here the moment a customer says hi."
              action={
                <Button size="sm" icon={ArrowUpRight} onClick={() => window.open(simulatorLink, "_blank", "noopener")}>
                  Open the simulator
                </Button>
              }
            />
          ) : (
            <EmptyState compact icon={Inbox} title="Nothing here right now" description="Try another filter — new chats show up live." />
          )
        ) : (
          <ul className="divide-y divide-slate-100">
            <AnimatePresence initial={false}>
              {items.map((conversation) => (
                <Motion.li
                  key={conversation.id}
                  layout="position"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ConversationRow conversation={conversation} selected={conversation.id === selectedId} onSelect={onSelect} />
                </Motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {!loading && items?.length > 0 && (
        <p className="shrink-0 border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
          {items.length} shown{total && total > items.length ? ` · ${total} total` : ""} · updates live
        </p>
      )}
    </div>
  );
}

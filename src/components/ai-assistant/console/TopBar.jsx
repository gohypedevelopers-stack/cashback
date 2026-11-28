import { useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Cpu, Headset, Menu, Pencil, Search, Sparkles } from "lucide-react";
import { aiConsole } from "@/lib/aiAssistantApi";
import { plainText, truncate } from "@/components/ai-assistant/shared/format";
import { Avatar, ChannelIcon, IconButton, Kbd, Pill, ScorePill, Spinner, StatusDot, Tooltip, cx, focusRing } from "./ui";
import { useDebouncedValue, useDismiss, useHotkey, usePoll } from "./lib/hooks";
import { useLiveStatus, useNow } from "./lib/liveStore";
import { contactName, contactSubline, conversationStatusMeta, prettyModel } from "./lib/consoleFormat";

// ---------------------------------------------------------------------------
// Live indicator
// ---------------------------------------------------------------------------

function LiveIndicator() {
  const live = useLiveStatus();
  const now = useNow(1000);
  const age = live.lastOkAt ? Math.max(0, Math.round((now - live.lastOkAt) / 1000)) : null;
  const updated =
    age === null ? "" : age < 2 ? "updated just now" : age < 90 ? `updated ${age}s ago` : `updated ${Math.round(age / 60)}m ago`;

  // "Live" while any poll succeeded recently, so one failing endpoint doesn't make it flicker.
  const fresh = age !== null && age <= 15;
  let tone = "slate";
  let label = "Connecting…";
  if (fresh) {
    tone = "emerald";
    label = "Live";
  } else if (live.failing) {
    tone = "amber";
    label = "Reconnecting…";
  } else if (live.lastOkAt) {
    tone = "amber";
    label = "Paused";
  }

  return (
    <Tooltip
      align="end"
      side="bottom"
      content={
        !fresh && live.failing
          ? `Last request failed: ${live.message}. Retrying automatically.`
          : "The console polls the assistant every few seconds — new messages, leads and bookings appear on their own."
      }
      wide
    >
      <span
        tabIndex={0}
        role="status"
        className={cx(
          "inline-flex h-8 items-center gap-2 rounded-full bg-white px-3 text-xs font-semibold ring-1 ring-slate-200",
          focusRing,
        )}
      >
        <StatusDot tone={tone} pulse={tone === "emerald"} />
        <span className={tone === "amber" ? "text-amber-700" : tone === "emerald" ? "text-emerald-700" : "text-slate-500"}>
          {label}
        </span>
        {updated && <span className="hidden font-medium text-slate-400 tabular-nums xl:inline">{updated}</span>}
      </span>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Engine badge
// ---------------------------------------------------------------------------

function EngineBadge({ llm }) {
  const configured = Boolean(llm?.configured);
  const name = configured ? prettyModel(llm?.model) || "Claude" : "Rules engine";
  const detail = configured
    ? `Answers are written by ${name} via the Anthropic API · effort ${llm?.effort || "default"}${llm?.fastMode ? " · fast mode on" : ""}. If Claude is unavailable, the rules engine answers instead.`
    : "No Claude API key is configured, so the built-in rules engine is answering. Add ANTHROPIC_API_KEY on the server to switch to Claude.";
  return (
    <Tooltip content={detail} align="end" side="bottom" wide>
      <span
        tabIndex={0}
        className={cx(
          "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1",
          configured ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200",
          focusRing,
        )}
      >
        {configured ? <Sparkles className="size-3.5" aria-hidden="true" /> : <Cpu className="size-3.5" aria-hidden="true" />}
        <span className="hidden sm:inline">{name}</span>
        <span className="sm:hidden">{configured ? "Claude" : "Rules"}</span>
      </span>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Agent display name (stored in localStorage by the shell)
// ---------------------------------------------------------------------------

function AgentChip({ agentName, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(agentName);
  const containerRef = useRef(null);
  useDismiss(containerRef, () => setEditing(false), editing);

  const startEditing = () => {
    setDraft(agentName);
    setEditing(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => (editing ? setEditing(false) : startEditing())}
        aria-expanded={editing}
        aria-label={`Signed in as ${agentName}. Change display name`}
        className={cx(
          "group inline-flex h-8 cursor-pointer items-center gap-2 rounded-full bg-white pr-2.5 pl-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50",
          focusRing,
        )}
      >
        <Avatar name={agentName} size="xs" seed={`agent:${agentName}`} />
        <span className="hidden max-w-30 truncate md:inline">{agentName}</span>
        <Pencil className="size-3 text-slate-400 group-hover:text-slate-600" aria-hidden="true" />
      </button>
      <AnimatePresence>
        {editing && (
          <Motion.form
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            onSubmit={(event) => {
              event.preventDefault();
              onChange(draft);
              setEditing(false);
            }}
            className="absolute top-full right-0 z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
          >
            <label htmlFor="console-agent-name" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Headset className="size-3.5 text-slate-400" aria-hidden="true" />
              Your display name
            </label>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
              Shown on takeovers and on replies you send to customers.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                id="console-agent-name"
                autoFocus
                maxLength={40}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="e.g. Priya (Advisor)"
                className="h-8 min-w-0 flex-1 rounded-lg border-0 px-2.5 text-[13px] text-slate-900 ring-1 ring-slate-200 ring-inset outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className={cx(
                  "h-8 cursor-pointer rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800",
                  focusRing,
                )}
              >
                Save
              </button>
            </div>
          </Motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversation search (server search, keyboard navigable)
// ---------------------------------------------------------------------------

function GlobalSearch({ tenantKey, onOpenConversation }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const term = useDebouncedValue(query.trim(), 250);
  const enabled = open && term.length >= 2;

  useDismiss(containerRef, () => setOpen(false), open);
  useHotkey("/", (event) => {
    event.preventDefault();
    inputRef.current?.focus();
  });

  const search = usePoll(() => aiConsole.listConversations({ tenantKey, search: term, limit: 8 }), {
    key: `global-search:${tenantKey}:${term}`,
    enabled,
  });
  const items = (search.data || (enabled ? search.lastData : null))?.items || [];
  const showPanel = open && query.trim().length > 0;

  const choose = (conversation) => {
    if (!conversation) return;
    onOpenConversation(conversation.id);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, Math.max(items.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(items[Math.min(active, items.length - 1)]);
    } else if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="console-search-results"
        aria-autocomplete="list"
        aria-label="Search conversations"
        placeholder="Search conversations…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-9 w-full rounded-lg border-0 bg-slate-100/80 pr-10 pl-9 text-[13px] text-slate-900 ring-1 ring-transparent ring-inset outline-none transition placeholder:text-slate-400 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-emerald-500"
      />
      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2">
        {search.loading && enabled ? <Spinner className="size-3.5" /> : <Kbd>/</Kbd>}
      </span>

      <AnimatePresence>
        {showPanel && (
          <Motion.div
            id="console-search-results"
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 z-50 mt-2 w-[min(440px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
          >
            {query.trim().length < 2 ? (
              <p className="px-3 py-3 text-xs text-slate-500">Type at least two characters — name, phone or lead name.</p>
            ) : search.error ? (
              <p className="px-3 py-3 text-xs text-rose-600">Search failed: {search.error.message}</p>
            ) : !items.length && !search.loading ? (
              <p className="px-3 py-3 text-xs text-slate-500">No conversations match “{query.trim()}”.</p>
            ) : (
              <ul className={cx(search.loading && "opacity-60")}>
                {items.map((conversation, index) => {
                  const status = conversationStatusMeta(conversation.status);
                  return (
                    <li key={conversation.id} role="option" aria-selected={index === active}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(index)}
                        onClick={() => choose(conversation)}
                        className={cx(
                          "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left",
                          index === active ? "bg-slate-100" : "hover:bg-slate-50",
                        )}
                      >
                        <Avatar name={contactName(conversation)} seed={conversation.id} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-semibold text-slate-900">{contactName(conversation)}</span>
                            <ChannelIcon channel={conversation.channel} className="size-3" />
                            <ScorePill score={conversation.lead?.score} />
                          </span>
                          <span className="block truncate text-[11px] text-slate-500">
                            {contactSubline(conversation)}
                            {conversation.lastMessagePreview
                              ? ` · ${truncate(plainText(conversation.lastMessagePreview), 60)}`
                              : ""}
                          </span>
                        </span>
                        <Pill classes={status.classes}>{status.short}</Pill>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------

export default function TopBar({ title, subtitle, onOpenMenu, llm, agentName, onAgentNameChange, tenantKey, onOpenConversation }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-3 backdrop-blur sm:px-4 lg:px-6">
      <IconButton label="Open navigation" icon={Menu} onClick={onOpenMenu} className="lg:hidden" variant="ghost" />
      <div className="min-w-0 shrink">
        <h1 className="truncate text-[15px] font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="hidden truncate text-[11px] text-slate-500 2xl:block">{subtitle}</p>}
      </div>
      <div className="hidden min-w-0 flex-1 justify-center px-2 md:flex">
        <GlobalSearch tenantKey={tenantKey} onOpenConversation={onOpenConversation} />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <LiveIndicator />
        <EngineBadge llm={llm} />
        <AgentChip agentName={agentName} onChange={onAgentNameChange} />
      </div>
    </header>
  );
}


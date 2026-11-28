// Live inbox: conversation list · live thread · customer & lead.
// ≥1280 px three panes; 1024–1279 px list + thread (lead in a drawer); <1024 px one pane at a time.

import { useMemo, useState } from "react";
import { ArrowUpRight, Bot, Eye, Headset, MessagesSquare, Sparkles } from "lucide-react";
import { aiConsole } from "@/lib/aiAssistantApi";
import { Button, cx } from "../ui";
import { useConsole, useInboxData } from "../lib/ConsoleContext";
import { useDebouncedValue, usePoll } from "../lib/hooks";
import ConversationList, { INBOX_FILTERS } from "./ConversationList";
import ConversationWorkspace from "./ConversationWorkspace";

const FILTER_BY_KEY = Object.fromEntries(INBOX_FILTERS.map((filter) => [filter.key, filter]));

function ThreadPlaceholder({ simulatorLink, counts }) {
  return (
    <div className="hidden min-w-0 flex-1 items-center justify-center bg-[#f5f6f8] bg-[radial-gradient(#e3e8ef_1px,transparent_1px)] bg-size-[18px_18px] p-8 lg:flex">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200">
          <MessagesSquare className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-slate-900">Pick a conversation</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          Watch the assistant answer in real time, open <span className="font-semibold text-slate-700">Why the AI said this</span> on
          any reply, and take over whenever a human touch is needed.
        </p>
        <ul className="mx-auto mt-5 grid max-w-sm gap-2 text-left text-[13px] text-slate-600">
          <li className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
            <Eye className="size-4 text-slate-400" aria-hidden="true" />
            Every chat updates live — no refresh needed
          </li>
          <li className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
            <Sparkles className="size-4 text-emerald-600" aria-hidden="true" />
            Tools, knowledge and cost behind every AI turn
          </li>
          <li className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
            <Headset className="size-4 text-sky-600" aria-hidden="true" />
            Take over, reply as yourself, then hand back to <Bot className="inline size-3.5" aria-hidden="true" /> AI
          </li>
        </ul>
        {counts?.needs > 0 && (
          <p className="mt-4 text-[13px] font-semibold text-amber-700">
            {counts.needs} conversation{counts.needs === 1 ? "" : "s"} waiting for a human
          </p>
        )}
        <Button
          className="mt-5"
          variant="secondary"
          size="sm"
          icon={ArrowUpRight}
          onClick={() => window.open(simulatorLink, "_blank", "noopener")}
        >
          Chat as a customer in the simulator
        </Button>
      </div>
    </div>
  );
}

export default function InboxView() {
  const { tenantKey, conversationId, selectConversation, simulatorLink } = useConsole();
  const inbox = useInboxData();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search.trim(), 300);

  const searchPoll = usePoll(() => aiConsole.listConversations({ tenantKey, search: term, limit: 50 }), {
    key: `inbox-search:${tenantKey}:${term}`,
    interval: 4000,
    enabled: term.length > 0,
  });

  const source = term ? searchPoll.data || searchPoll.lastData : inbox?.data || inbox?.lastData;
  const allItems = useMemo(() => (Array.isArray(source?.items) ? source.items : null), [source]);
  const loading = term ? !source && !searchPoll.error : !source && !inbox?.error;
  const error = term ? searchPoll.error : inbox?.error;

  const counts = useMemo(() => {
    const list = allItems || [];
    return Object.fromEntries(INBOX_FILTERS.map((option) => [option.key, list.filter(option.test).length]));
  }, [allItems]);

  const items = useMemo(() => (allItems ? allItems.filter((FILTER_BY_KEY[filter] || INBOX_FILTERS[0]).test) : null), [allItems, filter]);
  const selectedSummary = useMemo(
    () => (allItems || []).find((conversation) => conversation.id === conversationId) || null,
    [allItems, conversationId],
  );

  const handleSelect = (id) => {
    selectConversation(id);
    inbox?.patchConversation?.(id, { unreadCount: 0 });
  };

  return (
    <div className="flex h-full min-h-0">
      <aside
        className={cx(
          "w-full min-w-0 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex lg:w-72 xl:w-85",
          conversationId ? "hidden" : "flex",
        )}
        aria-label="Conversations"
      >
        <ConversationList
          items={items}
          total={source?.total}
          loading={loading}
          error={error}
          onRetry={term ? searchPoll.refresh : inbox?.refresh}
          selectedId={conversationId}
          onSelect={handleSelect}
          filter={filter}
          onFilterChange={setFilter}
          counts={counts}
          search={search}
          onSearchChange={setSearch}
          searching={Boolean(term) && searchPoll.loading}
          simulatorLink={simulatorLink}
        />
      </aside>
      {conversationId ? (
        <ConversationWorkspace
          key={conversationId}
          conversationId={conversationId}
          summary={selectedSummary}
          onBack={() => selectConversation(null)}
        />
      ) : (
        <ThreadPlaceholder simulatorLink={simulatorLink} counts={counts} />
      )}
    </div>
  );
}

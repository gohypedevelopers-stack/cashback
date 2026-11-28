// Leads: pipeline (new → engaged → qualified → booked → converted / lost) + sortable table.
// Stage changes use a dropdown on each card (no drag-and-drop dependency) and are optimistic.

import { useMemo, useState } from "react";
import { ArrowDownWideNarrow, Columns3, IndianRupee, RefreshCw, Search, Table2, Target, Users } from "lucide-react";
import { aiConsole } from "@/lib/aiAssistantApi";
import { LEAD_STAGES, STAGE_BY_KEY, formatINR, formatNumber, maskPhone, stageClasses } from "@/components/ai-assistant/shared/format";
import { useToast } from "@/components/ui/ToastContext";
import {
  Button,
  Card,
  ChannelIcon,
  EmptyState,
  ErrorState,
  Pill,
  ScorePill,
  Segmented,
  SelectInput,
  Skeleton,
  Spinner,
  TimeAgo,
  cx,
  focusRing,
} from "../ui";
import { useConsole } from "../lib/ConsoleContext";
import { useDebouncedValue, usePoll } from "../lib/hooks";
import { asArray, errorMessage, frequencyLabel, humanize, leadStageOf, riskLabel, toTime } from "../lib/consoleFormat";

const STAGE_DOT = {
  slate: "bg-slate-400",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

const leadName = (lead) =>
  lead?.name ||
  lead?.conversation?.contactName ||
  maskPhone(lead?.phone || lead?.conversation?.contactPhone) ||
  "Unnamed lead";

const leadContact = (lead) => {
  const channel = lead?.conversation?.channel || lead?.source;
  if (channel === "simulator") return "Web simulator";
  return maskPhone(lead?.phone || lead?.conversation?.contactPhone || lead?.conversation?.externalUserId) || "WhatsApp";
};

const leadAmount = (lead) => {
  if (lead?.investmentAmount === null || lead?.investmentAmount === undefined || lead?.investmentAmount === "") return "";
  const amount = formatINR(lead.investmentAmount, { compact: true });
  const freq = lead.investmentFrequency === "monthly_sip" ? "/mo SIP" : frequencyLabel(lead.investmentFrequency);
  return lead.investmentFrequency === "monthly_sip" ? `${amount}${freq}` : [amount, freq].filter(Boolean).join(" · ");
};

const conversationOf = (lead) => lead?.conversationId || lead?.conversation?.id || null;

const sortLeads = (items, sort) =>
  [...items].sort((a, b) => {
    if (sort === "recent") return toTime(b.lastActivityAt) - toTime(a.lastActivityAt);
    const diff = (Number(b.score) || 0) - (Number(a.score) || 0);
    return diff || toTime(b.lastActivityAt) - toTime(a.lastActivityAt);
  });

const moveLead = (data, id, from, to) => {
  if (!data || !Array.isArray(data.items)) return data;
  const counts = { ...(data.stageCounts || {}) };
  if (from && counts[from] !== undefined) counts[from] = Math.max(0, (counts[from] || 0) - 1);
  counts[to] = (counts[to] || 0) + 1;
  return {
    ...data,
    stageCounts: counts,
    items: data.items.map((lead) => (lead.id === id ? { ...lead, intentStage: to } : lead)),
  };
};

const replaceLead = (data, lead) =>
  data && Array.isArray(data.items)
    ? { ...data, items: data.items.map((item) => (item.id === lead.id ? { ...item, ...lead } : item)) }
    : data;

function StageSelect({ lead, onChange, size = "xs", className = "" }) {
  return (
    <SelectInput
      size={size}
      value={leadStageOf(lead) || "new"}
      onChange={(event) => onChange(lead, event.target.value)}
      aria-label={`Stage for ${leadName(lead)}`}
      className={className}
      onClick={(event) => event.stopPropagation()}
    >
      {LEAD_STAGES.map((stage) => (
        <option key={stage.key} value={stage.key}>
          {stage.label}
        </option>
      ))}
    </SelectInput>
  );
}

function LeadCard({ lead, onOpen, onStageChange }) {
  const amount = leadAmount(lead);
  const goals = asArray(lead.goals);
  const canOpen = Boolean(conversationOf(lead));
  return (
    <article className="rounded-lg bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200 transition hover:shadow-md hover:ring-slate-300">
      <button
        type="button"
        onClick={() => onOpen(lead)}
        disabled={!canOpen}
        className={cx("block w-full cursor-pointer rounded-t-lg px-3 pt-3 pb-2 text-left disabled:cursor-default", focusRing)}
        title={canOpen ? "Open the conversation" : undefined}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-slate-900">{leadName(lead)}</p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
              <ChannelIcon channel={lead.conversation?.channel || lead.source} className="size-3 shrink-0" />
              <span className="truncate">{leadContact(lead)}</span>
              {lead.city && <span className="truncate">· {lead.city}</span>}
            </p>
          </div>
          <ScorePill score={lead.score} />
        </div>
        {(amount || goals.length > 0 || lead.company) && (
          <div className="mt-2 space-y-1 text-xs">
            {amount && (
              <p className="flex items-center gap-1.5 font-semibold text-slate-700">
                <IndianRupee className="size-3 text-slate-400" aria-hidden="true" />
                {amount}
              </p>
            )}
            {goals.length > 0 && (
              <p className="flex items-center gap-1.5 truncate text-slate-600">
                <Target className="size-3 shrink-0 text-slate-400" aria-hidden="true" />
                <span className="truncate">
                  {humanize(goals[0])}
                  {goals.length > 1 ? ` +${goals.length - 1}` : ""}
                </span>
              </p>
            )}
            {!goals.length && lead.company && <p className="truncate text-slate-600">{lead.company}</p>}
          </div>
        )}
      </button>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
        <TimeAgo value={lead.lastActivityAt || lead.updatedAt} className="text-[11px] text-slate-400" />
        <StageSelect lead={lead} onChange={onStageChange} className="w-31" />
      </div>
    </article>
  );
}

function PipelineSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {LEAD_STAGES.map((stage) => (
        <div key={stage.key} className="min-w-62.5 flex-1 space-y-2 rounded-xl bg-slate-100/70 p-2.5 ring-1 ring-slate-200/70">
          <Skeleton className="h-4 w-24" />
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-24 bg-white" />
          ))}
        </div>
      ))}
    </div>
  );
}

function SortHeader({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "inline-flex cursor-pointer items-center gap-1 rounded font-semibold",
        active ? "text-slate-900" : "text-slate-500 hover:text-slate-800",
        focusRing,
      )}
    >
      {label}
      <ArrowDownWideNarrow className={cx("size-3.5", active ? "text-emerald-600" : "text-slate-300")} aria-hidden="true" />
    </button>
  );
}

export default function LeadsView() {
  const { tenantKey, openConversation } = useConsole();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [view, setView] = useState("pipeline");
  const [sort, setSort] = useState("score");
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search.trim(), 300);

  const leads = usePoll(() => aiConsole.listLeads({ tenantKey, search: term || undefined, limit: 200, sort }), {
    key: `leads:${tenantKey}:${term}:${sort}`,
    interval: 10000,
  });
  const { setData, track } = leads;
  const data = leads.data || leads.lastData;
  const refetching = !leads.data && Boolean(leads.lastData);
  const items = useMemo(() => sortLeads(Array.isArray(data?.items) ? data.items : [], sort), [data, sort]);
  const stageCounts = data?.stageCounts || {};

  const grouped = useMemo(() => {
    const map = Object.fromEntries(LEAD_STAGES.map((stage) => [stage.key, []]));
    items.forEach((lead) => {
      const stage = STAGE_BY_KEY[leadStageOf(lead)] ? leadStageOf(lead) : "new";
      map[stage].push(lead);
    });
    return map;
  }, [items]);

  const total = data?.total ?? items.length;
  const qualified = (stageCounts.qualified || 0) + (stageCounts.booked || 0) + (stageCounts.converted || 0);

  const open = (lead) => {
    const id = conversationOf(lead);
    if (id) openConversation(id);
    else toastInfo("No conversation linked", "This lead isn't attached to a conversation.");
  };

  const changeStage = async (lead, stage) => {
    const previous = leadStageOf(lead) || "new";
    if (previous === stage) return;
    setData((current) => moveLead(current, lead.id, previous, stage));
    try {
      const res = await track(aiConsole.updateLead(lead.id, { intentStage: stage }));
      if (res?.lead) setData((current) => replaceLead(current, res.lead));
      toastSuccess(`Moved to ${STAGE_BY_KEY[stage]?.label || stage}`, leadName(lead));
    } catch (err) {
      setData((current) => moveLead(current, lead.id, stage, previous));
      toastError("Couldn't change the stage", errorMessage(err));
    }
  };

  return (
    <div className="mx-auto w-full max-w-450 space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search leads by name or phone…"
            aria-label="Search leads"
            className="h-9 w-full rounded-lg border-0 bg-white pr-3 pl-8 text-[13px] text-slate-900 shadow-[0_1px_1px_rgba(15,23,42,0.03)] ring-1 ring-slate-200 ring-inset outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <Segmented
          ariaLabel="Layout"
          value={view}
          onChange={setView}
          options={[
            { value: "pipeline", label: "Pipeline", icon: Columns3 },
            { value: "table", label: "Table", icon: Table2 },
          ]}
        />
        <Segmented
          ariaLabel="Sort leads"
          value={sort}
          onChange={setSort}
          options={[
            { value: "score", label: "Top score" },
            { value: "recent", label: "Most recent" },
          ]}
        />
        <div className="ml-auto flex items-center gap-3">
          {refetching && <Spinner className="size-3.5" />}
          {data && (
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{formatNumber(total)}</span> leads ·{" "}
              <span className="font-semibold text-slate-800">{formatNumber(qualified)}</span> qualified or better
            </p>
          )}
          <Button size="sm" icon={RefreshCw} onClick={leads.refresh}>
            Refresh
          </Button>
        </div>
      </div>

      {leads.error && !data ? (
        <Card>
          <ErrorState title="Couldn't load leads" error={leads.error} onRetry={leads.refresh} />
        </Card>
      ) : !data ? (
        <PipelineSkeleton />
      ) : !items.length ? (
        <Card>
          <EmptyState
            icon={Users}
            title={term ? "No leads match your search" : "No leads yet"}
            description={
              term
                ? "Try a different name or phone number."
                : "The assistant builds a lead profile as customers share their goals, amounts and timelines — they land here automatically."
            }
          />
        </Card>
      ) : view === "pipeline" ? (
        <div className={cx("-mx-1 flex gap-3 overflow-x-auto px-1 pb-3 [scrollbar-width:thin]", refetching && "opacity-60")}>
          {LEAD_STAGES.map((stage) => {
            const column = grouped[stage.key] || [];
            const count = stageCounts[stage.key] ?? column.length;
            return (
              <section
                key={stage.key}
                aria-label={`${stage.label}: ${count} leads`}
                className="flex min-w-62.5 flex-1 flex-col rounded-xl bg-slate-100/70 ring-1 ring-slate-200/70"
              >
                <header className="flex items-center gap-2 px-3 pt-2.5 pb-2">
                  <span className={cx("size-2 rounded-full", STAGE_DOT[stage.tone] || STAGE_DOT.slate)} aria-hidden="true" />
                  <h3 className="text-xs font-semibold text-slate-700">{stage.label}</h3>
                  <span className="ml-auto rounded-full bg-white px-1.5 text-[11px] font-bold text-slate-500 tabular-nums ring-1 ring-slate-200">
                    {formatNumber(count)}
                  </span>
                </header>
                <div className="max-h-[calc(100dvh-15rem)] min-h-30 flex-1 space-y-2 overflow-y-auto px-2 pb-2 [scrollbar-width:thin]">
                  {column.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} onOpen={open} onStageChange={changeStage} />
                  ))}
                  {!column.length && <p className="px-2 py-8 text-center text-xs text-slate-400">No leads in this stage</p>}
                  {count > column.length && column.length > 0 && (
                    <p className="pt-1 text-center text-[11px] text-slate-400">+{formatNumber(count - column.length)} more</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <Card className={cx("overflow-hidden", refetching && "opacity-60")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-230 text-left text-[13px]">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Lead
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    Stage
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    <SortHeader label="Score" active={sort === "score"} onClick={() => setSort("score")} />
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    Investment
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    Goals
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    Risk
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    <SortHeader label="Last activity" active={sort === "recent"} onClick={() => setSort("recent")} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((lead) => {
                  const stage = leadStageOf(lead) || "new";
                  return (
                    <tr key={lead.id} className="group hover:bg-slate-50/70">
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => open(lead)}
                          className={cx("flex min-w-0 cursor-pointer items-center gap-2 rounded text-left", focusRing)}
                        >
                          <ChannelIcon channel={lead.conversation?.channel || lead.source} className="size-3.5 shrink-0" />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-slate-900 group-hover:text-emerald-700">
                              {leadName(lead)}
                            </span>
                            <span className="block truncate text-[11px] text-slate-500">
                              {leadContact(lead)}
                              {lead.city ? ` · ${lead.city}` : ""}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Pill classes={stageClasses(stage)} className="hidden 2xl:inline-flex">
                            {STAGE_BY_KEY[stage]?.label || humanize(stage)}
                          </Pill>
                          <StageSelect lead={lead} onChange={changeStage} className="w-32" />
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <ScorePill score={lead.score} />
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{leadAmount(lead) || <span className="text-slate-300">—</span>}</td>
                      <td className="max-w-55 truncate px-3 py-2.5 text-slate-600">
                        {asArray(lead.goals).map(humanize).join(", ") || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{riskLabel(lead.riskProfile) || <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-2.5 text-slate-500">
                        <TimeAgo value={lead.lastActivityAt || lead.updatedAt} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

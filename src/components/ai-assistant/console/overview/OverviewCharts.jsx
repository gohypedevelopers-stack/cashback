// Overview charts. Palette validated with the dataviz validator (light surface):
// conversations #257de0 · calls booked #059669 · messages #e8590c (all-pairs PASS),
// funnel = ordinal blue ramp (PASS). One y-axis per chart: messages live in their own
// synced panel instead of a second axis.

import { memo, useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Filter, MessageSquareText, Split, TrendingUp } from "lucide-react";
import { formatNumber, formatPercent } from "@/components/ai-assistant/shared/format";
import { Card, CardHeader, EmptyState, Segmented, Skeleton, cx } from "../ui";
import { longDateLabel, shortDateLabel } from "../lib/consoleFormat";

export const CHART_COLORS = {
  conversations: "#257de0",
  bookings: "#059669",
  messages: "#e8590c",
  bar: "#257de0",
  grid: "#e9eef4",
  axis: "#cbd5e1",
  tick: "#64748b",
  ordinal: ["#84b9f3", "#519ced", "#257de0", "#1b64be", "#0f4a96"],
};

const SERIES = [
  { key: "conversations", label: "Conversations", color: CHART_COLORS.conversations, mark: "line" },
  { key: "bookings", label: "Calls booked", color: CHART_COLORS.bookings, mark: "bar" },
  { key: "messages", label: "Messages handled", color: CHART_COLORS.messages, mark: "line" },
];

function LegendKey({ color, mark }) {
  return mark === "bar" ? (
    <span className="inline-block h-2.5 w-2 rounded-xs" style={{ backgroundColor: color }} aria-hidden="true" />
  ) : (
    <span className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
  );
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="min-w-45 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-slate-500">{longDateLabel(row.date)}</p>
      <ul className="space-y-1">
        {SERIES.map((series) => (
          <li key={series.key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-slate-500">
              <span className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: series.color }} />
              {series.label}
            </span>
            <span className="font-semibold text-slate-900 tabular-nums">{formatNumber(row[series.key] || 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const axisTick = { fontSize: 11, fill: CHART_COLORS.tick };
const Y_AXIS_WIDTH = 36;

export const TrendCard = memo(function TrendCard({ series, loading, dim, className = "", emptyAction }) {
  const [view, setView] = useState("chart");
  const rows = useMemo(
    () =>
      (Array.isArray(series) ? series : []).map((row) => ({
        date: row.date,
        label: shortDateLabel(row.date),
        conversations: Number(row.conversations) || 0,
        messages: Number(row.messages) || 0,
        leads: Number(row.leads) || 0,
        bookings: Number(row.bookings) || 0,
      })),
    [series],
  );
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          conversations: acc.conversations + row.conversations,
          messages: acc.messages + row.messages,
          bookings: acc.bookings + row.bookings,
        }),
        { conversations: 0, messages: 0, bookings: 0 },
      ),
    [rows],
  );
  const empty = !loading && totals.conversations === 0 && totals.messages === 0 && totals.bookings === 0;

  return (
    <Card className={cx("flex min-h-110 flex-col", className)}>
      <CardHeader
        title="Conversations & calls booked"
        subtitle={
          loading
            ? "Per day (IST)"
            : `${formatNumber(totals.conversations)} conversations · ${formatNumber(totals.bookings)} calls booked · ${formatNumber(totals.messages)} messages`
        }
        icon={TrendingUp}
        actions={
          <Segmented
            size="xs"
            ariaLabel="Chart or table"
            value={view}
            onChange={setView}
            options={[
              { value: "chart", label: "Chart" },
              { value: "table", label: "Table" },
            ]}
          />
        }
      />
      <div className={cx("min-h-0 flex-1 px-4 pb-4 transition-opacity", dim && "opacity-50")}>
        {loading ? (
          <div className="flex h-full flex-col gap-3">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="flex-1" />
            <Skeleton className="h-20" />
          </div>
        ) : empty ? (
          <EmptyState
            icon={TrendingUp}
            title="No conversations in this range yet"
            description="Chat with the assistant in the simulator or on WhatsApp — the trend fills in as conversations happen."
            action={emptyAction}
          />
        ) : view === "table" ? (
          <div className="h-full overflow-auto rounded-lg ring-1 ring-slate-200 [scrollbar-width:thin]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Day</th>
                  <th className="px-3 py-2 text-right font-semibold">Conversations</th>
                  <th className="px-3 py-2 text-right font-semibold">Messages</th>
                  <th className="px-3 py-2 text-right font-semibold">Leads</th>
                  <th className="px-3 py-2 text-right font-semibold">Calls booked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 tabular-nums">
                {[...rows].reverse().map((row) => (
                  <tr key={row.date}>
                    <td className="px-3 py-1.5 font-medium">{longDateLabel(row.date)}</td>
                    <td className="px-3 py-1.5 text-right">{formatNumber(row.conversations)}</td>
                    <td className="px-3 py-1.5 text-right">{formatNumber(row.messages)}</td>
                    <td className="px-3 py-1.5 text-right">{formatNumber(row.leads)}</td>
                    <td className="px-3 py-1.5 text-right">{formatNumber(row.bookings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-[11px] font-medium text-slate-500">
              {SERIES.slice(0, 2).map((item) => (
                <span key={item.key} className="flex items-center gap-1.5">
                  <LegendKey color={item.color} mark={item.mark} />
                  {item.label}
                </span>
              ))}
            </div>
            <div className="h-50 shrink-0">
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={rows} syncId="console-trend" margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="label" scale="band" hide />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={axisTick}
                    width={Y_AXIS_WIDTH}
                    tickCount={4}
                  />
                  <ChartTooltip content={<TrendTooltip />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
                  <Bar
                    dataKey="bookings"
                    name="Calls booked"
                    fill={CHART_COLORS.bookings}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={14}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="conversations"
                    name="Conversations"
                    stroke={CHART_COLORS.conversations}
                    strokeWidth={2}
                    fill={CHART_COLORS.conversations}
                    fillOpacity={0.1}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff" }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-1.5 pt-2 pb-0.5 text-[11px] font-medium text-slate-500">
              <LegendKey color={CHART_COLORS.messages} mark="line" />
              Messages handled
            </div>
            <div className="h-28 shrink-0">
              <ResponsiveContainer width="100%" height={112}>
                <ComposedChart data={rows} syncId="console-trend" margin={{ top: 4, right: 6, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="label"
                    scale="band"
                    tickLine={false}
                    axisLine={{ stroke: CHART_COLORS.axis }}
                    tick={axisTick}
                    interval="preserveStartEnd"
                    minTickGap={14}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={axisTick}
                    width={Y_AXIS_WIDTH}
                    tickCount={3}
                  />
                  <ChartTooltip content={() => null} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    name="Messages handled"
                    stroke={CHART_COLORS.messages}
                    strokeWidth={2}
                    fill={CHART_COLORS.messages}
                    fillOpacity={0.08}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff" }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Lead funnel (ordinal ramp, labels outside the bars)
// ---------------------------------------------------------------------------

export const FunnelCard = memo(function FunnelCard({ funnel, loading, className = "" }) {
  const rows = useMemo(() => (Array.isArray(funnel) ? funnel : []).filter((row) => row && row.stage !== "lost"), [funnel]);
  const lost = useMemo(() => (Array.isArray(funnel) ? funnel : []).find((row) => row?.stage === "lost"), [funnel]);
  const max = Math.max(1, ...rows.map((row) => Number(row.count) || 0));
  const cumulative = rows.every((row, index) => index === 0 || (Number(row.count) || 0) <= (Number(rows[index - 1].count) || 0));
  const total = rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  const empty = !loading && (!rows.length || total === 0);

  return (
    <Card className={cx("flex flex-col", className)}>
      <CardHeader
        title="Lead funnel"
        subtitle={cumulative ? "Leads reaching each stage · step conversion" : "Leads by current stage"}
        icon={Filter}
      />
      <div className="flex-1 px-4 pb-4">
        {loading ? (
          <div className="space-y-4 pt-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3" style={{ width: `${90 - index * 15}%` }} />
              </div>
            ))}
          </div>
        ) : empty ? (
          <EmptyState compact icon={Filter} title="No leads yet" description="Leads appear once customers share their goals." />
        ) : (
          <ol className="space-y-3">
            {rows.map((row, index) => {
              const count = Number(row.count) || 0;
              const prev = index > 0 ? Number(rows[index - 1].count) || 0 : null;
              const step = cumulative && prev ? count / prev : null;
              const share = !cumulative && total ? count / total : null;
              const width = count ? Math.max(2, (count / max) * 100) : 0;
              const color = CHART_COLORS.ordinal[Math.min(index, CHART_COLORS.ordinal.length - 1)];
              return (
                <li key={row.stage || index} title={`${row.label || row.stage}: ${formatNumber(count)}`}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-700">{row.label || row.stage}</span>
                    <span className="text-slate-500 tabular-nums">
                      {step !== null && <span className="mr-2 text-[11px] text-slate-400">{formatPercent(step)} of prev.</span>}
                      {share !== null && <span className="mr-2 text-[11px] text-slate-400">{formatPercent(share)}</span>}
                      <span className="font-semibold text-slate-900">{formatNumber(count)}</span>
                    </span>
                  </div>
                  <div className="h-3 w-full">
                    <div
                      className="h-3 rounded-r-sm transition-[width] duration-500"
                      style={{ width: `${width}%`, backgroundColor: color }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {!loading && !empty && lost && (
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{formatNumber(lost.count || 0)}</span> marked lost in this range
          </p>
        )}
      </div>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Ranked bars (top intents, channel and handling meters) — one hue
// ---------------------------------------------------------------------------

function RankedBars({ rows, labelWidth = "minmax(0,9.5rem)", color = CHART_COLORS.bar }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => {
        const width = row.value ? Math.max(1.5, (row.value / max) * 100) : 0;
        return (
          <li
            key={row.key}
            className="grid items-center gap-3"
            style={{ gridTemplateColumns: `${labelWidth} 1fr auto` }}
            title={`${row.label}: ${formatNumber(row.value)}${row.share !== undefined ? ` (${formatPercent(row.share)})` : ""}`}
          >
            <span className="truncate text-xs font-medium text-slate-700">{row.label}</span>
            <span className="h-2.5 w-full">
              <span
                className="block h-2.5 rounded-r-sm transition-[width] duration-500"
                style={{ width: `${width}%`, backgroundColor: color }}
              />
            </span>
            <span className="min-w-14 text-right text-xs tabular-nums">
              <span className="font-semibold text-slate-900">{formatNumber(row.value)}</span>
              {row.share !== undefined && <span className="ml-1.5 text-[11px] text-slate-400">{formatPercent(row.share)}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function BarsSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-3 pt-1">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-2.5 flex-1" />
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}

export const IntentsCard = memo(function IntentsCard({ intents, loading, className = "" }) {
  const rows = useMemo(() => {
    const list = (Array.isArray(intents) ? intents : []).filter((row) => (Number(row?.count) || 0) > 0);
    const total = list.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
    return [...list]
      .sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0))
      .slice(0, 8)
      .map((row) => ({
        key: row.intent || row.label,
        label: row.label || row.intent,
        value: Number(row.count) || 0,
        share: total ? (Number(row.count) || 0) / total : 0,
      }));
  }, [intents]);

  return (
    <Card className={cx("flex flex-col", className)}>
      <CardHeader title="Top intents" subtitle="What customers ask about most" icon={MessageSquareText} />
      <div className="flex-1 px-4 pb-4">
        {loading ? (
          <BarsSkeleton />
        ) : !rows.length ? (
          <EmptyState
            compact
            icon={MessageSquareText}
            title="No intents yet"
            description="Intents are classified on every customer message."
          />
        ) : (
          <RankedBars rows={rows} />
        )}
      </div>
    </Card>
  );
});

const CHANNEL_LABELS = { whatsapp: "WhatsApp", simulator: "Web simulator" };

export const MixCard = memo(function MixCard({ channels, kpis, loading, className = "" }) {
  const channelRows = useMemo(() => {
    const list = Array.isArray(channels) ? channels : [];
    const byKey = Object.fromEntries(list.map((row) => [row.channel, Number(row.count) || 0]));
    const keys = [...new Set(["whatsapp", "simulator", ...Object.keys(byKey)])];
    const total = keys.reduce((sum, key) => sum + (byKey[key] || 0), 0);
    return keys.map((key) => ({
      key,
      label: CHANNEL_LABELS[key] || key,
      value: byKey[key] || 0,
      share: total ? (byKey[key] || 0) / total : 0,
    }));
  }, [channels]);

  const handlingRows = useMemo(() => {
    const ai = Number(kpis?.aiMessages) || 0;
    const human = Number(kpis?.humanMessages) || 0;
    const total = ai + human;
    return [
      { key: "ai", label: "AI assistant", value: ai, share: total ? ai / total : 0 },
      { key: "human", label: "Human advisors", value: human, share: total ? human / total : 0 },
    ];
  }, [kpis]);

  return (
    <Card className={cx("flex flex-col", className)}>
      <CardHeader title="Channels & handling" subtitle="Where conversations come from, and who replies" icon={Split} />
      <div className="flex-1 space-y-5 px-4 pb-4">
        {loading ? (
          <BarsSkeleton rows={4} />
        ) : (
          <>
            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Conversations by channel</p>
              <RankedBars rows={channelRows} labelWidth="minmax(0,7.5rem)" />
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Outbound messages</p>
              <RankedBars rows={handlingRows} labelWidth="minmax(0,7.5rem)" />
            </div>
          </>
        )}
      </div>
    </Card>
  );
});

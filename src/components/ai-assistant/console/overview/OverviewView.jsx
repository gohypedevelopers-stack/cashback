import { useState } from "react";
import {
  ArrowUpRight,
  Bot,
  CalendarCheck,
  IndianRupee,
  Info,
  MessagesSquare,
  RefreshCw,
  Target,
  Timer,
} from "lucide-react";
import { aiConsole } from "@/lib/aiAssistantApi";
import {
  formatDayIST,
  formatDuration,
  formatINR,
  formatNumber,
  formatPercent,
  formatUSD,
} from "@/components/ai-assistant/shared/format";
import { Badge, Button, Card, ErrorState, Segmented, Skeleton, Spinner, Tooltip, cx } from "../ui";
import { useConsole } from "../lib/ConsoleContext";
import { usePoll } from "../lib/hooks";
import { normalizeRatio } from "../lib/consoleFormat";
import ActivityFeed from "./ActivityFeed";
import { FunnelCard, IntentsCard, MixCard, TrendCard } from "./OverviewCharts";

const RANGE_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
];

const KPI_DEFS = [
  {
    key: "conversations",
    label: "Conversations",
    icon: MessagesSquare,
    value: (k) => formatNumber(k.conversations),
    sub: (k) => `${formatNumber(k.newConversations ?? 0)} new · ${formatNumber(k.activeNow ?? 0)} active now`,
  },
  {
    key: "resolution",
    label: "AI resolution rate",
    icon: Bot,
    value: (k) => formatPercent(normalizeRatio(k.aiResolutionRate)),
    sub: (k) => `${formatNumber(k.humanTakeovers ?? 0)} human takeovers`,
    hint: "Conversations the assistant handled end-to-end, without a human stepping in.",
  },
  {
    key: "response",
    label: "Avg response time",
    icon: Timer,
    value: (k) => formatDuration(k.avgResponseMs),
    sub: (k) => `${formatNumber(k.aiMessages ?? 0)} AI messages sent`,
    hint: "Time from a customer message to the assistant's reply.",
  },
  {
    key: "qualified",
    label: "Qualified leads",
    icon: Target,
    value: (k) => formatNumber(k.qualifiedLeads),
    sub: (k) => `of ${formatNumber(k.leads ?? 0)} leads captured`,
  },
  {
    key: "booked",
    label: "Calls booked",
    icon: CalendarCheck,
    accent: true,
    value: (k) => formatNumber(k.bookings),
    sub: (k) =>
      `${formatNumber(k.upcomingBookings ?? 0)} upcoming · ${formatPercent(normalizeRatio(k.bookingConversionRate))} conversion`,
  },
  {
    key: "cost",
    label: "AI cost per conversation",
    icon: IndianRupee,
    value: (k) => formatINR(k.costPerConversationInr, { decimals: 2 }),
    sub: () => "Claude model spend per chat · excludes WhatsApp fees",
    hint: (k) =>
      `Total model spend in this range: ${formatUSD(k.totalCostUsd)} (Claude API usage). WhatsApp charges are billed separately by Meta: replies inside the 24-hour window are free up to 1,000 a month per number, then about ₹0.12 each in India (see RESEARCH.md).`,
  },
];

function KpiTile({ def, kpis, loading }) {
  const Icon = def.icon;
  const hint = typeof def.hint === "function" ? (kpis ? def.hint(kpis) : "") : def.hint;
  return (
    <Card className="flex min-w-0 flex-col p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1 text-xs font-semibold text-slate-500">
          <span className="truncate">{def.label}</span>
          {hint && (
            <Tooltip content={hint} wide>
              <span
                tabIndex={0}
                aria-label={hint}
                className="inline-grid size-4 cursor-help place-items-center rounded-full text-slate-300 outline-none hover:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500/70"
              >
                <Info className="size-3.5" aria-hidden="true" />
              </span>
            </Tooltip>
          )}
        </p>
        <span
          className={cx(
            "grid size-7 shrink-0 place-items-center rounded-lg ring-1",
            def.accent ? "bg-emerald-50 text-emerald-600 ring-emerald-100" : "bg-slate-50 text-slate-400 ring-slate-100",
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-7 w-20" />
          <Skeleton className="mt-2.5 h-3 w-32" />
        </>
      ) : (
        <>
          <p className="mt-2 truncate text-[26px] leading-tight font-semibold tracking-tight text-slate-900">
            {kpis ? def.value(kpis) : "—"}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">{kpis ? def.sub(kpis) : ""}</p>
        </>
      )}
    </Card>
  );
}

export default function OverviewView() {
  const { tenantKey, tenant, openConversation, simulatorLink } = useConsole();
  const [days, setDays] = useState(7);
  const overview = usePoll(() => aiConsole.getOverview({ tenantKey, days }), {
    key: `overview:${tenantKey}:${days}`,
    interval: 30000,
  });

  // Hold the previous frame (dimmed) while a new range loads — no skeleton flash.
  const data = overview.data || overview.lastData;
  const refetching = !overview.data && Boolean(overview.lastData) && !overview.error;
  const loading = !data;
  const range = data?.range;

  const simulatorAction = (
    <Button size="sm" variant="secondary" icon={ArrowUpRight} onClick={() => window.open(simulatorLink, "_blank", "noopener")}>
      Open the simulator
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-400 space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented ariaLabel="Date range" value={days} onChange={setDays} options={RANGE_OPTIONS} />
          <p className="flex items-center gap-2 text-xs text-slate-500">
            {range?.from && range?.to ? `${formatDayIST(range.from)} – ${formatDayIST(range.to)} · IST` : "India Standard Time"}
            {refetching && <Spinner className="size-3.5" />}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tenant?.isDemo && (
            <Badge tone="amber" title="This workspace is a concept demo with illustrative data">
              Concept demo workspace
            </Badge>
          )}
          <Button size="sm" icon={RefreshCw} onClick={overview.refresh}>
            Refresh
          </Button>
        </div>
      </div>

      {overview.error && !data ? (
        <Card>
          <ErrorState title="Couldn't load the overview" error={overview.error} onRetry={overview.refresh} />
        </Card>
      ) : (
        <>
          <div className={cx("grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6", refetching && "opacity-60")}>
            {KPI_DEFS.map((def) => (
              <KpiTile key={def.key} def={def} kpis={data?.kpis} loading={loading} />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <TrendCard
              className="xl:col-span-2"
              series={data?.timeseries}
              loading={loading}
              dim={refetching}
              emptyAction={simulatorAction}
            />
            <ActivityFeed tenantKey={tenantKey} seed={data?.recent} onOpen={openConversation} />
          </div>

          <div className={cx("grid gap-4 lg:grid-cols-2 xl:grid-cols-3", refetching && "opacity-60")}>
            <FunnelCard funnel={data?.funnel} loading={loading} />
            <IntentsCard intents={data?.intents} loading={loading} />
            <MixCard channels={data?.channels} kpis={data?.kpis} loading={loading} className="lg:col-span-2 xl:col-span-1" />
          </div>
        </>
      )}
    </div>
  );
}

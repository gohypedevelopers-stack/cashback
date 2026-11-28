// Right pane: customer & lead (score, stage, known fields, notes, bookings).

import { useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CalendarCheck,
  CalendarX2,
  Hand,
  Link2,
  Phone,
  Save,
  Sparkles,
  Tag,
  Video,
} from "lucide-react";
import {
  LEAD_STAGES,
  STAGE_BY_KEY,
  formatINR,
  formatNumber,
  stageClasses,
} from "@/components/ai-assistant/shared/format";
import {
  Avatar,
  Badge,
  Button,
  ChannelIcon,
  InlineAlert,
  KeyValue,
  Pill,
  ScoreRing,
  SectionLabel,
  SelectInput,
  Skeleton,
  TextArea,
  TimeAgo,
  cx,
} from "../ui";
import { useNow } from "../lib/liveStore";
import {
  asArray,
  bookingStatusMeta,
  channelLabel,
  contactName,
  contactSubline,
  frequencyLabel,
  humanize,
  isNeedsHuman,
  leadStageOf,
  modeLabel,
  needsHumanReason,
  relativeDayLabel,
  riskLabel,
  scoreTone,
  timeRangeIST,
} from "../lib/consoleFormat";

const MODE_ICONS = { phone: Phone, video: Video, branch: Building2 };

function NotesEditor({ notes, onSave }) {
  const incoming = notes || "";
  const [base, setBase] = useState(incoming);
  const [draft, setDraft] = useState(incoming);
  const [saving, setSaving] = useState(false);

  // Follow server-side changes while the advisor isn't editing.
  if (incoming !== base && draft === base) {
    setBase(incoming);
    setDraft(incoming);
  }

  const dirty = draft !== base;
  const save = async () => {
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) setBase(draft);
  };

  return (
    <div className="space-y-2">
      <label htmlFor="lead-notes" className="sr-only">
        Advisor notes
      </label>
      <TextArea
        id="lead-notes"
        rows={4}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Context for the advisor call — family situation, existing investments, preferred time…"
        className="text-[13px]"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400">{dirty ? "Unsaved changes" : "Visible to every advisor"}</span>
        <div className="flex items-center gap-1.5">
          {dirty && (
            <Button size="xs" variant="ghost" onClick={() => setDraft(base)} disabled={saving}>
              Discard
            </Button>
          )}
          <Button size="xs" variant="primary" icon={Save} onClick={save} loading={saving} disabled={!dirty}>
            Save notes
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChipList({ items, tone = "slate", empty = "Not shared yet" }) {
  const list = asArray(items);
  if (!list.length) return <p className="text-[13px] text-slate-400">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((item) => (
        <Badge key={item} tone={tone}>
          {humanize(item)}
        </Badge>
      ))}
    </div>
  );
}

function profileFields(lead, vertical) {
  const amount =
    lead.investmentAmount !== null && lead.investmentAmount !== undefined
      ? `${formatINR(lead.investmentAmount)}${lead.investmentFrequency === "monthly_sip" ? "/month" : ""}`
      : "";
  const investment = [amount, frequencyLabel(lead.investmentFrequency)].filter(Boolean).join(" · ");
  const risk = [riskLabel(lead.riskProfile), lead.riskScore !== null && lead.riskScore !== undefined ? `score ${lead.riskScore}` : ""]
    .filter(Boolean)
    .join(" · ");
  const wealth = [
    { label: "Name", value: lead.name },
    { label: "Age", value: lead.age ? `${lead.age} years` : "" },
    { label: "City", value: lead.city },
    { label: "Occupation", value: lead.occupation },
    {
      label: "Monthly income",
      value: lead.monthlyIncome !== null && lead.monthlyIncome !== undefined ? formatINR(lead.monthlyIncome) : "",
    },
    { label: "Investment", value: investment },
    {
      label: "Horizon",
      value: lead.investmentHorizonYears ? `${lead.investmentHorizonYears} year${lead.investmentHorizonYears === 1 ? "" : "s"}` : "",
    },
    { label: "Risk profile", value: risk },
  ];
  const rewards = [
    { label: "Name", value: lead.name },
    { label: "Company", value: lead.company },
    { label: "City", value: lead.city },
    { label: "Occupation", value: lead.occupation },
    { label: "Email", value: lead.email },
  ];
  const base = vertical === "rewards" ? rewards : wealth;
  // Surface anything the assistant captured that the vertical template doesn't list.
  const extras = [
    vertical === "rewards" && investment ? { label: "Investment", value: investment } : null,
    vertical !== "rewards" && lead.company ? { label: "Company", value: lead.company } : null,
    vertical !== "rewards" && lead.email ? { label: "Email", value: lead.email } : null,
  ].filter(Boolean);
  return [...base, ...extras];
}

export default function LeadPanel({
  conversation,
  lead,
  bookings,
  loaded,
  tenant,
  onStageChange,
  onSaveNotes,
  onTakeover,
  takeoverBusy,
  onOpenBookings,
}) {
  const now = useNow(60000);
  const needsHuman = isNeedsHuman(conversation);
  const reason = needsHumanReason(conversation);
  const stage = leadStageOf(lead);
  const tone = scoreTone(lead?.score);
  const sortedBookings = [...(Array.isArray(bookings) ? bookings : [])].sort((a, b) => {
    const aUpcoming = a.status === "confirmed" ? 0 : 1;
    const bUpcoming = b.status === "confirmed" ? 0 : 1;
    if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });

  return (
    <div className="divide-y divide-slate-100">
      {needsHuman && (
        <div className="p-4">
          <InlineAlert
            tone="amber"
            icon={Hand}
            title="Needs a human"
            action={
              conversation?.status === "ai_active" ? (
                <Button size="xs" variant="warning" onClick={onTakeover} loading={takeoverBusy}>
                  Take over
                </Button>
              ) : null
            }
          >
            {reason || "The assistant flagged this conversation for an advisor to follow up personally."}
          </InlineAlert>
        </div>
      )}

      <section className="p-4">
        <div className="flex items-start gap-3">
          <Avatar name={contactName(conversation)} seed={conversation?.id} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{contactName(conversation)}</p>
            <p className="truncate text-xs text-slate-500">{contactSubline(conversation)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone="white">
                <ChannelIcon channel={conversation?.channel} className="size-3" />
                {channelLabel(conversation?.channel)}
              </Badge>
              {conversation?.language && <Badge tone="white">{String(conversation.language).toUpperCase()}</Badge>}
              {conversation?.userId && (
                <Badge tone="emerald" icon={Link2} title="Linked to an Assured Rewards account">
                  Linked account
                </Badge>
              )}
              {conversation?.metadata?.sample && <Badge tone="slate">Sample data</Badge>}
            </div>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-50 px-2 py-1.5 ring-1 ring-slate-100">
            <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">Started</dt>
            <dd className="truncate text-xs font-semibold text-slate-700">
              {conversation?.createdAt ? <TimeAgo value={conversation.createdAt} /> : "—"}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-1.5 ring-1 ring-slate-100">
            <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">Messages</dt>
            <dd className="text-xs font-semibold text-slate-700 tabular-nums">{formatNumber(conversation?.messageCount ?? 0)}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-1.5 ring-1 ring-slate-100">
            <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">Handler</dt>
            <dd className="truncate text-xs font-semibold text-slate-700">
              {conversation?.status === "human_takeover" ? conversation?.assignedAgentName || "Human" : conversation?.status === "closed" ? "Closed" : "AI"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="p-4">
        <SectionLabel className="mb-3">Lead</SectionLabel>
        {!loaded && !lead ? (
          <div className="flex items-center gap-3">
            <Skeleton className="size-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ) : lead ? (
          <div className="flex items-center gap-3.5">
            <ScoreRing score={lead.score} />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Sparkles className="size-3.5 text-emerald-600" aria-hidden="true" />
                <span className="font-semibold text-slate-700">{tone.label} lead</span>
                {lead.lastActivityAt && (
                  <>
                    · <TimeAgo value={lead.lastActivityAt} />
                  </>
                )}
              </p>
              <div>
                <label htmlFor="lead-stage" className="sr-only">
                  Lead stage
                </label>
                <SelectInput
                  id="lead-stage"
                  size="sm"
                  value={stage || "new"}
                  onChange={(event) => onStageChange(event.target.value)}
                >
                  {LEAD_STAGES.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </SelectInput>
              </div>
              <Pill classes={stageClasses(stage || "new")}>{STAGE_BY_KEY[stage]?.label || "New"}</Pill>
            </div>
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-3 text-[13px] leading-relaxed text-slate-500 ring-1 ring-slate-100">
            No lead profile yet. The assistant creates one as soon as the customer shares a goal, an amount or a
            timeline.
          </p>
        )}
      </section>

      {lead && (
        <section className="p-4">
          <SectionLabel className="mb-1.5">What the assistant learned</SectionLabel>
          <dl className="divide-y divide-slate-50">
            {profileFields(lead, tenant?.vertical).map((field) => (
              <KeyValue key={field.label} label={field.label} value={field.value} />
            ))}
          </dl>
          <div className="mt-3 space-y-3">
            <div>
              <p className="mb-1.5 text-xs text-slate-500">Goals</p>
              <ChipList items={lead.goals} tone="sky" />
            </div>
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-xs text-slate-500">
                <Tag className="size-3" aria-hidden="true" />
                Interests
              </p>
              <ChipList items={lead.interests} tone="violet" />
            </div>
          </div>
        </section>
      )}

      {lead && (
        <section className="p-4">
          <SectionLabel className="mb-2">Advisor notes</SectionLabel>
          <NotesEditor key={lead.id} notes={lead.notes} onSave={onSaveNotes} />
        </section>
      )}

      <section className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <SectionLabel>Bookings</SectionLabel>
          {sortedBookings.length > 0 && (
            <button
              type="button"
              onClick={onOpenBookings}
              className="inline-flex cursor-pointer items-center gap-0.5 rounded text-[11px] font-semibold text-slate-500 hover:text-slate-800"
            >
              All bookings
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </button>
          )}
        </div>
        {sortedBookings.length ? (
          <ul className="space-y-2">
            {sortedBookings.map((booking) => {
              const meta = bookingStatusMeta(booking.status);
              const ModeIcon = MODE_ICONS[booking.mode] || Phone;
              return (
                <li key={booking.id} className="rounded-lg p-2.5 ring-1 ring-slate-200">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-slate-800">
                      {relativeDayLabel(booking.startAt, now)} · {timeRangeIST(booking.startAt, booking.endAt)}
                    </p>
                    <Pill classes={meta.classes}>{meta.label}</Pill>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {booking.advisor?.name ? `with ${booking.advisor.name}` : "Advisor call"}
                    {booking.topic ? ` · ${booking.topic}` : ""}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                    <ModeIcon className="size-3" aria-hidden="true" />
                    {modeLabel(booking.mode)}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={cx("flex items-center gap-2 text-[13px] text-slate-400")}>
            <CalendarX2 className="size-4" aria-hidden="true" />
            No calls booked yet
          </p>
        )}
        {sortedBookings.some((b) => b.status === "confirmed") && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
            <CalendarCheck className="size-3.5" aria-hidden="true" />
            Reminder goes out automatically before the call
          </p>
        )}
      </section>
    </div>
  );
}

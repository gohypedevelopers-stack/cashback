// Console-specific labels and small pure helpers (no React).
// Generic formatters (INR, IST dates, maskPhone, ...) live in ../../shared/format.js.

import { dayKeyIST, formatDayIST, formatTimeIST, maskPhone } from "@/components/ai-assistant/shared/format";

const DAY_MS = 24 * 60 * 60 * 1000;

const toTime = (value) => {
  if (!value) return 0;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
};

export { toTime };

// "sip_info" -> "Sip info"
export const humanize = (value) => {
  const text = String(value || "")
    .replace(/[_-]+/g, " ")
    .trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
};

export const asArray = (value) => {
  if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined && item !== "");
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

// "a, b ,c" -> ["a", "b", "c"] (deduped, order kept)
export const parseList = (text) => [...new Set(asArray(String(text || "")))];

export const pluralize = (count, singular, plural = `${singular}s`) =>
  `${Number(count || 0).toLocaleString("en-IN")} ${Number(count) === 1 ? singular : plural}`;

// ---------------------------------------------------------------------------
// Engine / model
// ---------------------------------------------------------------------------

// "claude-opus-5-5" -> "Claude Opus 5.5"; "claude-3-5-haiku-20241022" -> "Claude Haiku 3.5"
export const prettyModel = (model) => {
  const raw = String(model || "").trim();
  if (!raw) return "";
  const match = raw.toLowerCase().match(/^claude-(.+)$/);
  if (!match) return raw;
  const tokens = match[1]
    .split("-")
    .filter(Boolean)
    .filter((token) => !/^\d{8}$/.test(token) && token !== "latest" && !/^v\d/.test(token));
  const words = [];
  const numbers = [];
  tokens.forEach((token) => (/^\d+$/.test(token) ? numbers.push(token) : words.push(token)));
  const family = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  return ["Claude", family, numbers.join(".")].filter(Boolean).join(" ");
};

export const FALLBACK_REASONS = {
  no_api_key: "No Claude API key configured",
  api_error: "Claude API error — rules engine answered",
  refusal: "Model declined — rules engine answered",
  timeout: "Claude timed out — rules engine answered",
};

export const fallbackReasonLabel = (reason) => (reason ? FALLBACK_REASONS[reason] || humanize(reason) : "");

export const engineLabel = (engine, model) => {
  if (engine === "claude") return prettyModel(model) || "Claude";
  if (engine === "fallback") return "Rules engine";
  if (engine === "human") return "Human";
  return humanize(engine) || "—";
};

const GUARDRAIL_BASE = {
  pii_redacted: "PII redacted",
  disclaimer_added: "Disclaimer added",
  opt_out: "Opt-out honoured",
  opt_in: "Opt-in restored",
  escalated: "Escalated to human",
  rate_limited: "Rate limited",
  off_topic: "Off-topic steered back",
  advice_boundary: "Advice boundary kept",
};

const GUARDRAIL_DETAIL = {
  pan: "PAN",
  aadhaar: "Aadhaar",
  phone: "phone number",
  email: "email",
  card: "card number",
  account: "bank account",
  upi: "UPI ID",
  otp: "OTP",
};

export const guardrailLabel = (value) => {
  const [key, detail] = String(value || "").split(":");
  const base = GUARDRAIL_BASE[key] || humanize(key);
  if (!detail) return base;
  return `${base} · ${GUARDRAIL_DETAIL[detail] || humanize(detail)}`;
};

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export const CONVERSATION_STATUS = {
  ai_active: { label: "AI handling", short: "AI", classes: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  human_takeover: { label: "Human", short: "Human", classes: "bg-sky-50 text-sky-700 ring-sky-200" },
  closed: { label: "Closed", short: "Closed", classes: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export const conversationStatusMeta = (status) =>
  CONVERSATION_STATUS[status] || { label: humanize(status) || "Unknown", short: "—", classes: CONVERSATION_STATUS.closed.classes };

export const CHANNEL_META = {
  whatsapp: { label: "WhatsApp", short: "WhatsApp" },
  simulator: { label: "Web simulator", short: "Simulator" },
};

export const channelLabel = (channel) => CHANNEL_META[channel]?.label || humanize(channel) || "Unknown";

export const isNeedsHuman = (conversation) =>
  Boolean(conversation?.metadata?.needsHuman) && conversation?.status !== "closed";

export const needsHumanReason = (conversation) => {
  const meta = conversation?.metadata || {};
  const reason = meta.needsHumanReason || meta.escalationReason || meta.handoffReason || meta.escalation?.reason;
  return typeof reason === "string" ? reason : "";
};

export const isSampleConversation = (conversation) => Boolean(conversation?.metadata?.sample);

export const contactName = (conversation) => {
  if (!conversation) return "Unknown contact";
  const name = conversation.contactName || conversation.lead?.name;
  if (name) return name;
  if (conversation.channel === "simulator") return "Simulator guest";
  return maskPhone(conversation.contactPhone || conversation.externalUserId) || "Unknown contact";
};

export const contactSubline = (conversation) => {
  if (!conversation) return "";
  if (conversation.channel === "simulator") return "Web simulator";
  return maskPhone(conversation.contactPhone || conversation.externalUserId);
};

export const leadStageOf = (lead) => lead?.intentStage || lead?.stage || "";

const SENDER_PREFIX = { ai: "AI", agent: "You", system: "", customer: "" };

export const previewPrefix = (sender) => SENDER_PREFIX[sender] ?? "";

// Merge two message (or event) arrays by id, oldest first.
export const mergeById = (prev = [], incoming = []) => {
  if (!incoming || !incoming.length) return prev;
  const map = new Map();
  prev.forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  incoming.forEach((item) => {
    if (item?.id) map.set(item.id, map.has(item.id) ? { ...map.get(item.id), ...item } : item);
  });
  return [...map.values()].sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt));
};

// Newest createdAt (ISO string) in a list, compared with `current`.
export const latestCreatedAt = (items = [], current = null) => {
  let best = current;
  let bestTime = toTime(current);
  items.forEach((item) => {
    const t = toTime(item?.createdAt);
    if (t > bestTime) {
      bestTime = t;
      best = item.createdAt;
    }
  });
  return best;
};

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export const errorMessage = (error, fallback = "Something went wrong. Please try again.") =>
  error?.data?.message || error?.message || fallback;

export const errorCode = (error) => error?.data?.code || error?.code || "";

export const isOutside24hError = (error) => errorCode(error) === "OUTSIDE_24H_WINDOW" || (error?.status === 409 && /24/.test(errorMessage(error, "")));

// ---------------------------------------------------------------------------
// Dates (IST)
// ---------------------------------------------------------------------------

export const relativeDayLabel = (value, now) => {
  const key = dayKeyIST(value);
  if (!key) return "";
  if (key === dayKeyIST(now)) return "Today";
  if (key === dayKeyIST(now + DAY_MS)) return "Tomorrow";
  if (key === dayKeyIST(now - DAY_MS)) return "Yesterday";
  return formatDayIST(value);
};

export const timeRangeIST = (startAt, endAt) => {
  const start = formatTimeIST(startAt);
  const end = formatTimeIST(endAt);
  return end ? `${start} – ${end}` : start;
};

export const startOfDayISTIso = (now) => {
  const key = dayKeyIST(now);
  return key ? new Date(`${key}T00:00:00+05:30`).toISOString() : new Date(now).toISOString();
};

// "2026-11-28" -> "28 Nov"
export const shortDateLabel = (dateKey) => {
  if (!dateKey) return "";
  const date = new Date(`${String(dateKey).slice(0, 10)}T12:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return String(dateKey);
  return date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
};

// "2026-11-28" -> "Sat, 28 Nov"
export const longDateLabel = (dateKey) => {
  if (!dateKey) return "";
  const date = new Date(`${String(dateKey).slice(0, 10)}T12:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return String(dateKey);
  return formatDayIST(date);
};

// Ratios may arrive as 0..1 or 0..100 — normalise to 0..1.
export const normalizeRatio = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n > 1 ? n / 100 : n;
};

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export const FREQUENCY_LABELS = {
  monthly_sip: "Monthly SIP",
  sip: "Monthly SIP",
  monthly: "Monthly SIP",
  lumpsum: "Lumpsum",
  lump_sum: "Lumpsum",
  both: "SIP + lumpsum",
};

export const frequencyLabel = (value) => (value ? FREQUENCY_LABELS[value] || humanize(value) : "");

export const RISK_LABELS = { conservative: "Conservative", moderate: "Moderate", aggressive: "Aggressive" };

export const riskLabel = (value) => (value ? RISK_LABELS[value] || humanize(value) : "");

export const scoreTone = (score) => {
  const n = Number(score) || 0;
  if (n >= 70) return { ring: "#059669", classes: "bg-emerald-50 text-emerald-700 ring-emerald-200", label: "Hot" };
  if (n >= 40) return { ring: "#d97706", classes: "bg-amber-50 text-amber-800 ring-amber-200", label: "Warm" };
  return { ring: "#94a3b8", classes: "bg-slate-100 text-slate-600 ring-slate-200", label: "Cold" };
};

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export const BOOKING_STATUS = {
  confirmed: { label: "Confirmed", classes: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  completed: { label: "Completed", classes: "bg-sky-50 text-sky-700 ring-sky-200" },
  no_show: { label: "No-show", classes: "bg-amber-50 text-amber-800 ring-amber-200" },
  cancelled: { label: "Cancelled", classes: "bg-rose-50 text-rose-700 ring-rose-200" },
};

export const bookingStatusMeta = (status) =>
  BOOKING_STATUS[status] || { label: humanize(status) || "Unknown", classes: "bg-slate-100 text-slate-600 ring-slate-200" };

export const MODE_LABELS = { phone: "Phone call", video: "Video call", branch: "Branch visit" };

export const modeLabel = (mode) => MODE_LABELS[mode] || humanize(mode) || "Call";

export const SOURCE_LABELS = { whatsapp: "WhatsApp", simulator: "Simulator", console: "Console" };

export const sourceLabel = (source) => SOURCE_LABELS[source] || humanize(source) || "";

export const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "call";

// ---------------------------------------------------------------------------
// Advisors — working hours { mon: [["10:00","13:30"], ...], ..., sun: [] } (IST)
// ---------------------------------------------------------------------------

export const WEEK_DAYS = [
  { key: "mon", short: "Mon", label: "Monday" },
  { key: "tue", short: "Tue", label: "Tuesday" },
  { key: "wed", short: "Wed", label: "Wednesday" },
  { key: "thu", short: "Thu", label: "Thursday" },
  { key: "fri", short: "Fri", label: "Friday" },
  { key: "sat", short: "Sat", label: "Saturday" },
  { key: "sun", short: "Sun", label: "Sunday" },
];

export const DEFAULT_WORKING_HOURS = {
  mon: [["10:00", "13:30"], ["14:30", "19:00"]],
  tue: [["10:00", "13:30"], ["14:30", "19:00"]],
  wed: [["10:00", "13:30"], ["14:30", "19:00"]],
  thu: [["10:00", "13:30"], ["14:30", "19:00"]],
  fri: [["10:00", "13:30"], ["14:30", "19:00"]],
  sat: [["10:00", "14:00"]],
  sun: [],
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  return h * 60 + m;
};

export const normalizeWorkingHours = (value) => {
  const source = value && typeof value === "object" ? value : {};
  const result = {};
  WEEK_DAYS.forEach(({ key }) => {
    const ranges = Array.isArray(source[key]) ? source[key] : [];
    result[key] = ranges
      .filter((range) => Array.isArray(range) && range.length >= 2)
      .map(([start, end]) => [String(start || "").slice(0, 5), String(end || "").slice(0, 5)]);
  });
  return result;
};

// { mon: "message", ... } for invalid days; empty object when valid.
export const validateWorkingHours = (hours) => {
  const errors = {};
  WEEK_DAYS.forEach(({ key, label }) => {
    const ranges = hours?.[key] || [];
    for (const [start, end] of ranges) {
      if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) {
        errors[key] = `${label}: use HH:MM times`;
        return;
      }
      if (toMinutes(start) >= toMinutes(end)) {
        errors[key] = `${label}: each range must end after it starts`;
        return;
      }
    }
    const sorted = [...ranges].sort((a, b) => toMinutes(a[0]) - toMinutes(b[0]));
    for (let i = 1; i < sorted.length; i += 1) {
      if (toMinutes(sorted[i][0]) < toMinutes(sorted[i - 1][1])) {
        errors[key] = `${label}: ranges overlap`;
        return;
      }
    }
  });
  return errors;
};

export const sortWorkingHours = (hours) => {
  const result = {};
  WEEK_DAYS.forEach(({ key }) => {
    result[key] = [...(hours?.[key] || [])].sort((a, b) => toMinutes(a[0]) - toMinutes(b[0]));
  });
  return result;
};

export const weeklyHoursTotal = (hours) =>
  WEEK_DAYS.reduce(
    (sum, { key }) =>
      sum +
      (hours?.[key] || []).reduce((daySum, [start, end]) => {
        if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) return daySum;
        return daySum + Math.max(0, toMinutes(end) - toMinutes(start));
      }, 0),
    0,
  ) / 60;

// "Mon–Fri 10:00–13:30, 14:30–19:00 · Sat 10:00–14:00"
export const summarizeWorkingHours = (hours) => {
  const normalized = normalizeWorkingHours(hours);
  const signature = (ranges) => ranges.map(([start, end]) => `${start}–${end}`).join(", ");
  const groups = [];
  WEEK_DAYS.forEach((day) => {
    const sig = signature(normalized[day.key]);
    const last = groups[groups.length - 1];
    if (last && last.sig === sig) last.end = day;
    else groups.push({ sig, start: day, end: day });
  });
  const parts = groups
    .filter((group) => group.sig)
    .map((group) => `${group.start.short}${group.start.key !== group.end.key ? `–${group.end.short}` : ""} ${group.sig}`);
  return parts.length ? parts.join(" · ") : "No working hours set";
};

// ---------------------------------------------------------------------------
// Knowledge docs
// ---------------------------------------------------------------------------

export const isBuiltinDoc = (doc) => {
  if (!doc) return false;
  if (doc.source === "builtin" || doc.builtin === true || doc.readOnly === true) return true;
  if (doc.source === "custom") return false;
  return /^(ar|fin|bc)-/.test(String(doc.id || ""));
};

export const docReferenceUrl = (doc) => {
  const candidates = [doc?.sourceUrl, doc?.url, doc?.reference, doc?.source];
  return candidates.find((value) => typeof value === "string" && /^https?:\/\//i.test(value)) || "";
};

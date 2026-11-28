// Formatting helpers shared by the AI showcase, simulator and advisor console.
// All dates are shown in India Standard Time (the assistant's operating timezone).

const IST = "Asia/Kolkata";

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// ₹12,34,567 (Indian digit grouping). compact: ₹12.3L / ₹1.2Cr.
export const formatINR = (value, { compact = false, decimals = 0 } = {}) => {
  const n = toNumber(value);
  if (n === null) return "—";
  if (compact) {
    const abs = Math.abs(n);
    if (abs >= 1e7) return `₹${(n / 1e7).toFixed(abs >= 1e8 ? 0 : 2).replace(/\.0+$/, "")}Cr`;
    if (abs >= 1e5) return `₹${(n / 1e5).toFixed(abs >= 1e6 ? 1 : 2).replace(/\.0+$/, "")}L`;
    if (abs >= 1e3) return `₹${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

export const formatNumber = (value) => {
  const n = toNumber(value);
  return n === null ? "—" : n.toLocaleString("en-IN");
};

// 0.4567 -> "45.7%"
export const formatPercent = (ratio, digits = 0) => {
  const n = toNumber(ratio);
  if (n === null) return "—";
  return `${(n * 100).toFixed(digits)}%`;
};

// 1840 -> "1.8s", 420 -> "420ms"
export const formatDuration = (ms) => {
  const n = toNumber(ms);
  if (n === null) return "—";
  if (n < 1000) return `${Math.round(n)}ms`;
  if (n < 60000) return `${(n / 1000).toFixed(1)}s`;
  return `${Math.floor(n / 60000)}m ${Math.round((n % 60000) / 1000)}s`;
};

export const formatUSD = (value) => {
  const n = toNumber(value);
  if (n === null) return "—";
  return `$${n < 1 ? n.toFixed(4) : n.toFixed(2)}`;
};

export const formatTimeIST = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit", hour12: true });
};

export const formatDayIST = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short" });
};

// "Mon, 30 Nov · 11:00 am"
export const formatDateTimeIST = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return `${formatDayIST(date)} · ${formatTimeIST(date)}`;
};

// YYYY-MM-DD of the IST calendar day (for grouping).
export const dayKeyIST = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-CA", { timeZone: IST });
};

export const timeAgo = (value, now = Date.now()) => {
  const date = toDate(value);
  if (!date) return "";
  const seconds = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDayIST(date);
};

// "919876543210" -> "+91 98•••••210"; simulator ids -> "Web simulator"
export const maskPhone = (value) => {
  const raw = String(value || "");
  if (!raw) return "";
  if (raw.startsWith("sim:")) return "Web simulator";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 6) return raw;
  const cc = digits.length > 10 ? digits.slice(0, digits.length - 10) : "";
  const local = digits.slice(-10);
  return `${cc ? `+${cc} ` : ""}${local.slice(0, 2)}•••••${local.slice(-3)}`;
};

export const initials = (name, fallback = "?") => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return fallback;
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

export const truncate = (text, max = 80) => {
  const value = String(text || "");
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
};

// Strip WhatsApp markup for previews ("*Hi* _there_" -> "Hi there").
export const plainText = (text) =>
  String(text || "")
    .replace(/```([\s\S]*?)```/g, "$1")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const LEAD_STAGES = [
  { key: "new", label: "New", tone: "slate" },
  { key: "engaged", label: "Engaged", tone: "sky" },
  { key: "qualified", label: "Qualified", tone: "violet" },
  { key: "booked", label: "Call booked", tone: "emerald" },
  { key: "converted", label: "Converted", tone: "amber" },
  { key: "lost", label: "Lost", tone: "rose" },
];

export const STAGE_BY_KEY = Object.fromEntries(LEAD_STAGES.map((stage) => [stage.key, stage]));

// Tailwind classes per tone (static strings so Tailwind keeps them).
export const TONE_CLASSES = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
};

export const stageClasses = (stage) => TONE_CLASSES[STAGE_BY_KEY[stage]?.tone || "slate"];

// Human labels for engine tools (trace panels).
export const TOOL_LABELS = {
  search_knowledge_base: "Searched knowledge base",
  get_my_rewards_account: "Looked up rewards account",
  calculate_sip: "Ran SIP calculator",
  calculate_lumpsum: "Ran lumpsum calculator",
  calculate_goal_plan: "Planned a financial goal",
  calculate_retirement_corpus: "Estimated retirement corpus",
  compare_tax_regimes: "Compared tax regimes",
  assess_risk_profile: "Scored risk profile",
  update_lead_profile: "Updated lead profile",
  get_available_slots: "Checked advisor calendar",
  book_advisor_call: "Booked advisor call",
  cancel_advisor_call: "Cancelled advisor call",
  escalate_to_human: "Escalated to a human",
  create_support_ticket: "Created support ticket",
};

export const toolLabel = (name) =>
  TOOL_LABELS[name] || String(name || "tool").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

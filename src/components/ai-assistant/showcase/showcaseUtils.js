// Helpers for the showcase page: tenant selection, trace/lead formatting.

import { formatINR, truncate } from "@/components/ai-assistant/shared/format";

const ACRONYMS = {
  ai: "AI",
  ctc: "CTC",
  d2c: "D2C",
  elss: "ELSS",
  emi: "EMI",
  epf: "EPF",
  faq: "FAQ",
  fd: "FD",
  gst: "GST",
  hra: "HRA",
  id: "ID",
  ifsc: "IFSC",
  kyc: "KYC",
  ltcg: "LTCG",
  mf: "MF",
  nps: "NPS",
  nri: "NRI",
  otp: "OTP",
  pan: "PAN",
  ppf: "PPF",
  qr: "QR",
  rd: "RD",
  roi: "ROI",
  sip: "SIP",
  stcg: "STCG",
  ulip: "ULIP",
  upi: "UPI",
};

// "sip_info" -> "SIP info", "monthlyAmount" -> "Monthly amount"
export function humanize(key) {
  const words = String(key || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_:-]+/)
    .filter(Boolean);
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (ACRONYMS[lower]) return ACRONYMS[lower];
      return index === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(" ");
}

const GUARDRAIL_LABELS = {
  disclaimer_added: "Risk disclaimer added",
  opt_out: "Opt-out honoured",
  opt_in: "Opted back in",
  no_scheme_recommendation: "No scheme recommendation",
  scheme_recommendation_blocked: "Scheme recommendation blocked",
  advice_softened: "Advice kept general",
  human_takeover: "Human takeover respected",
  prompt_injection: "Prompt injection blocked",
  off_topic: "Off-topic deflected",
  escalated: "Escalated to a human",
};

const PII_LABELS = {
  pan: "PAN",
  aadhaar: "Aadhaar",
  aadhar: "Aadhaar",
  phone: "phone number",
  mobile: "phone number",
  email: "email",
  card: "card number",
  bank_account: "bank account",
  account: "bank account",
  upi: "UPI ID",
  ifsc: "IFSC",
  passport: "passport",
};

export function guardrailLabel(code) {
  const [head, detail] = String(code || "").split(":");
  if (head === "pii_redacted") return `PII redacted · ${PII_LABELS[detail] || humanize(detail || "data")}`;
  const base = GUARDRAIL_LABELS[head] || humanize(head);
  return detail ? `${base} · ${humanize(detail)}` : base;
}

const MONEY_KEY = /amount|income|corpus|lumpsum|target|investment|expense|salary|premium|savings|budget|price|cost|value|sip/i;
const PERCENT_KEY = /rate|return|percent|pct|cagr|inflation|yield/i;

const formatValue = (key, value) => {
  if (typeof value === "number") {
    if (PERCENT_KEY.test(key)) return `${value}%`;
    if (MONEY_KEY.test(key) && Math.abs(value) >= 100) return formatINR(value);
    return value.toLocaleString("en-IN");
  }
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) return value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return `“${String(value)}”`;
};

// Tool input -> "query: “sip for child” · monthly amount: ₹10,000"
export function summarizeInput(input) {
  if (input === null || input === undefined || input === "") return "";
  if (typeof input !== "object") return truncate(String(input), 90);
  const parts = [];
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined || value === "") continue;
    parts.push(`${humanize(key).toLowerCase()}: ${truncate(formatValue(key, value), 46)}`);
    if (parts.length >= 4) break;
  }
  return parts.join(" · ");
}

export function previewOutput(value) {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return truncate(text.replace(/\s+/g, " ").trim(), 150);
}

// 3120 -> "3.1k"
export function compactCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}

// Live tenants first ("Assured Rewards — live"), then concept demos.
export const orderTenants = (tenants) =>
  [...(tenants || [])].sort((a, b) => Number(Boolean(a?.isDemo)) - Number(Boolean(b?.isDemo)));

export function pickDefaultTenant(tenants, defaultKey) {
  const list = tenants || [];
  return (
    list.find((t) => t?.vertical === "wealth") ||
    list.find((t) => t?.key === defaultKey) ||
    list[0] ||
    null
  );
}

export const tenantShortName = (tenant) => tenant?.shortName || tenant?.name || "Assistant";

export const tenantSwitchLabel = (tenant) => `${tenantShortName(tenant)} — ${tenant?.isDemo ? "concept demo" : "live"}`;

export const findTenant = (tenants, key) => (tenants || []).find((t) => t?.key === key) || null;

export function findBooking(messages) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const message = list[i];
    if (message?.type === "booking_confirmation" && message?.payload?.booking) return message.payload.booking;
  }
  return null;
}

// After a refresh: rebuild the "last turn" from stored history (trace lives on
// the first outbound message of each AI turn).
export function lastTurnFromHistory(messages) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const message = list[i];
    if (message?.direction === "outbound" && message?.trace) {
      const replies = [];
      for (let j = i; j < list.length && list[j]?.direction === "outbound"; j += 1) replies.push(list[j]);
      return { trace: message.trace, replies, lead: null, restored: true };
    }
  }
  return null;
}

const GOAL_LABELS = {
  child_education: "Child's education",
  retirement: "Retirement",
  house: "Buying a home",
  home: "Buying a home",
  wealth: "Wealth creation",
  wealth_creation: "Wealth creation",
  tax_saving: "Tax saving",
  emergency_fund: "Emergency fund",
  marriage: "Marriage",
  travel: "Travel",
  car: "Car",
};

const listOf = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
};

const FREQUENCY_SUFFIX = { monthly_sip: " / month (SIP)", lumpsum: " lumpsum", both: " (SIP + lumpsum)" };

// Known lead fields in display order. Each: { key, label, value }.
export function leadFields(lead) {
  if (!lead) return [];
  const fields = [];
  const push = (key, label, value) => {
    if (value === null || value === undefined || value === "") return;
    fields.push({ key, label, value: String(value) });
  };
  push("name", "Name", lead.name);
  const age = lead.age === null || lead.age === undefined || lead.age === "" ? NaN : Number(lead.age);
  push("age", "Age", Number.isFinite(age) && age > 0 ? `${age} yrs` : null);
  push("city", "City", lead.city);
  push("occupation", "Occupation", lead.occupation);
  push("company", "Company", lead.company);
  const goals = listOf(lead.goals).map((goal) => GOAL_LABELS[goal] || humanize(goal));
  push("goals", "Goals", goals.length ? goals.join(", ") : null);
  if (lead.investmentAmount !== null && lead.investmentAmount !== undefined && lead.investmentAmount !== "") {
    push("investmentAmount", "Investment", `${formatINR(lead.investmentAmount)}${FREQUENCY_SUFFIX[lead.investmentFrequency] || ""}`);
  }
  if (lead.monthlyIncome !== null && lead.monthlyIncome !== undefined && lead.monthlyIncome !== "") {
    push("monthlyIncome", "Monthly income", formatINR(lead.monthlyIncome));
  }
  const years = Number(lead.investmentHorizonYears);
  push("horizon", "Horizon", Number.isFinite(years) && years > 0 ? `${years} ${years === 1 ? "year" : "years"}` : null);
  push("riskProfile", "Risk profile", lead.riskProfile ? humanize(lead.riskProfile) : null);
  const interests = listOf(lead.interests).map(humanize);
  push("interests", "Interests", interests.length ? interests.join(", ") : null);
  return fields;
}

export const FALLBACK_REASONS = {
  no_api_key: "no API key",
  api_error: "API error",
  refusal: "model declined",
  timeout: "timeout",
};

export function engineBadge(trace, llm) {
  if (trace) {
    if (trace.engine === "fallback") {
      return {
        kind: "fallback",
        label: `Rules engine (${FALLBACK_REASONS[trace.fallbackReason] || humanize(trace.fallbackReason || "fallback").toLowerCase()})`,
      };
    }
    return { kind: "claude", label: trace.model || llm?.model || "Claude" };
  }
  if (llm && llm.configured === false) return { kind: "fallback", label: "Rules engine (no API key)" };
  if (llm?.model) return { kind: "claude", label: llm.model };
  return { kind: "claude", label: "Claude" };
}

// Pure helpers for the WhatsApp simulator (message merging, ticks, day chips,
// error copy, wallpaper). No React in here.

import { dayKeyIST, formatDayIST } from "@/components/ai-assistant/shared/format";

export const WA = {
  header: "#075E54",
  teal: "#128C7E",
  green: "#25D366",
  action: "#00796b", // interactive text (AA on white)
  wallpaper: "#efeae2",
  outgoing: "#d9fdd3",
  incoming: "#ffffff",
  text: "#111b21",
  meta: "#667781",
  icon: "#54656f",
  muted: "#8696a0",
  tickRead: "#53bdeb",
  notice: "#fff3c4",
};

export const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Noto Sans Devanagari", Arial, sans-serif';

export const BUBBLE_SHADOW = "0 1px 0.5px rgba(11, 20, 26, 0.13)";

// A quiet doodle-like texture made only of CSS gradients (rings, dots and
// bubbles at co-prime tile sizes so the motifs never line up into a grid).
const INK = "rgba(84, 101, 111, 0.075)";
const INK_SOFT = "rgba(84, 101, 111, 0.055)";
export const WALLPAPER_STYLE = {
  backgroundColor: WA.wallpaper,
  backgroundImage: [
    `radial-gradient(circle at 22px 26px, transparent 0 5px, ${INK} 5.6px 6.8px, transparent 7.4px)`,
    `radial-gradient(circle at 70px 18px, ${INK} 0 1.7px, transparent 2.3px)`,
    `radial-gradient(ellipse 10px 6px at 52px 74px, transparent 0 58%, ${INK_SOFT} 62% 84%, transparent 88%)`,
    `radial-gradient(circle at 18px 96px, ${INK_SOFT} 0 2.6px, transparent 3.2px)`,
    `radial-gradient(circle at 104px 60px, transparent 0 3px, ${INK} 3.5px 4.6px, transparent 5.2px)`,
    `radial-gradient(circle at 90px 120px, transparent 0 8px, ${INK_SOFT} 8.6px 9.6px, transparent 10.2px)`,
    `radial-gradient(circle at 40px 140px, ${INK} 0 1.3px, transparent 1.9px)`,
  ].join(", "),
  backgroundSize: "124px 124px, 96px 96px, 140px 140px, 118px 118px, 132px 132px, 168px 168px, 152px 152px",
};

export const isCustomerMessage = (message) => message?.direction === "inbound";
export const isNoticeMessage = (message) =>
  message?.type === "notice" || (message?.sender === "system" && message?.direction !== "inbound");

const timeOf = (message) => {
  const t = Date.parse(message?.createdAt || "");
  return Number.isFinite(t) ? t : 0;
};

// Server messages in createdAt order (stable), unsent local messages last.
export function sortMessages(list) {
  const server = [];
  const local = [];
  for (const message of list) (message._local ? local : server).push(message);
  server.sort((a, b) => timeOf(a) - timeOf(b));
  return server.concat(local);
}

// Merge server messages into the list, deduped by id. `animate` marks new
// messages so they slide in (staggered) instead of popping.
export function mergeServerMessages(prev, incoming, { animate = false } = {}) {
  if (!Array.isArray(incoming) || !incoming.length) return prev;
  const known = new Set(prev.map((m) => m.id));
  const additions = [];
  for (const raw of incoming) {
    if (!raw || !raw.id || known.has(raw.id)) continue;
    known.add(raw.id);
    additions.push(animate ? { ...raw, _anim: additions.length * 0.3 } : raw);
  }
  if (!additions.length) return prev;
  return sortMessages(prev.concat(additions));
}

// Replace the optimistic bubble with the stored inbound message and append the
// replies (staggered like a person typing several messages).
export function applySendResult(prev, localId, result) {
  const inbound = result?.inbound?.id ? result.inbound : null;
  const replies = Array.isArray(result?.replies) ? result.replies.filter((r) => r && r.id) : [];
  const known = new Set(prev.map((m) => m.id));
  let next;
  if (inbound) {
    next = prev.filter((m) => m.id !== localId);
    if (!known.has(inbound.id)) next.push({ ...inbound, _key: localId });
  } else {
    next = prev.map((m) => (m.id === localId ? { ...m, status: "sent" } : m));
  }
  replies.forEach((reply, index) => {
    if (!known.has(reply.id)) next.push({ ...reply, _anim: 0.1 + index * 0.38 });
  });
  return sortMessages(next);
}

// Tick state for each customer message: pending | failed | sent | delivered | read.
// "read" (blue) once any business reply exists after it.
export function computeTickStates(messages) {
  let lastReply = -1;
  messages.forEach((m, i) => {
    if (!m._local && m.direction === "outbound") lastReply = i;
  });
  return messages.map((m, i) => {
    if (m.direction !== "inbound") return null;
    if (m._local) return m.status === "failed" ? "failed" : m.status === "sent" ? "sent" : "pending";
    return i < lastReply ? "read" : "delivered";
  });
}

export function lastIndexWhere(list, predicate) {
  for (let i = list.length - 1; i >= 0; i -= 1) if (predicate(list[i], i)) return i;
  return -1;
}

export function dayChipLabel(value, todayKey, yesterdayKey) {
  const key = dayKeyIST(value);
  if (!key || key === todayKey) return "Today";
  if (key === yesterdayKey) return "Yesterday";
  return formatDayIST(value);
}

// Status-bar clock in IST without the am/pm suffix ("9:41").
export const statusClock = (date) =>
  date
    .toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s?(am|pm)$/i, "");

export function describeSendError(error) {
  const status = Number(error?.status) || 0;
  if (status === 429) {
    return { kind: "rate", text: "You're sending messages quickly — try again in a moment." };
  }
  if (status >= 400 && status < 500) {
    return {
      kind: "client",
      text: error?.data?.message || "The assistant couldn't accept that message. Please rephrase and try again.",
    };
  }
  return { kind: "network", text: "Couldn't reach the assistant. Check your connection and try again." };
}

export const safeHttpUrl = (value) => {
  const url = String(value || "").trim();
  return /^https?:\/\/[^\s]+$/i.test(url) ? url : "";
};

export const prettyUrl = (value) =>
  String(value || "")
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");

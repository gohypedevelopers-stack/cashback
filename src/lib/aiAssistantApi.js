// REST client for the AI WhatsApp Concierge (backend: /api/ai-assistant).
// Contract: docs/ai-whatsapp-assistant/ARCHITECTURE.md §11.

import { apiRequest, buildApiUrl } from "./apiClient";
import { getAuthToken } from "./auth";

const BASE = "/api/ai-assistant";
const CONSOLE_KEY_STORAGE = "ai_console_key";
const SIM_SESSION_PREFIX = "ai_sim_session_";
const SIM_NAME_STORAGE = "ai_sim_contact_name";

const qs = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  if (!entries.length) return "";
  return `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}`;
};

const safeStorage = {
  get(key) {
    try {
      return window.localStorage.getItem(key) || "";
    } catch {
      return "";
    }
  },
  set(key, value) {
    try {
      if (value) window.localStorage.setItem(key, value);
      else window.localStorage.removeItem(key);
    } catch {
      // Private mode / blocked storage: keep working without persistence.
    }
  },
};

// ---------------------------------------------------------------------------
// Simulator session helpers
// ---------------------------------------------------------------------------

export const createSessionId = () => {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, "");
    }
  } catch {
    // fall through
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
};

export const getSimulatorSessionId = (tenantKey) => {
  const storageKey = `${SIM_SESSION_PREFIX}${tenantKey}`;
  let id = safeStorage.get(storageKey);
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(id)) {
    id = createSessionId();
    safeStorage.set(storageKey, id);
  }
  return id;
};

export const rotateSimulatorSessionId = (tenantKey) => {
  const id = createSessionId();
  safeStorage.set(`${SIM_SESSION_PREFIX}${tenantKey}`, id);
  return id;
};

export const getSimulatorContactName = () => safeStorage.get(SIM_NAME_STORAGE);
export const setSimulatorContactName = (name) => safeStorage.set(SIM_NAME_STORAGE, String(name || "").trim());

// ---------------------------------------------------------------------------
// Public (simulator) API
// ---------------------------------------------------------------------------

export const aiPublic = {
  getTenants: () => apiRequest(`${BASE}/public/tenants`),

  sendSimulatorMessage: ({ tenantKey, sessionId, text, interactive, contactName }) =>
    apiRequest(`${BASE}/public/simulator/message`, {
      method: "POST",
      body: {
        tenantKey,
        sessionId,
        text: text || undefined,
        interactive: interactive || undefined,
        contactName: contactName || undefined,
      },
    }),

  getSimulatorHistory: ({ tenantKey, sessionId, after }) =>
    apiRequest(`${BASE}/public/simulator/history${qs({ tenantKey, sessionId, after })}`),

  resetSimulator: ({ tenantKey, sessionId }) =>
    apiRequest(`${BASE}/public/simulator/reset`, { method: "POST", body: { tenantKey, sessionId } }),
};

// ---------------------------------------------------------------------------
// Console (advisor dashboard) API
// ---------------------------------------------------------------------------

export const getConsoleKey = () => safeStorage.get(CONSOLE_KEY_STORAGE);
export const setConsoleKey = (key) => safeStorage.set(CONSOLE_KEY_STORAGE, String(key || "").trim());
export const clearConsoleKey = () => safeStorage.set(CONSOLE_KEY_STORAGE, "");

const consoleHeaders = () => {
  const key = getConsoleKey();
  return key ? { "X-AI-Console-Key": key } : {};
};

const consoleRequest = (path, { method = "GET", body } = {}) =>
  apiRequest(`${BASE}/console${path}`, {
    method,
    body,
    token: getAuthToken() || undefined,
    headers: consoleHeaders(),
  });

// True when the error means "log in / enter the console key".
export const isConsoleAuthError = (error) =>
  error?.status === 401 || error?.data?.code === "CONSOLE_AUTH_REQUIRED";

export const aiConsole = {
  getSystem: () => consoleRequest("/system"),
  getOverview: ({ tenantKey, days = 7 } = {}) => consoleRequest(`/overview${qs({ tenantKey, days })}`),
  getFeed: ({ tenantKey, since } = {}) => consoleRequest(`/feed${qs({ tenantKey, since })}`),

  listConversations: ({ tenantKey, status, channel, search, limit, offset } = {}) =>
    consoleRequest(`/conversations${qs({ tenantKey, status, channel, search, limit, offset })}`),
  getConversation: (id) => consoleRequest(`/conversations/${encodeURIComponent(id)}`),
  getConversationMessages: (id, { after } = {}) =>
    consoleRequest(`/conversations/${encodeURIComponent(id)}/messages${qs({ after })}`),
  takeover: (id, { agentName } = {}) =>
    consoleRequest(`/conversations/${encodeURIComponent(id)}/takeover`, { method: "POST", body: { agentName } }),
  release: (id) => consoleRequest(`/conversations/${encodeURIComponent(id)}/release`, { method: "POST", body: {} }),
  reply: (id, { text, agentName }) =>
    consoleRequest(`/conversations/${encodeURIComponent(id)}/reply`, { method: "POST", body: { text, agentName } }),

  listLeads: ({ tenantKey, stage, search, limit, offset, sort } = {}) =>
    consoleRequest(`/leads${qs({ tenantKey, stage, search, limit, offset, sort })}`),
  updateLead: (id, patch) => consoleRequest(`/leads/${encodeURIComponent(id)}`, { method: "PATCH", body: patch }),

  listBookings: ({ tenantKey, status, from, to } = {}) => consoleRequest(`/bookings${qs({ tenantKey, status, from, to })}`),
  updateBooking: (id, patch) => consoleRequest(`/bookings/${encodeURIComponent(id)}`, { method: "PATCH", body: patch }),
  downloadBookingIcs: async (id, fileName = "advisor-call.ics") => {
    const headers = { ...consoleHeaders() };
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(buildApiUrl(`${BASE}/console/bookings/${encodeURIComponent(id)}/ics`), { headers });
    if (!response.ok) throw new Error(`Could not download the calendar file (${response.status})`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  listAdvisors: ({ tenantKey } = {}) => consoleRequest(`/advisors${qs({ tenantKey })}`),
  createAdvisor: (data) => consoleRequest("/advisors", { method: "POST", body: data }),
  updateAdvisor: (id, patch) => consoleRequest(`/advisors/${encodeURIComponent(id)}`, { method: "PATCH", body: patch }),
  getSlots: ({ tenantKey, days, period } = {}) => consoleRequest(`/slots${qs({ tenantKey, days, period })}`),

  listKnowledge: ({ tenantKey } = {}) => consoleRequest(`/knowledge${qs({ tenantKey })}`),
  createKnowledge: (data) => consoleRequest("/knowledge", { method: "POST", body: data }),
  updateKnowledge: (id, patch) => consoleRequest(`/knowledge/${encodeURIComponent(id)}`, { method: "PATCH", body: patch }),
  deleteKnowledge: (id) => consoleRequest(`/knowledge/${encodeURIComponent(id)}`, { method: "DELETE" }),
  searchKnowledge: ({ tenantKey, query }) =>
    consoleRequest("/knowledge/search", { method: "POST", body: { tenantKey, query } }),
};

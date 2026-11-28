"use client";

// Advisor Console for the AI WhatsApp Concierge (/ai-assistant/console).
// Contract: docs/ai-whatsapp-assistant/ARCHITECTURE.md §6 and §11.
//
// URL state: ?tab=<overview|inbox|leads|bookings|knowledge|advisors|system>&tenant=<key>&c=<conversationId>
// (read with useSearchParams inside a Suspense boundary, written with window.history,
// which Next.js syncs into useSearchParams).

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MotionConfig } from "framer-motion";
import { aiConsole, clearConsoleKey, isConsoleAuthError } from "@/lib/aiAssistantApi";
import { useToast } from "@/components/ui/ToastContext";
import { AuthGate, BootScreen, OfflineScreen } from "./AuthGate";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { Drawer, cx } from "./ui";
import { ConsoleContext, InboxDataContext } from "./lib/ConsoleContext";
import { readStorage, usePoll, useStoredString, writeStorage } from "./lib/hooks";
import { resetLiveStatus } from "./lib/liveStore";
import { isNeedsHuman } from "./lib/consoleFormat";
import { AGENT_NAME_STORAGE, NAV_BY_KEY, TAB_KEYS, TENANT_STORAGE, simulatorHref } from "./navigation";
import OverviewView from "./overview/OverviewView";
import InboxView from "./inbox/InboxView";
import LeadsView from "./leads/LeadsView";
import BookingsView from "./bookings/BookingsView";
import KnowledgeView from "./knowledge/KnowledgeView";
import AdvisorsView from "./advisors/AdvisorsView";
import SystemView from "./system/SystemView";

const SESSION_ENDED = "Your console session ended. Enter the access key to continue.";

export default function AiConsole() {
  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<BootScreen />}>
        <ConsoleApp />
      </Suspense>
    </MotionConfig>
  );
}

// ---------------------------------------------------------------------------
// Boot + access gate
// ---------------------------------------------------------------------------

function ConsoleApp() {
  const { info } = useToast();
  const [boot, setBoot] = useState({ status: "checking", system: null, error: null, notice: "", retrying: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const system = await aiConsole.getSystem();
        if (!cancelled) setBoot({ status: "ready", system, error: null, notice: "", retrying: false });
      } catch (error) {
        if (cancelled) return;
        if (isConsoleAuthError(error)) {
          setBoot((prev) => ({ status: "locked", system: null, error: null, notice: prev.notice, retrying: false }));
        } else {
          setBoot({ status: "offline", system: null, error, notice: "", retrying: false });
        }
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Keep the system snapshot (engine badge, tenants) fresh in the background.
  useEffect(() => {
    if (boot.status !== "ready") return undefined;
    let cancelled = false;
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const system = await aiConsole.getSystem();
        if (!cancelled) setBoot((prev) => (prev.status === "ready" ? { ...prev, system } : prev));
      } catch (error) {
        if (!cancelled && isConsoleAuthError(error)) {
          setBoot({ status: "locked", system: null, error: null, notice: SESSION_ENDED, retrying: false });
        }
      }
    }, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [boot.status]);

  const retry = useCallback(() => {
    setBoot((prev) => ({ ...prev, retrying: true }));
    setAttempt((n) => n + 1);
  }, []);

  const handleAuthError = useCallback(() => {
    resetLiveStatus();
    setBoot((prev) =>
      prev.status === "locked" ? prev : { status: "locked", system: null, error: null, notice: SESSION_ENDED, retrying: false },
    );
  }, []);

  const lockConsole = useCallback(() => {
    clearConsoleKey();
    resetLiveStatus();
    setBoot({ status: "locked", system: null, error: null, notice: "", retrying: false });
    info("Console locked", "Enter the access key to open it again.");
  }, [info]);

  const unlock = useCallback((system) => {
    setBoot({ status: "ready", system, error: null, notice: "", retrying: false });
  }, []);

  if (boot.status === "checking") return <BootScreen />;
  if (boot.status === "offline") return <OfflineScreen error={boot.error} onRetry={retry} retrying={boot.retrying} />;
  if (boot.status === "locked") return <AuthGate onUnlocked={unlock} notice={boot.notice} />;
  return <ConsoleWorkspace system={boot.system} onAuthError={handleAuthError} onLock={lockConsole} />;
}

// ---------------------------------------------------------------------------
// Workspace (shell + views)
// ---------------------------------------------------------------------------

const VIEWS = {
  overview: OverviewView,
  inbox: InboxView,
  leads: LeadsView,
  bookings: BookingsView,
  knowledge: KnowledgeView,
  advisors: AdvisorsView,
  system: SystemView,
};

const safeBrandColor = (value) =>
  typeof value === "string" && /^(#[0-9a-f]{3,8}|rgb|hsl|oklch)/i.test(value.trim()) ? value.trim() : "#059669";

function ConsoleWorkspace({ system, onAuthError, onLock }) {
  const searchParams = useSearchParams();
  const rawTab = searchParams?.get("tab") || "";
  const tab = TAB_KEYS.has(rawTab) ? rawTab : "overview";
  const urlTenant = searchParams?.get("tenant") || "";
  const conversationId = searchParams?.get("c") || null;

  const tenants = useMemo(() => (Array.isArray(system?.tenants) ? system.tenants : []), [system]);
  // URL tenant wins; otherwise stay on the tenant we were showing (first visit: last-used from storage).
  const [currentTenant, setCurrentTenant] = useState(() => readStorage(TENANT_STORAGE, ""));
  const tenant = useMemo(
    () => tenants.find((t) => t.key === urlTenant) || tenants.find((t) => t.key === currentTenant) || tenants[0] || null,
    [tenants, urlTenant, currentTenant],
  );
  const tenantKey = tenant?.key || "";
  if (tenantKey && tenantKey !== currentTenant) setCurrentTenant(tenantKey);

  const [agentName, setAgentName] = useStoredString(AGENT_NAME_STORAGE, "Advisor");
  const [menuOpen, setMenuOpen] = useState(false);
  const lastConversationRef = useRef(conversationId);

  const navigate = useCallback((patch, { replace = false } = {}) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    const query = params.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
  }, []);

  // Pin the resolved tenant into the URL (shareable links) and remember it.
  useEffect(() => {
    if (!tenantKey) return;
    writeStorage(TENANT_STORAGE, tenantKey);
    if (urlTenant !== tenantKey) navigate({ tenant: tenantKey }, { replace: true });
  }, [tenantKey, urlTenant, navigate]);

  useEffect(() => {
    if (conversationId) lastConversationRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    const label = NAV_BY_KEY[tab]?.label || "Console";
    document.title = `${label} · ${tenant?.shortName || tenant?.name || "AI Concierge"} · Advisor Console`;
  }, [tab, tenant]);

  const setTab = useCallback(
    (next) => {
      setMenuOpen(false);
      navigate({ tab: next, c: next === "inbox" ? lastConversationRef.current : null });
    },
    [navigate],
  );

  const openConversation = useCallback(
    (id) => {
      if (!id) return;
      setMenuOpen(false);
      navigate({ tab: "inbox", c: id });
    },
    [navigate],
  );

  const selectConversation = useCallback(
    (id) => {
      if (!id) lastConversationRef.current = null;
      navigate({ tab: "inbox", c: id || null }, { replace: true });
    },
    [navigate],
  );

  const changeTenant = useCallback(
    (key) => {
      lastConversationRef.current = null;
      setMenuOpen(false);
      navigate({ tenant: key, c: null });
    },
    [navigate],
  );

  // Shared conversation list: inbox list + sidebar badges (faster while the inbox is open).
  const conversations = usePoll(() => aiConsole.listConversations({ tenantKey, limit: 100 }), {
    key: `conversations:${tenantKey}`,
    interval: tab === "inbox" ? 4000 : 10000,
    enabled: Boolean(tenantKey),
    onAuthError,
  });
  const { setData: setConversationData, refresh: refreshConversations } = conversations;

  const patchConversation = useCallback(
    (id, patch) => {
      setConversationData((data) =>
        data && Array.isArray(data.items)
          ? { ...data, items: data.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) }
          : data,
      );
    },
    [setConversationData],
  );

  const inboxCounts = useMemo(() => {
    const items = conversations.data?.items || [];
    return {
      unread: items.filter((item) => (item.unreadCount || 0) > 0 && item.status !== "closed" && item.id !== conversationId)
        .length,
      needsHuman: items.filter(isNeedsHuman).length,
    };
  }, [conversations.data, conversationId]);

  const inboxValue = useMemo(
    () => ({
      data: conversations.data,
      lastData: conversations.lastData,
      error: conversations.error,
      loading: conversations.loading,
      refresh: refreshConversations,
      patchConversation,
      counts: inboxCounts,
    }),
    [
      conversations.data,
      conversations.lastData,
      conversations.error,
      conversations.loading,
      refreshConversations,
      patchConversation,
      inboxCounts,
    ],
  );

  const simulatorLink = simulatorHref(tenantKey);

  const consoleValue = useMemo(
    () => ({
      system,
      tenants,
      tenant,
      tenantKey,
      tab,
      conversationId,
      agentName,
      setAgentName,
      navigate,
      setTab,
      openConversation,
      selectConversation,
      onAuthError,
      lockConsole: onLock,
      simulatorLink,
    }),
    [
      system,
      tenants,
      tenant,
      tenantKey,
      tab,
      conversationId,
      agentName,
      setAgentName,
      navigate,
      setTab,
      openConversation,
      selectConversation,
      onAuthError,
      onLock,
      simulatorLink,
    ],
  );

  const navItem = NAV_BY_KEY[tab];
  const View = VIEWS[tab] || OverviewView;
  const sidebarProps = {
    tab,
    onNavigate: setTab,
    tenants,
    tenant,
    onTenantChange: changeTenant,
    inboxCounts,
    onLock,
    simulatorLink,
  };

  return (
    <ConsoleContext.Provider value={consoleValue}>
      <InboxDataContext.Provider value={inboxValue}>
        <div
          className="flex h-dvh w-full overflow-hidden bg-slate-50 text-slate-900 antialiased"
          style={{ "--brand": safeBrandColor(tenant?.brand?.primary) }}
        >
          <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block" aria-label="Console navigation">
            <Sidebar {...sidebarProps} />
          </aside>
          <Drawer
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            side="left"
            title="Console navigation"
            hideHeader
            widthClass="w-72 max-w-[85vw]"
          >
            <Sidebar {...sidebarProps} scope="drawer" onClose={() => setMenuOpen(false)} />
          </Drawer>

          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar
              title={navItem?.label || "Overview"}
              subtitle={navItem?.subtitle}
              onOpenMenu={() => setMenuOpen(true)}
              llm={system?.llm}
              agentName={agentName}
              onAgentNameChange={setAgentName}
              tenantKey={tenantKey}
              onOpenConversation={openConversation}
            />
            <main
              id="console-main"
              className={cx("relative min-h-0 flex-1", tab === "inbox" ? "overflow-hidden" : "overflow-y-auto")}
            >
              {tenantKey ? (
                <View key={`${tab}:${tenantKey}`} />
              ) : (
                <div className="p-8 text-sm text-slate-500">
                  No tenants are configured on the backend, so there is nothing to show yet.
                </div>
              )}
            </main>
          </div>
        </div>
      </InboxDataContext.Provider>
    </ConsoleContext.Provider>
  );
}

"use client";

// WhatsApp-style simulator for the AI concierge.
//
// <WhatsAppSimulator
//   tenant={publicTenant}                    // GET /public/tenants item (§6.4)
//   variant="phone" | "fullscreen"
//   onTurn={(result) => {}}                  // POST /public/simulator/message response (§11)
//   onSync={({ source, messages, status }) => {}}   // history load ("history") and polling ("poll")
//   onReset={() => {}}  onPendingChange={(busy) => {}}  onBack={() => {}}
//   ref={handle}                             // handle.sendText(text), handle.reset()
// />
//
// One simulator session per tenant (session id lives in localStorage). The
// component remounts when tenant.key changes.

import {
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useReducedMotion } from "framer-motion";
import { Bot, Headset, LoaderCircle, RotateCcw, UserPen } from "lucide-react";
import {
  aiPublic,
  getSimulatorContactName,
  getSimulatorSessionId,
  rotateSimulatorSessionId,
  setSimulatorContactName,
} from "@/lib/aiAssistantApi";
import { dayKeyIST } from "@/components/ai-assistant/shared/format";
import { brandTheme } from "./brandTheme";
import MessageBubble, { DayChip, FailedBubble, NoticeChip, TypingBubble } from "./MessageBubble";
import { ChatHeader, Composer, HomeIndicator, StarterPrompts, StatusBar } from "./SimChrome";
import { BottomSheet, ListSheetBody, NameSheetBody } from "./SimSheets";
import {
  applySendResult,
  computeTickStates,
  dayChipLabel,
  describeSendError,
  isCustomerMessage,
  isNoticeMessage,
  lastIndexWhere,
  mergeServerMessages,
  statusClock,
  SYSTEM_FONT,
  WALLPAPER_STYLE,
} from "./simulatorUtils";

const POLL_MS = 3000;
const POLL_BACKOFF_MS = 8000;
const POLL_RATE_LIMITED_MS = 30000;
// Poll slightly before the newest createdAt so a message stored just before the
// last AI reply (e.g. an advisor typing during takeover) is never skipped;
// duplicates are dropped by id.
const POLL_OVERLAP_MS = 10000;
const NAME_SKIP_KEY = "ai_sim_name_skipped";
const PHONE_SCREEN_HEIGHT = "clamp(560px, calc(100vh - 150px), 780px)";

const readNameSkipped = () => {
  try {
    return window.sessionStorage.getItem(NAME_SKIP_KEY) === "1";
  } catch {
    return false;
  }
};

const rememberNameSkipped = () => {
  try {
    window.sessionStorage.setItem(NAME_SKIP_KEY, "1");
  } catch {
    // Storage blocked: the prompt may show again next visit, which is fine.
  }
};

// Visual viewport (fullscreen variant keeps the composer above the keyboard).
const noopSubscribe = () => () => {};
const zero = () => 0;
const subscribeViewport = (callback) => {
  const viewport = window.visualViewport;
  window.addEventListener("resize", callback);
  viewport?.addEventListener("resize", callback);
  viewport?.addEventListener("scroll", callback);
  return () => {
    window.removeEventListener("resize", callback);
    viewport?.removeEventListener("resize", callback);
    viewport?.removeEventListener("scroll", callback);
  };
};
const viewportHeight = () => Math.round(window.visualViewport?.height || window.innerHeight || 0);
const viewportOffsetTop = () => Math.round(window.visualViewport?.offsetTop || 0);

function TakeoverBar() {
  return (
    <div className="relative z-20 flex shrink-0 items-center gap-2 bg-[#fff7e0] px-4 py-2 text-[12.5px] font-medium leading-snug text-[#6b4e00] shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
      <Headset size={14} className="shrink-0" aria-hidden="true" />
      An advisor has joined — you&apos;re now chatting with a person.
    </div>
  );
}

function LoadingChip() {
  return (
    <div className="my-3 flex justify-center">
      <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[12.5px] text-[#54656f]">
        <LoaderCircle size={14} className="motion-safe:animate-spin" aria-hidden="true" />
        Loading chat…
      </span>
    </div>
  );
}

export default function WhatsAppSimulator({ tenant, ...props }) {
  if (!tenant?.key) return null;
  return <SimulatorCore key={tenant.key} tenant={tenant} {...props} />;
}

function SimulatorCore({
  ref,
  tenant,
  variant = "phone",
  onTurn,
  onSync,
  onReset,
  onPendingChange,
  onBack,
  className = "",
}) {
  const fullscreen = variant === "fullscreen";
  const size = fullscreen ? "md" : "sm";
  const tenantKey = tenant.key;
  const theme = useMemo(() => brandTheme(tenant.brand), [tenant.brand]);
  const reduceMotion = useReducedMotion();
  const sheetId = useId();

  const [sessionId, setSessionId] = useState(() => getSimulatorSessionId(tenantKey));
  const [messages, setMessages] = useState([]);
  const [historyState, setHistoryState] = useState("loading"); // loading | ready | error
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [convStatus, setConvStatus] = useState(null);
  const [contactName, setContactName] = useState(() => getSimulatorContactName());
  const [nameSheet, setNameSheet] = useState(() =>
    !getSimulatorContactName() && !readNameSkipped() ? "first-run" : null,
  );
  const [listSheet, setListSheet] = useState({ open: false, message: null });
  const [now, setNow] = useState(() => new Date());
  const [openedAt] = useState(() => new Date().toISOString());

  const scrollRef = useRef(null);
  const busyRef = useRef(false); // a send or reset is in flight
  const lastAtRef = useRef(null); // createdAt of the newest stored message
  const knownIdsRef = useRef(new Set());
  const hasConversationRef = useRef(false);
  const generationRef = useRef(0); // bumps on send/reset so stale polls are dropped
  const seqRef = useRef(0);
  const scrolledRef = useRef(false);
  const listTriggerRef = useRef(null);

  const emitSync = useEffectEvent((payload) => onSync?.(payload));

  const vvHeight = useSyncExternalStore(
    fullscreen ? subscribeViewport : noopSubscribe,
    fullscreen ? viewportHeight : zero,
    zero,
  );
  const vvTop = useSyncExternalStore(
    fullscreen ? subscribeViewport : noopSubscribe,
    fullscreen ? viewportOffsetTop : zero,
    zero,
  );

  // Load stored history so a refresh keeps the chat.
  useEffect(() => {
    let cancelled = false;
    aiPublic
      .getSimulatorHistory({ tenantKey, sessionId })
      .then((response) => {
        if (cancelled) return;
        const list = Array.isArray(response?.messages) ? response.messages : [];
        setMessages((prev) => mergeServerMessages(prev, list));
        setConvStatus(response?.status || null);
        setHistoryState("ready");
        emitSync({
          source: "history",
          messages: list,
          status: response?.status || null,
          conversationId: response?.conversationId || null,
        });
      })
      .catch(() => {
        if (!cancelled) setHistoryState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey, sessionId]);

  // Poll for messages written by someone else (human advisor takeover).
  useEffect(() => {
    if (historyState === "loading") return undefined;
    let stopped = false;
    let timer = null;

    const tick = async () => {
      if (stopped) return;
      let delay = POLL_MS;
      const visible = document.visibilityState !== "hidden";
      if (visible && !busyRef.current && (hasConversationRef.current || historyState === "error")) {
        const generation = generationRef.current;
        const lastAt = Date.parse(lastAtRef.current || "");
        try {
          const response = await aiPublic.getSimulatorHistory({
            tenantKey,
            sessionId,
            after: Number.isFinite(lastAt) ? new Date(lastAt - POLL_OVERLAP_MS).toISOString() : undefined,
          });
          if (!stopped && generation === generationRef.current && !busyRef.current) {
            const list = Array.isArray(response?.messages) ? response.messages : [];
            const fresh = list.filter((message) => message?.id && !knownIdsRef.current.has(message.id));
            if (fresh.length) {
              setMessages((prev) => mergeServerMessages(prev, fresh, { animate: true }));
              emitSync({ source: "poll", messages: fresh, status: response?.status || null });
            }
            if (response?.status) setConvStatus(response.status);
            if (historyState === "error") setHistoryState("ready");
          }
        } catch (error) {
          delay = Number(error?.status) === 429 ? POLL_RATE_LIMITED_MS : POLL_BACKOFF_MS;
        }
      }
      if (!stopped) timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [historyState, tenantKey, sessionId]);

  // Keep poll bookkeeping in refs (read only inside async callbacks).
  useEffect(() => {
    let last = null;
    let hasStored = false;
    for (const message of messages) {
      if (message._local) continue;
      hasStored = true;
      if (message.createdAt) last = message.createdAt;
    }
    lastAtRef.current = last;
    hasConversationRef.current = hasStored;
    knownIdsRef.current = new Set(messages.map((message) => message.id));
  }, [messages]);

  // Status-bar clock and "Today" chip.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(timer);
  }, []);

  const typing = sending && convStatus !== "human_takeover";

  // Stick to the newest message.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const smooth = scrolledRef.current && !reduceMotion;
    scrolledRef.current = true;
    element.scrollTo({ top: element.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, [messages, typing, historyState, reduceMotion]);

  const sendMessage = async ({ text, interactive }) => {
    if (busyRef.current) return false;
    const display = String(interactive ? interactive.title : text || "").trim();
    if (!display) return false;

    seqRef.current += 1;
    const localId = `local-${seqRef.current}`;
    const request = interactive
      ? { interactive: { id: String(interactive.id), title: display } }
      : { text: display.slice(0, 1000) };
    const optimistic = {
      id: localId,
      _local: true,
      _anim: 0,
      status: "pending",
      direction: "inbound",
      sender: "customer",
      type: "text",
      text: display,
      payload: request.interactive ? { interactive: request.interactive } : null,
      createdAt: new Date().toISOString(),
      request,
    };

    busyRef.current = true;
    generationRef.current += 1;
    if (nameSheet === "first-run") setNameSheet(null);
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);
    onPendingChange?.(true);

    let result = null;
    try {
      result = await aiPublic.sendSimulatorMessage({
        tenantKey,
        sessionId,
        ...request,
        contactName: contactName || undefined,
      });
      setMessages((prev) => applySendResult(prev, localId, result));
      if (result?.handledBy === "human_pending") setConvStatus("human_takeover");
      else if (result?.handledBy === "claude" || result?.handledBy === "fallback") setConvStatus("ai_active");
    } catch (error) {
      const info = describeSendError(error);
      setMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, status: "failed", error: info } : m)));
    } finally {
      busyRef.current = false;
      setSending(false);
      onPendingChange?.(false);
    }

    if (result) onTurn?.(result);
    return Boolean(result);
  };

  const retry = (message) => {
    if (busyRef.current) return;
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    sendMessage(message.request || { text: message.text });
  };

  const resetChat = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    generationRef.current += 1;
    setResetting(true);
    setListSheet({ open: false, message: null });
    try {
      await aiPublic.resetSimulator({ tenantKey, sessionId });
    } catch {
      // Best effort: a fresh session id starts a new conversation either way.
    }
    const nextSession = rotateSimulatorSessionId(tenantKey);
    generationRef.current += 1;
    scrolledRef.current = false;
    setMessages([]);
    setConvStatus(null);
    setHistoryState("ready");
    setSessionId(nextSession);
    setResetting(false);
    busyRef.current = false;
    onReset?.();
  };

  const saveName = (name) => {
    setSimulatorContactName(name);
    setContactName(name);
    setNameSheet(null);
  };

  const dismissNameSheet = () => {
    if (nameSheet === "first-run") rememberNameSkipped();
    setNameSheet(null);
  };

  const openList = (message, trigger) => {
    listTriggerRef.current = trigger || null;
    setListSheet({ open: true, message });
  };

  const closeList = () => {
    setListSheet((state) => ({ ...state, open: false }));
    const trigger = listTriggerRef.current;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  };

  const sendListRow = (row) => {
    setListSheet((state) => ({ ...state, open: false }));
    sendMessage({ interactive: { id: row.id, title: row.title } });
  };

  useImperativeHandle(ref, () => ({
    sendText: (text) => sendMessage({ text }),
    reset: () => resetChat(),
  }));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const ticks = useMemo(() => computeTickStates(messages), [messages]);
  const lastCustomerIndex = lastIndexWhere(messages, (m) => isCustomerMessage(m));
  const todayKey = dayKeyIST(now);
  const yesterdayKey = dayKeyIST(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const busy = sending || resetting;
  const statusText = typing
    ? "typing…"
    : convStatus === "human_takeover"
      ? "online · advisor in chat"
      : "online";
  const prompts = Array.isArray(tenant.starterPrompts) ? tenant.starterPrompts.filter(Boolean) : [];
  const showPrompts = messages.length === 0 && historyState !== "loading";

  // The local welcome is only a preview for an empty chat. Once the conversation starts, the
  // assistant's own first reply (which introduces itself, as it does on real WhatsApp) takes over,
  // so the customer never sees two introductions.
  const welcome = tenant.welcomeMessage ? String(tenant.welcomeMessage) : "";
  const showWelcome = Boolean(welcome) && messages.length === 0;

  const firstAt = messages[0]?.createdAt || openedAt;
  const feed = [
    <DayChip key="day-first" label={dayChipLabel(firstAt, todayKey, yesterdayKey)} />,
    <NoticeChip key="ai-notice" tone="ai" icon={Bot}>
      This chat is handled by an AI assistant · Reply STOP to opt out
    </NoticeChip>,
  ];
  if (showWelcome) {
    feed.push(
      <MessageBubble
        key="welcome"
        message={{ id: "welcome", direction: "outbound", sender: "ai", type: "text", text: welcome, createdAt: firstAt }}
        first
        theme={theme}
        size={size}
      />,
    );
  }

  let previousDay = dayKeyIST(firstAt);
  let previousSide = showWelcome ? "business" : null;
  let previousSender = showWelcome ? "ai" : null;
  messages.forEach((message, index) => {
    const day = dayKeyIST(message.createdAt) || todayKey;
    if (day !== previousDay) {
      feed.push(<DayChip key={`day-${day}`} label={dayChipLabel(message.createdAt, todayKey, yesterdayKey)} />);
      previousDay = day;
      previousSide = null;
    }
    const key = message._key || message.id;
    if (isNoticeMessage(message)) {
      feed.push(<MessageBubble key={key} message={message} theme={theme} />);
      previousSide = null;
      return;
    }
    const side = isCustomerMessage(message) ? "customer" : "business";
    const sender = message.sender === "agent" ? "agent" : side;
    const first = side !== previousSide || sender !== previousSender;
    previousSide = side;
    previousSender = sender;
    feed.push(
      <MessageBubble
        key={key}
        message={message}
        tick={ticks[index]}
        first={first}
        active={index > lastCustomerIndex && !busy}
        theme={theme}
        teamName={tenant.booking?.teamName}
        size={size}
        onReply={(interactive) => sendMessage({ interactive })}
        onOpenList={openList}
      />,
    );
    if (message._local && message.status === "failed") {
      feed.push(
        <FailedBubble key={`${message.id}-failed`} error={message.error} onRetry={() => retry(message)} disabled={busy} />,
      );
    }
  });
  if (typing) feed.push(<TypingBubble key="typing" />);

  const menuItems = [
    {
      key: "reset",
      label: resetting ? "Resetting…" : "Reset chat",
      icon: RotateCcw,
      onSelect: resetChat,
      disabled: busy,
    },
    {
      key: "name",
      label: contactName ? "Change your name" : "Set your name",
      icon: UserPen,
      onSelect: () => setNameSheet("edit"),
    },
  ];

  const screen = (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden text-[#111b21] antialiased"
      style={{ ...WALLPAPER_STYLE, fontFamily: SYSTEM_FONT }}
    >
      {fullscreen ? (
        <div className="shrink-0 bg-[#075E54]" style={{ height: "env(safe-area-inset-top, 0px)" }} />
      ) : (
        <StatusBar clock={statusClock(now)} />
      )}
      <ChatHeader tenant={tenant} theme={theme} statusText={statusText} onBack={onBack} menuItems={menuItems} />
      {convStatus === "human_takeover" ? <TakeoverBar /> : null}

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={`Conversation with ${tenant.name}`}
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-[3.5%] pb-2 pt-1 [scrollbar-width:thin]"
      >
        {feed}
        {historyState === "loading" ? <LoadingChip /> : null}
        {historyState === "error" && messages.length === 0 ? (
          <NoticeChip>Couldn&apos;t load earlier messages — new messages will still work.</NoticeChip>
        ) : null}
      </div>

      {showPrompts ? (
        <StarterPrompts
          prompts={prompts}
          max={fullscreen ? 6 : 4}
          disabled={busy}
          onPick={(prompt) => sendMessage({ text: prompt })}
        />
      ) : null}
      <Composer disabled={busy} size={size} onSubmit={(text) => sendMessage({ text })} />
      {fullscreen ? (
        <div className="shrink-0" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      ) : (
        <HomeIndicator />
      )}

      <BottomSheet open={listSheet.open} onClose={closeList} labelledBy={`${sheetId}-list`}>
        {listSheet.message ? (
          <ListSheetBody
            key={listSheet.message.id}
            message={listSheet.message}
            headingId={`${sheetId}-list`}
            onSend={sendListRow}
            onClose={closeList}
          />
        ) : null}
      </BottomSheet>
      <BottomSheet
        open={Boolean(nameSheet)}
        onClose={dismissNameSheet}
        labelledBy={`${sheetId}-name`}
        autoFocus={nameSheet === "edit" || fullscreen}
      >
        <NameSheetBody
          headingId={`${sheetId}-name`}
          initialName={nameSheet === "edit" ? contactName : ""}
          skipLabel={nameSheet === "edit" ? "Cancel" : "Skip"}
          onSave={saveName}
          onSkip={dismissNameSheet}
        />
      </BottomSheet>
    </div>
  );

  if (fullscreen) {
    return (
      <div
        className={`fixed inset-x-0 top-0 z-10 flex justify-center bg-[#0b141a] ${className}`}
        style={{
          height: vvHeight ? `${vvHeight}px` : "100dvh",
          transform: vvTop ? `translate3d(0, ${vvTop}px, 0)` : undefined,
        }}
      >
        <div className="relative h-full w-full md:max-w-[480px] md:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_30px_80px_rgba(0,0,0,0.5)]">
          {screen}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative mx-auto w-full max-w-[380px] ${className}`}>
      <div className="relative rounded-[48px] bg-[#101317] p-[8px] shadow-[0_50px_100px_-30px_rgba(11,18,32,0.55),0_30px_60px_-40px_rgba(11,18,32,0.5)] ring-1 ring-black/70 sm:rounded-[56px] sm:p-[11px]">
        <span aria-hidden="true" className="absolute -left-[3px] top-[112px] h-9 w-[3px] rounded-l-sm bg-[#262a31]" />
        <span aria-hidden="true" className="absolute -left-[3px] top-[164px] h-14 w-[3px] rounded-l-sm bg-[#262a31]" />
        <span aria-hidden="true" className="absolute -right-[3px] top-[148px] h-20 w-[3px] rounded-r-sm bg-[#262a31]" />
        <div className="relative overflow-hidden rounded-[40px] sm:rounded-[45px]" style={{ height: PHONE_SCREEN_HEIGHT }}>
          {screen}
        </div>
      </div>
    </div>
  );
}

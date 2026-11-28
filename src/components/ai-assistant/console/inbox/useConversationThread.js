// Live thread state for one conversation.
// - GET /conversations/:id once (messages + lead + bookings; marks the chat read)
// - then GET /conversations/:id/messages?after=<newest createdAt> every 2.5 s
// - re-fetches the detail (lead score, bookings, read state) shortly after new
//   customer / AI messages arrive, and every 20 s as a safety net.

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { aiConsole, isConsoleAuthError } from "@/lib/aiAssistantApi";
import { useConsole } from "../lib/ConsoleContext";
import { reportPollFailure, reportPollSuccess } from "../lib/liveStore";
import { latestCreatedAt, mergeById } from "../lib/consoleFormat";

const POLL_MS = 2500;
const DETAIL_REFRESH_MS = 20000;

const sameFields = (current, next) => {
  if (!current) return false;
  return Object.keys(next).every((key) => JSON.stringify(current[key]) === JSON.stringify(next[key]));
};

export function useConversationThread(conversationId, initialSummary) {
  const { onAuthError } = useConsole();
  const [state, setState] = useState(() => ({
    conversation: initialSummary || null,
    messages: [],
    lead: null,
    bookings: [],
    loaded: false,
    error: null,
    notFound: false,
  }));
  const [reloadToken, setReloadToken] = useState(0);
  const leadEditRef = useRef(0);
  const handleAuthError = useEffectEvent((error) => onAuthError(error));

  useEffect(() => {
    if (!conversationId) return undefined;
    let cancelled = false;
    let stopped = false;
    let inFlight = false;
    let detailLoaded = false;
    let pollTimer = null;
    let detailTimer = null;
    let lastAt = null;

    const handleError = (error) => {
      if (isConsoleAuthError(error)) {
        stopped = true;
        handleAuthError(error);
        return true;
      }
      reportPollFailure(error);
      return false;
    };

    const loadDetail = async () => {
      const leadVersion = leadEditRef.current;
      try {
        const res = await aiConsole.getConversation(conversationId);
        if (cancelled) return false;
        const messages = Array.isArray(res?.messages) ? res.messages : [];
        lastAt = latestCreatedAt(messages, lastAt);
        detailLoaded = true;
        const keepLocalLead = leadVersion !== leadEditRef.current;
        setState((prev) => ({
          conversation: res?.conversation ? { ...prev.conversation, ...res.conversation } : prev.conversation,
          messages: mergeById(prev.messages, messages),
          lead: keepLocalLead ? prev.lead : res?.lead ?? null,
          bookings: Array.isArray(res?.bookings) ? res.bookings : prev.bookings,
          loaded: true,
          error: null,
          notFound: false,
        }));
        reportPollSuccess();
        return true;
      } catch (error) {
        if (cancelled || handleError(error)) return false;
        if (error?.status === 404) {
          stopped = true;
          setState((prev) => ({ ...prev, notFound: true, error }));
          return false;
        }
        setState((prev) => (prev.loaded ? prev : { ...prev, error }));
        return false;
      }
    };

    const poll = async () => {
      pollTimer = null;
      if (cancelled || stopped) return;
      if (document.hidden) {
        pollTimer = setTimeout(poll, POLL_MS);
        return;
      }
      inFlight = true;
      try {
        if (!detailLoaded) {
          await loadDetail();
          return;
        }
        const res = await aiConsole.getConversationMessages(conversationId, { after: lastAt || undefined });
        if (cancelled) return;
        const fresh = Array.isArray(res?.messages) ? res.messages : [];
        if (fresh.length) lastAt = latestCreatedAt(fresh, lastAt);
        const nextConversation = res?.conversation && typeof res.conversation === "object" ? res.conversation : null;
        setState((prev) => {
          const messages = fresh.length ? mergeById(prev.messages, fresh) : prev.messages;
          const conversation =
            nextConversation && !sameFields(prev.conversation, nextConversation)
              ? { ...prev.conversation, ...nextConversation }
              : prev.conversation;
          if (messages === prev.messages && conversation === prev.conversation) return prev;
          return { ...prev, messages, conversation };
        });
        if (fresh.some((m) => m.sender === "customer" || m.trace || m.type === "booking_confirmation")) {
          clearTimeout(detailTimer);
          detailTimer = setTimeout(loadDetail, 900);
        }
        reportPollSuccess();
      } catch (error) {
        if (!cancelled) handleError(error);
      } finally {
        inFlight = false;
        if (!cancelled && !stopped) pollTimer = setTimeout(poll, POLL_MS);
      }
    };

    const start = async () => {
      const ok = await loadDetail();
      if (cancelled || stopped) return;
      pollTimer = setTimeout(poll, ok ? POLL_MS : POLL_MS * 2);
    };
    start();

    const detailInterval = setInterval(() => {
      if (!document.hidden && !cancelled && !stopped && detailLoaded) loadDetail();
    }, DETAIL_REFRESH_MS);

    const onVisibility = () => {
      if (document.hidden || cancelled || stopped || inFlight) return;
      clearTimeout(pollTimer);
      poll();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
      clearTimeout(detailTimer);
      clearInterval(detailInterval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [conversationId, reloadToken]);

  const applyConversation = useCallback((patch) => {
    if (!patch || typeof patch !== "object") return;
    setState((prev) => ({ ...prev, conversation: { ...prev.conversation, ...patch } }));
  }, []);

  const appendMessages = useCallback((messages) => {
    const list = (Array.isArray(messages) ? messages : [messages]).filter((m) => m && m.id);
    if (!list.length) return;
    setState((prev) => ({ ...prev, messages: mergeById(prev.messages, list) }));
  }, []);

  // Local lead edits win over a detail refresh that was already in flight.
  const setLead = useCallback((updater) => {
    leadEditRef.current += 1;
    setState((prev) => ({ ...prev, lead: typeof updater === "function" ? updater(prev.lead) : updater }));
  }, []);

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, notFound: false }));
    setReloadToken((n) => n + 1);
  }, []);

  return { ...state, applyConversation, appendMessages, setLead, reload };
}

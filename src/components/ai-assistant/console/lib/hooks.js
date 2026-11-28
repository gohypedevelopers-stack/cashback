import {
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { isConsoleAuthError } from "@/lib/aiAssistantApi";
import { ConsoleContext } from "./ConsoleContext";
import { reportPollFailure, reportPollSuccess } from "./liveStore";

const EMPTY_POLL_STATE = { dataKey: null, data: undefined, errorKey: null, error: null, updatedAt: 0 };

/**
 * Fetch `fetcher()` for `key`, then every `interval` ms (0 = once).
 * - pauses while the tab is hidden and refreshes as soon as it is visible again
 * - skips re-renders when the payload is unchanged
 * - optimistic updates: setData(updater) / track(promise) discard in-flight results
 * - console auth errors bubble up to the shell (shows the access-key gate)
 */
export function usePoll(fetcher, { key = "default", interval = 0, enabled = true, onAuthError } = {}) {
  const consoleCtx = useContext(ConsoleContext);
  const [state, setState] = useState(EMPTY_POLL_STATE);
  const [nonce, setNonce] = useState(0);
  const guardRef = useRef({ seq: 0, pending: 0, sig: null, sigKey: null, errorKey: null });

  const runFetcher = useEffectEvent(() => fetcher());
  const handleAuthError = useEffectEvent((error) => {
    const handler = onAuthError || consoleCtx?.onAuthError;
    if (handler) handler(error);
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const guard = guardRef.current;
    let cancelled = false;
    let stopped = false;
    let inFlight = false;
    let timer = null;

    const schedule = () => {
      if (cancelled || stopped || interval <= 0) return;
      clearTimeout(timer);
      timer = setTimeout(tick, interval);
    };

    async function tick() {
      timer = null;
      if (cancelled || stopped) return;
      if (interval > 0 && typeof document !== "undefined" && document.hidden) {
        schedule();
        return;
      }
      inFlight = true;
      const seq = guard.seq;
      try {
        const data = await runFetcher();
        if (cancelled) return;
        reportPollSuccess();
        if (seq !== guard.seq || guard.pending > 0) return; // a local mutation happened meanwhile
        let sig = null;
        try {
          sig = JSON.stringify(data);
        } catch {
          sig = null;
        }
        if (sig !== null && guard.sigKey === key && sig === guard.sig) {
          // Unchanged payload: no re-render, unless an earlier error must be cleared.
          if (guard.errorKey === key) {
            guard.errorKey = null;
            setState((prev) => ({ ...prev, error: null, errorKey: null }));
          }
          return;
        }
        guard.sig = sig;
        guard.sigKey = key;
        guard.errorKey = null;
        setState({ dataKey: key, data, errorKey: null, error: null, updatedAt: Date.now() });
      } catch (error) {
        if (cancelled) return;
        if (isConsoleAuthError(error)) {
          stopped = true;
          handleAuthError(error);
          return;
        }
        reportPollFailure(error);
        guard.errorKey = key;
        setState((prev) => ({ ...prev, error, errorKey: key }));
      } finally {
        inFlight = false;
        schedule();
      }
    }

    tick();

    const onVisibility = () => {
      if (document.hidden || inFlight || cancelled || stopped || interval <= 0) return;
      clearTimeout(timer);
      tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [key, interval, enabled, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  // Optimistic local update for the current key; in-flight poll results are dropped.
  const setData = useCallback(
    (updater) => {
      const guard = guardRef.current;
      guard.seq += 1;
      guard.sig = null;
      setState((prev) => {
        if (prev.dataKey !== key) return prev;
        const next = typeof updater === "function" ? updater(prev.data) : updater;
        return { ...prev, data: next };
      });
    },
    [key],
  );

  // Hold poll results while a mutation request is running.
  const track = useCallback(async (promise) => {
    const guard = guardRef.current;
    guard.pending += 1;
    guard.seq += 1;
    try {
      return await promise;
    } finally {
      guard.pending -= 1;
      guard.seq += 1;
      guard.sig = null;
    }
  }, []);

  const isCurrent = state.dataKey === key;
  const error = state.errorKey === key ? state.error : null;
  return {
    data: isCurrent ? state.data : undefined,
    lastData: state.data,
    error,
    loading: enabled && !isCurrent && !error,
    isCurrent,
    updatedAt: state.updatedAt,
    refresh,
    setData,
    track,
  };
}

export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export const readStorage = (storageKey, fallback = "") => {
  try {
    const value = window.localStorage.getItem(storageKey);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
};

export const writeStorage = (storageKey, value) => {
  try {
    if (value === null || value === undefined || value === "") window.localStorage.removeItem(storageKey);
    else window.localStorage.setItem(storageKey, String(value));
  } catch {
    // Storage blocked (private mode) — keep working without persistence.
  }
};

// String state persisted in localStorage.
export function useStoredString(storageKey, fallback) {
  const [value, setValue] = useState(() => readStorage(storageKey, fallback) || fallback);
  const update = useCallback(
    (next) => {
      const clean = String(next ?? "").trim();
      setValue(clean || fallback);
      writeStorage(storageKey, clean);
    },
    [storageKey, fallback],
  );
  return [value, update];
}

export function useMediaQuery(query) {
  const subscribe = useCallback(
    (callback) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    [query],
  );
  const getSnapshot = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

// Close popovers on outside click / Escape.
export function useDismiss(ref, onDismiss, enabled = true) {
  const dismiss = useEffectEvent(() => onDismiss());
  useEffect(() => {
    if (!enabled) return undefined;
    const onPointerDown = (event) => {
      const node = ref.current;
      if (node && !node.contains(event.target)) dismiss();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") dismiss();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, ref]);
}

export function useCopy(resetMs = 1600) {
  const [copiedId, setCopiedId] = useState(null);
  useEffect(() => {
    if (!copiedId) return undefined;
    const timer = setTimeout(() => setCopiedId(null), resetMs);
    return () => clearTimeout(timer);
  }, [copiedId, resetMs]);

  const copy = useCallback(async (text, id = "default") => {
    const value = String(text ?? "");
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      return true;
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = value;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        if (ok) setCopiedId(id);
        return ok;
      } catch {
        return false;
      }
    }
  }, []);

  return { copiedId, copy };
}

// Global single-key shortcut (ignored while typing in a field).
export function useHotkey(key, handler) {
  const onKey = useEffectEvent((event) => handler(event));
  useEffect(() => {
    const listener = (event) => {
      if (event.key !== key || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;
      onKey(event);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [key]);
}

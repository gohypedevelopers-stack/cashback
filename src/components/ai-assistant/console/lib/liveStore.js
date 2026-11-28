// Tiny external stores for the advisor console.
//
// - live status: every successful / failed poll reports here, and only the top
//   bar subscribes, so a poll tick does not re-render the whole console.
// - tickers: shared clocks that relative-time labels subscribe to (render code
//   never calls Date.now() itself).

import { useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// Live status
// ---------------------------------------------------------------------------

let liveSnapshot = { lastOkAt: 0, lastFailAt: 0, failing: false, message: "" };
const liveListeners = new Set();

const emitLive = (next) => {
  liveSnapshot = next;
  liveListeners.forEach((listener) => listener());
};

export const reportPollSuccess = () => {
  emitLive({ lastOkAt: Date.now(), lastFailAt: liveSnapshot.lastFailAt, failing: false, message: "" });
};

export const reportPollFailure = (error) => {
  emitLive({
    lastOkAt: liveSnapshot.lastOkAt,
    lastFailAt: Date.now(),
    failing: true,
    message: error?.message || "Connection problem",
  });
};

export const resetLiveStatus = () => emitLive({ lastOkAt: 0, lastFailAt: 0, failing: false, message: "" });

const subscribeLive = (listener) => {
  liveListeners.add(listener);
  return () => liveListeners.delete(listener);
};

const getLiveSnapshot = () => liveSnapshot;

export const useLiveStatus = () => useSyncExternalStore(subscribeLive, getLiveSnapshot, getLiveSnapshot);

// ---------------------------------------------------------------------------
// Shared tickers (one interval per period, started lazily, stopped when unused)
// ---------------------------------------------------------------------------

const createTicker = (periodMs) => {
  const ticker = { now: Date.now(), listeners: new Set(), timer: null };
  ticker.subscribe = (listener) => {
    ticker.listeners.add(listener);
    if (!ticker.timer) {
      ticker.now = Date.now();
      ticker.timer = setInterval(() => {
        ticker.now = Date.now();
        ticker.listeners.forEach((fn) => fn());
      }, periodMs);
    }
    return () => {
      ticker.listeners.delete(listener);
      if (!ticker.listeners.size && ticker.timer) {
        clearInterval(ticker.timer);
        ticker.timer = null;
      }
    };
  };
  ticker.getSnapshot = () => ticker.now;
  return ticker;
};

const TICKERS = {
  1000: createTicker(1000),
  5000: createTicker(5000),
  15000: createTicker(15000),
  60000: createTicker(60000),
};

// Current time in ms, refreshed every `periodMs` (1 s, 5 s, 15 s or 60 s).
export const useNow = (periodMs = 15000) => {
  const ticker = TICKERS[periodMs] || TICKERS[15000];
  return useSyncExternalStore(ticker.subscribe, ticker.getSnapshot, ticker.getSnapshot);
};

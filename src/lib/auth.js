import { useSyncExternalStore } from "react";

export const AUTH_TOKEN_KEY = "cashback_auth_token";
export const AUTH_CHANGE_EVENT = "cashback-auth-change";
export const REDIRECT_AFTER_LOGIN_KEY = "cashback_redirect_after_login";
const AUTH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const dispatchAuthChange = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
};

const readCookie = (name) => {
  if (typeof window === "undefined") return "";
  const target = `${name}=`;
  const cookieValue = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(target));
  if (!cookieValue) return "";
  try {
    return decodeURIComponent(cookieValue.slice(target.length));
  } catch {
    return cookieValue.slice(target.length);
  }
};

const writeAuthCookie = (token) => {
  if (typeof window === "undefined") return;
  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  if (token) {
    document.cookie = `${AUTH_TOKEN_KEY}=${encodeURIComponent(token)}; Max-Age=${AUTH_TOKEN_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secureFlag}`;
  } else {
    document.cookie = `${AUTH_TOKEN_KEY}=; Max-Age=0; Path=/; SameSite=Lax${secureFlag}`;
  }
};

export const getAuthToken = () => {
  if (typeof window === "undefined") return "";
  try {
    const localToken = localStorage.getItem(AUTH_TOKEN_KEY) || "";
    if (localToken) return localToken;
  } catch {
    // Some in-app "safe browsers" block localStorage; fall back to cookie.
  }
  return readCookie(AUTH_TOKEN_KEY) || "";
};

export const storeAuthToken = (token) => {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // Ignore localStorage failures and keep cookie-based auth as fallback.
  }
  writeAuthCookie(token || "");
  dispatchAuthChange();
};

export const clearAuthToken = () => {
  storeAuthToken(null);
};

export const storePostLoginRedirect = (path) => {
  if (typeof window === "undefined") return;
  if (path) {
    localStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, path);
  } else {
    localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
  }
};

export const popPostLoginRedirect = () => {
  if (typeof window === "undefined") return "";
  const target = localStorage.getItem(REDIRECT_AFTER_LOGIN_KEY) || "";
  localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
  return target;
};

const subscribeToAuth = (callback) => {
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
};

// useSyncExternalStore: the server render (and hydration) sees "logged out",
// then the client immediately re-renders with the real token. Pages rendered
// only in the browser get the real token on their first render.
export const useAuth = () => {
  const authToken = useSyncExternalStore(subscribeToAuth, getAuthToken, () => "");

  return {
    authToken,
    isAuthenticated: Boolean(authToken),
  };
};

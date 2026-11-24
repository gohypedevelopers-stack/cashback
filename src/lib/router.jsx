"use client";

// Small compatibility layer that exposes the react-router-dom API the app was
// written against (Link, Navigate, useNavigate, useLocation, useParams,
// useSearchParams, useMatch) on top of the Next.js App Router. It lets the
// existing views keep their code unchanged.

import React, { forwardRef, useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import NextLink from "next/link";
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";

const STATE_KEY_PREFIX = "ar-nav-state:";

const toHref = (to) => {
  if (typeof to === "string") return to;
  if (to && typeof to === "object") {
    return `${to.pathname || ""}${to.search || ""}${to.hash || ""}` || "/";
  }
  return "/";
};

const pathOf = (href) => String(href).split(/[?#]/)[0] || "/";

const LOCATION_EVENT = "ar-locationchange";
let navStateVersion = 0;

const notifyLocationChange = () => {
  // Deferred so we never update React state in the middle of Next's commit.
  queueMicrotask(() => window.dispatchEvent(new Event(LOCATION_EVENT)));
};

if (typeof window !== "undefined" && !window.__arRouterShimInstalled) {
  window.__arRouterShimInstalled = true;
  // Next.js changes the URL with pushState/replaceState, which fire no event.
  // Announce them so useLocation().search/hash update on in-app navigation.
  for (const method of ["pushState", "replaceState"]) {
    const original = window.history[method];
    window.history[method] = function patchedHistoryMethod(...args) {
      const result = original.apply(this, args);
      notifyLocationChange();
      return result;
    };
  }
  // react-router state lives on a history entry: a fresh page load has none, while
  // reload and back/forward keep it. Mirror that by clearing saved state on fresh loads.
  try {
    const [entry] = performance.getEntriesByType("navigation");
    if (!entry || entry.type === "navigate") {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(STATE_KEY_PREFIX)) sessionStorage.removeItem(key);
      }
    }
  } catch {
    // sessionStorage / performance API unavailable; nothing to clear.
  }
}

// react-router keeps `state` in history.state; Next.js owns history.state, so we
// keep it in sessionStorage keyed by the target path (survives refresh like before).
// Navigating without state clears it, like react-router's new history entry.
const saveNavState = (href, state) => {
  if (typeof window === "undefined") return;
  const key = STATE_KEY_PREFIX + pathOf(href);
  try {
    if (state === undefined || state === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // sessionStorage unavailable (private mode / in-app browser); state is dropped.
  }
  navStateVersion += 1;
  notifyLocationChange();
};

const readNavState = (pathname) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STATE_KEY_PREFIX + pathname);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (to, options = {}) => {
      if (typeof to === "number") {
        if (to === -1) router.back();
        else window.history.go(to);
        return;
      }
      const href = toHref(to);
      saveNavState(href, options.state);
      if (options.replace) router.replace(href);
      else router.push(href);
    },
    [router],
  );
}

const subscribeToHistory = (callback) => {
  window.addEventListener("popstate", callback);
  window.addEventListener("hashchange", callback);
  window.addEventListener(LOCATION_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("hashchange", callback);
    window.removeEventListener(LOCATION_EVENT, callback);
  };
};

// `search`/`hash` are read from window instead of useSearchParams so that
// components like the shared Layout don't opt whole pages out of server rendering.
// They are "" during server render and hydration, then update on the client.
export function useLocation() {
  const pathname = usePathname() || "/";
  const search = useSyncExternalStore(
    subscribeToHistory,
    () => window.location.search,
    () => "",
  );
  const hash = useSyncExternalStore(
    subscribeToHistory,
    () => window.location.hash,
    () => "",
  );
  const isClient = useSyncExternalStore(
    subscribeToHistory,
    () => true,
    () => false,
  );
  // Bumped by every navigate()/Link with or without state, so navigating to the
  // current path with new state (e.g. vendor "Create campaign") is picked up.
  const stateVersion = useSyncExternalStore(
    subscribeToHistory,
    () => navStateVersion,
    () => 0,
  );
  const state = useMemo(
    () => (isClient ? readNavState(pathname) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isClient, pathname, stateVersion],
  );
  return { pathname, search, hash, state, key: pathname };
}

export function useParams() {
  const params = useNextParams();
  return useMemo(() => {
    const out = {};
    for (const [key, value] of Object.entries(params || {})) {
      const raw = Array.isArray(value) ? value.join("/") : value;
      try {
        out[key] = decodeURIComponent(raw);
      } catch {
        out[key] = raw;
      }
    }
    return out;
  }, [params]);
}

export function useSearchParams() {
  const searchParams = useNextSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const setSearchParams = useCallback(
    (next, options = {}) => {
      const params = new URLSearchParams(
        typeof next === "function" ? next(new URLSearchParams(searchParams?.toString())) : next,
      );
      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;
      if (options.replace) router.replace(href);
      else router.push(href);
    },
    [pathname, router, searchParams],
  );
  return [searchParams || new URLSearchParams(), setSearchParams];
}

// Supports patterns like "/gift-card-info/:id".
export function matchPath(pattern, pathname) {
  const names = [];
  const regex = new RegExp(
    `^${pattern
      .replace(/\/+$/, "")
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/:(\w+)/g, (_, name) => {
        names.push(name);
        return "([^/]+)";
      })}/?$`,
  );
  const match = regex.exec(pathname);
  if (!match) return null;
  const params = {};
  names.forEach((name, i) => {
    params[name] = decodeURIComponent(match[i + 1]);
  });
  return { params, pathname, pattern };
}

export function useMatch(pattern) {
  const pathname = usePathname() || "/";
  return useMemo(() => matchPath(pattern, pathname), [pattern, pathname]);
}

export const Link = forwardRef(function Link({ to, href, replace, state, onClick, ...rest }, ref) {
  const target = toHref(to ?? href);
  return (
    <NextLink
      ref={ref}
      href={target}
      replace={replace}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) saveNavState(target, state);
      }}
      {...rest}
    />
  );
});

export const NavLink = Link;

export function Navigate({ to, replace, state }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace, state });
  }, [navigate, to, replace, state]);
  return null;
}

// Full-screen states shown before the console shell: booting, backend offline,
// and the access-key gate.

import { useState } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, RefreshCw, ServerCrash, ShieldCheck, Sparkles } from "lucide-react";
import { aiConsole, clearConsoleKey, isConsoleAuthError, setConsoleKey } from "@/lib/aiAssistantApi";
import { Button, Spinner, cx, focusRing } from "./ui";
import { errorMessage } from "./lib/consoleFormat";

export function ConsoleMark({ size = "md", className = "" }) {
  const dims = size === "lg" ? "size-11 rounded-xl" : size === "sm" ? "size-7 rounded-lg" : "size-8 rounded-lg";
  return (
    <span
      className={cx(
        "relative grid shrink-0 place-items-center bg-slate-900 text-emerald-400 shadow-sm ring-1 ring-slate-900/10",
        dims,
        className,
      )}
      aria-hidden="true"
    >
      <Sparkles className={size === "lg" ? "size-5" : "size-4"} />
      <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
    </span>
  );
}

function ScreenFrame({ children }) {
  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-size-[22px_22px] mask-[radial-gradient(ellipse_at_center,black_35%,transparent_75%)]"
      />
      <div className="relative w-full max-w-105">{children}</div>
    </div>
  );
}

function BrandLine() {
  return (
    <div className="mb-6 flex items-center justify-center gap-2.5">
      <ConsoleMark />
      <div className="leading-tight">
        <p className="text-sm font-bold text-slate-900">AI Concierge</p>
        <p className="text-xs font-medium text-slate-500">Advisor Console</p>
      </div>
    </div>
  );
}

export function BootScreen({ label = "Connecting to the AI assistant…" }) {
  return (
    <ScreenFrame>
      <div className="flex flex-col items-center gap-4 text-center">
        <ConsoleMark size="lg" />
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Spinner />
          {label}
        </div>
      </div>
    </ScreenFrame>
  );
}

export function OfflineScreen({ error, onRetry, retrying = false }) {
  return (
    <ScreenFrame>
      <BrandLine />
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.18)]">
        <span className="grid size-11 place-items-center rounded-xl bg-rose-50 text-rose-500 ring-1 ring-rose-100">
          <ServerCrash className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Can&apos;t reach the AI assistant</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          The console couldn&apos;t load its status from <code className="rounded bg-slate-100 px-1 font-mono text-xs text-slate-700">/api/ai-assistant/console/system</code>.
          Make sure the backend is running and the AI assistant module is mounted.
        </p>
        {error && (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs wrap-break-word text-slate-600 ring-1 ring-slate-200">
            {errorMessage(error)}
          </p>
        )}
        <Button variant="primary" className="mt-5 w-full" icon={RefreshCw} loading={retrying} onClick={onRetry}>
          Try again
        </Button>
      </div>
    </ScreenFrame>
  );
}

export function AuthGate({ onUnlocked, notice = "" }) {
  const [key, setKey] = useState("");
  const [reveal, setReveal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [error, setError] = useState("");

  const attempt = async ({ withKey }) => {
    setError("");
    if (withKey) {
      const value = key.trim();
      if (!value) {
        setError("Enter the console access key.");
        return;
      }
      setConsoleKey(value);
      setSubmitting(true);
    } else {
      setCheckingAdmin(true);
    }
    try {
      const system = await aiConsole.getSystem();
      onUnlocked(system);
    } catch (err) {
      if (isConsoleAuthError(err)) {
        if (withKey) {
          clearConsoleKey();
          setError("That access key wasn't accepted. Check AI_CONSOLE_ACCESS_KEY on the server and try again.");
        } else {
          setError("No admin session found on this browser. Enter the access key instead.");
        }
      } else {
        setError(`Couldn't reach the backend: ${errorMessage(err)}`);
      }
    } finally {
      setSubmitting(false);
      setCheckingAdmin(false);
    }
  };

  return (
    <ScreenFrame>
      <BrandLine />
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.18)]">
        <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <KeyRound className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Advisor console access</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          Watch every AI conversation live, see lead scores and booked calls, and take over a chat whenever a human
          touch is needed.
        </p>

        {notice && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900 ring-1 ring-amber-200">{notice}</p>
        )}

        <form
          className="mt-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            attempt({ withKey: true });
          }}
        >
          <label htmlFor="console-access-key" className="text-xs font-semibold text-slate-700">
            Access key
          </label>
          <div className="relative">
            <input
              id="console-access-key"
              type={reveal ? "text" : "password"}
              autoComplete="current-password"
              autoFocus
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="Paste the console key"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "console-access-error" : undefined}
              className={cx(
                "h-11 w-full rounded-xl border-0 bg-white pr-11 pl-3.5 font-mono text-sm text-slate-900 ring-1 ring-inset outline-none placeholder:font-sans placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500",
                error ? "ring-rose-300" : "ring-slate-200",
              )}
            />
            <button
              type="button"
              onClick={() => setReveal((value) => !value)}
              aria-label={reveal ? "Hide key" : "Show key"}
              className={cx(
                "absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                focusRing,
              )}
            >
              {reveal ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
          {error && (
            <p id="console-access-error" role="alert" className="text-[13px] font-medium text-rose-600">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={submitting} iconRight={ArrowRight}>
            Unlock console
          </Button>
        </form>

        <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200/70">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <div className="text-[13px] leading-relaxed text-slate-600">
            Assured Rewards admins signed in on this browser get in automatically.{" "}
            <button
              type="button"
              onClick={() => attempt({ withKey: false })}
              disabled={checkingAdmin}
              className={cx(
                "cursor-pointer font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800 disabled:opacity-60",
                focusRing,
                "rounded-sm",
              )}
            >
              {checkingAdmin ? "Checking…" : "Check my admin session"}
            </button>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-slate-400">
        The key is set with <span className="font-mono">AI_CONSOLE_ACCESS_KEY</span> on the server and is stored only in
        this browser.
      </p>
    </ScreenFrame>
  );
}

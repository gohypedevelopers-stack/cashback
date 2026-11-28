import { useRef, useState } from "react";
import { AlertTriangle, Clock3, Headset, Lock, SendHorizontal } from "lucide-react";
import { Button, Kbd, cx } from "../ui";
import { useNow } from "../lib/liveStore";
import { toTime } from "../lib/consoleFormat";

const MAX_LENGTH = 4096; // WhatsApp text limit
const WINDOW_MS = 24 * 60 * 60 * 1000;

export default function Composer({ conversation, agentName, onSend }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);
  const now = useNow(60000);

  const status = conversation?.status;
  const isHuman = status === "human_takeover";
  const isClosed = status === "closed";
  const isWhatsApp = conversation?.channel === "whatsapp";
  const lastInbound = toTime(conversation?.lastInboundAt);
  const windowClosed = isWhatsApp && lastInbound > 0 && now - lastInbound > WINDOW_MS;
  const text = draft.trim();

  const resize = (element) => {
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 168)}px`;
  };

  const submit = async () => {
    if (!text || sending || isClosed) return;
    setSending(true);
    setError(null);
    const result = await onSend(text);
    setSending(false);
    if (result?.ok) {
      setDraft("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "";
        textareaRef.current.focus();
      }
    } else if (result?.error) {
      setError(result.error);
    }
  };

  if (isClosed) {
    return (
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
        <p className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
          <Lock className="size-3.5" aria-hidden="true" />
          This conversation is closed — it&apos;s kept here as a read-only record.
        </p>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-slate-200 bg-white px-3 pt-2.5 pb-3 sm:px-4">
      {error?.kind === "window" && (
        <div role="alert" className="mb-2.5 flex items-start gap-2.5 rounded-lg bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900 ring-1 ring-amber-200">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <p className="font-semibold">Outside WhatsApp&apos;s 24-hour reply window</p>
            <p className="mt-0.5 text-amber-900/85">
              The customer last wrote more than 24 hours ago, so WhatsApp only accepts pre-approved template messages.
              Your draft is kept — it can be sent as soon as the customer messages again.
            </p>
          </div>
        </div>
      )}
      {error?.kind === "error" && (
        <div role="alert" className="mb-2.5 flex items-start gap-2.5 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900 ring-1 ring-rose-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden="true" />
          <p>
            <span className="font-semibold">Message not sent.</span> {error.message}
          </p>
        </div>
      )}
      {!error && windowClosed && (
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-700">
          <Clock3 className="size-3.5" aria-hidden="true" />
          Last customer message was over 24 h ago — WhatsApp may reject free-form replies.
        </p>
      )}

      <div
        className={cx(
          "flex items-end gap-2 rounded-xl bg-white p-1.5 ring-1 ring-inset transition focus-within:ring-2",
          isHuman ? "ring-slate-200 focus-within:ring-emerald-500" : "ring-slate-200 focus-within:ring-slate-400",
        )}
      >
        <label htmlFor="console-composer" className="sr-only">
          {isHuman ? `Reply as ${agentName}` : "Write a reply (takes over from the AI)"}
        </label>
        <textarea
          id="console-composer"
          ref={textareaRef}
          rows={1}
          maxLength={MAX_LENGTH}
          value={draft}
          disabled={sending}
          onChange={(event) => {
            setDraft(event.target.value);
            resize(event.target);
            if (error?.kind === "error") setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={isHuman ? `Reply as ${agentName}…` : "Write a reply — sending pauses the AI and assigns the chat to you"}
          className="max-h-42 min-h-9 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-snug text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
        />
        <Button
          variant={isHuman ? "accent" : "primary"}
          size="md"
          icon={isHuman ? SendHorizontal : Headset}
          loading={sending}
          disabled={!text}
          onClick={submit}
          className="mb-px"
        >
          <span className="hidden sm:inline">{isHuman ? "Send" : "Take over & send"}</span>
          <span className="sm:hidden">{isHuman ? "Send" : "Send"}</span>
        </Button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          {isHuman ? (
            <>
              You&apos;re handling this chat · {isWhatsApp ? "sent via WhatsApp Cloud API" : "shown in the web simulator"}
            </>
          ) : (
            <>The AI is answering this chat. Sending a reply pauses it and assigns the chat to {agentName}.</>
          )}
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <Kbd>Enter</Kbd> send · <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> new line
          {draft.length > MAX_LENGTH - 400 && (
            <span className="ml-2 tabular-nums text-amber-600">
              {draft.length}/{MAX_LENGTH}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { SendHorizontal, UserRound, X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2";

// Bottom sheet that lives inside the simulator screen (absolute, not fixed).
// `autoFocus` is false for sheets that appear on page load (first-run name
// prompt) so the page doesn't start with focus trapped inside the phone.
export function BottomSheet({ open, onClose, labelledBy, children, autoFocus = true }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open || !autoFocus) return undefined;
    const frame = requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open, autoFocus]);

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose?.();
      return;
    }
    if (event.key !== "Tab" || !panelRef.current) return;
    const nodes = Array.from(panelRef.current.querySelectorAll(FOCUSABLE));
    if (!nodes.length) return;
    const firstNode = nodes[0];
    const lastNode = nodes[nodes.length - 1];
    if (event.shiftKey && (document.activeElement === firstNode || document.activeElement === panelRef.current)) {
      event.preventDefault();
      lastNode.focus();
    } else if (!event.shiftKey && document.activeElement === lastNode) {
      event.preventDefault();
      firstNode.focus();
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <Motion.div
          key="sheet"
          className="absolute inset-0 z-40 flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-[#0b141a]/45" onClick={onClose} aria-hidden="true" />
          <Motion.div
            ref={panelRef}
            role="dialog"
            aria-modal={autoFocus ? "true" : "false"}
            aria-labelledby={labelledBy}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 380 }}
            className="relative flex max-h-[88%] flex-col overflow-hidden rounded-t-[22px] bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.18)] outline-none"
          >
            <span className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-black/15" aria-hidden="true" />
            {children}
          </Motion.div>
        </Motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ListSheetBody({ message, headingId, onSend, onClose }) {
  const list = message?.payload?.list || {};
  const sections = Array.isArray(list.sections) ? list.sections : [];
  const [selected, setSelected] = useState(null);
  const groupName = `wa-list-${String(message?.id || "options").replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const selectedRow = sections.flatMap((section) => section?.rows || []).find((row) => row?.id === selected) || null;
  const title = list.buttonLabel || "Options";

  return (
    <>
      <div className="flex items-center px-2 pb-1 pt-1">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close options"
          className={`grid h-10 w-10 place-items-center rounded-full text-[#54656f] transition-colors hover:bg-black/5 ${FOCUS_RING}`}
        >
          <X size={20} aria-hidden="true" />
        </button>
        <p id={headingId} className="flex-1 pr-10 text-center text-[16px] font-semibold text-[#111b21]">
          {title}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
        <fieldset className="m-0 border-0 p-0">
          <legend className="sr-only">{title}</legend>
          {sections.map((section, sectionIndex) => (
            <div
              key={`${section?.title || "section"}-${sectionIndex}`}
              className={sectionIndex ? "border-t border-black/6" : ""}
            >
              {section?.title ? (
                <p className="px-5 pb-1 pt-3 text-[13px] font-semibold text-[#00796b]">{section.title}</p>
              ) : null}
              {(section?.rows || []).filter((row) => row?.id).map((row) => {
                const checked = selected === row.id;
                return (
                  <label
                    key={row.id}
                    className="flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-black/3 has-[:focus-visible]:bg-black/5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] leading-[20px] text-[#111b21]">{row.title}</span>
                      {row.description ? (
                        <span className="mt-0.5 block text-[13px] leading-[17px] text-[#667781]">{row.description}</span>
                      ) : null}
                    </span>
                    <input
                      type="radio"
                      name={groupName}
                      value={row.id}
                      checked={checked}
                      onChange={() => setSelected(row.id)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#25D366]/60 ${
                        checked ? "border-[#00a884]" : "border-[#8696a0]"
                      }`}
                    >
                      {checked ? <span className="h-2.5 w-2.5 rounded-full bg-[#00a884]" /> : null}
                    </span>
                  </label>
                );
              })}
            </div>
          ))}
        </fieldset>
      </div>
      <div className="border-t border-black/6 px-4 pb-4 pt-3">
        <button
          type="button"
          disabled={!selectedRow}
          onClick={() => selectedRow && onSend?.(selectedRow)}
          className={`flex w-full items-center justify-center gap-2 rounded-full bg-[#128C7E] py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#0f7a6e] disabled:cursor-not-allowed disabled:bg-[#b9c3c8] ${FOCUS_RING}`}
        >
          <SendHorizontal size={18} aria-hidden="true" /> Send
        </button>
      </div>
    </>
  );
}

export function NameSheetBody({ headingId, initialName = "", onSave, onSkip, skipLabel = "Skip" }) {
  const [value, setValue] = useState(initialName);
  const inputId = useId();
  const trimmed = value.trim();

  return (
    <form
      className="px-5 pb-5 pt-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (trimmed) onSave?.(trimmed);
      }}
    >
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e7f8ee] text-[#128C7E]" aria-hidden="true">
        <UserRound size={22} />
      </span>
      <p id={headingId} className="mt-3 text-center text-[17px] font-semibold text-[#111b21]">
        What should we call you?
      </p>
      <p className="mx-auto mt-1 max-w-[270px] text-center text-[13px] leading-[18px] text-[#667781]">
        The assistant will greet you by name. It&apos;s saved only in this browser.
      </p>
      <label htmlFor={inputId} className="sr-only">
        Your first name
      </label>
      <input
        id={inputId}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={40}
        autoComplete="given-name"
        enterKeyHint="done"
        placeholder="Your first name"
        className="mt-4 w-full rounded-xl border border-black/10 bg-[#f7f8fa] px-4 py-3 text-[15px] text-[#111b21] outline-none transition-colors placeholder:text-[#8696a0] focus:border-[#25D366] focus:bg-white focus:ring-2 focus:ring-[#25D366]/30"
      />
      <button
        type="submit"
        disabled={!trimmed}
        className={`mt-3 w-full rounded-full bg-[#128C7E] py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#0f7a6e] disabled:cursor-not-allowed disabled:bg-[#b9c3c8] ${FOCUS_RING}`}
      >
        Continue
      </button>
      <button
        type="button"
        onClick={onSkip}
        className={`mt-1 w-full rounded-full py-2.5 text-[14px] font-medium text-[#54656f] transition-colors hover:bg-black/4 ${FOCUS_RING}`}
      >
        {skipLabel}
      </button>
    </form>
  );
}

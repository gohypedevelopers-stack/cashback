"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  BatteryFull,
  Camera,
  ChevronLeft,
  EllipsisVertical,
  Mic,
  Paperclip,
  Phone,
  SendHorizontal,
  Signal,
  Smile,
  Video,
  Wifi,
} from "lucide-react";
import { initials } from "@/components/ai-assistant/shared/format";
import { VerifiedBadge } from "./SimIcons";
import { BUBBLE_SHADOW } from "./simulatorUtils";

const WHITE_FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";
const GREEN_FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-1";

export function StatusBar({ clock }) {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-[42px] shrink-0 items-end justify-between bg-[#075E54] px-[26px] pb-[8px] text-white"
    >
      <span className="text-[14px] font-semibold leading-none tracking-[-0.01em] tabular-nums">{clock}</span>
      <span className="absolute left-1/2 top-[8px] h-[25px] w-[86px] -translate-x-1/2 rounded-full bg-black" />
      <span className="flex items-center gap-[5px]">
        <Signal size={14} strokeWidth={2.6} />
        <Wifi size={14} strokeWidth={2.6} />
        <BatteryFull size={20} strokeWidth={2} />
      </span>
    </div>
  );
}

export function HomeIndicator() {
  return (
    <div aria-hidden="true" className="flex h-[18px] shrink-0 items-start justify-center">
      <span className="mt-[6px] h-[4px] w-[118px] rounded-full bg-[#111b21]/80" />
    </div>
  );
}

export function ChatHeader({ tenant, theme, statusText, onBack, menuItems = [] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const menuId = useId();
  const avatarText = tenant.brand?.avatarInitials || initials(tenant.name, "AI");

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (event) => {
      if (menuRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    const frame = requestAnimationFrame(() => {
      menuRef.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus({ preventScroll: true });
    });
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      cancelAnimationFrame(frame);
    };
  }, [menuOpen]);

  const closeMenu = (restoreFocus) => {
    setMenuOpen(false);
    if (restoreFocus) buttonRef.current?.focus({ preventScroll: true });
  };

  const onMenuKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
      return;
    }
    if (event.key === "Tab") {
      closeMenu(false);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') || []);
    if (!items.length) return;
    const index = items.indexOf(document.activeElement);
    const next = event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next].focus();
  };

  return (
    <div className="relative z-30 flex h-[58px] shrink-0 items-center bg-[#075E54] pl-1 pr-1.5 text-white">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className={`grid h-10 w-9 place-items-center rounded-full transition-colors hover:bg-white/10 ${WHITE_FOCUS}`}
        >
          <ChevronLeft size={26} strokeWidth={2.2} aria-hidden="true" />
        </button>
      ) : (
        <span aria-hidden="true" className="grid h-10 w-8 place-items-center">
          <ChevronLeft size={26} strokeWidth={2.2} />
        </span>
      )}
      <span
        aria-hidden="true"
        className="ml-0.5 grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full text-[13.5px] font-bold tracking-wide ring-2 ring-white/15"
        style={{ backgroundColor: theme.primary, color: theme.onPrimary }}
      >
        {avatarText}
      </span>
      <div className="ml-2.5 min-w-0 flex-1">
        <p className="flex items-center gap-1">
          <span className="truncate text-[16px] font-semibold leading-[20px]">{tenant.name}</span>
          <VerifiedBadge size={15} />
        </p>
        <p className="truncate text-[12.5px] leading-[16px] text-white/80" aria-live="polite">
          {statusText}
        </p>
      </div>
      <span aria-hidden="true" className="grid h-10 w-8 place-items-center text-white/95">
        <Video size={21} />
      </span>
      <span aria-hidden="true" className="grid h-10 w-8 place-items-center text-white/95">
        <Phone size={18} />
      </span>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Chat options"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        onClick={() => setMenuOpen((open) => !open)}
        className={`grid h-10 w-9 place-items-center rounded-full transition-colors hover:bg-white/10 ${WHITE_FOCUS}`}
      >
        <EllipsisVertical size={20} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {menuOpen ? (
          <Motion.div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Chat options"
            onKeyDown={onMenuKeyDown}
            initial={{ opacity: 0, scale: 0.94, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.14 }}
            style={{ transformOrigin: "100% 0%" }}
            className="absolute right-2 top-[50px] z-40 min-w-[196px] overflow-hidden rounded-xl bg-white py-1.5 text-[#111b21] shadow-[0_12px_32px_rgba(11,20,26,0.22)] ring-1 ring-black/5"
          >
            {menuItems.map(({ key, label, icon: Icon, onSelect, disabled }) => (
              <button
                key={key}
                type="button"
                role="menuitem"
                disabled={disabled}
                onClick={() => {
                  closeMenu(false);
                  onSelect?.();
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14.5px] transition-colors hover:bg-black/5 focus-visible:bg-black/6 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
              >
                {Icon ? <Icon size={17} className="text-[#54656f]" aria-hidden="true" /> : null}
                {label}
              </button>
            ))}
          </Motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function StarterPrompts({ prompts, onPick, disabled, max = 6 }) {
  if (!prompts?.length) return null;
  return (
    <div className="shrink-0 px-2.5 pb-1 pt-1.5">
      <p className="sr-only">Suggested messages</p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {prompts.slice(0, max).map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={disabled}
            onClick={() => onPick?.(prompt)}
            className={`max-w-full rounded-[18px] bg-white px-3 py-[7px] text-center text-[13px] font-medium leading-[17px] text-[#00796b] ring-1 ring-black/5 transition-colors hover:bg-[#f2fbf6] disabled:opacity-60 ${GREEN_FOCUS}`}
            style={{ boxShadow: BUBBLE_SHADOW }}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Composer({ disabled, onSubmit, size = "sm" }) {
  const [draft, setDraft] = useState("");
  const areaRef = useRef(null);
  const inputId = useId();
  const hasText = draft.trim().length > 0;
  const textSize = size === "md" ? "text-[16px]" : "text-[15px]";

  const autoGrow = (element) => {
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 132)}px`;
  };

  const submit = () => {
    const text = draft.trim();
    if (!text || disabled) return;
    onSubmit?.(text);
    setDraft("");
    const area = areaRef.current;
    if (area) {
      area.style.height = "";
      area.focus({ preventScroll: true });
    }
  };

  return (
    <form
      className="flex shrink-0 items-end gap-1.5 px-1.5 pb-1.5 pt-1"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div
        className="flex min-h-[44px] min-w-0 flex-1 items-end rounded-[22px] bg-white pl-1 pr-1.5 transition-shadow focus-within:ring-2 focus-within:ring-[#25D366]/45"
        style={{ boxShadow: BUBBLE_SHADOW }}
      >
        <span aria-hidden="true" className="grid h-[44px] w-9 shrink-0 place-items-center text-[#8696a0]">
          <Smile size={22} />
        </span>
        <label htmlFor={inputId} className="sr-only">
          Type a message
        </label>
        <textarea
          id={inputId}
          ref={areaRef}
          rows={1}
          value={draft}
          maxLength={1000}
          enterKeyHint="send"
          placeholder="Message"
          onChange={(event) => {
            setDraft(event.target.value);
            autoGrow(event.target);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            event.preventDefault();
            submit();
          }}
          className={`block max-h-[132px] min-h-[44px] min-w-0 flex-1 resize-none bg-transparent py-[11px] leading-[22px] text-[#111b21] outline-none placeholder:text-[#8696a0] ${textSize}`}
        />
        <span aria-hidden="true" className="grid h-[44px] w-8 shrink-0 place-items-center text-[#8696a0]">
          <Paperclip size={20} className="-rotate-45" />
        </span>
        {hasText ? null : (
          <span aria-hidden="true" className="grid h-[44px] w-8 shrink-0 place-items-center text-[#8696a0]">
            <Camera size={20} />
          </span>
        )}
      </div>
      {hasText ? (
        <button
          type="submit"
          disabled={disabled}
          aria-label="Send message"
          className={`grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full bg-[#128C7E] text-white shadow-[0_2px_4px_rgba(11,20,26,0.2)] transition-colors hover:bg-[#0f7a6e] disabled:cursor-wait disabled:opacity-60 ${GREEN_FOCUS}`}
        >
          <SendHorizontal size={20} aria-hidden="true" />
        </button>
      ) : (
        <span
          aria-hidden="true"
          className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full bg-[#128C7E] text-white shadow-[0_2px_4px_rgba(11,20,26,0.2)]"
        >
          <Mic size={20} />
        </span>
      )}
    </form>
  );
}

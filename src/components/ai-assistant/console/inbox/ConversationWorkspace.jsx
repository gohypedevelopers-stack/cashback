// Thread pane + customer/lead pane for the selected conversation.

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { ArrowDown, ArrowLeft, Bot, Hand, Headset, MessageSquareDashed, PanelRight, RefreshCw } from "lucide-react";
import { aiConsole } from "@/lib/aiAssistantApi";
import { dayKeyIST } from "@/components/ai-assistant/shared/format";
import { useToast } from "@/components/ui/ToastContext";
import {
  Avatar,
  Badge,
  Button,
  ChannelIcon,
  Drawer,
  EmptyState,
  ErrorState,
  Pill,
  ScorePill,
  Skeleton,
  cx,
  focusRing,
} from "../ui";
import { useConsole, useInboxData } from "../lib/ConsoleContext";
import { useMediaQuery } from "../lib/hooks";
import { useNow } from "../lib/liveStore";
import {
  channelLabel,
  contactName,
  contactSubline,
  conversationStatusMeta,
  errorMessage,
  isNeedsHuman,
  isOutside24hError,
  isSampleConversation,
  relativeDayLabel,
  toTime,
} from "../lib/consoleFormat";
import { useConversationThread } from "./useConversationThread";
import MessageBubble from "./MessageBubble";
import Composer from "./Composer";
import LeadPanel from "./LeadPanel";

const RUN_GAP_MS = 5 * 60 * 1000;

function groupMessages(messages) {
  const groups = [];
  messages.forEach((message, index) => {
    const key = dayKeyIST(message.createdAt) || "unknown";
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, date: message.createdAt, items: [] };
      groups.push(group);
    }
    const prev = messages[index - 1];
    const continued = Boolean(
      prev &&
        prev.sender === message.sender &&
        prev.type !== "notice" &&
        message.type !== "notice" &&
        prev.sender !== "system" &&
        dayKeyIST(prev.createdAt) === key &&
        toTime(message.createdAt) - toTime(prev.createdAt) < RUN_GAP_MS,
    );
    group.items.push({ message, continued });
  });
  return groups;
}

function ThreadSkeleton() {
  return (
    <div className="space-y-4 px-4 py-6" aria-hidden="true">
      {[56, 72, 40, 64, 48].map((width, index) => (
        <div key={index} className={cx("flex", index % 2 ? "justify-end" : "justify-start")}>
          <Skeleton className={cx("h-14 rounded-2xl", index % 2 ? "bg-emerald-100/70" : "bg-white")} style={{ width: `${width}%` }} />
        </div>
      ))}
    </div>
  );
}

function MessageList({ messages, conversation, loaded, error, notFound, onRetry, assistantName }) {
  const scrollRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);
  const [seenCount, setSeenCount] = useState(0);
  const now = useNow(60000);
  const groups = useMemo(() => groupMessages(messages), [messages]);
  const customer = contactName(conversation);

  // Follow new messages only while the advisor is already at the bottom.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element && atBottom) element.scrollTop = element.scrollHeight;
  }, [messages.length, atBottom, loaded]);

  const onScroll = (event) => {
    const element = event.currentTarget;
    const bottom = element.scrollHeight - element.scrollTop - element.clientHeight < 64;
    setAtBottom(bottom);
    if (bottom) setSeenCount(messages.length);
  };

  const unseen = atBottom ? 0 : Math.max(0, messages.length - seenCount);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="h-full overflow-y-auto bg-[#f5f6f8] bg-[radial-gradient(#e3e8ef_1px,transparent_1px)] bg-size-[18px_18px] px-3 pb-4 sm:px-5 [scrollbar-width:thin]"
        role="log"
        aria-live="polite"
        aria-label={`Conversation with ${customer}`}
      >
        {notFound ? (
          <EmptyState
            icon={MessageSquareDashed}
            title="Conversation not found"
            description="It may have been removed, or it belongs to a different backend instance (memory store)."
          />
        ) : error && !loaded && !messages.length ? (
          <ErrorState title="Couldn't load this conversation" error={error} onRetry={onRetry} />
        ) : !loaded && !messages.length ? (
          <ThreadSkeleton />
        ) : !messages.length ? (
          <EmptyState
            icon={MessageSquareDashed}
            title="No messages yet"
            description="Messages appear here the moment the customer or the assistant writes."
          />
        ) : (
          groups.map((group) => (
            <div key={group.key}>
              <div className="sticky top-0 z-10 flex justify-center pt-3 pb-1">
                <span className="rounded-full bg-white/95 px-3 py-0.5 text-[11px] font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 backdrop-blur">
                  {relativeDayLabel(group.date, now)}
                </span>
              </div>
              {group.items.map(({ message, continued }) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  continued={continued}
                  customerName={customer}
                  agentFallback={conversation?.assignedAgentName}
                  assistantName={assistantName}
                />
              ))}
            </div>
          ))
        )}
      </div>
      <AnimatePresence>
        {!atBottom && messages.length > 0 && (
          <Motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => {
              const element = scrollRef.current;
              if (element) element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
            }}
            className={cx(
              "absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-slate-800",
              focusRing,
            )}
          >
            <ArrowDown className="size-3.5" aria-hidden="true" />
            {unseen > 0 ? `${unseen} new message${unseen === 1 ? "" : "s"}` : "Jump to latest"}
          </Motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ConversationWorkspace({ conversationId, summary, onBack }) {
  const { agentName, tenant, setTab } = useConsole();
  const inbox = useInboxData();
  const { success: toastSuccess, error: toastError } = useToast();
  const thread = useConversationThread(conversationId, summary);
  const isXl = useMediaQuery("(min-width: 1280px)");
  const [leadOpen, setLeadOpen] = useState(false);
  const [busy, setBusy] = useState(null);

  const conversation = thread.conversation || summary || { id: conversationId };
  const status = conversation.status;
  const statusMeta = conversationStatusMeta(status);
  const needsHuman = isNeedsHuman(conversation);
  const name = contactName(conversation);
  const leadScore = thread.lead?.score ?? conversation.lead?.score;
  const { applyConversation, appendMessages, setLead } = thread;

  const patchList = (patch) => inbox?.patchConversation?.(conversationId, patch);

  const takeover = async ({ quiet = false } = {}) => {
    setBusy("takeover");
    try {
      const res = await aiConsole.takeover(conversationId, { agentName });
      const next = res?.conversation || { status: "human_takeover", assignedAgentName: agentName };
      applyConversation(next);
      if (res?.message) appendMessages(res.message);
      patchList({ status: next.status || "human_takeover", assignedAgentName: next.assignedAgentName || agentName });
      if (!quiet) toastSuccess("You're handling this chat", "The AI is paused until you hand it back.");
      return true;
    } catch (err) {
      toastError("Couldn't take over", errorMessage(err));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const release = async () => {
    setBusy("release");
    try {
      const res = await aiConsole.release(conversationId);
      const next = res?.conversation || { status: "ai_active" };
      applyConversation(next);
      if (res?.message) appendMessages(res.message);
      patchList({ status: next.status || "ai_active", assignedAgentName: next.assignedAgentName ?? null });
      toastSuccess("Handed back to the AI", "The assistant answers the customer's next message.");
    } catch (err) {
      toastError("Couldn't hand back to the AI", errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const sendReply = async (text) => {
    if (status !== "human_takeover") {
      const ok = await takeover({ quiet: true });
      if (!ok) return { ok: false };
    }
    try {
      const res = await aiConsole.reply(conversationId, { text, agentName });
      if (res?.message) appendMessages(res.message);
      patchList({ lastMessagePreview: text, lastMessageSender: "agent", lastMessageAt: res?.message?.createdAt });
      return { ok: true };
    } catch (err) {
      if (isOutside24hError(err)) return { ok: false, error: { kind: "window", message: errorMessage(err) } };
      return { ok: false, error: { kind: "error", message: errorMessage(err) } };
    }
  };

  const changeStage = async (intentStage) => {
    const lead = thread.lead;
    if (!lead?.id || lead.intentStage === intentStage) return;
    const previous = lead.intentStage;
    setLead((current) => (current ? { ...current, intentStage } : current));
    try {
      const res = await aiConsole.updateLead(lead.id, { intentStage });
      if (res?.lead) setLead((current) => ({ ...current, ...res.lead }));
      toastSuccess("Lead stage updated");
    } catch (err) {
      setLead((current) => (current ? { ...current, intentStage: previous } : current));
      toastError("Couldn't update the stage", errorMessage(err));
    }
  };

  const saveNotes = async (notes) => {
    const lead = thread.lead;
    if (!lead?.id) return false;
    try {
      const res = await aiConsole.updateLead(lead.id, { notes });
      setLead((current) => ({ ...current, ...(res?.lead || {}), notes: res?.lead?.notes ?? notes }));
      toastSuccess("Notes saved");
      return true;
    } catch (err) {
      toastError("Couldn't save notes", errorMessage(err));
      return false;
    }
  };

  const leadPanel = (
    <LeadPanel
      conversation={conversation}
      lead={thread.lead}
      bookings={thread.bookings}
      loaded={thread.loaded}
      tenant={tenant}
      onStageChange={changeStage}
      onSaveNotes={saveNotes}
      onTakeover={() => takeover()}
      takeoverBusy={busy === "takeover"}
      onOpenBookings={() => setTab("bookings")}
    />
  );

  return (
    <>
      <section className="flex min-w-0 flex-1 flex-col bg-white" aria-label={`Conversation with ${name}`}>
        <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 sm:px-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className={cx(
              "grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden",
              focusRing,
            )}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
          <span className="relative shrink-0">
            <Avatar name={name} seed={conversation.id} size="md" />
            <span className="absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full bg-white ring-1 ring-slate-200">
              <ChannelIcon channel={conversation.channel} className="size-2.5" />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <h2 className="truncate text-sm font-semibold text-slate-900">{name}</h2>
              <Pill classes={statusMeta.classes} icon={status === "human_takeover" ? Headset : status === "ai_active" ? Bot : undefined}>
                {status === "human_takeover" && conversation.assignedAgentName
                  ? `Human · ${conversation.assignedAgentName}`
                  : statusMeta.label}
              </Pill>
              {needsHuman && (
                <Pill classes="bg-amber-50 text-amber-800 ring-amber-200" icon={Hand} className="hidden sm:inline-flex">
                  Needs human
                </Pill>
              )}
              {isSampleConversation(conversation) && (
                <Badge tone="slate" className="hidden sm:inline-flex">
                  Sample
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-slate-500">
              {contactSubline(conversation)}
              {conversation.channel === "whatsapp" ? ` · ${channelLabel(conversation.channel)}` : ""}
              {conversation.language ? ` · ${String(conversation.language).toUpperCase()}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {status === "human_takeover" ? (
              <Button variant="accent" size="sm" icon={Bot} loading={busy === "release"} onClick={release}>
                <span className="hidden sm:inline">Hand back to AI</span>
                <span className="sm:hidden">To AI</span>
              </Button>
            ) : status === "ai_active" ? (
              <Button variant="primary" size="sm" icon={Headset} loading={busy === "takeover"} onClick={() => takeover()}>
                Take over
              </Button>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              icon={PanelRight}
              onClick={() => setLeadOpen(true)}
              className="xl:hidden"
              aria-label="Show customer and lead details"
            >
              <span className="hidden md:inline">Lead</span>
              {leadScore !== undefined && leadScore !== null && <ScorePill score={leadScore} />}
            </Button>
          </div>
        </header>

        <MessageList
          messages={thread.messages}
          conversation={conversation}
          loaded={thread.loaded}
          error={thread.error}
          notFound={thread.notFound}
          onRetry={thread.reload}
          assistantName={tenant?.assistantName}
        />

        {thread.error && thread.loaded && (
          <div className="flex items-center justify-between gap-2 border-t border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-800">
            Connection hiccup — retrying automatically.
            <button
              type="button"
              onClick={thread.reload}
              className="inline-flex cursor-pointer items-center gap-1 font-semibold hover:underline"
            >
              <RefreshCw className="size-3" aria-hidden="true" />
              Retry now
            </button>
          </div>
        )}

        {!thread.notFound && <Composer conversation={conversation} agentName={agentName} onSend={sendReply} />}
      </section>

      <aside
        className="hidden w-85 shrink-0 overflow-y-auto border-l border-slate-200 bg-white [scrollbar-width:thin] xl:block"
        aria-label="Customer and lead"
      >
        {leadPanel}
      </aside>
      {!isXl && (
        <Drawer open={leadOpen} onClose={() => setLeadOpen(false)} title="Customer & lead" widthClass="w-[min(92vw,360px)]">
          {leadPanel}
        </Drawer>
      )}
    </>
  );
}

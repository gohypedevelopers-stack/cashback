// Knowledge base: built-in docs (read-only) + custom docs (editable), filters,
// "Add knowledge", and a retrieval tester that shows what the assistant would pull.

import { useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  FilePlus2,
  FileText,
  FlaskConical,
  Lock,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { aiConsole } from "@/lib/aiAssistantApi";
import { formatNumber } from "@/components/ai-assistant/shared/format";
import { useToast } from "@/components/ui/ToastContext";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Segmented,
  Skeleton,
  TextArea,
  TextInput,
  TimeAgo,
  Toggle,
  cx,
  focusRing,
} from "../ui";
import { useConsole } from "../lib/ConsoleContext";
import { usePoll } from "../lib/hooks";
import { asArray, docReferenceUrl, errorMessage, isBuiltinDoc, parseList } from "../lib/consoleFormat";

const CONTENT_MIN = 30;
const CONTENT_MAX = 4000;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function Highlight({ text, query }) {
  const terms = [...new Set(String(query || "").toLowerCase().split(/[^\p{L}\p{N}]+/u))].filter((term) => term.length >= 3);
  const source = String(text || "");
  if (!terms.length) return source;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  return source.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="rounded-sm bg-amber-100 px-0.5 text-slate-900">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function KnowledgeForm({ initial, categories, submitLabel, onSubmit, onCancel, autoFocus = false }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [content, setContent] = useState(initial?.content || "");
  const [tags, setTags] = useState(asArray(initial?.tags).join(", "));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const listId = useId();

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (title.trim().length < 3) next.title = "Give it a short, specific title.";
    if (!category.trim()) next.category = "Pick or type a category.";
    if (content.trim().length < CONTENT_MIN) next.content = `Add at least ${CONTENT_MIN} characters of facts the assistant can quote.`;
    if (content.length > CONTENT_MAX) next.content = `Keep it under ${CONTENT_MAX} characters — split long topics into several docs.`;
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    const ok = await onSubmit({
      title: title.trim(),
      category: category.trim(),
      content: content.trim(),
      tags: parseList(tags),
    });
    setSaving(false);
    if (ok && !initial) {
      setTitle("");
      setCategory("");
      setContent("");
      setTags("");
    }
  };

  const length = content.trim().length;
  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <Field label="Title" htmlFor="kb-title" error={errors.title}>
        <TextInput
          id="kb-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Diwali SIP top-up offer"
          maxLength={140}
          autoFocus={autoFocus}
          invalid={Boolean(errors.title)}
        />
      </Field>
      <Field label="Category" htmlFor="kb-category" error={errors.category}>
        <TextInput
          id="kb-category"
          list={listId}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="e.g. Offers"
          maxLength={60}
          invalid={Boolean(errors.category)}
        />
        <datalist id={listId}>
          {categories.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </Field>
      <Field
        label="Content"
        htmlFor="kb-content"
        error={errors.content}
        hint={`${formatNumber(length)} characters · 300–1,500 works best — plain, self-contained facts.`}
      >
        <TextArea
          id="kb-content"
          rows={6}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write the facts the assistant should know and may quote to customers…"
          invalid={Boolean(errors.content)}
          className="text-[13px]"
        />
      </Field>
      <Field label="Tags" htmlFor="kb-tags" optional hint="Comma-separated keywords customers might use.">
        <TextInput
          id="kb-tags"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="diwali, sip, offer"
        />
      </Field>
      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" size="sm" loading={saving} icon={initial ? undefined : Plus}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function RetrievalTester({ tenantKey, suggestions, customIds, highlightId, query, onQueryChange, state, onSearch, inputRef }) {
  const results = Array.isArray(state.results) ? state.results : [];
  const maxScore = Math.max(0.0001, ...results.map((result) => Number(result.score) || 0));
  return (
    <Card>
      <CardHeader
        title="Test retrieval"
        subtitle="Ask what a customer might ask — see which articles the assistant would pull, ranked."
        icon={FlaskConical}
      />
      <div className="space-y-3 px-4 pb-4">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch(query);
          }}
        >
          <label htmlFor="kb-test-query" className="sr-only">
            Customer question
          </label>
          <TextInput
            id="kb-test-query"
            ref={inputRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="e.g. Is there a Diwali offer on SIPs?"
            className="text-[13px]"
          />
          <Button type="submit" variant="primary" icon={Search} loading={state.loading} disabled={!query.trim()}>
            Test
          </Button>
        </form>
        {suggestions.length > 0 && !results.length && !state.loading && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  onQueryChange(suggestion);
                  onSearch(suggestion);
                }}
                className={cx(
                  "max-w-full cursor-pointer truncate rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-900",
                  focusRing,
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {state.error && <p className="text-xs text-rose-600">Search failed: {errorMessage(state.error)}</p>}
        {state.ran && !state.loading && !state.error && !results.length && (
          <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500 ring-1 ring-slate-100">
            Nothing relevant found for this tenant. The assistant would answer from general knowledge or offer an
            advisor — add a doc to cover it.
          </p>
        )}
        {results.length > 0 && (
          <ol className={cx("space-y-2", state.loading && "opacity-60")} aria-label={`Results for ${tenantKey}`}>
            {results.map((result, index) => {
              const custom = customIds.has(result.id);
              const fresh = highlightId && result.id === highlightId;
              const score = Number(result.score) || 0;
              return (
                <li
                  key={result.id || index}
                  className={cx(
                    "rounded-lg p-2.5 ring-1",
                    fresh ? "bg-emerald-50/60 ring-emerald-200" : "bg-white ring-slate-200",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-px grid size-5 shrink-0 place-items-center rounded-md bg-slate-900 text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[13px] font-semibold text-slate-900">{result.title}</p>
                        {fresh && (
                          <Badge tone="emerald" icon={Sparkles}>
                            Just added
                          </Badge>
                        )}
                        {!fresh && custom && <Badge tone="sky">Custom</Badge>}
                        {result.category && <Badge tone="white">{result.category}</Badge>}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="h-1.5 flex-1 rounded-full bg-slate-100">
                          <span
                            className="block h-1.5 rounded-full bg-[#257de0]"
                            style={{ width: `${Math.max(4, (score / maxScore) * 100)}%` }}
                          />
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">{score.toFixed(2)}</span>
                      </div>
                      {result.snippet && (
                        <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-600">
                          <Highlight text={result.snippet} query={state.query} />
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Card>
  );
}

function DocCard({ doc, categories, onSave, onToggle, onDelete, busy }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const builtin = isBuiltinDoc(doc);
  const active = doc.active !== false;
  const reference = docReferenceUrl(doc);
  const tags = asArray(doc.tags);

  if (editing) {
    return (
      <Card className="p-4 ring-2 ring-emerald-500/30">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Pencil className="size-3.5" aria-hidden="true" />
          Editing custom knowledge
        </p>
        <KnowledgeForm
          initial={doc}
          categories={categories}
          submitLabel="Save changes"
          autoFocus
          onCancel={() => setEditing(false)}
          onSubmit={async (patch) => {
            const ok = await onSave(doc, patch);
            if (ok) setEditing(false);
            return ok;
          }}
        />
      </Card>
    );
  }

  return (
    <Card className={cx("p-4 transition-opacity", !active && "opacity-60")}>
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ring-1",
            builtin ? "bg-slate-50 text-slate-400 ring-slate-200" : "bg-sky-50 text-sky-600 ring-sky-100",
          )}
          title={builtin ? "Built-in (read-only)" : "Custom"}
        >
          {builtin ? <Lock className="size-4" aria-hidden="true" /> : <FileText className="size-4" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-[13.5px] font-semibold text-slate-900">{doc.title}</h3>
            {doc.category && <Badge tone="white">{doc.category}</Badge>}
            {builtin ? (
              <Badge tone="slate" icon={Lock}>
                Built-in
              </Badge>
            ) : (
              <Badge tone="sky">Custom</Badge>
            )}
            {!active && <Badge tone="amber">Disabled</Badge>}
          </div>
          <p className={cx("mt-1 text-[13px] leading-relaxed whitespace-pre-line text-slate-600", !expanded && "line-clamp-2")}>
            {doc.content}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-400">
            {String(doc.content || "").length > 160 && (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
                className={cx("inline-flex cursor-pointer items-center gap-0.5 rounded font-semibold text-slate-500 hover:text-slate-800", focusRing)}
              >
                {expanded ? "Show less" : "Read all"}
                <ChevronDown className={cx("size-3 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
              </button>
            )}
            {tags.slice(0, 6).map((tag) => (
              <span key={tag} className="font-medium text-slate-400">
                #{tag}
              </span>
            ))}
            {reference && (
              <a
                href={reference}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-semibold text-sky-700 hover:underline"
              >
                Source
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            )}
            {doc.asOf && <span>verified {doc.asOf}</span>}
            {!builtin && doc.updatedAt && <TimeAgo value={doc.updatedAt} prefix="updated " />}
          </div>
        </div>
        {!builtin && (
          <div className="flex shrink-0 items-center gap-1">
            <Toggle
              size="sm"
              checked={active}
              disabled={busy}
              onChange={(next) => onToggle(doc, next)}
              label={active ? "Disable this doc" : "Enable this doc"}
            />
            <IconButton size="xs" label="Edit" icon={Pencil} onClick={() => setEditing(true)} />
            <IconButton size="xs" label="Delete" icon={Trash2} variant="dangerGhost" onClick={() => onDelete(doc)} />
          </div>
        )}
      </div>
    </Card>
  );
}

export default function KnowledgeView() {
  const { tenantKey, tenant } = useConsole();
  const { success: toastSuccess, error: toastError } = useToast();
  const kb = usePoll(() => aiConsole.listKnowledge({ tenantKey }), { key: `kb:${tenantKey}` });
  const { setData } = kb;
  const [source, setSource] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [busyIds, setBusyIds] = useState({});
  const [testQuery, setTestQuery] = useState("");
  const [test, setTest] = useState({ loading: false, results: [], error: null, ran: false, query: "" });
  const [highlightId, setHighlightId] = useState(null);
  const testInputRef = useRef(null);
  const searchSeq = useRef(0);

  const items = useMemo(() => (Array.isArray(kb.data?.items) ? kb.data.items : []), [kb.data]);
  const customIds = useMemo(() => new Set(items.filter((doc) => !isBuiltinDoc(doc)).map((doc) => doc.id)), [items]);
  const stats = useMemo(
    () => ({
      builtin: items.filter(isBuiltinDoc).length,
      custom: items.filter((doc) => !isBuiltinDoc(doc)).length,
      disabled: items.filter((doc) => doc.active === false).length,
    }),
    [items],
  );
  const categories = useMemo(() => {
    const counts = new Map();
    items.forEach((doc) => {
      const key = doc.category || "General";
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [items]);
  const categoryNames = useMemo(() => categories.map((item) => item.name), [categories]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter((doc) => (source === "all" ? true : source === "builtin" ? isBuiltinDoc(doc) : !isBuiltinDoc(doc)))
      .filter((doc) => (category === "all" ? true : (doc.category || "General") === category))
      .filter((doc) => {
        if (!term) return true;
        const haystack = `${doc.title} ${doc.content} ${asArray(doc.tags).join(" ")} ${doc.category || ""}`.toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => {
        const aCustom = isBuiltinDoc(a) ? 1 : 0;
        const bCustom = isBuiltinDoc(b) ? 1 : 0;
        if (aCustom !== bCustom) return aCustom - bCustom;
        return String(a.title || "").localeCompare(String(b.title || ""));
      });
  }, [items, source, category, search]);

  const suggestions = useMemo(
    () => (Array.isArray(tenant?.starterPrompts) ? tenant.starterPrompts.filter(Boolean).slice(0, 3) : []),
    [tenant],
  );

  const runSearch = async (query) => {
    const value = String(query || "").trim();
    if (!value) return;
    const seq = ++searchSeq.current;
    setTest((current) => ({ ...current, loading: true, error: null, query: value }));
    try {
      const res = await aiConsole.searchKnowledge({ tenantKey, query: value });
      if (seq !== searchSeq.current) return;
      setTest({ loading: false, results: Array.isArray(res?.results) ? res.results : [], error: null, ran: true, query: value });
    } catch (err) {
      if (seq !== searchSeq.current) return;
      setTest((current) => ({ ...current, loading: false, error: err, ran: true }));
    }
  };

  const createDoc = async (payload) => {
    try {
      const res = await aiConsole.createKnowledge({ tenantKey, ...payload });
      const item = res?.item;
      if (item) setData((current) => ({ ...(current || {}), items: [item, ...(current?.items || [])] }));
      else kb.refresh();
      toastSuccess("Knowledge added", "The assistant can use it from the next message. Testing retrieval…");
      setShowForm(false);
      setHighlightId(item?.id || null);
      setTestQuery(payload.title);
      runSearch(payload.title);
      testInputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      return true;
    } catch (err) {
      toastError("Couldn't add knowledge", errorMessage(err));
      return false;
    }
  };

  const saveDoc = async (doc, patch) => {
    try {
      const res = await aiConsole.updateKnowledge(doc.id, patch);
      const item = res?.item || { ...doc, ...patch };
      setData((current) => ({
        ...(current || {}),
        items: (current?.items || []).map((entry) => (entry.id === doc.id ? { ...entry, ...item } : entry)),
      }));
      toastSuccess("Knowledge updated", doc.title);
      return true;
    } catch (err) {
      toastError("Couldn't save changes", errorMessage(err));
      return false;
    }
  };

  const toggleDoc = async (doc, active) => {
    setBusyIds((current) => ({ ...current, [doc.id]: true }));
    setData((current) => ({
      ...(current || {}),
      items: (current?.items || []).map((entry) => (entry.id === doc.id ? { ...entry, active } : entry)),
    }));
    try {
      const res = await aiConsole.updateKnowledge(doc.id, { active });
      if (res?.item) {
        setData((current) => ({
          ...(current || {}),
          items: (current?.items || []).map((entry) => (entry.id === doc.id ? { ...entry, ...res.item } : entry)),
        }));
      }
      toastSuccess(active ? "Doc enabled" : "Doc disabled", active ? "The assistant can retrieve it again." : "The assistant won't use it until you enable it.");
    } catch (err) {
      setData((current) => ({
        ...(current || {}),
        items: (current?.items || []).map((entry) => (entry.id === doc.id ? { ...entry, active: !active } : entry)),
      }));
      toastError("Couldn't update the doc", errorMessage(err));
    } finally {
      setBusyIds((current) => {
        const next = { ...current };
        delete next[doc.id];
        return next;
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await aiConsole.deleteKnowledge(deleting.id);
      setData((current) => ({ ...(current || {}), items: (current?.items || []).filter((entry) => entry.id !== deleting.id) }));
      toastSuccess("Knowledge deleted", deleting.title);
      if (highlightId === deleting.id) setHighlightId(null);
      setDeleting(null);
    } catch (err) {
      toastError("Couldn't delete", errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-400 space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search titles, content and tags…"
            aria-label="Search knowledge"
            className="h-9 w-full rounded-lg border-0 bg-white pr-3 pl-8 text-[13px] text-slate-900 shadow-[0_1px_1px_rgba(15,23,42,0.03)] ring-1 ring-slate-200 ring-inset outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <Segmented
          ariaLabel="Source"
          value={source}
          onChange={setSource}
          options={[
            { value: "all", label: "All", count: items.length },
            { value: "builtin", label: "Built-in", count: stats.builtin },
            { value: "custom", label: "Custom", count: stats.custom },
          ]}
        />
        <div className="ml-auto flex items-center gap-2">
          {stats.disabled > 0 && <span className="text-xs text-slate-500">{stats.disabled} disabled</span>}
          <Button variant="primary" size="sm" icon={showForm ? X : FilePlus2} onClick={() => setShowForm((value) => !value)}>
            {showForm ? "Close form" : "Add knowledge"}
          </Button>
        </div>
      </div>

      {categories.length > 1 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Categories">
          {[{ name: "all", count: items.length }, ...categories].map((item) => {
            const active = category === item.name;
            return (
              <button
                key={item.name}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(item.name)}
                className={cx(
                  "inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap ring-1 transition-colors",
                  active ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
                  focusRing,
                )}
              >
                {item.name === "all" ? "All categories" : item.name}
                <span className={cx("text-[10px] font-bold tabular-nums", active ? "text-white/70" : "text-slate-400")}>{item.count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-3">
          {kb.error && !kb.data ? (
            <Card>
              <ErrorState title="Couldn't load the knowledge base" error={kb.error} onRetry={kb.refresh} />
            </Card>
          ) : !kb.data ? (
            Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} className="flex gap-3 p-4">
                <Skeleton className="size-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </Card>
            ))
          ) : !filtered.length ? (
            <Card>
              <EmptyState
                icon={BookOpen}
                title={items.length ? "No docs match these filters" : "No knowledge yet"}
                description={
                  items.length
                    ? "Clear the search or pick another category."
                    : "Add a product note, an offer or an FAQ — then test retrieval to watch the assistant pick it up."
                }
                action={
                  !items.length ? (
                    <Button size="sm" variant="primary" icon={FilePlus2} onClick={() => setShowForm(true)}>
                      Add knowledge
                    </Button>
                  ) : null
                }
              />
            </Card>
          ) : (
            <>
              {source !== "builtin" && stats.custom === 0 && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-3">
                  <p className="text-[13px] text-slate-600">
                    <span className="font-semibold text-slate-800">No custom knowledge yet.</span> Add this week&apos;s offer
                    or an internal FAQ — the assistant can use it on the very next message.
                  </p>
                  <Button size="sm" variant="secondary" icon={Plus} onClick={() => setShowForm(true)}>
                    Add
                  </Button>
                </div>
              )}
              {filtered.map((doc) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  categories={categoryNames}
                  busy={Boolean(busyIds[doc.id])}
                  onSave={saveDoc}
                  onToggle={toggleDoc}
                  onDelete={setDeleting}
                />
              ))}
              <p className="px-1 text-xs text-slate-400">
                Showing {filtered.length} of {items.length} docs · built-in docs ship with the assistant and are read-only.
              </p>
            </>
          )}
        </div>

        <div className="order-first space-y-4 xl:sticky xl:top-5 xl:order-none xl:self-start">
          <AnimatePresence initial={false}>
            {showForm && (
              <Motion.div
                key="kb-form"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <Card>
                  <CardHeader
                    title="Add knowledge"
                    subtitle="Custom docs are searched alongside the built-in ones on every customer question."
                    icon={FilePlus2}
                    actions={<IconButton size="xs" label="Close form" icon={X} onClick={() => setShowForm(false)} />}
                  />
                  <div className="px-4 pb-4">
                    <KnowledgeForm categories={categoryNames} submitLabel="Add to knowledge base" onSubmit={createDoc} autoFocus />
                  </div>
                </Card>
              </Motion.div>
            )}
          </AnimatePresence>
          <RetrievalTester
            tenantKey={tenantKey}
            suggestions={suggestions}
            customIds={customIds}
            highlightId={highlightId}
            query={testQuery}
            onQueryChange={setTestQuery}
            state={test}
            onSearch={runSearch}
            inputRef={testInputRef}
          />
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this knowledge doc?"
        message={deleting ? `“${deleting.title}” will be removed and the assistant will stop using it. This can't be undone.` : ""}
        confirmLabel="Delete doc"
        cancelLabel="Keep it"
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

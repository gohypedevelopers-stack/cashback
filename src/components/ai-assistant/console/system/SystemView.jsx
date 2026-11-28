// System: engine, WhatsApp channel, storage, simulator/reminders, tenants and a go-live checklist.

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Cpu,
  Database,
  Layers,
  MessageCircle,
  Monitor,
  RefreshCw,
  Rocket,
  XCircle,
} from "lucide-react";
import { aiConsole } from "@/lib/aiAssistantApi";
import { getApiBaseUrl } from "@/lib/apiClient";
import { formatDateTimeIST } from "@/components/ai-assistant/shared/format";
import { Badge, Button, Card, CardHeader, CopyButton, ErrorState, InlineAlert, Spinner, cx } from "../ui";
import { useConsole } from "../lib/ConsoleContext";
import { usePoll } from "../lib/hooks";
import { prettyModel } from "../lib/consoleFormat";

function StatusValue({ ok, yes = "Yes", no = "No", warn = false }) {
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-emerald-700">
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        {yes}
      </span>
    );
  }
  return (
    <span className={cx("inline-flex items-center gap-1 text-[13px] font-semibold", warn ? "text-amber-700" : "text-rose-600")}>
      {warn ? <AlertTriangle className="size-3.5" aria-hidden="true" /> : <XCircle className="size-3.5" aria-hidden="true" />}
      {no}
    </span>
  );
}

function Row({ label, children, hint }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <dt className="text-xs font-medium text-slate-500">{label}</dt>
        {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
      </div>
      <dd className="min-w-0 text-right text-[13px] font-medium text-slate-800">{children}</dd>
    </div>
  );
}

const mono = (value) =>
  value ? <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">{value}</code> : <span className="text-slate-400">—</span>;

function buildChecklist(system) {
  const llm = system?.llm || {};
  const wa = system?.whatsapp || {};
  const store = system?.store || {};
  return [
    {
      key: "claude",
      label: "Claude API connected",
      ok: Boolean(llm.configured),
      detail: llm.configured
        ? `${prettyModel(llm.model) || "Claude"} writes the answers.`
        : "Set ANTHROPIC_API_KEY — until then the rules engine answers.",
    },
    {
      key: "storage",
      label: "Persistent database storage",
      ok: store.kind === "prisma" && store.healthy !== false,
      detail:
        store.kind === "prisma"
          ? store.healthy === false
            ? "Database is configured but not healthy."
            : "Conversations, leads and bookings are stored in PostgreSQL."
          : "Memory store — data is lost on restart. Run the AI migration and set AI_STORE=prisma.",
    },
    {
      key: "whatsapp",
      label: "WhatsApp Cloud API credentials",
      ok: Boolean(wa.configured),
      detail: wa.configured ? "Phone number ID and access token are set." : "Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.",
    },
    {
      key: "signature",
      label: "Webhook signature verification",
      ok: Boolean(wa.signatureVerification),
      detail: wa.signatureVerification
        ? "Inbound webhooks are verified with X-Hub-Signature-256."
        : "Set WHATSAPP_APP_SECRET so only Meta can post to the webhook.",
    },
    {
      key: "autoreply",
      label: "AI auto-reply on WhatsApp",
      ok: Boolean(wa.autoReply),
      detail: wa.autoReply ? "The assistant replies to inbound WhatsApp messages." : "Set AI_WHATSAPP_AUTOREPLY=true when you're ready to go live.",
    },
    {
      key: "reminders",
      label: "Booking reminders",
      ok: Boolean(system?.reminders?.enabled),
      detail: system?.reminders?.enabled ? "Customers get a reminder before their advisor call." : "Set AI_REMINDERS_ENABLED=true.",
    },
    {
      key: "number",
      label: "Public WhatsApp number",
      ok: Boolean(wa.displayNumber),
      detail: wa.displayNumber ? `Customers message ${wa.displayNumber}.` : "Set AI_WHATSAPP_DISPLAY_NUMBER for the demo page.",
    },
  ];
}

export default function SystemView() {
  const { system: bootSystem, tenantKey } = useConsole();
  const resource = usePoll(() => aiConsole.getSystem(), { key: "system", interval: 15000 });
  const system = resource.data || bootSystem;
  const llm = system?.llm || {};
  const wa = system?.whatsapp || {};
  const store = system?.store || {};
  const tenants = Array.isArray(system?.tenants) ? system.tenants : [];
  const checklist = buildChecklist(system);
  const passed = checklist.filter((item) => item.ok).length;
  const webhookPath = wa.webhookPath || "/api/webhooks/whatsapp";
  const apiBase = getApiBaseUrl();
  const webhookUrl = /^https?:\/\//i.test(apiBase)
    ? `${apiBase}${webhookPath}`
    : `${window.location.origin}${apiBase}${webhookPath}`;
  const tenantMap = wa.tenantMap && typeof wa.tenantMap === "object" ? Object.entries(wa.tenantMap) : [];

  if (!system && resource.error) {
    return (
      <div className="mx-auto w-full max-w-350 px-4 py-5 sm:px-6 lg:px-8">
        <Card>
          <ErrorState title="Couldn't load system status" error={resource.error} onRetry={resource.refresh} />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-350 space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-slate-500">
          {system?.serverTime ? `Server time ${formatDateTimeIST(system.serverTime)} IST` : "Live system status"}
          {system?.version ? ` · version ${system.version}` : ""}
        </p>
        <div className="ml-auto flex items-center gap-2">
          {resource.loading && <Spinner className="size-3.5" />}
          <Button size="sm" icon={RefreshCw} onClick={resource.refresh}>
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Go-live checklist"
          subtitle="What's needed to run the concierge on real WhatsApp traffic"
          icon={Rocket}
          actions={
            <Badge tone={passed === checklist.length ? "emerald" : "amber"}>
              {passed}/{checklist.length} ready
            </Badge>
          }
        />
        <div className="px-4 pb-4">
          <div className="mb-3 h-1.5 w-full rounded-full bg-slate-100" aria-hidden="true">
            <div
              className="h-1.5 rounded-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${(passed / checklist.length) * 100}%` }}
            />
          </div>
          <ul className="grid gap-2 md:grid-cols-2">
            {checklist.map((item) => (
              <li
                key={item.key}
                className={cx(
                  "flex items-start gap-2.5 rounded-lg px-3 py-2.5 ring-1",
                  item.ok ? "bg-emerald-50/50 ring-emerald-100" : "bg-rose-50/50 ring-rose-100",
                )}
              >
                {item.ok ? (
                  <CheckCircle2 className="mt-px size-4 shrink-0 text-emerald-600" aria-label="Ready" />
                ) : (
                  <XCircle className="mt-px size-4 shrink-0 text-rose-500" aria-label="Not ready" />
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800">{item.label}</p>
                  <p className="text-xs leading-relaxed text-slate-500">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="AI engine" subtitle="Anthropic Claude with a rules-engine fallback" icon={Cpu} />
          <dl className="divide-y divide-slate-100 px-4 pb-3">
            <Row label="Claude configured">
              <StatusValue ok={llm.configured} yes="Connected" no="Not configured" />
            </Row>
            <Row label="Model">
              <span className="flex flex-col items-end gap-0.5">
                <span>{llm.configured ? prettyModel(llm.model) || "—" : "Rules engine"}</span>
                {llm.model && <span className="font-mono text-[11px] text-slate-400">{llm.model}</span>}
              </span>
            </Row>
            <Row label="Effort" hint="Latency vs depth of reasoning">
              <span className="capitalize">{llm.effort || "—"}</span>
            </Row>
            <Row label="Fast mode">
              <StatusValue ok={llm.fastMode} yes="On" no="Off" warn />
            </Row>
          </dl>
          {!llm.configured && (
            <div className="px-4 pb-4">
              <InlineAlert tone="amber" title="Running on the rules engine">
                Answers come from the built-in rule-based responder and the same tools. Add ANTHROPIC_API_KEY to switch
                every reply to Claude.
              </InlineAlert>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="WhatsApp channel" subtitle="Meta WhatsApp Cloud API" icon={MessageCircle} />
          <dl className="divide-y divide-slate-100 px-4 pb-3">
            <Row label="Cloud API credentials">
              <StatusValue ok={wa.configured} yes="Configured" no="Not configured" />
            </Row>
            <Row label="AI auto-reply">
              <StatusValue ok={wa.autoReply} yes="On" no="Off" warn />
            </Row>
            <Row label="Phone number ID">{mono(wa.phoneNumberIdMasked)}</Row>
            <Row label="Display number">{wa.displayNumber || <span className="text-slate-400">—</span>}</Row>
            <Row label="Webhook" hint="Paste the full URL into the Meta app dashboard">
              <span className="flex flex-col items-end gap-1.5">
                {mono(webhookPath)}
                <CopyButton text={webhookUrl} label="Copy webhook URL" />
              </span>
            </Row>
            <Row label="Signature verification">
              <StatusValue ok={wa.signatureVerification} yes="Verified (app secret set)" no="Off" />
            </Row>
            <Row label="Default tenant">{mono(wa.defaultTenant)}</Row>
            {tenantMap.length > 0 && (
              <Row label="Number → tenant map">
                <span className="flex flex-col items-end gap-1">
                  {tenantMap.map(([number, key]) => (
                    <span key={number} className="font-mono text-[11px] text-slate-600">
                      {number} → {key}
                    </span>
                  ))}
                </span>
              </Row>
            )}
          </dl>
        </Card>

        <Card>
          <CardHeader title="Storage" subtitle="Where conversations, leads and bookings live" icon={Database} />
          <dl className="divide-y divide-slate-100 px-4 pb-3">
            <Row label="Store">
              <Badge tone={store.kind === "prisma" ? "emerald" : "amber"}>
                {store.kind === "prisma" ? "PostgreSQL (Prisma)" : store.kind === "memory" ? "In-memory" : store.kind || "Unknown"}
              </Badge>
            </Row>
            <Row label="Healthy">
              <StatusValue ok={store.healthy !== false} yes="Healthy" no="Unhealthy" />
            </Row>
            {store.note && <Row label="Note">{store.note}</Row>}
          </dl>
          {store.kind === "memory" && (
            <div className="px-4 pb-4">
              <InlineAlert tone="amber" title="Memory is per process">
                Data resets when the server restarts and isn&apos;t shared between PM2 cluster workers — fine for a demo,
                not for production. Use the Prisma store to keep history.
              </InlineAlert>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Simulator & reminders" subtitle="Web simulator for demos, reminder worker for booked calls" icon={Monitor} />
          <dl className="divide-y divide-slate-100 px-4 pb-3">
            <Row label="Web simulator">
              <StatusValue ok={system?.simulator?.enabled} yes="Enabled" no="Disabled" warn />
            </Row>
            <Row label="Simulator rate limit">
              {system?.simulator?.rateLimit ? `${system.simulator.rateLimit} messages / 5 min per IP` : "—"}
            </Row>
            <Row label="Booking reminders">
              <span className="inline-flex items-center gap-1.5">
                <Bell className="size-3.5 text-slate-400" aria-hidden="true" />
                <StatusValue ok={system?.reminders?.enabled} yes="On" no="Off" warn />
              </span>
            </Row>
          </dl>
        </Card>
      </div>

      <Card>
        <CardHeader title="Tenants" subtitle="Workspaces served by the same engine" icon={Layers} />
        <ul className="grid gap-3 px-4 pb-4 md:grid-cols-2">
          {tenants.map((tenant) => (
            <li
              key={tenant.key}
              className={cx(
                "flex items-start gap-3 rounded-xl p-3 ring-1",
                tenant.key === tenantKey ? "bg-slate-50 ring-slate-300" : "ring-slate-200",
              )}
            >
              <span
                className="grid size-10 shrink-0 place-items-center rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: tenant.brand?.primaryDark || tenant.brand?.primary || "#059669" }}
                aria-hidden="true"
              >
                {tenant.brand?.avatarInitials || (tenant.shortName || tenant.name || "?").slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[13px] font-semibold text-slate-900">{tenant.name}</p>
                  {tenant.isDemo && <Badge tone="amber">{tenant.demoLabel || "Concept demo"}</Badge>}
                  {tenant.key === tenantKey && <Badge tone="dark">Viewing</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {tenant.assistantName ? `${tenant.assistantName} · ` : ""}
                  {tenant.tagline || tenant.vertical}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400">
                  <span className="font-mono">{tenant.key}</span>
                  {tenant.whatsapp?.displayNumber && <span>· {tenant.whatsapp.displayNumber}</span>}
                  {tenant.booking?.teamName && <span>· {tenant.booking.teamName}</span>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

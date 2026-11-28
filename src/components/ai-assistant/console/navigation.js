import { BookOpen, CalendarCheck, Inbox, LayoutDashboard, Server, Target, UserCog } from "lucide-react";

export const NAV_ITEMS = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    subtitle: "How the AI concierge is performing for your business",
  },
  { key: "inbox", label: "Live inbox", icon: Inbox, subtitle: "Every conversation as it happens — take over any time" },
  { key: "leads", label: "Leads", icon: Target, subtitle: "Prospects the assistant has qualified, scored and staged" },
  { key: "bookings", label: "Bookings", icon: CalendarCheck, subtitle: "Advisor calls booked by the assistant" },
  { key: "knowledge", label: "Knowledge base", icon: BookOpen, subtitle: "What the assistant knows — and how it finds it" },
  { key: "advisors", label: "Advisors", icon: UserCog, subtitle: "Who customers can book, and when they're available" },
  { key: "system", label: "System", icon: Server, subtitle: "Engine, WhatsApp channel, storage and go-live readiness" },
];

export const NAV_BY_KEY = Object.fromEntries(NAV_ITEMS.map((item) => [item.key, item]));

export const TAB_KEYS = new Set(NAV_ITEMS.map((item) => item.key));

export const AGENT_NAME_STORAGE = "ai_console_agent_name";
export const TENANT_STORAGE = "ai_console_tenant";

export const simulatorHref = (tenantKey) =>
  tenantKey ? `/ai-assistant/try?tenant=${encodeURIComponent(tenantKey)}` : "/ai-assistant/try";

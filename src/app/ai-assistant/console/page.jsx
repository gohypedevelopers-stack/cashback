import { AiConsoleView } from "@/components/ai-assistant/AiClientViews";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  path: "/ai-assistant/console",
  title: "Advisor Console | AI WhatsApp Concierge",
  description: "Live conversations, leads and advisor bookings handled by the AI assistant.",
  noindex: true,
});

export default function Page() {
  return <AiConsoleView />;
}

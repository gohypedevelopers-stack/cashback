import { AiTryView } from "@/components/ai-assistant/AiClientViews";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  path: "/ai-assistant/try",
  title: "Try the AI WhatsApp Concierge",
  description: "Chat with the AI assistant in a WhatsApp-style simulator.",
  noindex: true,
});

export default function Page() {
  return <AiTryView />;
}

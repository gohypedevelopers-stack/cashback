import { AiShowcaseView } from "@/components/ai-assistant/AiClientViews";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  path: "/ai-assistant",
  title: "AI WhatsApp Concierge | Assured Rewards Labs",
  description:
    "An AI assistant on WhatsApp that answers customer questions instantly, qualifies leads and books a call with an advisor when the customer is ready.",
  noindex: true,
});

export default function Page() {
  return <AiShowcaseView />;
}

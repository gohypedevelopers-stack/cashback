import View from "@/views/GiftCards";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/gift-cards" });

export default function Page() {
  return <View />;
}

import View from "@/views/GiftCardsList";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/gift-cards-list" });

export default function Page() {
  return <View />;
}

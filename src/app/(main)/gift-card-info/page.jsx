import View from "@/views/GiftCardInfo";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/gift-card-info" });

export default function Page() {
  return <View />;
}

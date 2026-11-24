import View from "@/views/PrivacyPolicy";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/privacy-policy" });

export default function Page() {
  return <View />;
}

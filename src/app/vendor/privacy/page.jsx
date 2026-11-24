import View from "@/views/VendorPrivacyPolicy";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/vendor/privacy" });

export default function Page() {
  return <View />;
}

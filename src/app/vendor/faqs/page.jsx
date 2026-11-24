import View from "@/views/VendorFAQs";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/vendor/faqs" });

export default function Page() {
  return <View />;
}

import View from "@/views/VendorTerms";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/vendor/terms" });

export default function Page() {
  return <View />;
}

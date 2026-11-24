import View from "@/views/VendorContact";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/vendor/contact" });

export default function Page() {
  return <View />;
}

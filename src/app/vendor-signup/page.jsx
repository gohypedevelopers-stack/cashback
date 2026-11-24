import View from "@/views/VendorSignup";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/vendor-signup" });

export default function Page() {
  return <View />;
}

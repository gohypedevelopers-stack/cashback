import View from "@/views/VendorLandingPage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/vendor-landing" });

export default function Page() {
  return <View />;
}

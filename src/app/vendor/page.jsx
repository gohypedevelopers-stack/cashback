import View from "@/views/VendorLandingPage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/vendor" });

export default function Page() {
  return <View />;
}

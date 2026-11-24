import View from "@/views/BrandDetails";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/brand-details" });

export default function Page() {
  return <View />;
}

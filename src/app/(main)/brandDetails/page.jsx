import View from "@/views/BrandDetails";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/brandDetails" });

export default function Page() {
  return <View />;
}

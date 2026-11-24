import View from "@/views/ProductInfo";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/productInfo" });

export default function Page() {
  return <View />;
}

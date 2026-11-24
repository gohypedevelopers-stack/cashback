import View from "@/views/ProductInfo";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/product-info" });

export default function Page() {
  return <View />;
}

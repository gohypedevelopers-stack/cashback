import View from "@/views/ProductReport";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/product-report" });

export default function Page() {
  return <View />;
}

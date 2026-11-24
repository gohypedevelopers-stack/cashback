import View from "@/views/BrandFAQs";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/brand-faqs" });

export default function Page() {
  return <View />;
}

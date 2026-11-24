import { BlogPortal as View } from "@/components/next/ClientViews";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/blog-edit", noindex: true });

export default function Page() {
  return <View />;
}

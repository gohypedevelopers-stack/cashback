import { Profile as View } from "@/components/next/ClientViews";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/profile", noindex: true });

export default function Page() {
  return <View />;
}

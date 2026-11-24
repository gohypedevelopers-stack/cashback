import { RedeemPage as View } from "@/components/next/ClientViews";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/wallet/redeem", noindex: true });

export default function Page() {
  return <View />;
}

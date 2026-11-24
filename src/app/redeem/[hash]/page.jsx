import { RedeemQr as View } from "@/components/next/ClientViews";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { hash } = await params;
  return buildMetadata({ path: `/redeem/${hash}`, noindex: true });
}

export default function Page() {
  return <View />;
}

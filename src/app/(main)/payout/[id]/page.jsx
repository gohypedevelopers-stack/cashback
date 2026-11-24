import { PayoutStatus as View } from "@/components/next/ClientViews";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return buildMetadata({ path: `/payout/${id}`, noindex: true });
}

export default function Page() {
  return <View />;
}

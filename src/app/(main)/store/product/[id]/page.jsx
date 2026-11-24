import View from "@/views/RedeemProductInfo";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return buildMetadata({ path: `/store/product/${id}` });
}

export default function Page() {
  return <View />;
}

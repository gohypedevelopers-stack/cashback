import View from "@/views/ProductInfo";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return buildMetadata({ path: `/product-info/${id}` });
}

export default function Page() {
  return <View />;
}

import View from "@/views/GiftCardInfo";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return buildMetadata({ path: `/gift-card-info/${id}` });
}

export default function Page() {
  return <View />;
}

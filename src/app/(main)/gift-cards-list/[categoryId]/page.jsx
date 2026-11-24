import View from "@/views/GiftCardsList";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { categoryId } = await params;
  return buildMetadata({ path: `/gift-cards-list/${categoryId}` });
}

export default function Page() {
  return <View />;
}

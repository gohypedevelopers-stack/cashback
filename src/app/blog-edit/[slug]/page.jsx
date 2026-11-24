import { BlogPortal as View } from "@/components/next/ClientViews";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return buildMetadata({ path: `/blog-edit/${slug}`, noindex: true });
}

export default function Page() {
  return <View />;
}

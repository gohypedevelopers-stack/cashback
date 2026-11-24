import Brands from "@/views/Brands";
import { buildMetadata } from "@/lib/seo";
import { fetchPublicBrands } from "@/lib/serverApi";

export const revalidate = 300;

export const metadata = buildMetadata({ path: "/brands" });

export default async function Page() {
  const brands = await fetchPublicBrands();
  return <Brands initialBrands={brands ?? undefined} />;
}

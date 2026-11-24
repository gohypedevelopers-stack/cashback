import BrandDetails from "@/views/BrandDetails";
import { brandMetadata } from "@/lib/seo";
import { fetchPublicBrand } from "@/lib/serverApi";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const brand = await fetchPublicBrand(id);
  return brandMetadata(brand, `/brand-details/${id}`);
}

export default async function Page({ params }) {
  const { id } = await params;
  const brand = await fetchPublicBrand(id);
  return <BrandDetails key={id} initialBrand={brand} />;
}

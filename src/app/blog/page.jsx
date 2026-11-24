import BlogViewer from "@/views/BlogViewer";
import { buildMetadata } from "@/lib/seo";
import { fetchPublicBlogs } from "@/lib/serverApi";

export const revalidate = 300;

export const metadata = buildMetadata({ path: "/blog" });

export default async function Page() {
  const blogs = await fetchPublicBlogs();
  return <BlogViewer initialBlogs={blogs ?? undefined} />;
}

import BlogViewer from "@/views/BlogViewer";
import { buildMetadata } from "@/lib/seo";
import { fetchPublicBlogs, fetchPublishedBlogs } from "@/lib/serverApi";

export const revalidate = 300;

// Pre-build every published post; new posts are rendered on first request.
export async function generateStaticParams() {
  const blogs = await fetchPublishedBlogs();
  return blogs.map((b) => ({ slug: String(b.slug) }));
}

const findPost = (blogs, slug) =>
  (blogs || []).find(
    (b) => b?.slug === slug && String(b.status).toLowerCase() === "published",
  );

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const blogs = await fetchPublicBlogs();
  const post = findPost(blogs, slug);
  if (!post) {
    // Unknown slug: keep the page's own "not found" UI but keep it out of the index.
    return buildMetadata({ path: `/blog/${slug}`, noindex: blogs !== null });
  }
  return buildMetadata({
    path: `/blog/${slug}`,
    title: `${post.title} | Assured Rewards Blog`,
    description: post.excerpt || "Read this article on Assured Rewards.",
    type: "article",
    image: /^https?:\/\//.test(post.coverImage || "") ? post.coverImage : undefined,
  });
}

export default async function Page() {
  const blogs = await fetchPublicBlogs();
  return <BlogViewer initialBlogs={blogs ?? undefined} />;
}

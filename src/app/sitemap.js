import { SITE_URL } from "@/lib/seo";
import { PUBLIC_ROUTES } from "@/lib/routeMeta";
import { fetchPublicBrands, fetchPublishedBlogs } from "@/lib/serverApi";

// Served at /sitemap.xml; regenerated at most every 5 minutes so new blog posts
// and brands appear without a rebuild.
export const revalidate = 300;

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

export default async function sitemap() {
  const now = new Date();
  const entries = Object.entries(PUBLIC_ROUTES).map(([path, meta]) => ({
    url: SITE_URL + path,
    lastModified: now,
    changeFrequency: meta.changefreq,
    priority: meta.priority,
  }));

  for (const b of await fetchPublishedBlogs()) {
    if (!SAFE_SEGMENT.test(String(b.slug))) continue;
    const published = /^\d{4}-\d{2}-\d{2}/.test(b.publishedAt || "") ? new Date(b.publishedAt.slice(0, 10)) : now;
    entries.push({ url: `${SITE_URL}/blog/${b.slug}`, lastModified: published, changeFrequency: "monthly", priority: 0.6 });
  }

  for (const b of (await fetchPublicBrands()) || []) {
    if (!b?.id || !b?.name || !SAFE_SEGMENT.test(String(b.id))) continue;
    entries.push({ url: `${SITE_URL}/brand-details/${b.id}`, lastModified: now, changeFrequency: "weekly", priority: 0.6 });
  }

  return entries;
}

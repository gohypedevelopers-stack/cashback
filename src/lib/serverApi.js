// Server-only data fetching for SEO pages (blog posts, brand pages, sitemap).
// On the VPS the Next.js server talks to the backend directly; set
// API_INTERNAL_URL (e.g. http://127.0.0.1:5000) to skip the public round trip.
import "server-only";

const API_BASE = (
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:5000"
).replace(/\/+$/, "");

export const REVALIDATE_SECONDS = 300;

const fetchJson = async (path) => {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`[serverApi] ${path} failed: ${err.message}`);
    return null;
  }
};

export const fetchPublicBlogs = async () => {
  const data = await fetchJson("/api/public/blogs");
  return Array.isArray(data?.blogs) ? data.blogs : null;
};

export const fetchPublishedBlogs = async () => {
  const blogs = await fetchPublicBlogs();
  return (blogs || []).filter(
    (b) => b?.slug && String(b.status).toLowerCase() === "published",
  );
};

export const fetchPublicBrands = async () => {
  const data = await fetchJson("/api/public/brands");
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.brands) ? data.brands : null;
};

export const fetchPublicBrand = async (id) => {
  if (!id) return null;
  const data = await fetchJson(`/api/public/brands/${encodeURIComponent(id)}`);
  const brand = data?.brand || data;
  return brand && typeof brand === "object" && !Array.isArray(brand) ? brand : null;
};

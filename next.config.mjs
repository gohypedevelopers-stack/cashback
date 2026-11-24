import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

// Where /api and /uploads go when the request reaches Next.js (local dev, or a
// server without an nginx /api location). In production nginx normally proxies
// these to the backend before they ever reach Next.js.
const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle in .next/standalone for the VPS (run with PM2).
  output: "standalone",
  outputFileTracingRoot: root,
  turbopack: { root },
  // Keep URLs exactly as before (no trailing-slash redirects).
  trailingSlash: false,
  poweredByHeader: false,
  // Images are plain <img> tags served from /public and the backend; Next's image
  // optimizer isn't used, so its native "sharp" binary is never needed on the server.
  images: { unoptimized: true },
  async redirects() {
    return [
      { source: "/admin", destination: "/admin/overview", permanent: false },
      { source: "/vendor-panel", destination: "/vendor/overview", permanent: false },
      { source: "/vendor-panel/:section", destination: "/vendor/:section", permanent: false },
    ];
  },
  async rewrites() {
    return {
      fallback: [
        { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
        { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
      ],
    };
  },
};

export default nextConfig;

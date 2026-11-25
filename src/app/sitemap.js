// Served at /sitemap.xml.
// A fixed list of the public pages we want Google to index. Brand-details pages,
// vendor sub-pages and legal pages are intentionally left out.
// lastModified is a fixed date instead of "now" on every request.

const BASE = "https://assuredrewards.in";

// Bump this date only when the page content actually changes.
const UPDATED = new Date("2026-11-25");

// [path, changeFrequency, priority]
const pages = [
  // Core pages
  ["/", "daily", 1.0],
  ["/store", "weekly", 0.9],
  ["/gift-cards", "weekly", 0.9],
  ["/brands", "weekly", 0.8],
  ["/how-verify-works", "monthly", 0.8],
  ["/about-us", "monthly", 0.7],
  ["/vendor", "monthly", 0.7],

  // Blog (add new posts here when they are published)
  ["/blog", "weekly", 0.7],
  ["/blog/what-is-a-customer-loyalty-program-and-how-does-it-work", "monthly", 0.6],
  ["/blog/customer-loyalty-program-turn-buyers-into-repeat-customers", "monthly", 0.6],
  ["/blog/loyalty-rewards-program-how-it-helps-build-repeat-customers", "monthly", 0.6],
  ["/blog/loyalty-discounts-vs-reward-points-vs-cashback", "monthly", 0.6],
  ["/blog/cashback-on-shopping-a-beginner-s-guide", "monthly", 0.6],
  ["/blog/how-scan-and-earn-loyalty-rewards-work-qr-code-to-wallet", "monthly", 0.6],

  // Support
  ["/help", "monthly", 0.5],
  ["/brand-faqs", "monthly", 0.5],
  ["/contact", "monthly", 0.5],
];

export default function sitemap() {
  return pages.map(([path, changeFrequency, priority]) => ({
    url: `${BASE}${path}`,
    lastModified: UPDATED,
    changeFrequency,
    priority,
  }));
}

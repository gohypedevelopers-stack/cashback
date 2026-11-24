// Canonical host. Always the apex domain, so www / preview hosts never become canonical.
export const SITE_URL = "https://assuredrewards.in";

import { PUBLIC_ROUTES } from "./routeMeta";

// Duplicate route spellings -> the one URL we want indexed.
const CANONICAL_ALIASES = {
  "/brandDetails": "/brand-details",
  "/productInfo": "/product-info",
  "/vendor-landing": "/vendor",
  "/vendor-faqs": "/vendor/faqs",
  "/vendor-contact": "/vendor/contact",
  "/profile/terms": "/terms",
  "/profile/privacy-policy": "/privacy-policy",
  "/profile/contact": "/contact",
};

export const getCanonicalUrl = (pathname = "/") => {
  let path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  for (const [alias, target] of Object.entries(CANONICAL_ALIASES)) {
    if (path === alias || path.startsWith(`${alias}/`)) {
      path = target + path.slice(alias.length);
      break;
    }
  }
  return SITE_URL + path;
};

export const setCanonical = (href) => {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

// ---- Next.js metadata helpers ------------------------------------------------

export const DEFAULT_TITLE = "Assured Rewards - Best Customer Loyalty Program & Cashback Deals";
export const DEFAULT_DESCRIPTION =
  "Join the best customer loyalty program! Earn reward points, get the highest cashback deals, and redeem rewards on daily shopping. Start earning today!";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/light%20theme%20incentify%20logo.png`;

// Builds the full Next.js `metadata` object for a page. Child metadata replaces
// the parent's openGraph/twitter objects entirely, so every page gets all fields.
// Title/description default to the PUBLIC_ROUTES entry for the canonical path.
export const buildMetadata = ({
  path = "/",
  title,
  description,
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noindex = false,
} = {}) => {
  const url = getCanonicalUrl(path);
  const known = PUBLIC_ROUTES[url.slice(SITE_URL.length) || "/"] || {};
  title = title || known.title || DEFAULT_TITLE;
  description = description || known.description || DEFAULT_DESCRIPTION;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      title,
      description,
      images: [image],
      siteName: "Assured Rewards",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
};

// Must match the title/description BrandDetails.jsx used before the Next.js move.
export const brandMetadata = (brand, path) =>
  buildMetadata({
    path,
    title: brand?.name
      ? `${brand.name} Cashback Offers & Rewards | Assured Rewards`
      : "Brand Cashback Offers & Rewards | Assured Rewards",
    description: brand?.name
      ? `Buy genuine ${brand.name} products, scan the Assured Rewards QR code and get instant cashback in your wallet. View ${brand.name} offers and FAQs.`
      : "Explore partner brand offers on Assured Rewards. Scan the QR code on genuine products and get instant cashback in your wallet.",
  });

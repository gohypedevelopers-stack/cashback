// Canonical host. Always the apex domain, so www / preview hosts never become canonical.
export const SITE_URL = "https://assuredrewards.in";

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

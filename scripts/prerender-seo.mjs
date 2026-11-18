// Post-build SEO step (runs after `vite build`).
//
// The app is a client-side SPA, so without this every URL returns the same
// index.html: homepage title, canonical pointing at "/", and an empty <div id="root">.
// For each public route this writes dist/<route>/index.html with the route's own
// title / description / canonical and a short static text summary inside #root
// (React replaces it on load). Nginx's `try_files $uri $uri/ ...` serves these files.
// It also writes dist/sitemap.xml (static routes + live blog posts and brands)
// and dist/app-shell.html (no canonical) for use as the SPA fallback.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://assuredrewards.in";
const API_URL = process.env.SEO_API_URL || SITE_URL;
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");

const nav = `
<nav aria-label="Main">
  <a href="/">Home</a> · <a href="/brands">Partner Brands</a> · <a href="/store">Rewards Store</a> ·
  <a href="/gift-cards">Gift Cards</a> · <a href="/how-verify-works">How Verification Works</a> ·
  <a href="/blog">Blog</a> · <a href="/vendor">For Brands</a> · <a href="/about-us">About Us</a> ·
  <a href="/help">Help</a> · <a href="/contact">Contact</a>
</nav>`;

// title/description must match the useSEO() call on each page.
const ROUTES = [
  {
    path: "/",
    changefreq: "daily",
    priority: "1.0",
    title: "Best Customer Loyalty Program & Cashback Deals | Assured Rewards",
    description:
      "Join the best customer loyalty program! Earn reward points, get the highest cashback deals, and redeem rewards on daily shopping. Start earning today!",
    h1: "Assured Rewards: scan genuine products & get instant cashback",
    body: `
<p>Assured Rewards is a QR-based cashback and customer loyalty platform. Partner brands print a unique Assured Rewards QR code on their products. When you buy a genuine product, scan the code and the cashback is credited to your Assured Rewards wallet. Withdraw it to your bank account through UPI, or redeem it in our rewards store and on gift cards.</p>
<h2>What you can do with Assured Rewards</h2>
<ul>
  <li><a href="/scan">Scan &amp; Earn Cashback</a>: scan the QR code on products from partner brands and get cashback credited to your wallet instantly.</li>
  <li><a href="/how-verify-works">Genuine Product Verification</a>: each scan is matched against our secure database, so you know the product you bought is authentic.</li>
  <li><a href="/help">Wallet &amp; UPI Withdrawal</a>: track all your rewards in one wallet and transfer your cashback to your bank account through UPI.</li>
  <li><a href="/store">Rewards Store &amp; Gift Cards</a>: redeem your balance for products or for gift cards from top brands.</li>
  <li><a href="/product-report">Report Fake Products</a>: report suspicious or unauthorised items so the brand can take action.</li>
  <li><a href="/vendor">Loyalty Programs for Brands</a>: brands and small businesses can run QR cashback campaigns to reward customers and grow repeat sales.</li>
</ul>
<h2>Frequently asked questions</h2>
<h3>What is Assured Rewards?</h3>
<p>Assured Rewards is a cashback and customer loyalty platform in India. Partner brands put a unique QR code on their products, and customers scan it after purchase to earn instant cashback.</p>
<h3>How do I get cashback?</h3>
<p>Buy a product from a partner brand, scan the Assured Rewards QR code on the pack, and sign in. The cashback is credited to your Assured Rewards wallet.</p>
<h3>How can I use my cashback?</h3>
<p>You can withdraw your wallet balance to your bank account through UPI, or redeem it in the rewards store and on gift cards.</p>
<h3>How can my brand join Assured Rewards?</h3>
<p>Visit the <a href="/vendor">vendor page</a> to register your brand, create a cashback campaign and order QR codes for your products.</p>`,
  },
  {
    path: "/brands",
    priority: "0.8",
    changefreq: "weekly",
    title: "Top Brands Loyalty Discounts & Rewards | Assured Rewards",
    description:
      "Explore our partner brands to earn loyalty points and daily rewards deals. Get exclusive member benefits and repeat customer offers on your shopping.",
    h1: "Partner Brands",
    body: "<p>Browse the brands that offer Assured Rewards cashback. Buy their products, scan the QR code on the pack and get cashback in your wallet.</p>",
  },
  {
    path: "/store",
    priority: "0.8",
    changefreq: "weekly",
    title: "Earn Cashback Online | Redeem Rewards at Assured Rewards",
    description:
      "Shop at the Assured Rewards store to earn cashback online and bonus reward points. Find the highest cashback deals and redeem rewards seamlessly here.",
    h1: "Rewards Store",
    body: "<p>Redeem your Assured Rewards wallet balance for products and gift cards from top brands.</p>",
  },
  {
    path: "/gift-cards",
    priority: "0.8",
    changefreq: "weekly",
    title: "Buy Gift Cards & Earn Loyalty Points | Assured Rewards",
    description:
      "Shop top brand gift cards and earn loyalty points on every purchase. Enjoy exclusive member benefits and get the best cashback offers instantly with us.",
    h1: "Gift Cards",
    body: "<p>Use your Assured Rewards balance to get gift cards from top brands.</p>",
  },
  {
    path: "/blog",
    priority: "0.7",
    changefreq: "weekly",
    title: "Latest Insights & Cashback Guides | Assured Rewards Blog",
    description:
      "Read our latest articles, guides, and tips on digital loyalty programs, rewards maximization, and smart shopping.",
    h1: "Assured Rewards Blog",
    body: "<p>Guides on cashback, reward points and loyalty programs for shoppers and brands.</p>",
  },
  {
    path: "/how-verify-works",
    priority: "0.6",
    title: "How Verification Works | Secure Cashback & Reward Points",
    description:
      "Learn how our verification process helps you safely earn reward points and get cashback on payments through secure and fast reward processing.",
    h1: "How Verification Works",
    body: "<p>Scan the QR code on a product. Our system matches the code against our secure database to confirm the product is authentic. Once verified, cashback or reward points are deposited into your wallet.</p>",
  },
  {
    path: "/about-us",
    priority: "0.6",
    title: "About Assured Rewards | Best Loyalty Rewards Program",
    description:
      "Discover how Assured Rewards is building the best loyalty rewards program. We aim to reward loyal customers with top cashback offers and loyalty points.",
    h1: "About Us",
    body: "<p>Assured Rewards is a web-based platform that connects users with trusted brands and merchants, where everyday purchases earn meaningful cashback. Every eligible transaction goes through a validation process for accuracy and fairness.</p>",
  },
  {
    path: "/contact",
    priority: "0.5",
    title: "Contact Assured Rewards | Support for Loyalty Points",
    description:
      "Need help with cashback on shopping or bonus reward points? Contact the Assured Rewards support team today. We value and reward loyal customers.",
    h1: "Contact Us",
    body: "<p>Get in touch with the Assured Rewards support team for help with cashback, your wallet or withdrawals.</p>",
  },
  {
    path: "/help",
    priority: "0.5",
    title: "Help Center | Guide to Earn Reward Points & Cashback",
    description:
      "Have questions about our customer loyalty programs? Visit our Help Center to learn how to earn loyalty points, redeem rewards, and use cashback coupons.",
    h1: "Help Center",
    body: "<p>Answers to common questions about earning cashback, using your wallet, UPI withdrawals and redeeming rewards.</p>",
  },
  {
    path: "/brand-faqs",
    priority: "0.5",
    title: "Brand FAQs | Loyalty Promotions & Cashback Offers",
    description:
      "Find answers about brand loyalty promotions, bank cashback offers and loyalty membership deals. Maximize your benefits with Assured Rewards.",
    h1: "Brand FAQs",
    body: "<p>Frequently asked questions about brand cashback offers and loyalty promotions on Assured Rewards.</p>",
  },
  {
    path: "/vendor",
    priority: "0.7",
    title: "Loyalty Program for Small Businesses | Vendor Portal | Assured Rewards",
    description:
      "Grow your store with our loyalty program for small businesses. Partner with Assured Rewards to offer loyalty promotions and reward loyal customers.",
    h1: "Loyalty Program for Brands & Small Businesses",
    body: '<p>Run QR cashback campaigns on your products, reward customers for genuine purchases and grow repeat sales. <a href="/vendor-signup">Register your brand</a>.</p>',
  },
  {
    path: "/vendor/faqs",
    priority: "0.4",
    title: "Vendor FAQs | Loyalty Program for Small Businesses | Assured Rewards",
    description:
      "Find answers about setting up a loyalty program for your small business and managing reward points, cashback offers and vendor benefits.",
    h1: "Vendor FAQs",
    body: "<p>Answers for brands and merchants about setting up cashback campaigns on Assured Rewards.</p>",
  },
  {
    path: "/vendor/contact",
    priority: "0.4",
    title: "Vendor Support & Contact | Assured Rewards Partner Desk",
    description:
      "Contact the Assured Rewards merchant support team. Quick phone, WhatsApp, and email help for store campaigns, payouts, and retail partnerships.",
    h1: "Vendor Support",
    body: "<p>Contact the Assured Rewards merchant support team about campaigns, payouts and partnerships.</p>",
  },
  {
    path: "/vendor/privacy",
    priority: "0.3",
    title: "Vendor Privacy Policy | Assured Rewards",
    description:
      "Read our Vendor Privacy Policy and learn how Assured Rewards protects your business information while managing loyalty and cashback programs.",
    h1: "Vendor Privacy Policy",
    body: "",
  },
  {
    path: "/vendor/terms",
    priority: "0.3",
    title: "Vendor Terms & Conditions | Assured Rewards",
    description:
      "Review the terms for partnering with Assured Rewards and understand the guidelines for loyalty discounts, cashback offers and daily rewards deals.",
    h1: "Vendor Terms & Conditions",
    body: "",
  },
  {
    path: "/privacy-policy",
    priority: "0.3",
    title: "Privacy Policy | Assured Rewards Customer Loyalty Program",
    description:
      "Read the Assured Rewards Privacy Policy and learn how we protect your personal information while you earn cashback and use our rewards program.",
    h1: "Privacy Policy",
    body: "",
  },
  {
    path: "/terms",
    priority: "0.3",
    title: "Terms & Conditions | Assured Rewards Loyalty Program",
    description:
      "Review the Assured Rewards terms and conditions. Understand the rules for earning loyalty points, redeeming rewards and using cashback coupons.",
    h1: "Terms & Conditions",
    body: "",
  },
  {
    path: "/return-refund",
    priority: "0.3",
    title: "Return & Refund Policy | Assured Rewards",
    description:
      "Read the Assured Rewards return and refund policy for purchases made with reward points or cashback and understand eligibility and refund timelines.",
    h1: "Return & Refund Policy",
    body: "",
  },
];

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const setTag = (html, pattern, replacement) => {
  if (!pattern.test(html)) throw new Error(`prerender-seo: index.html is missing ${pattern}`);
  return html.replace(pattern, replacement);
};

const renderRoute = (template, route) => {
  const url = SITE_URL + route.path;
  const title = esc(route.title);
  const desc = esc(route.description);
  let html = template;
  html = setTag(html, /<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = setTag(html, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${desc}" />`);
  html = setTag(html, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`);
  html = setTag(html, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`);
  html = setTag(html, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${title}" />`);
  html = setTag(html, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${desc}" />`);
  html = setTag(html, /<meta name="twitter:url" content="[^"]*" \/>/, `<meta name="twitter:url" content="${url}" />`);
  html = setTag(html, /<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${title}" />`);
  html = setTag(html, /<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${desc}" />`);
  const content = `<main><h1>${esc(route.h1)}</h1>${route.body}</main>${nav}`;
  html = setTag(html, /<div id="root"><\/div>/, `<div id="root">${content}</div>`);
  return html;
};

const fetchJson = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

// Blog posts and brand pages from the live API. Titles/descriptions match
// BlogViewer.jsx and BrandDetails.jsx. If the API is unreachable the build still
// succeeds; those pages just fall back to the SPA shell and drop out of the sitemap.
const dynamicRoutes = async () => {
  const routes = [];
  try {
    const { blogs = [] } = await fetchJson(`${API_URL}/api/public/blogs`);
    for (const b of blogs) {
      if (!b.slug || String(b.status).toLowerCase() !== "published") continue;
      routes.push({
        path: `/blog/${b.slug}`,
        priority: "0.6",
        changefreq: "monthly",
        lastmod: /^\d{4}-\d{2}-\d{2}/.test(b.publishedAt || "") ? b.publishedAt.slice(0, 10) : undefined,
        title: `${b.title} | Assured Rewards Blog`,
        description: b.excerpt || "Read this article on Assured Rewards.",
        h1: b.title,
        body: b.excerpt ? `<p>${esc(b.excerpt)}</p>` : "",
      });
    }
  } catch (err) {
    console.warn(`prerender-seo: blog posts skipped (${err.message})`);
  }
  try {
    const data = await fetchJson(`${API_URL}/api/public/brands`);
    const brands = Array.isArray(data) ? data : data.brands || [];
    for (const b of brands) {
      if (!b.id || !b.name) continue;
      routes.push({
        path: `/brand-details/${b.id}`,
        priority: "0.6",
        changefreq: "weekly",
        title: `${b.name} Cashback Offers & Rewards | Assured Rewards`,
        description: `Buy genuine ${b.name} products, scan the Assured Rewards QR code and get instant cashback in your wallet. View ${b.name} offers and FAQs.`,
        h1: b.name,
        body: `<p>Buy genuine ${esc(b.name)} products, scan the Assured Rewards QR code on the pack and get instant cashback in your wallet.</p>`,
      });
    }
  } catch (err) {
    console.warn(`prerender-seo: brand pages skipped (${err.message})`);
  }
  // Path segments come from the API; refuse anything that could escape dist/.
  return routes.filter((r) => /^\/[a-z-]+\/[A-Za-z0-9_-]+$/.test(r.path));
};

const buildSitemap = (entries) => {
  const today = new Date().toISOString().slice(0, 10);
  const items = entries
    .map(
      (e) => `  <url>
    <loc>${esc(SITE_URL + e.path)}</loc>
    <lastmod>${e.lastmod || today}</lastmod>
    <changefreq>${e.changefreq || "monthly"}</changefreq>
    <priority>${e.priority || "0.5"}</priority>
  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>
`;
};

const main = async () => {
  const template = await fs.readFile(path.join(DIST, "index.html"), "utf8");

  // Bare shell for unknown / dynamic URLs: no canonical, so it never claims to be the homepage.
  const shell = template
    .replace(/\s*<link rel="canonical" href="[^"]*" \/>/, "")
    .replace(/\s*<meta property="og:url" content="[^"]*" \/>/, "")
    .replace(/\s*<meta name="twitter:url" content="[^"]*" \/>/, "");
  await fs.writeFile(path.join(DIST, "app-shell.html"), shell);

  const routes = [...ROUTES, ...(await dynamicRoutes())];
  for (const route of routes) {
    const out =
      route.path === "/"
        ? path.join(DIST, "index.html")
        : path.join(DIST, ...route.path.split("/").filter(Boolean), "index.html");
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, renderRoute(template, route));
  }

  await fs.writeFile(path.join(DIST, "sitemap.xml"), buildSitemap(routes));

  console.log(`prerender-seo: ${routes.length} pages pre-rendered and listed in sitemap.xml`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

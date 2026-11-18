import { Link } from "react-router-dom";

// Static, crawlable description of Assured Rewards for the homepage.
// Rendered without any API data so search engines always see real content.
// Keep in sync with the "/" entry in scripts/prerender-seo.mjs.
const services = [
  {
    title: "Scan & Earn Cashback",
    text: "Scan the Assured Rewards QR code on products from partner brands and get cashback credited to your wallet instantly.",
    to: "/scan",
  },
  {
    title: "Genuine Product Verification",
    text: "Each scan is matched against our secure database, so you know the product you bought is authentic.",
    to: "/how-verify-works",
  },
  {
    title: "Wallet & UPI Withdrawal",
    text: "Track all your rewards in one wallet and transfer your cashback to your bank account through UPI.",
    to: "/help",
  },
  {
    title: "Rewards Store & Gift Cards",
    text: "Redeem your balance for products in the rewards store or for gift cards from top brands.",
    to: "/store",
  },
  {
    title: "Report Fake Products",
    text: "Found a suspicious or unauthorised item? Report it so the brand can take action.",
    to: "/product-report",
  },
  {
    title: "Loyalty Programs for Brands",
    text: "Brands and small businesses can run QR cashback campaigns to reward customers and grow repeat sales.",
    to: "/vendor",
  },
];

const faqs = [
  {
    q: "What is Assured Rewards?",
    a: "Assured Rewards is a cashback and customer loyalty platform in India. Partner brands put a unique QR code on their products, and customers scan it after purchase to earn instant cashback.",
  },
  {
    q: "How do I get cashback?",
    a: "Buy a product from a partner brand, scan the Assured Rewards QR code on the pack, and sign in. The cashback is credited to your Assured Rewards wallet.",
  },
  {
    q: "How can I use my cashback?",
    a: "You can withdraw your wallet balance to your bank account through UPI, or redeem it in the rewards store and on gift cards.",
  },
  {
    q: "How can my brand join Assured Rewards?",
    a: "Visit the vendor page to register your brand, create a cashback campaign and order QR codes for your products.",
  },
];

const HomeSeoContent = () => (
  <section
    aria-labelledby="about-assured-rewards"
    className="rounded-3xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm p-5 space-y-5"
  >
    <div className="space-y-2">
      <h2
        id="about-assured-rewards"
        className="text-[18px] font-bold text-zinc-900 dark:text-white tracking-tight"
      >
        About Assured Rewards
      </h2>
      <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
        Assured Rewards is a QR-based cashback and customer loyalty platform.
        Partner brands print a unique Assured Rewards QR code on their
        products. When you buy a genuine product, scan the code and the
        cashback is credited to your Assured Rewards wallet. Withdraw it to
        your bank account through UPI, or redeem it in our rewards store and on
        gift cards.
      </p>
    </div>

    <div className="space-y-3">
      <h2 className="text-[15px] font-bold text-zinc-900 dark:text-white">
        What you can do with Assured Rewards
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {services.map((s) => (
          <li key={s.title}>
            <Link to={s.to} className="block group">
              <h3 className="text-[13px] font-semibold text-zinc-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                {s.title}
              </h3>
              <p className="text-[12px] leading-relaxed text-gray-500 dark:text-gray-400">
                {s.text}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>

    <div className="space-y-3">
      <h2 className="text-[15px] font-bold text-zinc-900 dark:text-white">
        Frequently asked questions
      </h2>
      {faqs.map((f) => (
        <div key={f.q}>
          <h3 className="text-[13px] font-semibold text-zinc-900 dark:text-gray-100">
            {f.q}
          </h3>
          <p className="text-[12px] leading-relaxed text-gray-500 dark:text-gray-400">
            {f.a}
          </p>
        </div>
      ))}
    </div>
  </section>
);

export default HomeSeoContent;

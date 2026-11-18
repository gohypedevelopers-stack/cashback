import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronRight,
  Globe,
  Mail,
  Search,
  ChevronDown,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import FallbackImage from "../components/FallbackImage";
import HowItWorks from "../components/HowItWorks";
import { getPublicBrandDetails, getPublicBrands } from "../lib/api";
import { useSEO } from "../hooks/useSEO";
import { getApiBaseUrl, resolvePublicAssetUrl } from "../lib/apiClient";

const BrandAccordion = ({ title, items }) => {
  const [openIndex, setOpenIndex] = useState(null);

  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-2 mb-2 px-1">
        <HelpCircle size={18} className="text-primary-strong" />
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
      </div>
      <div className="space-y-2.5">
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className="group rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 overflow-hidden transition-all duration-300 shadow-sm"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800/50"
            >
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200 pr-4 leading-tight">
                {item.question}
              </span>
              <div
                className={`flex-shrink-0 w-7 h-7 rounded-full bg-primary/5 flex items-center justify-center transition-transform duration-300 ${
                  openIndex === index ? "rotate-180 bg-primary/10" : ""
                }`}
              >
                <ChevronDown size={14} className="text-primary-strong" />
              </div>
            </button>
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                openIndex === index
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="p-4 pt-0 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400 border-t border-gray-50 dark:border-zinc-800/50">
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const API_BASE_URL = getApiBaseUrl();

const buildProductReportPath = (brand, product) => {
  const params = new URLSearchParams();
  if (brand?.id) params.set("brandId", brand.id);
  if (brand?.name) params.set("brandName", brand.name);
  if (product?.id) params.set("productId", product.id);
  if (product?.name) params.set("productName", product.name);
  if (product?.category) params.set("category", product.category);
  const query = params.toString();
  return query ? `/product-report?${query}` : "/product-report";
};

const normalizeWebsiteUrl = (website) => {
  const value = String(website || "").trim();
  if (!value || value.toLowerCase() === "null" || value.toLowerCase() === "undefined") {
    return "";
  }
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

const getWebsiteLabel = (websiteUrl) => {
  if (!websiteUrl) return "";
  try {
    return new URL(websiteUrl).hostname.replace(/^www\./i, "");
  } catch {
    return websiteUrl;
  }
};

const BrandDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [brandData, setBrandData] = useState(null);
  const [brandError, setBrandError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useSEO(
    brandData?.name
      ? `${brandData.name} Cashback Offers & Rewards | Assured Rewards`
      : "Brand Cashback Offers & Rewards | Assured Rewards",
    brandData?.name
      ? `Buy genuine ${brandData.name} products, scan the Assured Rewards QR code and get instant cashback in your wallet. View ${brandData.name} offers and FAQs.`
      : "Explore partner brand offers on Assured Rewards. Scan the QR code on genuine products and get instant cashback in your wallet."
  );

  useEffect(() => {
    let isMounted = true;

    const loadBrand = async () => {
      setIsLoading(true);
      setBrandError("");
      try {
        let targetId = id;
        if (!targetId) {
          const brands = await getPublicBrands();
          targetId = brands?.[0]?.id;
        }

        if (!targetId) {
          if (!isMounted) return;
          setBrandData(null);
          return;
        }

        let dataRaw;
        try {
          dataRaw = await getPublicBrandDetails(targetId);
        } catch (detailsErr) {
          if (detailsErr.status !== 404 || !id) {
            throw detailsErr;
          }

          const brands = await getPublicBrands();
          const fallbackBrand = brands?.find((brand) => brand.id !== id);
          if (!fallbackBrand?.id) {
            if (!isMounted) return;
            setBrandData(null);
            return;
          }

          navigate(`/brand-details/${fallbackBrand.id}`, { replace: true });
          return;
        }

        const data = dataRaw?.brand || dataRaw;
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new Error("Invalid brand response from server.");
        }
        if (!isMounted) return;
        setBrandData(data);
      } catch (err) {
        if (!isMounted) return;
        setBrandError(err.message || "Unable to load brand details.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadBrand();
    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  useEffect(() => {
    setQuery("");
    setActiveCategory("All");
  }, [brandData?.id]);

  const brandProducts = useMemo(() => {
    const sourceProducts = brandData?.products || brandData?.Products || [];
    return sourceProducts.map((product) => ({
      ...product,
      image: resolvePublicAssetUrl(
        product.image ||
          product.imageUrl ||
          product.bannerUrl ||
          "/placeholder.svg",
      ),
      reward: product.reward || product.cashback || "Check App",
      variant: product.variant || "",
      category: product.category || "General",
    }));
  }, [brandData]);

  const categories = useMemo(() => {
    const unique = new Set(
      brandProducts.map((product) => product.category).filter(Boolean),
    );
    return ["All", ...unique];
  }, [brandProducts]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return brandProducts.filter((product) => {
      const matchesCategory =
        activeCategory === "All" || product.category === activeCategory;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;
      const haystack =
        `${product.name} ${product.variant || ""} ${product.category || ""} ${product.description || ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeCategory, brandProducts, query]);

  if (isLoading) {
    return (
      <div className="bg-primary/10 dark:bg-zinc-950 min-h-full pb-24 transition-colors duration-300">
        <div className="px-4 mt-4 text-xs text-gray-500">
          Loading brand details...
        </div>
      </div>
    );
  }

  if (brandError) {
    return (
      <div className="bg-primary/10 dark:bg-zinc-950 min-h-full pb-24 transition-colors duration-300">
        <div className="px-4 mt-4 text-xs text-rose-500">{brandError}</div>
      </div>
    );
  }

  if (!brandData) {
    return (
      <div className="bg-primary/10 dark:bg-zinc-950 min-h-full pb-24 transition-colors duration-300">
        <div className="px-4 mt-4 text-xs text-gray-500">
          No brand information available.
        </div>
      </div>
    );
  }

  const websiteUrl = normalizeWebsiteUrl(brandData.website);
  const displayBrand = {
    ...brandData,
    logo: resolvePublicAssetUrl(brandData.logo || brandData.logoUrl),
    banner: resolvePublicAssetUrl(
      brandData.banner || brandData.logoUrl || brandData.logo,
    ),
    website: websiteUrl,
    websiteLabel: getWebsiteLabel(websiteUrl),
    tags: Array.isArray(brandData.tags) ? brandData.tags : [],
    faqs: Array.isArray(brandData.faqs) ? brandData.faqs : [],
  };

  return (
    <div className="bg-primary/10 dark:bg-zinc-950 min-h-full pb-4 transition-colors duration-300">
      <div className="px-4 mt-4 space-y-4">
        <div className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors duration-300">
          <div className="w-full aspect-[16/9] relative overflow-hidden bg-gray-100 dark:bg-zinc-800">
            {/* Blurred background image */}
            <img
              src={resolvePublicAssetUrl(displayBrand.banner)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-150 blur-3xl"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            {/* Crisp centered image on top */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <FallbackImage
                src={displayBrand.banner}
                alt={`${displayBrand.name} banner`}
                className="max-w-full max-h-full object-contain p-2"
                fallback={
                  <div className="w-full h-full bg-linear-to-br from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center">
                    <Sparkles
                      className="text-gray-400 dark:text-zinc-600"
                      size={32}
                    />
                  </div>
                }
              />
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {displayBrand.name}
                </h1>
                <div className="flex items-center gap-2 text-[11px] text-green-700 font-semibold mt-1">
                  <BadgeCheck size={14} className="text-green-600" />
                  Verified brand partner
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-[11px] text-primary-strong">
              {displayBrand.email && (
                <a
                  href={`mailto:${displayBrand.email}`}
                  className="inline-flex items-center gap-1 hover:text-primary-strong"
                >
                  <Mail size={12} />
                  {displayBrand.email}
                </a>
              )}
              {displayBrand.website && (
                <a
                  href={displayBrand.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-primary-strong"
                >
                  <Globe size={12} />
                  {displayBrand.websiteLabel}
                </a>
              )}
            </div>

            {displayBrand.about && (
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {displayBrand.about}
              </p>
            )}

            {displayBrand.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {displayBrand.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-semibold text-primary-strong dark:text-primary bg-primary/10 dark:bg-primary-strong/30 px-2 py-1 rounded-full border border-primary/20 dark:border-primary-strong/30"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold">
                  Products
                </div>
                <div className="text-lg font-bold text-emerald-800">
                  {brandProducts.length}
                </div>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-sky-700 font-semibold">
                  Category
                </div>
                <div className="text-lg font-bold text-sky-800">
                  {categories.length - 1}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Product"
            className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-full py-3 pl-10 pr-12 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md"
          >
            <Search size={14} />
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-[11px] font-semibold border transition-colors ${
                activeCategory === category
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Products from {displayBrand.name}
            </h2>
            <div className="text-xs text-gray-500">
              {filteredProducts.length} items
            </div>
          </div>
          {filteredProducts.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl p-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No products matched your search yet.
            </div>
          ) : (
            filteredProducts.map((product) => {
              const reportPath = buildProductReportPath(displayBrand, product);
              return (
                <div
                  key={product.id}
                  className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                >
                  <Link
                    to={`/product-info/${product.id}`}
                    className="flex items-center gap-3"
                  >
                    <FallbackImage
                      src={product.image}
                      alt={product.name}
                      className="w-12 h-12 object-contain rounded-lg bg-primary/10 dark:bg-zinc-800"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {product.name}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        {product.variant || product.category}
                      </div>
                      {product.scheme && (
                        <div className="text-[10px] text-blue-700 dark:text-blue-400 font-medium mt-1">
                          Running: {product.scheme}
                        </div>
                      )}
                      <div className="text-[11px] text-green-600 dark:text-green-500 font-semibold mt-1 flex items-center gap-2">
                        <span>{product.reward}</span>
                        {product.category && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary-strong text-[10px]">
                            {product.category}
                          </span>
                        )}
                      </div>
                      {product.description && (
                        <div className="text-[10px] text-gray-400 mt-1 line-clamp-1">
                          {product.description}
                        </div>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <ChevronRight size={16} className="text-primary-strong" />
                    </div>
                  </Link>
                </div>
              );
            })
          )}
        </div>

        <HowItWorks />

        <div className="pb-8 pt-4">
          <BrandAccordion
            title={`More about ${displayBrand.name}`}
            items={displayBrand.faqs}
          />
        </div>
      </div>
    </div>
  );
};

export default BrandDetails;

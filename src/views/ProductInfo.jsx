"use client";

import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "@/lib/router";
import { BadgeCheck, ChevronRight, Scan, Gift } from "lucide-react";
import FallbackImage from "../components/FallbackImage";
import {
  getPublicBrandDetails,
  getPublicProductDetails,
  getPublicProducts,
} from "../lib/api";
import { getApiBaseUrl, resolvePublicAssetUrl } from "../lib/apiClient";
import HowItWorks from "../components/HowItWorks";

const API_BASE_URL = getApiBaseUrl();

const ProductInfo = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [productError, setProductError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      setIsLoading(true);
      setProductError("");
      try {
        let targetId = id;
        if (!targetId) {
          const products = await getPublicProducts();
          targetId = products?.[0]?.id;
        }

        if (!targetId) {
          if (!isMounted) return;
          setProduct(null);
          return;
        }

        const data = await getPublicProductDetails(targetId);
        const normalizedProduct = data?.product || data;
        if (
          !normalizedProduct ||
          typeof normalizedProduct !== "object" ||
          Array.isArray(normalizedProduct)
        ) {
          throw new Error("Invalid product response from server.");
        }
        if (!isMounted) return;
        setProduct(normalizedProduct);
      } catch (err) {
        if (err?.status === 404 && id) {
          try {
            await getPublicBrandDetails(id);
            if (!isMounted) return;
            navigate(`/brand-details/${id}`, { replace: true });
            return;
          } catch {
            // The route ID is not an active brand either; show the original error.
          }
        }
        if (!isMounted) return;
        setProductError(err.message || "Unable to load product details.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProduct();
    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    const loadRelated = async () => {
      if (!product?.Brand?.id) {
        if (isMounted) setRelatedProducts([]);
        return;
      }
      try {
        const brandDetailsRaw = await getPublicBrandDetails(product.Brand.id);
        const brandDetails = brandDetailsRaw?.brand || brandDetailsRaw;
        if (!isMounted) return;
        const sourceProducts =
          brandDetails?.products || brandDetails?.Products || [];
        const normalized = sourceProducts
          .map((item) => ({
            ...item,
            image: resolvePublicAssetUrl(
              item.image ||
                item.imageUrl ||
                item.bannerUrl ||
                "/placeholder.svg",
            ),
            reward: item.reward || item.cashback || "Check App",
          }))
          .filter((item) => item.id !== product.id);
        setRelatedProducts(normalized);
      } catch (_err) {
        if (isMounted) setRelatedProducts([]);
      }
    };
    loadRelated();
    return () => {
      isMounted = false;
    };
  }, [product]);

  if (isLoading) {
    return (
      <div className="bg-primary/10 dark:bg-zinc-950 min-h-full pb-24 transition-colors duration-300">
        <div className="px-4 mt-4 text-xs text-gray-500">
          Loading product details...
        </div>
      </div>
    );
  }

  if (productError) {
    return (
      <div className="bg-primary/10 dark:bg-zinc-950 min-h-full pb-24 transition-colors duration-300">
        <div className="px-4 mt-4 text-xs text-rose-500">{productError}</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-primary/10 dark:bg-zinc-950 min-h-full pb-4 transition-colors duration-300">
        <div className="px-4 mt-4 text-xs text-gray-500">
          No product information available.
        </div>
      </div>
    );
  }

  const displayProduct = {
    ...product,
    image: resolvePublicAssetUrl(product.imageUrl || product.image),
    banner: resolvePublicAssetUrl(
      product.bannerUrl || product.banner || product.imageUrl,
    ),
    reward: product.reward || product.cashback || "Check App",
    scheme: product.scheme || "Standard Offer",
  };

  const brand = product.Brand;

  const details = [
    { label: "SKU", value: displayProduct.sku || "-" },
    {
      label: "MRP",
      value: displayProduct.mrp
        ? `INR ${Number(displayProduct.mrp).toFixed(2)}`
        : "-",
    },
    { label: "Scheme", value: displayProduct.scheme },
    { label: "Cashback", value: displayProduct.reward },
    { label: "Pack Size", value: displayProduct.packSize || "-" },
    { label: "Warranty", value: displayProduct.warranty || "-" },
  ];

  return (
    <div className="bg-primary/10 dark:bg-zinc-950 min-h-full pb-24 transition-colors duration-300">
      <div className="px-4 mt-4 space-y-4">
        <div className="relative rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors duration-300">
          <div className="w-full aspect-[3/2] bg-gray-100 dark:bg-zinc-900/40 flex items-center justify-center">
            <FallbackImage
              src={displayProduct.banner || displayProduct.image}
              alt={`${displayProduct.name} banner`}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm space-y-3 transition-colors duration-300">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {displayProduct.name}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {displayProduct.variant}
            </p>
          </div>
          {brand && (
            <Link
              to={`/brand-details/${brand.id}`}
              className="text-xs font-semibold text-primary-strong dark:text-primary inline-flex items-center gap-1"
            >
              {brand.name}
              <ChevronRight size={12} />
            </Link>
          )}
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {displayProduct.description}
          </p>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold">
              Running Campaign
            </div>
            <div className="text-sm font-bold text-emerald-900">
              {displayProduct.scheme || "No active campaign"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="bg-primary/10 dark:bg-primary-strong/20 rounded-xl p-3 border border-primary/20 dark:border-primary-strong/30"
              >
                <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {detail.label}
                </div>
                <div className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-1">
                  {detail.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-0 shadow-sm overflow-hidden transition-colors duration-300">
          <HowItWorks />
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm space-y-3 transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              More products from {brand?.name || "this brand"}
            </div>
            <div className="text-xs text-gray-500">
              {relatedProducts.length} items
            </div>
          </div>
          {relatedProducts.length === 0 ? (
            <div className="text-xs text-gray-500 bg-primary/5 rounded-xl p-3 border border-primary/10">
              No additional products available for this brand yet.
            </div>
          ) : (
            <div className="space-y-2">
              {relatedProducts.map((item) => (
                <Link
                  key={item.id}
                  to={`/product-info/${item.id}`}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-zinc-800 p-3 hover:border-primary/30 hover:bg-primary/5 transition-colors"
                >
                  <FallbackImage
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded-lg bg-primary/10"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {item.variant || item.category || "General"}
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold text-green-600">
                    {item.reward}
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductInfo;

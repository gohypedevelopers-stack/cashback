"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "@/lib/router";
import { Search, ChevronRight, ArrowLeft, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getPublicBrands } from "../lib/api";
import { resolvePublicAssetUrl } from "../lib/apiClient";
import { useSEO } from "../hooks/useSEO";

// `initialBrands` comes from the server (app/(main)/brands) so the list is in the HTML.
const Brands = ({ initialBrands }) => {
  useSEO(
    "Top Brands Loyalty Discounts & Rewards | Assured Rewards",
    "Explore our partner brands to earn loyalty points and daily rewards deals. Get exclusive member benefits and repeat customer offers on your shopping."
  );

  const navigate = useNavigate();
  const [brands, setBrands] = useState(() => initialBrands || []);
  const [isLoading, setIsLoading] = useState(!initialBrands);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    const fetchData = async () => {
      if (!initialBrands) setIsLoading(true);
      try {
        const brandsData = await getPublicBrands();
        if (live) {
          setBrands(brandsData || []);
        }
      } catch (err) {
        if (live) setError("Failed to load data. Please try again.");
      } finally {
        if (live) setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      live = false;
    };
  }, [initialBrands]);

  const filteredBrands = useMemo(() => {
    return brands.filter((b) =>
      b.name?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [brands, searchQuery]);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800">
        <div className="px-4 h-16 flex items-center justify-center">
          <h1 className="text-xl font-bold text-gray-950 dark:text-white uppercase tracking-tight">
            All Brands
          </h1>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-8">
        {/* Search Bar */}
        <div className="relative flex items-center gap-2">
          <div className="flex-1 relative group shadow-sm rounded-2xl">
            <input
              type="text"
              placeholder="Search Brand"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-zinc-900 border-none rounded-2xl py-4 px-6 text-[15px] font-medium text-gray-900 dark:text-white placeholder:text-gray-400 outline-none transition-all focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-gray-200 dark:focus:ring-zinc-700"
            />
          </div>
        </div>

        {/* Brand List */}
        <div className="space-y-0">
          <div className="mb-4 px-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
              Partner Network
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">
              {filteredBrands.length} Brands
            </span>
          </div>

          <div className="bg-white dark:bg-zinc-950 rounded-3xl overflow-hidden">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-4 py-4 border-b border-gray-50 dark:border-zinc-900/50 animate-pulse"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-900" />
                  <div className="flex-1 h-5 bg-gray-100 dark:bg-zinc-900 rounded-md" />
                </div>
              ))
            ) : (
              <AnimatePresence>
                {filteredBrands.map((brand, idx) => (
                  <motion.div
                    key={brand.id ? `brand-${brand.id}` : `brand-${brand.name || idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <Link
                      to={`/brand-details/${brand.id}`}
                      className="flex items-center gap-4 px-4 py-5 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-all group border-b border-gray-50 dark:border-zinc-900/50 last:border-none"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all duration-300">
                        <img
                          src={resolvePublicAssetUrl(
                            brand.logoUrl || brand.logo,
                          )}
                          alt={brand.name}
                          className="w-full h-full object-contain p-2.5"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentElement.innerHTML = `<span class="text-xl font-semibold text-emerald-600">${brand.name
                              ?.charAt(0)
                              ?.toUpperCase()}</span>`;
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-[15px] font-semibold text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {brand.name}
                        </span>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                          View Details
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-colors">
                        <ChevronRight
                          size={18}
                          className="text-gray-300 dark:text-gray-700 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-all group-hover:translate-x-0.5"
                        />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {!isLoading && filteredBrands.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-gray-500 font-medium">No brands found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Brands;

"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from "@/lib/router";
import { ChevronRight, Percent, Search } from 'lucide-react';
import FallbackImage from '../components/FallbackImage';
import HowItWorks from '../components/HowItWorks';
import { getPublicGiftCards } from '../lib/api';

const GiftCardsList = () => {
  const { categoryId } = useParams();
  const [query, setQuery] = useState('');
  const [giftCards, setGiftCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadGiftCards = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const data = await getPublicGiftCards();
        if (!isMounted) return;
        setGiftCards(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!isMounted) return;
        setLoadError(err.message || 'Unable to load gift cards.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadGiftCards();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return giftCards.filter((card) => {
      if (categoryId && card.categoryId !== categoryId) return false;
      if (!normalizedQuery) return true;
      return card.name.toLowerCase().includes(normalizedQuery);
    });
  }, [categoryId, giftCards, query]);

  return (
    <div className="bg-primary/10 dark:bg-zinc-950 min-h-full pb-24 transition-colors duration-300">
      <div className="px-4 mt-4 space-y-4">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Giftcard"
            className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-full py-3 pl-10 pr-12 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md"
          >
            <Search size={14} />
          </button>
        </div>

        {loadError && (
          <div className="text-xs text-rose-500">{loadError}</div>
        )}
        {isLoading && (
          <div className="text-xs text-gray-500">Loading gift cards...</div>
        )}

        <div className="space-y-3">
          {filteredCards.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl p-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No gift cards match your search.
            </div>
          ) : (
            filteredCards.map((card) => (
              <Link
                key={card.id}
                to={`/gift-card-info/${card.id}`}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <FallbackImage
                  src={card.logo}
                  alt={card.name}
                  className="w-12 h-12 rounded-lg object-cover bg-gray-50 dark:bg-zinc-800"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{card.name}</div>
                  <div className="text-green-600 dark:text-green-500 text-xs font-semibold mt-1 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <Percent size={12} className="text-green-600" />
                    </span>
                    Get Flat {card.discount} Instant Discount.
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </Link>
            ))
          )}
        </div>

        <HowItWorks />
      </div>
    </div>
  );
};

export default GiftCardsList;

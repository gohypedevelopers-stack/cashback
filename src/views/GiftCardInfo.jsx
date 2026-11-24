"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from "@/lib/router";
import { Calendar, Package, Percent, ShoppingBag } from 'lucide-react';
import FallbackImage from '../components/FallbackImage';
import HowItWorks from '../components/HowItWorks';
import { getPublicGiftCardDetails, getPublicGiftCards } from '../lib/api';

const GiftCardInfo = () => {
  const { id } = useParams();
  const [giftCard, setGiftCard] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadGiftCard = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        let targetId = id;
        if (!targetId) {
          const cards = await getPublicGiftCards();
          targetId = cards?.[0]?.id;
        }

        if (!targetId) {
          if (!isMounted) return;
          setGiftCard(null);
          return;
        }

        const data = await getPublicGiftCardDetails(targetId);
        if (!isMounted) return;
        setGiftCard(data);
      } catch (err) {
        if (!isMounted) return;
        setLoadError(err.message || 'Unable to load gift card details.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadGiftCard();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="bg-primary/10 dark:bg-zinc-950 min-h-full pb-24 transition-colors duration-300">
        <div className="px-4 mt-4 text-xs text-gray-500">Loading gift card...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-primary/10 dark:bg-zinc-950 min-h-full pb-24 transition-colors duration-300">
        <div className="px-4 mt-4 text-xs text-rose-500">{loadError}</div>
      </div>
    );
  }

  if (!giftCard) {
    return (
      <div className="bg-primary/10 dark:bg-zinc-950 min-h-full pb-24 transition-colors duration-300">
        <div className="px-4 mt-4 text-xs text-gray-500">No gift card details available.</div>
      </div>
    );
  }

  const amountOptions = useMemo(() => giftCard.amountOptions || [], [giftCard.amountOptions]);
  const minAmount = Number(giftCard.minAmount || 0);
  const maxAmount = Number(giftCard.maxAmount || 0);
  const minText = minAmount ? minAmount.toLocaleString('en-IN') : '-';
  const maxText = maxAmount ? maxAmount.toLocaleString('en-IN') : '-';

  const features = [
    {
      label: giftCard.delivery || 'Instant Delivery',
      icon: <Package size={16} className="text-rose-600" />,
      bg: 'bg-rose-50',
    },
    {
      label: giftCard.validityDays ? `Valid for ${giftCard.validityDays} day` : 'Validity varies',
      icon: <Calendar size={16} className="text-teal-600" />,
      bg: 'bg-teal-50',
    },
    {
      label: giftCard.noMinOrder ? 'No Minimum Order' : 'Minimum Order',
      icon: <ShoppingBag size={16} className="text-amber-600" />,
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="bg-primary/10 dark:bg-zinc-950 min-h-full pb-24 transition-colors duration-300">
      <div className="px-4 mt-4 space-y-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm flex items-center gap-3">
          <FallbackImage
            src={giftCard.logo}
            alt={giftCard.name}
            className="w-14 h-14 rounded-xl object-cover bg-gray-50"
          />
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{giftCard.name}</div>
            <div className="text-green-600 text-xs font-semibold mt-1 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                <Percent size={12} className="text-green-600" />
              </span>
              Get Flat {giftCard.discount} Instant Discount.
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm space-y-3">
          <input
            type="text"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Enter amount"
            className="w-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            Min: Rs {minText} & Max: Rs {maxText}
          </div>
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Change Amount</div>
          <div className="grid grid-cols-4 gap-2">
            {amountOptions.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(String(value))}
                className="text-xs font-semibold bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 dark:text-gray-300 rounded-full py-2 hover:border-primary-strong hover:text-primary-strong dark:hover:text-primary transition-colors"
              >
                Rs {value}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-3">
            {features.map((feature) => (
              <div
                key={feature.label}
                className={`rounded-xl p-3 text-center ${feature.bg} dark:bg-opacity-50 border border-gray-100 dark:border-transparent`}
              >
                <div className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-gray-100 dark:border-zinc-700 flex items-center justify-center mx-auto">
                  {feature.icon}
                </div>
                <div className="text-[10px] text-gray-700 dark:text-gray-300 font-semibold mt-2">{feature.label}</div>
              </div>
            ))}
          </div>
        </div>

        <details className="bg-primary/15 dark:bg-primary-strong/20 rounded-2xl border border-primary/20 dark:border-primary-strong/30 shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-200">
            Description
          </summary>
          <div className="px-4 pb-4 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {giftCard.description}
          </div>
        </details>

        <details className="bg-primary/15 dark:bg-primary-strong/20 rounded-2xl border border-primary/20 dark:border-primary-strong/30 shadow-sm mb-4">
          <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-200">
            Terms and Conditions
          </summary>
          <div className="px-4 pb-4 text-xs text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
            {(giftCard.terms || []).map((term) => (
              <div key={term}>{term}</div>
            ))}
          </div>
        </details>

        <HowItWorks />

        <button className="w-full bg-primary text-white py-3 rounded-2xl font-semibold shadow-lg shadow-primary/30 dark:shadow-none">
          Buy Now
        </button>
      </div>
    </div>
  );
};

export default GiftCardInfo;

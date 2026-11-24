"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Gift,
  ChevronRight,
  Sparkles,
  History,
  Zap,
  TrendingUp,
  Star,
  Wallet,
  Crown,
  ArrowRight,
  Shield,
  QrCode,
  Package,
  ShoppingBag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "@/lib/router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import FallbackImage from "../components/FallbackImage";
import VideoSpotlight from "../components/VideoSpotlight";
import HowItWorks from "../components/HowItWorks";
import { getPublicHome, getUserHomeStats } from "../lib/api";
import { getApiBaseUrl, resolvePublicAssetUrl } from "../lib/apiClient";
import { useAuth } from "../lib/auth";
import { useSEO } from "../hooks/useSEO";
import HomeSeoContent from "../components/HomeSeoContent";

gsap.registerPlugin(ScrollTrigger);

const API_BASE_URL = getApiBaseUrl();

const useDragScroll = () => {
  const ref = useRef(null);
  const dragState = useRef({ active: false, startX: 0, scrollLeft: 0 });

  const onMouseDown = (event) => {
    const element = ref.current;
    if (!element) return;
    dragState.current = {
      active: true,
      startX: event.pageX - element.offsetLeft,
      scrollLeft: element.scrollLeft,
    };
    element.classList.add("cursor-grabbing");
    event.preventDefault();
  };

  const stopDragging = () => {
    dragState.current.active = false;
    ref.current?.classList.remove("cursor-grabbing");
  };

  const onMouseMove = (event) => {
    const element = ref.current;
    if (!element || !dragState.current.active) return;
    const x = event.pageX - element.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.15;
    element.scrollLeft = dragState.current.scrollLeft - walk;
  };

  const scrollByPage = (direction) => {
    const element = ref.current;
    if (!element) return;
    element.scrollBy({
      left: direction * Math.max(180, element.clientWidth * 0.75),
      behavior: "smooth",
    });
  };

  return {
    ref,
    scrollByPage,
    dragProps: {
      onMouseDown,
      onMouseLeave: stopDragging,
      onMouseUp: stopDragging,
      onMouseMove,
    },
  };
};

/* -- Mock Data -- */
const heroBanners = [
  {
    id: 1,
    title: "Win Gold Coins Daily",
    subtitle: "Scan Heritage Milk Packs",
    gradient: "linear-gradient(135deg, #0f4c2e, #1a7842, #059669)",
    img: "/gold-coin-hero.png",
  },
  {
    id: 2,
    title: "Get Upto INR 1100",
    subtitle: "RL Masala Special Offer",
    gradient: "linear-gradient(135deg, #7c2d12, #c2410c, #fb923c)",
    img: "/masala-hero.png",
  },
];
const defaultOffers = [
  {
    amount: "₹1,100",
    brand: "RL Masala",
    gradient: "linear-gradient(135deg, #f97316, #ef4444, #e11d48)",
    emoji: "🔥",
  },
  {
    amount: "₹1,400",
    brand: "Agrawal's",
    gradient: "linear-gradient(135deg, #475569, #334155, #0f172a)",
    emoji: "✨",
  },
  {
    amount: "₹120",
    brand: "skcop",
    gradient: "linear-gradient(135deg, #10b981, #16a34a, #166534)",
    emoji: "✨",
  },
];

const quickActions = [
  {
    to: "/wallet",
    icon: Wallet,
    label: "Wallet",
    gradient: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
    shadow: "rgba(139,92,246,0.3)",
  },
  {
    to: "/history",
    icon: History,
    label: "History",
    gradient: "linear-gradient(135deg,#f59e0b,#d97706)",
    shadow: "rgba(245,158,11,0.3)",
  },
  {
    to: "/store",
    icon: Gift,
    label: "Rewards",
    gradient: "linear-gradient(135deg,#ec4899,#e11d48)",
    shadow: "rgba(236,72,153,0.3)",
  },
  {
    to: "/orders",
    icon: ShoppingBag,
    label: "Orders",
    gradient: "linear-gradient(135deg,#3b82f6,#2563eb)",
    shadow: "rgba(59,130,246,0.3)",
  },
];

/* -- Hero Carousel -- */
const HeroCarousel = React.memo(({ items }) => {
  const banners = items?.length ? items : heroBanners;
  const [cur, setCur] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return undefined;
    const t = setInterval(() => setCur((p) => (p + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  const goNext = () => {
    if (banners.length <= 1) return;
    setCur((prev) => (prev + 1) % banners.length);
  };

  const goPrev = () => {
    if (banners.length <= 1) return;
    setCur((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleDragEnd = (_event, info) => {
    if (banners.length <= 1) return;
    const swipePower = info.offset.x + info.velocity.x * 0.2;
    if (swipePower <= -55) {
      goNext();
    } else if (swipePower >= 55) {
      goPrev();
    }
  };

  return (
    <div
      className="hero-carousel relative isolate w-full h-[280px] sm:h-[270px] rounded-3xl overflow-hidden border border-white/25"
      style={{
        boxShadow: "0 28px 64px -12px rgba(15, 23, 42, 0.4)",
        touchAction: "pan-y",
      }}
    >
      <motion.div
        className="flex h-full w-full"
        animate={{ x: `-${cur * 100}%` }}
        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
        drag={banners.length > 1 ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ touchAction: "pan-y" }}
      >
        {banners.map((b, i) => {
          const bgValue = b.accent || b.gradient;
          const isCssGradient = bgValue?.startsWith("linear-gradient");
          const isTailwindGradient =
            bgValue?.includes("from-") && bgValue?.includes("to-");

          let inlineBg = {};
          if (isCssGradient) {
            inlineBg = { background: bgValue };
          } else if (isTailwindGradient) {
            const fromMatch = bgValue.match(/from-\[?([^\]\s]+)\]?/);
            const toMatch = bgValue.match(/to-\[?([^\]\s]+)\]?/);
            const from = fromMatch?.[1] || "";
            const to = toMatch?.[1] || "";
            if (from && to) {
              inlineBg = {
                background: `linear-gradient(135deg, ${from}, ${to})`,
              };
            }
          } else {
            inlineBg = {
              background: "linear-gradient(135deg,#14532d,#15803d,#059669)",
            };
          }

          return (
            <div key={b.id ? `banner-${b.id}` : `banner-idx-${i}`} className="relative flex-none w-full h-full">
              <div className="absolute inset-0" style={inlineBg} />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25), transparent 50%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.2), transparent 50%)",
                }}
              />
              <div className="absolute inset-0 bg-linear-to-r from-black/40 via-transparent to-black/20" />

              {/* Subtle noise/texture overlay for premium look */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />

              <div className="relative z-10 h-full px-5 sm:px-8 py-5 sm:py-7 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                  <div
                    className="inline-flex w-fit items-center gap-1.5 px-3 py-1 rounded-full border mb-2.5 backdrop-blur-xl"
                    style={{
                      background: "rgba(255,255,255,0.12)",
                      borderColor: "rgba(255,255,255,0.2)",
                    }}
                  >
                    <Zap
                      size={10}
                      className="text-yellow-400 fill-yellow-400"
                    />
                    <span
                      className="text-[10px] font-bold text-white uppercase"
                      style={{ letterSpacing: "0.2em" }}
                    >
                      Exclusive
                    </span>
                  </div>
                  <h3
                    className="text-[22px] sm:text-[26px] font-bold text-white leading-[1.1] tracking-tight"
                    style={{ textShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
                  >
                    {b.title}
                  </h3>
                  <p
                    className="text-[12px] sm:text-[14px] mt-2 font-medium"
                    style={{ color: "rgba(255,255,255,0.85)" }}
                  >
                    {b.subtitle}
                  </p>
                  <Link
                    to={b.link || "/brand-details"}
                    className="self-start mt-4"
                  >
                    <div
                      className="inline-flex items-center gap-2 bg-white text-gray-950 text-[13px] font-bold px-6 py-2.5 rounded-xl active:scale-[0.92] transition-all hover:pr-8 group"
                      style={{ boxShadow: "0 15px 35px -5px rgba(0,0,0,0.4)" }}
                    >
                      Explore{" "}
                      <ArrowRight
                        size={16}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </div>
                  </Link>
                </div>

                <div className="flex shrink-0 items-center justify-center">
                  <div className="relative w-[110px] h-[110px] sm:w-[160px] sm:h-[160px] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl group">
                    <FallbackImage
                      src={resolvePublicAssetUrl(b.img)}
                      alt="Offer"
                      className="w-full h-full object-cover transition-opacity duration-700"
                      fallback={
                        <Sparkles
                          className="w-full h-full p-8"
                          style={{ color: "rgba(255,255,255,0.2)" }}
                        />
                      }
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-white/10" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Progress */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] z-30"
        style={{ background: "rgba(255,255,255,0.1)" }}
      >
        <motion.div
          key={`p${cur}`}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 5, ease: "linear" }}
          className="h-full rounded-full"
          style={{ background: "rgba(255,255,255,0.6)" }}
        />
      </div>
    </div>
  );
});

/* ---------------------- MAIN HOME ---------------------- */
const Home = () => {
  useSEO(
    "Best Customer Loyalty Program & Cashback Deals | Assured Rewards",
    "Join the best customer loyalty program! Earn reward points, get the highest cashback deals, and redeem rewards on daily shopping. Start earning today!"
  );

  const navigate = useNavigate();
  const { authToken } = useAuth();
  const [homeData, setHomeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const pageRef = useRef(null);
  const brandsRail = useDragScroll();
  const offersRail = useDragScroll();

  useEffect(() => {
    let live = true;

    const fetchHomeData = async () => {
      // Don't show full loading spinner for background refetches
      if (!homeData) setIsLoading(true);
      try {
        const data = await getPublicHome();
        if (authToken) {
          try {
            const s = await getUserHomeStats(authToken);
            if (s && live)
              data.stats = {
                productsOwned: s.productsOwned || 0,
                productsReported: s.productsReported || 0,
                walletEarned: s.balance ?? s.totalEarned ?? 0,
              };
          } catch (_) { }
        }
        if (live) setHomeData(data);
      } catch (_) {
      } finally {
        if (live) setIsLoading(false);
      }
    };

    fetchHomeData();

    // Refresh when app becomes visible or regains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchHomeData();
      }
    };
    const handleFocus = () => fetchHomeData();

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    // Continuous polling every 60 seconds (reduced frequency for performance)
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchHomeData();
      }
    }, 60000);

    return () => {
      live = false;
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      clearInterval(intervalId);
    };
  }, [authToken]);

  /* -- GSAP Animations -- */
  useEffect(() => {
    if (isLoading || !pageRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".hero-carousel", {
        y: 35,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      });
      gsap.from(".scan-cta", {
        scale: 0.7,
        opacity: 0,
        duration: 0.6,
        ease: "elastic.out(1,0.75)",
        delay: 0.3,
      });
      gsap.to(".scan-icon-breathe", {
        scale: 1.08,
        duration: 2.1,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        force3D: true,
      });
      // Quick actions animation removed for alignment reliability
      // Brand items and offer cards animations removed for visibility reliability
      gsap.to(".offer-shine", {
        x: "400%",
        duration: 3,
        repeat: -1,
        repeatDelay: 5,
        ease: "power1.inOut",
        stagger: 0.8,
        force3D: true,
      });
    }, pageRef);
    return () => ctx.revert();
  }, [isLoading]);

  const brands = homeData?.brands || [];
  const banners = homeData?.banners?.length ? homeData.banners : heroBanners;
  const stats = homeData?.stats || {};
  const topOffers = homeData?.topOffers || [];
  const getOfferDestination = (offer) => {
    if (offer?.targetType === "brand" || !offer?.productId) {
      return offer?.brandId ? `/brand-details/${offer.brandId}` : "/store";
    }

    return `/product-info/${offer.productId}`;
  };
  const fmtRound = (v) => {
    const num = Number(v);
    if (!Number.isFinite(num) || num === 0) return "₹0";
    const abs = Math.abs(num);
    const sign = num < 0 ? "-" : "";
    if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
    if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`;
  };
  const fmtCash = fmtRound;

  const statItems = [
    {
      label: "Owned",
      value: stats.productsOwned || 0,
      icon: Package,
      color: "#059669",
      bg: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
      lightBg: "rgba(5,150,105,0.08)",
    },
    {
      label: "Wallet",
      value: fmtCash(stats.walletEarned),
      icon: Wallet,
      color: "#f59e0b",
      bg: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
      lightBg: "rgba(245,158,11,0.08)",
    },
  ];

  return (
    <div
      ref={pageRef}
      className="min-h-screen font-sans pb-28 transition-colors duration-300 bg-primary/10 dark:bg-zinc-950"
    >
      <div className="px-4 pt-4 space-y-4">
        <h1 className="px-1 text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
          Assured Rewards: scan genuine products & get instant cashback
        </h1>

        {/* --- 1  HERO CAROUSEL --- */}
        {isLoading ? (
          <div className="w-full h-[280px] sm:h-[270px] rounded-3xl bg-white border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800 animate-pulse shadow-sm" />
        ) : (
          <HeroCarousel items={banners} />
        )}

        {/* --- 2  SCAN CTA --- */}
        {isLoading ? (
          <div className="w-full h-[120px] rounded-3xl bg-white border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800 animate-pulse shadow-sm" />
        ) : (
          <Link to="/scan" className="scan-cta block">
            <div
              className="relative rounded-3xl p-6 overflow-hidden active:scale-[0.97] transition-transform"
              style={{
                background: "linear-gradient(135deg,#0d1f12,#143d1f,#1a5c2c)",
                boxShadow: "0 12px 36px -8px rgba(5,150,105,0.2)",
              }}
            >
              <div
                className="scan-ring-1 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full pointer-events-none"
                style={{ border: "1px solid rgba(5,150,105,0.1)" }}
              />
              <div
                className="scan-ring-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full pointer-events-none"
                style={{ border: "1px solid rgba(5,150,105,0.05)" }}
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-3xl pointer-events-none"
                style={{ background: "rgba(5,150,105,0.15)" }}
              />

              <div className="relative z-10 flex items-center gap-5">
                <div className="shrink-0">
                  <div className="scan-icon-breathe relative w-[72px] h-[72px]">
                    <div
                      className="absolute inset-0 rounded-2xl blur-sm"
                      style={{ background: "rgba(5,150,105,0.2)" }}
                    />
                    <div
                      className="relative w-full h-full rounded-2xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg,#059669,#5a9620)",
                        boxShadow: "0 8px 20px rgba(5,150,105,0.3)",
                      }}
                    >
                      <QrCode
                        size={34}
                        className="text-white"
                        strokeWidth={1.8}
                      />
                    </div>
                    <div
                      className="absolute -top-1 -left-1 w-2 h-2 rounded-full"
                      style={{ background: "#059669", opacity: 0.6 }}
                    />
                    <div
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                      style={{ background: "#059669", opacity: 0.6 }}
                    />
                    <div
                      className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full"
                      style={{ background: "#059669", opacity: 0.6 }}
                    />
                    <div
                      className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full"
                      style={{ background: "#059669", opacity: 0.6 }}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[22px] font-bold text-white tracking-tight leading-tight">
                    Scan & Earn
                  </h2>
                  <p
                    className="text-[12px] font-medium mt-0.5 flex items-center gap-1"
                    style={{ color: "rgba(5,150,105,0.8)" }}
                  >
                    <Zap size={11} className="text-yellow-400" /> Instant
                    cashback on every scan
                  </p>
                  <div
                    className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold px-4 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer"
                    style={{
                      boxShadow: "0 4px 12px rgba(5,150,105,0.25)",
                    }}
                  >
                    Scan Now <ArrowRight size={12} />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* --- 3 – QUICK ACTIONS --- */}
        <div className="quick-actions grid grid-cols-4 gap-3">
          {isLoading ? (
            Array(4)
              .fill(0)
              .map((_, i) => (
                <div
                  key={`skeleton-qa-${i}`}
                  className="flex flex-col items-center text-center gap-2 p-2.5 rounded-2xl bg-white border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm animate-pulse"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-zinc-800 shrink-0" />
                  <div className="w-10 h-3 rounded-full bg-gray-200 dark:bg-zinc-800 mt-1" />
                </div>
              ))
          ) : (
            quickActions.map((item, i) => (
              <Link
                key={item.to || `qa-${i}`}
                to={item.to}
                className="quick-action active:scale-[0.95] transition-transform"
                style={{ opacity: 1, visibility: "visible", transform: "none" }}
              >
                <div className="flex flex-col items-center text-center gap-2 p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 shadow-sm">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: item.gradient,
                      boxShadow: `0 4px 12px ${item.shadow}`,
                    }}
                  >
                    <item.icon size={18} className="text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-900 dark:text-gray-100 truncate w-full">
                    {item.label}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* --- 4 – YOUR ACTIVITY STATS --- */}
        <div className="home-activity-section space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-600 shadow-lg shadow-emerald-500/20">
                <Crown size={16} className="text-white" />
              </div>
              <h2 className="text-[15px] font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                Your Activity
              </h2>
            </div>
            <Link
              to="/history"
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
            >
              View All <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {statItems.map((s, i) => (
              <div
                key={s.label || `stat-${i}`}
                className="group relative overflow-hidden p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm flex items-center justify-between"
              >
                <div className="flex flex-col gap-1 z-10">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    {s.label}
                  </span>
                  {isLoading ? (
                    <div className="h-6 w-12 bg-gray-200 dark:bg-zinc-800 animate-pulse rounded-md" />
                  ) : (
                    <span
                      className="text-[18px] font-semibold text-zinc-800 dark:text-zinc-100 leading-none mt-0.5"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {s.value}
                    </span>
                  )}
                </div>

                <div
                  className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 z-10"
                  style={{ background: s.lightBg }}
                >
                  <s.icon size={20} style={{ color: s.color }} />
                </div>

                {/* Subtle floating glow orb in the background */}
                <div
                  className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full blur-2xl opacity-30 dark:opacity-20"
                  style={{ background: s.bg }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* --- 5  PARTNER BRANDS --- */}
        {(isLoading || brands.length > 0) && (
        <div className="brands-rail">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(5,150,105,0.1)" }}
              >
                <Star size={10} style={{ color: "#059669" }} />
              </div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                Partner Brands
              </span>
            </div>
            <Link
              to="/brands"
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
            >
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="relative -mx-4">
          <div
            ref={brandsRail.ref}
            {...brandsRail.dragProps}
            className="flex cursor-grab select-none gap-4 overflow-x-auto pb-3 pt-1 no-scrollbar px-4 snap-x scroll-smooth"
          >
            {isLoading ? (
              Array(6)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1.5 shrink-0 snap-center"
                  >
                    <div className="w-[64px] h-[64px] rounded-[18px] bg-white border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm animate-pulse" />
                    <div className="w-10 h-2.5 rounded-full bg-gray-200 dark:bg-zinc-800 animate-pulse mt-0.5" />
                  </div>
                ))
            ) : (
              brands.map((b, idx) => (
                <Link
                  key={b.id ? `brand-${b.id}` : `brand-${b.name || idx}`}
                  to={`/brand-details/${b.id || ""}`}
                  className="brand-item flex flex-col items-center gap-1.5 shrink-0 snap-center group"
                >
                  <div className="w-[64px] h-[64px] rounded-[18px] bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_8px_16px_rgba(5,150,105,0.1)]">
                    <img
                      src={resolvePublicAssetUrl(b.logoUrl || b.logo)}
                      alt={b.name}
                      className="w-full h-full object-contain p-2.5 transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.parentElement.innerHTML = `<span style="font-size:22px;font-weight:600;color:#059669;font-family:system-ui">${b.name?.charAt(0)?.toUpperCase() || "B"}</span>`;
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 truncate w-[68px] text-center transition-colors group-hover:text-gray-900 dark:group-hover:text-emerald-50 mt-0.5">
                    {b.name}
                  </span>
                </Link>
              ))
            )}
          </div>
          </div>
        </div>
        )}

        {/* --- 6. TOP OFFERS --- */}
        {(isLoading || topOffers.length > 0) && (
        <div className="offers-rail relative py-3 my-1">
          {/* Subtle full-bleed background */}
          <div className="absolute inset-0 -mx-4 bg-gradient-to-b from-emerald-50/50 to-transparent dark:from-emerald-900/5 dark:to-transparent -z-10 pointer-events-none" />

          <div className="flex items-center gap-2 mb-4 px-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shadow-sm"
              style={{ background: "rgba(5,150,105,0.12)" }}
            >
              <TrendingUp
                size={14}
                className="text-emerald-700 dark:text-emerald-400"
              />
            </div>
            <span
              className="text-[13px] font-bold text-emerald-950 dark:text-emerald-50 uppercase"
              style={{ letterSpacing: "0.15em" }}
            >
              Top Offers
            </span>
          </div>
          <div className="relative -mx-4">
          <div
            ref={offersRail.ref}
            {...offersRail.dragProps}
            className="flex cursor-grab select-none gap-3 overflow-x-auto pb-5 no-scrollbar snap-x snap-mandatory px-4 items-center scroll-smooth"
          >
            {isLoading ? (
              Array(4)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={`skeleton-offer-${i}`}
                    className="offer-card w-[130px] h-[165px] rounded-[24px] bg-white border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm animate-pulse snap-center shrink-0"
                  />
                ))
            ) : (
              topOffers.map((offer, i) => {
                const amountText = fmtRound(offer.maxCashback);

                return (
                  <div
                    key={offer.id ? `top-offer-${offer.id}-${i}` : `top-offer-idx-${i}`}
                    onClick={() => navigate(getOfferDestination(offer))}
                    className="offer-card group w-[130px] h-[165px] rounded-[24px] p-0 flex flex-col justify-between relative overflow-hidden snap-center active:scale-[0.96] transition-all shrink-0 cursor-pointer shadow-md bg-white border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800"
                  >
                    {/* Inner Content Container */}
                    <div className="w-full h-full flex flex-col relative z-10 overflow-hidden text-center justify-between rounded-[24px]">
                      {/* Top Filled Section */}
                      <div className="w-full flex-1 pt-3 pb-2 px-2 flex flex-col items-center justify-center relative bg-linear-to-b from-emerald-50/80 to-emerald-50/20 dark:from-emerald-900/20 dark:to-zinc-900/10">
                        {/* Subtle inner top glow */}
                        <div
                          className="absolute -top-10 w-24 h-24 rounded-full blur-[24px] opacity-40 pointer-events-none"
                          style={{ background: "#34d399" }}
                        />

                        {/* Logo Squircle */}
                        <div className="w-[38px] h-[38px] bg-white dark:bg-zinc-800 rounded-[12px] flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative transition-transform group-hover:scale-105 duration-300 border border-gray-100 dark:border-zinc-700 mb-1.5">
                          <img
                            src={resolvePublicAssetUrl(offer.logoUrl)}
                            alt=""
                            className="w-full h-full object-contain p-1 relative z-10 bg-white dark:bg-zinc-800 rounded-[12px]"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center z-0">
                            <span className="text-[10px] font-bold text-gray-400">
                              {offer.name
                                ? offer.name.slice(0, 3).toUpperCase()
                                : "N/A"}
                            </span>
                          </div>
                        </div>

                        {/* Get Upto Amount */}
                        <div className="flex flex-col z-20 items-center">
                          {offer.maxCashback > 0 ? (
                            <>
                              <span className="text-[9px] font-bold text-gray-500 dark:text-white/60 mb-0.5">
                                Get Upto
                              </span>
                              <span className="text-[20px] font-semibold text-emerald-700 dark:text-emerald-400 leading-none">
                                {amountText}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-[9px] font-bold text-gray-500 dark:text-white/60 mb-0.5">
                                Assured
                              </span>
                              <span className="text-[16px] font-semibold text-emerald-700 dark:text-emerald-400 leading-none mt-1">
                                Rewards
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Bottom Section */}
                      <div className="w-full pt-1.5 pb-2.5 px-2.5 flex flex-col gap-1.5 items-center z-20 bg-white dark:bg-zinc-900 shrink-0">
                        <span className="text-[10px] font-bold text-gray-600 dark:text-white/90 tracking-tight truncate w-full px-1">
                          {offer.name}
                        </span>

                        <button className="w-full py-1.5 rounded-[12px] flex items-center justify-center gap-1 font-bold text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm bg-gray-900 text-white dark:bg-white dark:text-gray-900">
                          <svg
                            className="w-2.5 h-2.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2Z"
                              fill="currentColor"
                            />
                          </svg>
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          </div>
        </div>
        )}

        {/* --- 7.5 PRODUCT REPORT --- */}
        <div className="mb-5">
          <Link
            to="/product-report"
            className="group relative overflow-hidden rounded-[20px] bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 active:scale-[0.98] transition-all flex items-center p-3.5 mx-0.5"
            style={{ boxShadow: "0 8px 16px -6px rgba(0,0,0,0.05)" }}
          >
            <div
              className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
              style={{ background: "rgba(59,130,246,0.08)" }}
            >
              <Shield
                size={20}
                style={{ color: "#3b82f6" }}
                strokeWidth={2.5}
              />
            </div>
            <div className="ml-3.5 flex-1">
              <h3 className="text-[14px] font-[500] text-zinc-950 dark:text-white leading-tight tracking-tight">
                Product Report
              </h3>
              <p className="text-[10px] font-medium text-gray-500 mt-0.5">
                Report fake or unauthorized items
              </p>
            </div>
            <div className="w-7 h-7 rounded-full bg-gray-50 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <ChevronRight
                size={14}
                className="text-gray-400 group-hover:text-blue-500 transition-colors"
              />
            </div>
          </Link>
        </div>

        {/* --- 8 � VIDEO SPOTLIGHT --- */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-5 h-5 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(5,150,105,0.1)" }}
            >
              <Sparkles size={10} style={{ color: "#059669" }} />
            </div>
            <span
              className="text-[11px] font-bold text-gray-500 uppercase"
              style={{ letterSpacing: "0.12em" }}
            >
              Brand Spotlight
            </span>
          </div>
          <VideoSpotlight />
        </div>

        {/* --- 9 � HOW IT WORKS --- */}
        <div className="mb-6">
          <HowItWorks />
        </div>

        {/* --- 10  ABOUT / SEO CONTENT --- */}
        <HomeSeoContent />
      </div>
    </div>
  );
};

export default Home;

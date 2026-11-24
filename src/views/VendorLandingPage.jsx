"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import {
  ArrowRight,
  QrCode,
  RefreshCw,
  BarChart3,
  Zap,
  TrendingUp,
  CheckCircle2,
  Settings2,
  Wallet,
  BarChart2,
  PieChart,
  Activity,
  CreditCard,
  Quote,
  ChevronDown,
  ChevronUp,
  HelpCircle, X,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
  useTransform,
} from "framer-motion";
import VendorNavbar from "../components/VendorNavbar";
// import whyCashbackHero from "../assets/why-cashback-hero.png";
import { useSEO } from "../hooks/useSEO";
const DEMO_VIDEO_URL = "https://pub-0cdc1d08d00648b48a3ee29c444168cb.r2.dev/video/ASSURED%20REWARDS.mp4";

const ScrollContent = () => {
  const [idx, setIdx] = React.useState(0);

  const states = [
    {
      number: "1",
      label: "Set Rewards",
      sub: "Create your campaign and decide how much rewards you want to offer.",
      color: "#10b981",
      tag: "STEP 01",
    },
    {
      number: "2",
      label: "Customer Scans",
      sub: "Customer purchases, scans the QR code, and receives instant cashback.",
      color: "#3b82f6",
      tag: "STEP 02",
    },
    {
      number: "3",
      label: "Rewards Credited",
      sub: "Rewards are credited instantly, giving them a strong reason to return.",
      color: "#a855f7",
      tag: "STEP 03",
    },
  ];

  const containerRef = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.33) {
      if (idx !== 0) setIdx(0);
    } else if (latest < 0.66) {
      if (idx !== 1) setIdx(1);
    } else {
      if (idx !== 2) setIdx(2);
    }
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[112vh] md:h-[250vh] bg-transparent"
    >
      <div className="sticky top-[8vh] md:top-[10vh] w-full flex flex-col items-center justify-center">
        {/* Section Header inside sticky container */}
        <div className="text-center mb-4 md:mb-8 w-full">
          <h2 className="text-4xl sm:text-5xl md:text-5xl font-black tracking-tight text-slate-900 uppercase leading-none">
            HOW IT <span className="text-emerald-600">WORKS.</span>
          </h2>
          <p className="text-sm sm:text-base md:text-xl text-slate-500 font-medium mt-3 md:mt-4">
            Simple for you. Seamless for your customers.
          </p>
        </div>

        {/* Connection Line from Top */}
        <div className="h-4 md:h-6 w-[2px] bg-linear-to-b from-slate-200 via-slate-300 to-transparent dashed-line" />

        <div className="relative max-w-3xl mx-auto w-full flex items-center justify-center pt-0 md:pt-2 min-h-[310px] sm:min-h-[340px] md:min-h-[300px] overflow-hidden md:overflow-visible">
          {/* The Arc SVG */}
          <div className="absolute inset-0 -top-4 md:top-0 flex items-center justify-center pointer-events-none">
            <svg
              viewBox="90 40 820 420"
              className="min-w-[360px] sm:min-w-[460px] md:min-w-0 w-[118%] sm:w-[105%] md:w-[90%] max-w-[700px] h-auto overflow-visible opacity-45 md:opacity-100"
            >
              <defs>
                <filter
                  id="arc-glow"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feGaussianBlur stdDeviation="12" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Base Dashed Arc */}
              <path
                d="M 100,450 A 400,400 0 0 1 900,450"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="4"
                strokeDasharray="8 16"
                strokeLinecap="round"
                className="opacity-70"
              />

              {/* Animated Progress Arc */}
              <motion.path
                d="M 100,450 A 400,400 0 0 1 900,450"
                fill="none"
                stroke={states[idx].color}
                strokeWidth="8"
                strokeLinecap="round"
                filter="url(#arc-glow)"
                style={{ pathLength: scrollYProgress }}
              />
            </svg>
          </div>

          {/* Central Content */}
          <div className="relative z-10 flex flex-col items-center justify-center mt-16 sm:mt-14 md:mt-24 px-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.1, filter: "blur(8px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex flex-col items-center text-center"
              >
                <div
                  className="text-[56px] sm:text-[70px] md:text-[100px] font-black tracking-tighter leading-none mb-3 md:mb-4 transition-colors duration-500"
                  style={{
                    color: states[idx].color,
                    filter: `drop-shadow(0px 8px 16px ${states[idx].color}45)`,
                  }}
                >
                  {states[idx].number}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 md:mb-4 font-black text-[10px] uppercase tracking-widest border"
                    style={{
                      color: states[idx].color,
                      backgroundColor: `${states[idx].color}10`,
                      borderColor: `${states[idx].color}30`,
                    }}
                  >
                    {states[idx].tag}
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2 md:mb-3">
                    {states[idx].label}
                  </h3>
                  <p className="text-sm sm:text-base md:text-lg text-slate-500 font-medium max-w-[300px] sm:max-w-sm mx-auto leading-relaxed px-0 sm:px-6">
                    {states[idx].sub}
                  </p>
                </motion.div>

                {/* Pagination Dots */}
                <div className="flex justify-center gap-4 mt-10 sm:mt-12 md:mt-16 pointer-events-auto">
                  {states.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIdx(i)}
                      className="group relative flex items-center justify-center w-9 h-9 md:w-10 md:h-10 focus:outline-none"
                    >
                      <motion.div
                        animate={{
                          scale: i === idx ? 1.5 : 1,
                          backgroundColor:
                            i === idx ? states[idx].color : "#e2e8f0",
                        }}
                        className="w-2.5 h-2.5 rounded-full"
                      />
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

const Button = ({
  children,
  className,
  variant = "default",
  size = "default",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
  const variants = {
    default: "bg-emerald-600 text-white hover:bg-emerald-700",
    outline:
      "border border-input hover:bg-emerald-50 hover:text-emerald-700 text-emerald-600",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "underline-offset-4 hover:underline text-primary",
  };
  const sizes = {
    default: "h-10 py-2 px-4",
    sm: "h-9 px-3 rounded-md",
    lg: "h-12 px-8 rounded-md text-lg",
    icon: "h-10 w-10",
  };

  const variantStyles = variants[variant] || variants.default;
  const sizeStyles = sizes[size] || sizes.default;

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const VendorLandingPage = () => {
  useSEO(
    "Loyalty Program for Small Businesses | Vendor Portal | Assured Rewards",
    "Grow your store with our loyalty program for small businesses. Partner with Assured Rewards to offer loyalty promotions and reward loyal customers."
  );

  const { scrollY } = useScroll();
  const heroImageY = useTransform(scrollY, [0, 800], [-50, 100]);

  const [hoveredLogo, setHoveredLogo] = useState(null);
  const [isRupee, setIsRupee] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const navigate = useNavigate();
  const APP_NAME = "Assured Rewards";

  useEffect(() => {
    if (!isDemoOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsDemoOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isDemoOpen]);

  useEffect(() => {
    const scrollToHash = () => {
      const sectionId = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!sectionId) return;
      window.requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      });
    };

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  const logos = [
    "FMCG",
    "Cosmetics",
    "Electronics",
    "Electrical",
    "Ply Board & Laminates",
    "Electric Appliances",
    "Paint Industry",
    "Petro Products",
    "Clothing / Garments",
    "Wellness products",
    "Confectionery",
    "Dairy Products",
    "Cattle Feed",
    "Bathroom / Kitchen Fittings",
    "Auto Spare Parts",
    "Aromatics Industry",
  ];

  const brandImages = Array.from({ length: 12 }, (_, i) => i + 1);

  const benefits = [
    {
      icon: QrCode,
      title: "Zero Friction",
      description:
        "Every unique QR confirms a genuine product and credits cashback instantly.",
    },
    {
      icon: RefreshCw,
      title: "Automatic Retention",
      description:
        "Set campaign budgets and let expiring cashback phrases prompt repeat visits.",
    },
    {
      icon: BarChart3,
      title: "Real Insights",
      description: "Know who your best customers are instantly.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Set Cashback",
      description:
        "Create your campaign and decide how much cashback you want to offer.",
      icon: Settings2,
      color: "emerald",
    },
    {
      number: "02",
      title: "Customer Scans",
      description:
        "Customer purchases, scans the QR code, and receives instant cashback.",
      icon: QrCode,
      color: "blue",
    },
    {
      number: "03",
      title: "Cashback Credited",
      description:
        "Cashback is credited instantly, giving them a strong reason to return.",
      icon: Wallet,
      color: "purple",
    },
  ];

  const stats = [
    {
      number: "30%",
      label: "Increase in Repeat Visits",
    },
    {
      number: "2x",
      label: "Higher Customer Lifetime Value",
    },
    {
      number: "0",
      label: "Tech Hardware Required",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-admin-body text-base">
      <VendorNavbar />
      <AnimatePresence>
        {isDemoOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsDemoOpen(false);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Assured Rewards product demo"
              className="relative w-full max-w-6xl"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <video
                className="block h-auto max-h-[calc(100dvh-1.5rem)] w-full rounded-[28px] bg-black object-contain"
                controls
                autoPlay
                playsInline
                preload="metadata"
              >
                <source src={DEMO_VIDEO_URL} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <button
                type="button"
                onClick={() => setIsDemoOpen(false)}
                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Close video"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="relative pt-20 pb-20 overflow-hidden bg-white">
        {/* Advanced Background Design */}
        <div className="absolute inset-0 z-0">
          {/* Subtle Grid Pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-8 items-center">
            {/* Left Column: Content */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              {/* Main Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="text-[42px] sm:text-5xl md:text-7xl font-black text-slate-900 leading-[1.08] tracking-tight mb-7 sm:mb-8 font-admin-heading"
              >
                Grow Your <br />
                Business <br />
                <span className="text-emerald-600">
                  with Every <br />
                  Customer Visit
                </span>
              </motion.h1>

              {/* Subheading */}
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.1,
                }}
                className="text-base sm:text-lg md:text-xl text-slate-500 max-w-xl mb-10 sm:mb-12 leading-relaxed font-medium"
              >
                Launch your own customer loyalty program with QR-based
                rewards. Scale your business effortlessly — without apps, cards,
                or complicated systems.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.2,
                }}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5 mb-10 sm:mb-12"
              >
                <Button
                  size="xl"
                  className="bg-slate-900 hover:bg-black text-white px-10 h-14 w-full sm:w-auto rounded-xl text-base font-bold shadow-2xl shadow-slate-900/20 transition-all hover:scale-105 active:scale-95 group"
                  onClick={() => navigate("/brand-registration")}
                >
                  Start Free
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  onClick={() => setIsDemoOpen(true)}
                  aria-haspopup="dialog"
                  className="bg-white/40 backdrop-blur-md border-slate-200 text-slate-700 px-10 h-14 w-full sm:w-auto rounded-xl text-base font-bold hover:bg-white/60 transition-all"
                >
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-[10px] mr-3">
                    ▶
                  </span>
                  Watch Demo
                </Button>
              </motion.div>

              {/* Trusted Details */}
              <motion.div
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 1, delay: 0.4 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-5 sm:gap-8 text-xs text-slate-400 font-bold uppercase tracking-widest"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  14 day free trial
                </div>
              </motion.div>
            </div>

            {/* Right Column: Premium Image Asset */}
            <div className="relative hidden lg:flex justify-center lg:justify-end items-center h-full lg:pl-8 lg:pr-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{
                  duration: 1.2,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.3,
                }}
                style={{ y: heroImageY }}
                className="relative z-10 w-full max-w-[340px] sm:max-w-[440px] lg:max-w-[90%] flex items-center justify-center"
              >
                <img
                  src="/Gif.webp"
                  alt="Dashboard Animation"
                  className="w-full h-auto object-contain mix-blend-multiply"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Improved Marquee Section */}
      <section className="py-8 sm:py-12 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-5 sm:mb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
              Trusted by 500+ Businesses
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-admin-heading">
              Powering Loyalty Across Industries
            </h2>
            <p className="text-base sm:text-lg text-slate-500 max-w-3xl mx-auto font-medium">
              From local favorites to national brands, we help businesses grow with data-driven rewards.
            </p>
          </motion.div>
        </div>

        <div className="relative">
          {/* Refined Gradient Overlays */}
          <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

          <div className="flex flex-col gap-4 sm:gap-8">
            {/* Marquee Row 1 */}
            <div className="flex overflow-hidden group">
              <div className="animate-marquee whitespace-nowrap flex items-center gap-4 sm:gap-18 px-3 sm:px-6 py-2 sm:py-4">
                {[...logos, ...logos].map((logo, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-center px-5 py-3 sm:px-10 sm:py-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-100 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500 group/tag cursor-default"
                  >
                    <span className="text-[11px] sm:text-sm font-black text-slate-400 uppercase tracking-widest group-hover/tag:text-emerald-600 transition-colors">
                      {logo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* Marquee Row 2 (Reverse) */}
            <div className="flex overflow-hidden group">
              <div className="animate-marquee-reverse whitespace-nowrap flex items-center gap-4 sm:gap-8 py-2 sm:py-4 min-h-[88px] sm:min-h-[160px]">
                {[...brandImages, ...brandImages, ...brandImages].map(
                  (num, idx) => {
                    const isWhiteLogo = [5, 6, 10, 11].includes(num);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-center min-w-[150px] sm:min-w-[300px]"
                      >
                        <img
                          src={`/${num}.webp`}
                          alt={`Brand ${num}`}
                          className={`w-[150px] h-[75px] sm:w-[320px] sm:h-[160px] object-contain transition-all duration-500 ${isWhiteLogo ? "brightness-0 opacity-80" : "opacity-100"}`}
                          onError={(e) => {
                            const currentSrc = e.target.src;
                            if (currentSrc.includes("brand/")) {
                              e.target.src = `${num}.webp`;
                            }
                          }}
                        />
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section - Clean 2-col design */}
      <section className="py-20 md:py-28 bg-white relative overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Problem */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-10"
            >
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight">
                  Still struggling to get{" "}
                  <span className="block">repeat customers?</span>
                </h2>
              </div>

              <div className="space-y-6">
                {[
                  "Customers visit once and don't return",
                  "Discounts reduce margins but don't build loyalty",
                  "Hard to track which customers are coming back",
                ].map((pain, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{
                      duration: 0.8,
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.1 + i * 0.1,
                    }}
                    className="flex items-start gap-4 group"
                  >
                    <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-rose-400" />
                    </div>
                    <p className="text-base md:text-lg text-slate-500 font-medium leading-relaxed group-hover:text-slate-700 transition-colors">
                      {pain}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right: Solution Card */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            >
              <div className="relative bg-emerald-600 rounded-[2.5rem] p-8 md:p-10 overflow-hidden shadow-2xl shadow-emerald-600/25">
                {/* Subtle dot mesh overlay */}
                <div
                  className="absolute inset-0 opacity-[0.08] pointer-events-none"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)",
                    backgroundSize: "20px 20px",
                  }}
                />
                {/* Glow blob */}
                <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-400/30 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-8">
                  <h3 className="text-2xl md:text-3xl font-black text-white leading-snug">
                    Here's a smarter way to retain customers.
                  </h3>

                  <div className="space-y-5">
                    {[
                      "Reward every purchase with instant rewards",
                      "Easily create and manage campaigns from one dashboard",
                      "Track customer activity and repeat visits in real time",
                    ].map((benefit, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.8,
                          ease: [0.16, 1, 0.3, 1],
                          delay: 0.4 + i * 0.1,
                        }}
                        className="flex items-start gap-4"
                      >
                        <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-xl bg-emerald-500/50 border border-emerald-400/40 flex items-center justify-center shadow-inner">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-base font-semibold text-white/90 leading-relaxed">
                          {benefit}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Redesigned Vendor Advantage Section (Premium Content Update) */}
      <section id="features" className="scroll-mt-24 py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Centered Header & Quote */}
          <div className="text-center max-w-4xl mx-auto mb-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-[0.25em]">
                Vendor Advantage
              </div>
              <h3 className="text-5xl md:text-5xl font-black tracking-tight font-admin-heading bg-linear-to-b from-slate-900 to-slate-500 bg-clip-text text-transparent">
                WHY VENDORS LOVE <br className="hidden md:block" />
                <span className="text-emerald-600 uppercase">
                  Assured Rewards.
                </span>
              </h3>

              <div className="relative">
                <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
                  Simple to run. Easy to manage.{" "}
                  <br className="hidden md:block" />
                  Built to increase repeat customers.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Metric Stats Grid (3 cards to match content) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                label: "Easy Setup",
                value: "3 MIN",
                desc: "Create and launch rewards campaigns in minutes without any technical complexity and knowledge.",
                icon: Zap,
                highlight: false,
              },
              {
                label: "Repeat Visits",
                value: "80%",
                desc: "Rewards encourage customers to return and purchase again consistently.",
                icon: RefreshCw,
                highlight: true,
              },
              {
                label: "Real-time Tracking",
                value: "LIVE",
                desc: "Monitor scans, rewards, and customer behavior from one simple dashboard.",
                icon: Activity,
                highlight: false,
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1],
                  delay: i * 0.15,
                }}
                className={`relative group p-8 lg:p-10 rounded-[2.5rem] transition-all duration-700 overflow-hidden ${
                  stat.highlight
                    ? "bg-emerald-600 text-white shadow-2xl shadow-emerald-500/30"
                    : "bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-xl"
                }`}
              >
                {/* Decorative Mesh background for highlighted card */}
                {stat.highlight && (
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)",
                        backgroundSize: "15px 15px",
                      }}
                    />
                  </div>
                )}

                <div className="relative z-10 h-full flex flex-col justify-start gap-6 min-h-[120px]">
                  <div className="flex justify-start items-start">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 ${
                        stat.highlight
                          ? "bg-white/20 text-white"
                          : "bg-white shadow-sm text-emerald-600"
                      }`}
                    >
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p
                      className={`text-[15px] font-black uppercase tracking-widest ${stat.highlight ? "text-emerald-100" : "text-slate-900"}`}
                    >
                      {stat.label}
                    </p>
                    <p
                      className={`text-[16px] font-medium leading-relaxed ${stat.highlight ? "text-emerald-50/70" : "text-slate-400"}`}
                    >
                      {stat.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Multi-State Arc Metric Section */}
      <section
        className="pt-14 pb-0 md:pt-20 md:pb-24 bg-white relative"
        id="how-it-works"
      >
        {/* Subtle Background Elements */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, #059669 1px, transparent 0)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          {/* The Arc & Dynamic Content */}
          <div className="relative max-w-5xl mx-auto">
            <ScrollContent />
          </div>
        </div>
      </section>

      {/* Improved Impact Section */}
      <section
        id="resources"
        className="scroll-mt-24 pt-16 pb-8 md:py-32 bg-white relative overflow-hidden"
      >
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center lg:text-left">
          <div className="grid lg:grid-cols-4 gap-16 items-center">
            <div className="lg:col-span-1 space-y-6">
              <h2 className="text-sm font-black text-emerald-600 uppercase tracking-[0.4em]">
                Real Business Impact
              </h2>
              <p className="text-4xl font-black text-slate-900 tracking-tight leading-tight font-admin-heading">
                Proven results that drive{" "}
                <span className="text-emerald-500">sustainable growth.</span>
              </p>
              <p className="text-slate-500 font-medium leading-relaxed">
                Our platform delivers measurable improvements in customer
                retention and sales volume.
              </p>
            </div>

            <div className="lg:col-span-3 grid sm:grid-cols-3 gap-10">
              {[
                {
                  number: "30%",
                  label: "Increase in Repeat Visits",
                  sub: "Verified platform data",
                },
                {
                  number: "2X",
                  label: "Higher Customer LTV",
                  sub: "Customer lifetime value",
                },
                {
                  number: "0",
                  label: "Extra Hardware Needed",
                  sub: "Cloud-native solution",
                },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95, y: 30 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1],
                    delay: i * 0.15,
                  }}
                  className="relative bg-white border border-slate-100 rounded-[2.5rem] p-10 md:p-12 flex flex-col items-start text-left group hover:shadow-[0_20px_60px_-15px_rgba(16,185,129,0.15)] hover:-translate-y-2 transition-all duration-500 overflow-hidden"
                >
                  {/* Subtle top accent line */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Number */}
                  <div className="mb-6">
                    <span className="text-6xl md:text-7xl font-black tracking-tighter font-admin-heading text-transparent bg-clip-text bg-gradient-to-br from-emerald-600 to-emerald-400 group-hover:scale-105 transition-transform duration-500 inline-block origin-left">
                      {stat.number}
                    </span>
                  </div>

                  {/* Text */}
                  <div className="space-y-2 relative z-10">
                    <span className="block text-[15px] font-black text-slate-900 uppercase tracking-widest leading-snug font-admin-heading">
                      {stat.label}
                    </span>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      {stat.sub}
                    </span>
                  </div>

                  {/* Background flare on hover */}
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Improved Versatile Solutions Section */}
      <section
        id="solutions"
        className="scroll-mt-24 pt-8 pb-16 md:py-24 bg-white relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-10 md:mb-16 max-w-4xl text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-[0.3em] mb-8">
                Targeted Solutions
              </div>
              <h3 className="text-5xl md:text-5xl font-black text-slate-900 tracking-tight font-admin-heading mb-10 leading-[1.05]">
                Built for businesses <br />
                <span className="text-emerald-600">that want to scale.</span>
              </h3>
              <p className="text-xl text-slate-500 font-medium max-w-2xl leading-relaxed">
                Whether you're a local cafe or a national brand, we give you the
                tools to drive more sales and build lasting customer loyalty.
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                title: "For Retail Stores",
                desc: "Turn everyday purchases into instant cashback rewards and bring customers back regularly.",
                icon: QrCode,
                accent: "emerald",
              },
              {
                title: "For Brands",
                desc: "Add QR codes to your products and offer cashback on purchase to drive engagement and repeat buying.",
                icon: Zap,
                accent: "blue",
              },
              {
                title: "For Growing Businesses",
                desc: "Manage multiple campaigns, track performance, and scale your rewards system with ease.",
                icon: TrendingUp,
                accent: "purple",
              },
            ].map((solution, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1],
                  delay: i * 0.15,
                }}
                className="group bg-slate-50/50 rounded-[3.5rem] p-12 border border-slate-100 hover:bg-white hover:shadow-[0_40px_100px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-2 flex flex-col items-start"
              >
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-12 group-hover:scale-110 transition-transform duration-300 ${
                    solution.accent === "emerald"
                      ? "bg-emerald-100/50"
                      : solution.accent === "blue"
                        ? "bg-blue-100/50"
                        : "bg-purple-100/50"
                  }`}
                >
                  <solution.icon
                    className={`w-8 h-8 ${
                      solution.accent === "emerald"
                        ? "text-emerald-600"
                        : solution.accent === "blue"
                          ? "text-blue-600"
                          : "text-purple-600"
                    }`}
                  />
                </div>
                <h4 className="text-2xl font-black text-slate-900 mb-6 tracking-tight group-hover:text-emerald-700 transition-colors duration-300">
                  {solution.title}
                </h4>
                <p className="text-slate-500 leading-relaxed font-medium text-lg">
                  {solution.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Cashback Works Section */}
      {/* Redesigned Why Cashback Works Section (White Aesthetic) */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Subtle Embossed Grid Background */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none grid grid-cols-6 md:grid-cols-12 gap-4 p-4">
          {Array.from({ length: 48 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-[2rem] border-slate-100 border-2 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.02),inset_-4px_-4px_8px_rgba(255,255,255,0.8)]"
            />
          ))}
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="space-y-16">
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <h3 className="text-5xl md:text-5xl font-black text-slate-900 tracking-tighter leading-[0.95]">
                Why Rewards <br className="hidden md:block" />
                Works <span className="text-emerald-600 italic">Better.</span>
              </h3>
            </motion.div>

            <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto">
              {[
                "Instant rewards create immediate excitement",
                "Customers remember value, not just products",
                "Rewards build habit, and habit drives repeat business",
              ].map((text, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1],
                    delay: i * 0.15,
                  }}
                  className="flex items-center gap-6 group w-full bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-slate-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:bg-white hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 group-hover:scale-110 transition-all duration-300">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tight text-left">
                    {text}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Improved Testimonial Section */}
      <section className="py-32 bg-slate-50/50 relative overflow-hidden border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col items-center text-center">
          <svg
            className="w-16 h-16 opacity-20"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C15.4647 8 15.017 8.44772 15.017 9V12C15.017 12.5523 14.5693 13 14.017 13H13.017V21H14.017ZM6.017 21L6.017 18C6.017 16.8954 6.91243 16 8.017 16H11.017C11.5693 16 12.017 15.5523 12.017 15V9C12.017 8.44772 11.5693 8 11.017 8H8.017C7.46472 8 7.017 8.44772 7.017 9V12C7.017 12.5523 6.56929 13 6.017 13H5.017V21H6.017Z" />
          </svg>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl md:text-5xl font-black text-slate-900 leading-tight mb-16 max-w-4xl tracking-tight italic"
          >
            “Since using Assured Rewards, our sales increased because customers
            keep coming back to use their cashback.”
          </motion.h2>

          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-emerald-500/20">
              SO
            </div>
            <div>
              <div className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] mb-2 text-center">
                Store Owner
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
                Retail / Café Industry
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Improved Final CTA Section */}
      <section id="pricing" className="scroll-mt-24 py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="group rounded-[3rem] md:rounded-[4rem] p-8 py-16 md:p-24 text-center relative overflow-hidden border border-emerald-100 bg-emerald-50/30"
          >
            {/* Simple Light Gradients */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-white pointer-events-none" />

            {/* Glowing top border (subtle) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />

            {/* Ambient Corner Glows (Light) */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-200/40 rounded-full blur-[80px] pointer-events-none transition-all duration-1000 group-hover:bg-emerald-300/40 group-hover:scale-110" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-100/50 rounded-full blur-[80px] pointer-events-none transition-all duration-1000 group-hover:bg-teal-200/50 group-hover:scale-110" />

            {/* Minimal Grid Pattern overlay */}
            <div
              className="absolute inset-0 opacity-[0.5] pointer-events-none mix-blend-multiply"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 2px 2px, #cbd5e1 1px, transparent 0)",
                backgroundSize: "32px 32px",
              }}
            />

            <div className="relative z-10 space-y-10">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] font-admin-heading">
                Ready to Grow Your <br />
                <span className="text-emerald-600">Business?</span>
              </h2>
              <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed px-2">
                Join 500+ businesses already using cashback rewards to increase
                repeat customers and sales volume.
              </p>

              <div className="flex flex-col items-center gap-10">
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-6 md:px-12 md:py-8 text-lg md:text-xl rounded-2xl md:rounded-3xl gap-3 md:gap-4 w-full sm:w-auto shadow-2xl shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 group border border-emerald-500"
                  onClick={() => navigate("/brand-registration")}
                >
                  Register Your Store Now
                  <ArrowRight className="w-6 h-6 md:w-8 md:h-8 group-hover:translate-x-2 transition-transform" />
                </Button>

                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
                  <span>Start in Minutes</span>
                  <span>Reasonable setup cost</span>
                  <span>Free Trial Available</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Improved Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pb-12 border-b border-slate-200/50">
            <div className="space-y-4 text-center md:text-left">
              <div className="text-3xl font-black text-slate-900 tracking-tighter font-admin-heading">
                Assured<span className="text-emerald-600">Rewards</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                Powering the next generation of loyalty.
              </p>
            </div>

            <div className="flex flex-wrap justify-center md:justify-end gap-6 md:gap-10 text-[11px] font-black uppercase tracking-widest text-slate-500">
              {[
                { label: "Login", path: "/vendor-dashboard" },
                { label: "Privacy Policy", path: "/vendor/privacy" },
                { label: "Terms of Service", path: "/vendor/terms" },
                { label: "FAQs", path: "/vendor/faqs" },
                { label: "Contact", path: "/vendor/contact" },
              ].map((link, i) => (
                <a
                  key={i}
                  href={link.href || "#"}
                  onClick={(e) => {
                    if (link.path) {
                      e.preventDefault();
                      navigate(link.path);
                    }
                  }}
                  className="hover:text-emerald-600 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center sm:text-left">
              © 2026 {APP_NAME}. Built for scale.
            </div>
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
              Secure • Reliable • Seamless
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default VendorLandingPage;

"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "@/lib/router";
import { jsPDF } from "jspdf";
import { QRCodeCanvas } from "qrcode.react";
import {
  Activity,
  AlertCircle,
  ArrowLeftRight,
  BarChart2,
  BarChart3,
  AlertTriangle,
  Banknote,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Download,
  HandCoins,
  LayoutGrid,
  LogOut,
  Menu,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  PiggyBank,
  Plus,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  UserRound,
  Users,
  Upload,
  Wallet,
  Zap,
  X,
  Mail,
  Newspaper,
  Phone,
  Trash2,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  Settings,
  FileText,
  Eye,
  EyeOff,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";

import AdminSidebar from "../components/AdminSidebar";
import BalanceCard from "../components/BalanceCard";
import CashbackRewardsCard from "../components/CashbackRewardsCard";
import RecentActivitiesCard from "../components/RecentActivitiesCard";
import ServiceIconGrid from "../components/ServiceIconGrid";
import ActionButtonGroup from "../components/ActionButtonGroup";
import EarnRewardCard from "../components/EarnRewardCard";
import { useTheme } from "../components/ThemeProvider";
import VendorAccountManager from "../components/admin/VendorAccountManager";
import UserAccountManager from "../components/admin/UserAccountManager";
import { ModeToggle } from "../components/ModeToggle";
import UserWalletModal from "../components/admin/UserWalletModal";
import RedeemProductModal from "../components/admin/RedeemProductModal";
import BlogContentToolbar from "../components/admin/BlogContentToolbar";
import {
  loginWithEmail,
  getMe,
  getAdminDashboard,
  getAdminFinanceSummary,
  getAdminUsers,
  updateAdminUserStatus,
  getAdminVendors,
  getAdminBrands,
  uploadImage,
  getAdminVendorOverview,
  updateAdminVendorDetails,
  getAdminBrandOverview,
  updateAdminBrandDetails,
  updateAdminCampaignDetails,
  getAdminCampaignAnalytics,
  getAdminCampaigns,
  createAdminBrand,
  updateAdminVendorStatus,
  updateAdminBrandStatus,
  adjustVendorWalletAdmin,
  updateAdminCampaignStatus,
  deleteAdminCampaign,
  getAdminOrders,
  getAdminQrBatch,
  updateAdminOrderStatus,
  getAdminTransactions,
  getAdminTransactionsFiltered,
  updateAdminTransactionStatus,
  getAdminQrs,
  getAdminWithdrawals,
  getAdminNotifications,
  processAdminWithdrawal,
  getAdminActivityLogs,
  getAdminSystemSettings,
  updateAdminSystemSettings,
  getAdminSupportTickets,
  replyAdminSupportTicket,
  deleteAdminUser,
  getAdminProducts,
  updateAdminProduct,
  deleteAdminProduct,
} from "../lib/api";
import { getApiBaseUrl } from "../lib/apiClient";
import AuthImage from "../components/AuthImage";
import CompliancePanel from "../components/admin/CompliancePanel";

const ADMIN_TOKEN_KEY = "cashback_admin_token";
const ADMIN_SIDEBAR_KEY = "cashback_admin_sidebar";
const MAX_QR_PRICE = 100;
const API_BASE_URL = getApiBaseUrl();
const defaultHomeBanners = [
  {
    title: "Win Gold Coins Daily",
    subtitle: "Scan Heritage Milk Packs",
    accent: "from-blue-600 to-indigo-900",
    img: "/gold-coin-hero.png",
    link: "/brand-details",
  },
  {
    title: "Get Upto INR 1100",
    subtitle: "RL Masala Special Offer",
    accent: "from-orange-600 to-red-900",
    img: "/masala-hero.png",
    link: "/brand-details",
  },
];

const cloneHomeBanners = (items) =>
  items.map((banner) => ({ ...(banner || {}) }));

const defaultRedeemStoreTabs = [
  { id: "vouchers", label: "Vouchers" },
  { id: "products", label: "Products" },
];

const defaultRedeemStoreCategories = [
  "Popular",
  "Food",
  "Shopping",
  "Travel",
  "Entertainment",
];

const slugifyValue = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const createRedeemProductDraft = () => {
  const uniquePart = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id: `redeem-product-${uniquePart}`,
    name: "",
    category: "Popular",
    amount: "",
    value: "",
    brand: "",
    stock: "",
    description: "",
    image: "",
    status: "active",
  };
};

const normalizeRedeemStoreTabs = (tabs) => {
  const source =
    Array.isArray(tabs) && tabs.length ? tabs : defaultRedeemStoreTabs;
  const seen = new Set();
  return source
    .map((tab) => {
      const id = String(tab?.id || "")
        .trim()
        .toLowerCase();
      const label = String(tab?.label || "").trim();
      if (!id || !label || seen.has(id)) return null;
      seen.add(id);
      return { id, label };
    })
    .filter(Boolean);
};

const normalizeRedeemStoreCategories = (categories) => {
  const source =
    Array.isArray(categories) && categories.length
      ? categories
      : defaultRedeemStoreCategories;
  const seen = new Set();
  return source
    .map((category) => String(category || "").trim())
    .filter((category) => {
      const key = category.toLowerCase();
      if (!category || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const normalizeRedeemProductEntry = (product, index = 0) => {
  const name = String(product?.name || "").trim();
  const candidateId =
    String(product?.id || "").trim() ||
    slugifyValue(name) ||
    `redeem-product-${index + 1}`;
  const parsedAmount = Number(product?.amount ?? product?.points);
  const parsedStock = Number(product?.stock);
  return {
    id: candidateId,
    name,
    category: String(product?.category || "Popular").trim() || "Popular",
    amount:
      Number.isFinite(parsedAmount) && parsedAmount >= 0 ? parsedAmount : 0,
    value: String(product?.value || "").trim(),
    brand: String(product?.brand || "").trim(),
    stock:
      Number.isFinite(parsedStock) && parsedStock >= 0
        ? Math.floor(parsedStock)
        : "",
    description: String(product?.description || "").trim(),
    image: String(product?.image || product?.imageUrl || "").trim(),
    images: Array.isArray(product?.images) ? product.images.filter(Boolean) : [],
    status:
      String(product?.status || "active").toLowerCase() === "inactive"
        ? "inactive"
        : "active",
  };
};

const normalizeRedeemProducts = (products) => {
  if (!Array.isArray(products)) return [];
  return products
    .map((product, index) => normalizeRedeemProductEntry(product, index))
    .filter((product) => product.name);
};

const createBlogDraft = () => ({
  id: `blog-${Date.now()}`,
  title: "",
  slug: "",
  excerpt: "",
  author: "",
  category: "",
  coverImage: "",
  coverImageAlt: "",
  content: "",
  status: "draft",
  publishedAt: "",
});

const createBlogUserDraft = () => ({
  id: `blog-user-${Date.now()}`,
  name: "",
  email: "",
  password: "",
  access: true,
});

const normalizeBlogEntries = (blogs) => {
  if (!Array.isArray(blogs)) return [];
  return blogs.map((blog, index) => ({
    id: String(blog?.id || `blog-${index + 1}`),
    title: String(blog?.title || ""),
    slug: String(blog?.slug || ""),
    excerpt: String(blog?.excerpt || ""),
    author: String(blog?.author || ""),
    category: String(blog?.category || ""),
    coverImage: String(blog?.coverImage || blog?.image || ""),
    coverImageAlt: String(blog?.coverImageAlt || blog?.imageAlt || ""),
    content: String(blog?.content || ""),
    status: String(blog?.status || "draft").toLowerCase() === "published" ? "published" : "draft",
    publishedAt: String(blog?.publishedAt || ""),
  }));
};

const normalizeBlogUsers = (users, legacyCredentials) => {
  const source = Array.isArray(users) ? users : [];
  const normalized = source
    .map((user, index) => ({
      id: String(user?.id || `blog-user-${index + 1}`),
      name: String(user?.name || ""),
      email: String(user?.email || user?.username || ""),
      password: String(user?.password || ""),
      access: user?.access !== false,
    }))
    .filter((user) => user.email || user.password || user.name);

  if (
    normalized.length === 0 &&
    legacyCredentials &&
    typeof legacyCredentials === "object" &&
    (legacyCredentials.username || legacyCredentials.password)
  ) {
    normalized.push({
      id: "blog-user-legacy",
      name: "Blog User",
      email: String(legacyCredentials.username || ""),
      password: String(legacyCredentials.password || ""),
      access: true,
    });
  }

  return normalized;
};

const resolveAssetUrl = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) {
    return API_BASE_URL ? `${API_BASE_URL}${value}` : value;
  }
  return value;
};

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "operations", label: "Operations", icon: Wallet },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "orders", label: "Orders", icon: Package },
  { id: "payouts", label: "Payouts", icon: CircleDollarSign },
  { id: "users", label: "Users", icon: Users },
  { id: "vendors", label: "Vendors", icon: Store },
  { id: "transactions", label: "Transactions", icon: ClipboardList },
  { id: "qrs", label: "QR Registry", icon: QrCode },
];

const quickActions = [
  { id: "operations", label: "Wallet", icon: PiggyBank },
  { id: "payouts", label: "Payouts", icon: HandCoins },
  { id: "analytics", label: "Analytics", icon: Activity },
  { id: "users", label: "Users", icon: UserRound },
  { id: "vendors", label: "Vendors", icon: Building2 },
  { id: "transactions", label: "Transfers", icon: ArrowLeftRight },
  { id: "qrs", label: "QRs", icon: ScanLine },
];

const rangeOptions = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

const metricOptions = [
  { label: "Net flow", value: "transactions" },
  { label: "New users", value: "users" },
  { label: "QR volume", value: "qrs" },
];

const QR_ORDER_ATTENTION_STATUSES = ["pending", "paid"];

const formatAmount = (value) => {
  if (value === undefined || value === null) return "0.00";
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric.toFixed(2);
  return String(value);
};

const toFiniteNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const getVendorTechFee = (vendor) => {
  const vendorFee = Number(vendor?.techFeePerQr);
  if (Number.isFinite(vendorFee) && vendorFee > 0) return vendorFee;

  const legacyQrFee = Number(vendor?.Brand?.qrPricePerUnit);
  if (Number.isFinite(legacyQrFee) && legacyQrFee > 0) return legacyQrFee;

  return 1.5;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const formatDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const getDefaultBrandFormState = () => ({
  brandName: "",
  logoUrl: "",
  website: "",
  vendorEmail: "",
  vendorPhone: "",
  qrPricePerUnit: "1.50",
});

const getDefaultCampaignEditFormState = () => ({
  id: "",
  title: "",
  description: "",
  cashbackAmount: "",
  startDate: "",
  endDate: "",
  totalBudget: "",
  subtotal: "",
});

const getDefaultWithdrawalActionState = () => ({
  id: "",
  status: "processed",
  referenceId: "",
  adminNote: "",
});

const getDefaultWalletCreditState = () => ({
  vendorId: "",
  amount: "",
  description: "",
  type: "credit",
});

const getDefaultCampaignControlState = () => ({
  id: "",
  status: "paused",
});

const getQrValue = (hash) => {
  const envBase = process.env.NEXT_PUBLIC_QR_BASE_URL;
  if (envBase) {
    return `${envBase.replace(/\/$/, "")}/redeem/${hash}`;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/redeem/${hash}`;
  }
  return hash;
};

const getPdfCanvasId = (hash) => `admin-pdf-qr-${hash}`;

const waitForPdfCanvases = async (items, timeoutMs = 5000) => {
  const hashes = (Array.isArray(items) ? items : [])
    .map((item) => item?.uniqueHash)
    .filter(Boolean);
  if (!hashes.length) return true;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const allReady = hashes.every((hash) => {
      const canvas = document.getElementById(getPdfCanvasId(hash));
      return canvas && typeof canvas.toDataURL === "function";
    });
    if (allReady) return true;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  return false;
};

const getStatusClasses = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (
    ["active", "success", "processed", "completed", "paid", "shipped"].includes(
      normalized,
    )
  ) {
    return "text-emerald-600 dark:text-emerald-400";
  }
  if (["pending"].includes(normalized)) {
    return "text-amber-600 dark:text-amber-400";
  }
  if (["paused", "inactive"].includes(normalized)) {
    return "text-yellow-600 dark:text-yellow-400";
  }
  if (["rejected", "blocked", "failed", "expired"].includes(normalized)) {
    return "text-rose-600 dark:text-rose-400";
  }
  return "text-slate-500 dark:text-slate-400";
};

const extractCampaignTitle = (description) => {
  if (!description) return "-";
  const cleaned = String(description).trim();
  const match = cleaned.match(/Campaign[:\s]+([^.,;]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return cleaned.length > 60 ? `${cleaned.slice(0, 60).trim()}�` : cleaned;
};

const adminPanelClass =
  "bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl shadow-sm transition-all duration-200";
const adminCardClass =
  "bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl p-5 shadow-sm";
const adminInputClass =
  "w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 focus:outline-none focus:border-[#059669] transition-colors";
const adminOptionClass =
  "bg-white text-slate-900 dark:bg-[#0f0f11] dark:text-white";
const adminPrimaryButtonClass =
  "px-6 py-2.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-semibold shadow-lg shadow-[#059669]/20 transition-all";
const adminGhostButtonClass =
  "px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm text-slate-700 font-medium transition-colors dark:bg-white/5 dark:hover:bg-white/10 dark:text-white";
const isProductReportSubject = (subject) =>
  /^product report(?:\b|:|-)/i.test(String(subject || "").trim());
const statLabelClass =
  "text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2";
const statValueClass = "text-2xl font-bold text-slate-900 dark:text-white";

const getDayKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildDayBuckets = (days) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - (days - 1));

  const buckets = [];
  const indexMap = new Map();

  for (let i = 0; i < days; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = getDayKey(date);
    buckets.push({ date, key });
    indexMap.set(key, i);
  }

  return { buckets, indexMap, start, end: today };
};

const buildTransactionSeries = (transactions, days) => {
  const { buckets, indexMap } = buildDayBuckets(days);
  const credit = new Array(days).fill(0);
  const debit = new Array(days).fill(0);

  transactions.forEach((tx) => {
    const date = new Date(tx.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const index = indexMap.get(getDayKey(date));
    if (index === undefined) return;

    const amount = Number(tx.amount) || 0;
    if (tx.type === "credit") credit[index] += amount;
    if (tx.type === "debit") debit[index] += amount;
  });

  const net = credit.map((value, index) => value - debit[index]);

  return { buckets, credit, debit, net };
};

const buildCountSeries = (items, days, getDate) => {
  const { buckets, indexMap } = buildDayBuckets(days);
  const counts = new Array(days).fill(0);

  items.forEach((item) => {
    const dateValue = getDate(item);
    if (!dateValue) return;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return;
    const index = indexMap.get(getDayKey(date));
    if (index === undefined) return;
    counts[index] += 1;
  });

  return { buckets, counts };
};

const buildStatusCounts = (items, key) =>
  items.reduce((acc, item) => {
    const status = String(item?.[key] || "unknown").toLowerCase();
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

const Sparkline = ({
  data,
  stroke = "#059669",
  fill = "rgba(129, 204, 42, 0.2)",
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-16 w-full rounded-2xl bg-slate-200/70 dark:bg-white/10" />
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = data.length > 1 ? data.length - 1 : 1;
  const points = data
    .map((value, index) => {
      const x = (index / width) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  const areaPoints = `${points} 100,100 0,100`;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-16 w-full"
    >
      <polygon points={areaPoints} fill={fill} />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/** Professional SVG Bar Chart */
const BarChart = ({
  data = [],
  labels = [],
  barColor = "#059669",
  height = 220,
  showLabels = true,
}) => {
  if (!data || data.length === 0)
    return (
      <div className="h-[220px] w-full rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs text-slate-400">
        No data
      </div>
    );
  const max = Math.max(...data, 1);
  const count = data.length;
  const barW = Math.max(100 / count - 2, 2);
  const gap = (100 - barW * count) / (count + 1);
  const gridLines = 4;
  const fmtValue = (v) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v);

  return (
    <div className="w-full" style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
      >
        {/* Grid lines */}
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const y = (i / gridLines) * 100;
          return (
            <line
              key={i}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="currentColor"
              className="text-slate-200 dark:text-white/5"
              strokeWidth="0.3"
            />
          );
        })}
        {/* Bars */}
        {data.map((val, i) => {
          const h = (val / max) * 90;
          const x = gap + i * (barW + gap);
          return (
            <g key={i}>
              <rect
                x={x}
                y={100 - h}
                width={barW}
                height={h}
                rx="0.8"
                fill={barColor}
                opacity="0.85"
                className="hover:opacity-100 transition-opacity"
              />
            </g>
          );
        })}
      </svg>
      {showLabels && labels.length > 0 && (
        <div className="flex justify-between mt-1.5 px-0.5">
          {labels
            .filter((_, i) => {
              const step = Math.max(1, Math.floor(count / 7));
              return i % step === 0 || i === count - 1;
            })
            .map((label, i) => (
              <span
                key={i}
                className="text-[9px] text-slate-400 dark:text-slate-500"
              >
                {label}
              </span>
            ))}
        </div>
      )}
    </div>
  );
};

/** Professional SVG Line Chart with Area Fill */
const LineChartComponent = ({
  data = [],
  labels = [],
  lineColor = "#059669",
  fillColor = "rgba(5,150,105,0.1)",
  height = 220,
  showLabels = true,
}) => {
  if (!data || data.length === 0)
    return (
      <div className="h-[220px] w-full rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs text-slate-400">
        No data
      </div>
    );
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const padding = 5;
  const count = data.length;
  const gridLines = 4;

  const points = data.map((val, i) => {
    const x = padding + (i / Math.max(count - 1, 1)) * (100 - padding * 2);
    const y = padding + (1 - (val - min) / range) * (100 - padding * 2);
    return { x, y };
  });
  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${points[0].x},${100 - padding} ${line} ${points[points.length - 1].x},${100 - padding}`;

  return (
    <div className="w-full" style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
      >
        {/* Grid */}
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const y = padding + (i / gridLines) * (100 - padding * 2);
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={100 - padding}
              y2={y}
              stroke="currentColor"
              className="text-slate-200 dark:text-white/5"
              strokeWidth="0.3"
            />
          );
        })}
        {/* Area */}
        <polygon points={area} fill={fillColor} />
        {/* Line */}
        <polyline
          points={line}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="0.8" fill={lineColor} />
        ))}
      </svg>
      {showLabels && labels.length > 0 && (
        <div className="flex justify-between mt-1.5 px-0.5">
          {labels
            .filter((_, i) => {
              const step = Math.max(1, Math.floor(count / 7));
              return i % step === 0 || i === count - 1;
            })
            .map((label, i) => (
              <span
                key={i}
                className="text-[9px] text-slate-400 dark:text-slate-500"
              >
                {label}
              </span>
            ))}
        </div>
      )}
    </div>
  );
};

const parseColors = (val) => {
  const fromMatch = val.match(/from-\[?([^\]\s]+)\]?/);
  const toMatch = val.match(/to-\[?([^\]\s]+)\]?/);

  let from = fromMatch ? fromMatch[1] : "#3b82f6";
  let to = toMatch ? toMatch[1] : "#4338ca";

  if (!from.startsWith("#")) {
    if (from === "blue-600") from = "#2563eb";
    else if (from === "orange-600") from = "#ea580c";
    else from = "#3b82f6";
  }
  if (!to.startsWith("#")) {
    if (to === "indigo-900") to = "#312e81";
    else if (to === "red-900") to = "#7f1d1d";
    else to = "#4338ca";
  }

  return { from, to };
};

const GradientPicker = ({ value, onChange }) => {
  const initialColors = useMemo(() => parseColors(value || ""), [value]);
  const [localColors, setLocalColors] = useState(initialColors);
  const debounceTimer = useRef(null);

  // Sync with value if it changes externally
  useEffect(() => {
    setLocalColors(initialColors);
  }, [initialColors]);

  const handleColorChange = (type, color) => {
    const newColors = { ...localColors, [type]: color };
    setLocalColors(newColors);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onChange(`from-[${newColors.from}] to-[${newColors.to}]`);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-black/20 rounded-lg border border-slate-200 dark:border-white/10">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">
            Start
          </label>
          <div className="relative w-8 h-8 rounded-md overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm">
            <input
              type="color"
              value={localColors.from}
              onChange={(e) => handleColorChange("from", e.target.value)}
              className="absolute inset-0 w-[150%] h-[150%] -translate-x-[25%] -translate-y-[25%] cursor-pointer border-0 p-0"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">
            End
          </label>
          <div className="relative w-8 h-8 rounded-md overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm">
            <input
              type="color"
              value={localColors.to}
              onChange={(e) => handleColorChange("to", e.target.value)}
              className="absolute inset-0 w-[150%] h-[150%] -translate-x-[25%] -translate-y-[25%] cursor-pointer border-0 p-0"
            />
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">
            Preview
          </label>
          <div
            className="h-8 w-full rounded-md border border-slate-200 dark:border-white/10 shadow-inner"
            style={{
              background: `linear-gradient(to right, ${localColors.from}, ${localColors.to})`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const blogTextareaRefs = useRef({});
  const { section, subSection } = useParams();
  const { effectiveTheme } = useTheme();
  const [token, setToken] = useState(() =>
    localStorage.getItem(ADMIN_TOKEN_KEY),
  );
  const isAuthenticated = Boolean(token);
  const [adminInfo, setAdminInfo] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [dashboardStats, setDashboardStats] = useState(null);
  const [dashboardError, setDashboardError] = useState("");
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userStatusUpdates, setUserStatusUpdates] = useState({});
  const [userActionStatus, setUserActionStatus] = useState("");
  const [userActionError, setUserActionError] = useState("");
  const [showAllUsers, setShowAllUsers] = useState(false);

  const [vendors, setVendors] = useState([]);
  const [vendorsError, setVendorsError] = useState("");
  const [isLoadingVendors, setIsLoadingVendors] = useState(false);
  const [vendorStatusUpdates, setVendorStatusUpdates] = useState({});
  const [vendorTechFeeDrafts, setVendorTechFeeDrafts] = useState({});
  const [vendorTechFeeSaving, setVendorTechFeeSaving] = useState({});
  const [vendorPlanTypeDrafts, setVendorPlanTypeDrafts] = useState({});
  const [vendorPlanTypeSaving, setVendorPlanTypeSaving] = useState({});
  const [vendorActionStatus, setVendorActionStatus] = useState("");
  const [vendorActionError, setVendorActionError] = useState("");
  const [brandForm, setBrandForm] = useState(() => getDefaultBrandFormState());
  const [isUploadingBrandLogo, setIsUploadingBrandLogo] = useState(false);
  const [brandLogoUploadStatus, setBrandLogoUploadStatus] = useState("");
  const [brandLogoUploadError, setBrandLogoUploadError] = useState("");
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [brandCreationMessage, setBrandCreationMessage] = useState("");
  const [brandCreationError, setBrandCreationError] = useState("");
  const [createdBrandCredentials, setCreatedBrandCredentials] = useState(null);
  const [createdBrandDetails, setCreatedBrandDetails] = useState(null);
  const [showAllVendors, setShowAllVendors] = useState(false);
  const [brands, setBrands] = useState([]);
  const [brandsError, setBrandsError] = useState("");
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  /* Vendor & Brand Overview State Removed (Refactored to VendorAccountManager) */
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [campaignAnalyticsId, setCampaignAnalyticsId] = useState("");
  const [campaignAnalytics, setCampaignAnalytics] = useState(null);
  const [campaignAnalyticsError, setCampaignAnalyticsError] = useState("");
  const [isLoadingCampaignAnalytics, setIsLoadingCampaignAnalytics] =
    useState(false);
  const [campaignEditForm, setCampaignEditForm] = useState(() =>
    getDefaultCampaignEditFormState(),
  );
  const [campaignEditStatus, setCampaignEditStatus] = useState("");
  const [campaignEditError, setCampaignEditError] = useState("");
  const [isUpdatingCampaignDetails, setIsUpdatingCampaignDetails] =
    useState(false);

  const [transactions, setTransactions] = useState([]);
  const [transactionsError, setTransactionsError] = useState("");
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  // Dashboard Filters
  const [filterVendorId, setFilterVendorId] = useState("all");
  const [filterBrandId, setFilterBrandId] = useState("all");
  const [filterCampaignId, setFilterCampaignId] = useState("all");

  const [qrs, setQrs] = useState([]);
  const [qrsError, setQrsError] = useState("");
  const [isLoadingQrs, setIsLoadingQrs] = useState(false);
  const [showAllQrs, setShowAllQrs] = useState(false);
  const [qrsPage, setQrsPage] = useState(1);
  const [qrsTotal, setQrsTotal] = useState(0);
  const [qrStatusSummary, setQrStatusSummary] = useState({});
  const [qrsHasMore, setQrsHasMore] = useState(false);

  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalsError, setWithdrawalsError] = useState("");
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(false);
  const [withdrawalAction, setWithdrawalAction] = useState(() =>
    getDefaultWithdrawalActionState(),
  );
  const [withdrawalStatus, setWithdrawalStatus] = useState("");
  const [withdrawalError, setWithdrawalError] = useState("");
  const [showAllWithdrawals, setShowAllWithdrawals] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  const [walletCredit, setWalletCredit] = useState(() =>
    getDefaultWalletCreditState(),
  );
  const [walletStatus, setWalletStatus] = useState("");
  const [walletError, setWalletError] = useState("");
  const [isCreditingWallet, setIsCreditingWallet] = useState(false);

  const [campaignControl, setCampaignControl] = useState(() =>
    getDefaultCampaignControlState(),
  );
  const [campaignStatus, setCampaignStatus] = useState("");
  const [campaignError, setCampaignError] = useState("");
  const [isUpdatingCampaign, setIsUpdatingCampaign] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsError, setCampaignsError] = useState("");
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [campaignStatusUpdates, setCampaignStatusUpdates] = useState({});
  const [campaignActionStatus, setCampaignActionStatus] = useState("");
  const [campaignActionError, setCampaignActionError] = useState("");
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);
  const [deletingCampaignId, setDeletingCampaignId] = useState(null);

  const [orders, setOrders] = useState([]);
  const [ordersError, setOrdersError] = useState("");
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderStatusUpdates, setOrderStatusUpdates] = useState({});
  const [orderActionStatus, setOrderActionStatus] = useState("");
  const [orderActionError, setOrderActionError] = useState("");
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [qrBatchStatus, setQrBatchStatus] = useState("");
  const [qrBatchError, setQrBatchError] = useState("");
  const [qrBatchSearch, setQrBatchSearch] = useState("");
  const [qrBatchSort, setQrBatchSort] = useState("recent");
  const [showAllQrBatches, setShowAllQrBatches] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [orderStatusSummary, setOrderStatusSummary] = useState({});
  const [ordersHasMore, setOrdersHasMore] = useState(false);
  const [batchQrs, setBatchQrs] = useState([]);
  const [isPreparingBatchPdf, setIsPreparingBatchPdf] = useState(false);

  // Logs State
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsFilter, setLogsFilter] = useState("all");

  // Finance Summary State
  const [financeSummary, setFinanceSummary] = useState(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState("");

  // System Settings State
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [bannerUploadState, setBannerUploadState] = useState({});
  const [blogUploadState, setBlogUploadState] = useState({});
  const [isBlogUsersModalOpen, setIsBlogUsersModalOpen] = useState(false);
  const [editingBlogId, setEditingBlogId] = useState(null);
  const [redeemProductUploadState, setRedeemProductUploadState] = useState({});
  const [isRedeemProductModalOpen, setIsRedeemProductModalOpen] =
    useState(false);
  const [redeemProductDraft, setRedeemProductDraft] = useState(() =>
    createRedeemProductDraft(),
  );
  const [redeemProductDraftUpload, setRedeemProductDraftUpload] = useState({
    status: "",
    error: "",
  });
  const [redeemProductDraftError, setRedeemProductDraftError] = useState("");
  const [editingRedeemProductIndex, setEditingRedeemProductIndex] =
    useState(-1);
  const [isDeleteRedeemProductModalOpen, setIsDeleteRedeemProductModalOpen] =
    useState(false);
  const [productToDeleteIndex, setProductToDeleteIndex] = useState(-1);
  const [productStatusToggleModal, setProductStatusToggleModal] = useState({ isOpen: false, index: -1, currentStatus: "" });

  // Support Tickets (Disputes)
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState("");
  const [supportReplies, setSupportReplies] = useState({});
  const [supportActionStatus, setSupportActionStatus] = useState("");
  const [supportActionError, setSupportActionError] = useState("");
  const [supportView, setSupportView] = useState("all");

  const [adminProducts, setAdminProducts] = useState([]);
  const [isLoadingAdminProducts, setIsLoadingAdminProducts] = useState(false);
  const [adminProductsError, setAdminProductsError] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedProductForDetail, setSelectedProductForDetail] = useState(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [redeemOrderStatuses, setRedeemOrderStatuses] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("redeem_order_statuses");
      if (saved) {
        setRedeemOrderStatuses(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // User Wallet Modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserWalletOpen, setIsUserWalletOpen] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem(ADMIN_SIDEBAR_KEY);
    return saved === "collapsed" ? true : false; // Default to expanded
  });
  const [analyticsRange, setAnalyticsRange] = useState(30);
  const [activityTimeframe, setActivityTimeframe] = useState("week");
  const [activityCustomStart, setActivityCustomStart] = useState("");
  const [activityCustomEnd, setActivityCustomEnd] = useState("");
  const [txTimeframe, setTxTimeframe] = useState("all");
  const [txCustomStart, setTxCustomStart] = useState("");
  const [txCustomEnd, setTxCustomEnd] = useState("");
  const [analyticsMetric, setAnalyticsMetric] = useState("transactions");
  const [recentTxLimit, setRecentTxLimit] = useState(4);
  const [recentTxTypeFilter, setRecentTxTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const searchLower = (searchQuery || "").toLowerCase().trim();
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const clearSession = (message = "") => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
    setToken(null);
    setAdminInfo(null);
    setEmail("");
    setPassword("");
    setAuthStatus(message || "");
    setAuthError("");
    setIsSigningIn(false);
    setDashboardStats(null);
    setDashboardError("");
    setIsLoadingDashboard(false);
    setUsers([]);
    setUsersError("");
    setIsLoadingUsers(false);
    setUserStatusUpdates({});
    setUserActionStatus("");
    setUserActionError("");
    setShowAllUsers(false);
    setVendors([]);
    setVendorsError("");
    setIsLoadingVendors(false);
    setVendorStatusUpdates({});
    setVendorTechFeeDrafts({});
    setVendorTechFeeSaving({});
    setVendorPlanTypeDrafts({});
    setVendorPlanTypeSaving({});
    setVendorActionStatus("");
    setVendorActionError("");
    setBrandForm(getDefaultBrandFormState());
    setIsCreatingBrand(false);
    setBrandCreationMessage("");
    setBrandCreationError("");
    setCreatedBrandCredentials(null);
    setCreatedBrandDetails(null);
    setShowAllVendors(false);
    setBrands([]);
    setBrandsError("");
    setIsLoadingBrands(false);
    setSelectedVendorId("");
    setSelectedBrandId("");
    setIsAccountModalOpen(false);
    setCampaignAnalyticsId("");
    setCampaignAnalytics(null);
    setCampaignAnalyticsError("");
    setIsLoadingCampaignAnalytics(false);
    setCampaignEditForm(getDefaultCampaignEditFormState());
    setCampaignEditStatus("");
    setCampaignEditError("");
    setIsUpdatingCampaignDetails(false);
    setTransactions([]);
    setTransactionsError("");
    setIsLoadingTransactions(false);
    setShowAllTransactions(false);
    setQrs([]);
    setQrsError("");
    setIsLoadingQrs(false);
    setShowAllQrs(false);
    setQrsPage(1);
    setQrsTotal(0);
    setQrStatusSummary({});
    setQrsHasMore(false);
    setWithdrawals([]);
    setWithdrawalsError("");
    setIsLoadingWithdrawals(false);
    setWithdrawalAction(getDefaultWithdrawalActionState());
    setWithdrawalStatus("");
    setWithdrawalError("");
    setShowAllWithdrawals(false);
    setWalletCredit(getDefaultWalletCreditState());
    setWalletStatus("");
    setWalletError("");
    setIsCreditingWallet(false);
    setCampaignControl(getDefaultCampaignControlState());
    setCampaignStatus("");
    setCampaignError("");
    setIsUpdatingCampaign(false);
    setCampaigns([]);
    setCampaignsError("");
    setIsLoadingCampaigns(false);
    setCampaignStatusUpdates({});
    setCampaignActionStatus("");
    setCampaignActionError("");
    setShowAllCampaigns(false);
    setDeletingCampaignId(null);
    setOrders([]);
    setOrdersError("");
    setIsLoadingOrders(false);
    setOrderStatusUpdates({});
    setOrderActionStatus("");
    setOrderActionError("");
    setShowAllOrders(false);
    setQrBatchStatus("");
    setQrBatchError("");
    setQrBatchSearch("");
    setQrBatchSort("recent");
    setShowAllQrBatches(false);
    setOrdersPage(1);
    setOrdersTotal(0);
    setOrderStatusSummary({});
    setOrdersHasMore(false);
    setBatchQrs([]);
    setIsPreparingBatchPdf(false);
    setIsRefreshing(false);
    setSidebarOpen(false);
    setAnalyticsRange(30);
    setAnalyticsMetric("transactions");
    setSearchQuery("");
    // Logs State Reset
    setLogs([]);
    setLogsLoading(false);
    setLogsError("");
    setLogsPage(1);
    setLogsTotal(0);
    // Settings State Reset
    setSettingsLoading(false);
    setSettingsError("");
    setSettingsMessage("");
    setRedeemProductUploadState({});
    setIsRedeemProductModalOpen(false);
    setRedeemProductDraft(createRedeemProductDraft());
    setRedeemProductDraftUpload({ status: "", error: "" });
    setRedeemProductDraftError("");
  };

  const activeSection = section || "overview";
  const activeSubSection = subSection || "";
  const activeNav =
    (activeSection === "vendors" || activeSection === "users") &&
    activeSubSection
      ? `${activeSection}-${activeSubSection}`
      : activeSection;

  const isOverviewRoute = activeSection === "overview";
  const isAnalyticsRoute = activeSection === "analytics";
  const isOperationsRoute = activeSection === "operations";
  const isCampaignsRoute = activeSection === "campaigns";
  const isOrdersRoute = activeSection === "orders";
  const isPayoutsRoute = activeSection === "payouts";
  const isFinanceRoute = activeSection === "finance";
  const isUsersRoute = activeSection === "users";
  const isProductReportsRoute = activeSection === "product-reports";
  const isSupportRoute = activeSection === "support" || isProductReportsRoute;
  const isTransactionsRoute = activeSection === "transactions";
  const isQrsRoute = activeSection === "qrs";
  const isVendorsRoute = activeSection === "vendors";
  const isLogsRoute = activeSection === "logs";
  const isComplianceRoute = activeSection === "compliance";
  const isSettingsRoute = activeSection === "settings";
  const isBlogsRoute = activeSection === "blogs";
  const isRedeemCatalogRoute = activeSection === "redeem-catalog";
  const isProductTrackRoute = activeSection === "product-track" || activeSection === "product_track";
  const isAddProductRoute = activeSection === "add-product";
  const isAccountRoute = activeSection === "account";
  const isSecurityRoute = activeSection === "security";

  const vendorView = isVendorsRoute ? activeSubSection || "all" : "all";
  const userView = isUsersRoute ? activeSubSection || "all" : "all";
  const showVendorSummaries = isVendorsRoute && vendorView === "all";
  const showVendorTable = isVendorsRoute; // Always show table if vendors route
  const shouldRenderVendorsSection = isVendorsRoute;

  const filteredWithdrawals = useMemo(() => {
    const list = withdrawals || [];
    if (!searchLower) return list;
    return list.filter((w) => {
      const id = String(w?.id || "").toLowerCase();
      const requester = String(
        w?.Wallet?.Vendor?.businessName ||
        w?.Wallet?.User?.name ||
        w?.Wallet?.User?.email ||
        ""
      ).toLowerCase();
      const status = String(w?.status || "").toLowerCase();
      const ref = String(w?.referenceNo || "").toLowerCase();
      return (
        id.includes(searchLower) ||
        requester.includes(searchLower) ||
        status.includes(searchLower) ||
        ref.includes(searchLower)
      );
    });
  }, [withdrawals, searchLower]);

  const withdrawalPreview = useMemo(() => {
    const list = filteredWithdrawals || [];
    if (!list.length) return [];
    const pending = list.filter(
      (w) => String(w.status || "").toLowerCase() === "pending",
    );
    if (showAllWithdrawals) {
      return pending.length ? pending : list;
    }
    if (pending.length) {
      return pending.slice(0, 3);
    }
    return list.slice(0, 3);
  }, [filteredWithdrawals, showAllWithdrawals]);

  const navRouteMap = {
    overview: "/admin/overview",
    analytics: "/admin/analytics",
    operations: "/admin/operations",
    campaigns: "/admin/campaigns",
    orders: "/admin/orders",
    payouts: "/admin/payouts",
    finance: "/admin/finance",
    users: "/admin/users",
    "users-active": "/admin/users/active",
    "users-inactive": "/admin/users/inactive",
    "users-blocked": "/admin/users/blocked",
    support: "/admin/support",
    "product-reports": "/admin/product-reports",
    vendors: "/admin/vendors",
    "vendors-create": "/admin/vendors/create",
    "vendors-active": "/admin/vendors/active",
    "vendors-paused": "/admin/vendors/paused",
    transactions: "/admin/transactions",
    qrs: "/admin/qrs",
    "redeem-catalog": "/admin/redeem-catalog",
    "product-track": "/admin/product-track",
    "product_track": "/admin/product_track",
    logs: "/admin/logs",
    blogs: "/admin/blogs",
    settings: "/admin/settings",
    account: "/admin/account",
    security: "/admin/security",
  };

  const pageTitleMap = {
    overview: "Overview",
    analytics: "Analytics",
    operations: "Operations",
    campaigns: "Campaigns",
    orders: "QR Processing",
    payouts: "Payouts",
    finance: "Finance & Revenue",
    users: "Users",
    support: "Disputes & Support",
    "product-reports": "Product Reports",
    vendors: "Vendors",
    transactions: "Transactions",
    qrs: "QR Registry",
    "redeem-catalog": "Redeem Catalog",
    "product-track": "Product Track",
    "product_track": "Product Track",
    logs: "Logs & Audit",
    compliance: "Compliance & Audit",
    blogs: "Upload Blog",
    settings: "System Settings",
    account: "Account",
    security: "Security",
  };
  const vendorSubTitleMap = {
    create: "Create Brand",
    active: "Active Vendors",
    paused: "Paused Vendors",
  };
  const userSubTitleMap = {
    active: "Active Users",
    inactive: "Inactive Users",
    blocked: "Blocked Users",
  };
  const headerTitle =
    activeSection === "vendors" && activeSubSection
      ? `${pageTitleMap.vendors} - ${vendorSubTitleMap[activeSubSection] || activeSubSection}`
      : activeSection === "users" && activeSubSection
        ? `${pageTitleMap.users} - ${userSubTitleMap[activeSubSection] || activeSubSection}`
        : pageTitleMap[activeSection] || "Admin";

  const handleRequestError = (err, setter, fallback) => {
    if (err?.status === 401) {
      clearSession("Session expired.");
    } else {
      setter(err.message || fallback);
    }
  };

  const loadAdmin = async (authToken) => {
    try {
      const data = await getMe(authToken);
      if (data?.role && data.role !== "admin") {
        clearSession("This account is not an admin.");
        setAuthError("This account is not an admin.");
        return;
      }
      setAdminInfo(data);
    } catch (err) {
      handleRequestError(err, setAuthError, "Unable to load admin profile.");
    }
  };

  const loadDashboardStats = async (authToken = token) => {
    if (!authToken) return;
    setIsLoadingDashboard(true);
    setDashboardError("");
    try {
      const data = await getAdminDashboard(authToken);
      setDashboardStats(data);
    } catch (err) {
      handleRequestError(
        err,
        setDashboardError,
        "Unable to load dashboard stats.",
      );
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const loadUsers = async (authToken = token) => {
    if (!authToken) return;
    setIsLoadingUsers(true);
    setUsersError("");
    try {
      const data = await getAdminUsers(authToken);
      setUsers(data?.users || []);
    } catch (err) {
      handleRequestError(err, setUsersError, "Unable to load users.");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadVendors = async (authToken = token) => {
    if (!authToken) return;
    setIsLoadingVendors(true);
    setVendorsError("");
    try {
      const data = await getAdminVendors(authToken);
      setVendors(data?.vendors || []);
    } catch (err) {
      handleRequestError(err, setVendorsError, "Unable to load vendors.");
    } finally {
      setIsLoadingVendors(false);
    }
  };

  const loadBrands = async (authToken = token) => {
    if (!authToken) return;
    setIsLoadingBrands(true);
    setBrandsError("");
    try {
      const data = await getAdminBrands(authToken);
      const items = Array.isArray(data) ? data : data?.items || [];
      setBrands(items);
    } catch (err) {
      handleRequestError(err, setBrandsError, "Unable to load brands.");
    } finally {
      setIsLoadingBrands(false);
    }
  };

  const loadAdminProducts = async (authToken = token) => {
    if (!authToken) return;
    setIsLoadingAdminProducts(true);
    setAdminProductsError("");
    try {
      const data = await getAdminProducts(authToken);
      const items = Array.isArray(data) ? data : data?.products || data?.items || [];
      setAdminProducts(items);
    } catch (err) {
      handleRequestError(err, setAdminProductsError, "Unable to load products.");
    } finally {
      setIsLoadingAdminProducts(false);
    }
  };

  const handleToggleProductStatus = async (product) => {
    if (!token) return;
    const newStatus = product.status === "active" ? "paused" : "active";
    try {
      await updateAdminProduct(token, product.id, { status: newStatus });
      setAdminProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
      );
    } catch (err) {
      alert(err.message || "Failed to update product status.");
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteAdminProduct(token, productId);
      setAdminProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err) {
      alert(err.message || "Failed to delete product.");
    }
  };

  const handleUpdateRedeemOrderStatus = async (orderId, newStatus) => {
    const statusText = newStatus === "SUCCESS" ? "Placed" : newStatus.charAt(0) + newStatus.slice(1).toLowerCase();
    if (!window.confirm(`Are you sure you want to change the order status to "${statusText}"?`)) {
      return;
    }
    
    const updated = { ...redeemOrderStatuses, [orderId]: newStatus };
    setRedeemOrderStatuses(updated);
    localStorage.setItem("redeem_order_statuses", JSON.stringify(updated));

    try {
      const savedTimestamps = JSON.parse(localStorage.getItem("redeem_order_timestamps") || "{}");
      if (!savedTimestamps[orderId]) {
        savedTimestamps[orderId] = {};
      }
      savedTimestamps[orderId][newStatus] = new Date().toISOString();
      localStorage.setItem("redeem_order_timestamps", JSON.stringify(savedTimestamps));
    } catch (e) {
      console.error(e);
    }

    if (token) {
      try {
        await updateAdminTransactionStatus(token, orderId, newStatus);
        // Refresh transactions to get updated metadata (timestamps, orderStatus)
        await loadTransactions(token);
      } catch (err) {
        console.error("Failed to update order status on backend:", err);
      }
    }
  };


  const loadCampaignAnalytics = async (
    authToken = token,
    campaignId = campaignAnalyticsId,
  ) => {
    if (!authToken || !campaignId) return;
    setIsLoadingCampaignAnalytics(true);
    setCampaignAnalyticsError("");
    try {
      const data = await getAdminCampaignAnalytics(authToken, campaignId);
      setCampaignAnalytics(data);
      setCampaignEditStatus("");
      setCampaignEditError("");
      setCampaignEditForm({
        id: data?.campaign?.id || campaignId,
        title: data?.campaign?.title || "",
        description: data?.campaign?.description || "",
        cashbackAmount: data?.campaign?.cashbackAmount ?? "",
        startDate: formatDateInput(data?.campaign?.startDate),
        endDate: formatDateInput(data?.campaign?.endDate),
        totalBudget: data?.campaign?.totalBudget ?? "",
        subtotal: data?.campaign?.subtotal ?? "",
      });
    } catch (err) {
      handleRequestError(
        err,
        setCampaignAnalyticsError,
        "Unable to load campaign analytics.",
      );
    } finally {
      setIsLoadingCampaignAnalytics(false);
    }
  };

  const loadCampaigns = async (authToken = token) => {
    if (!authToken) return;
    setIsLoadingCampaigns(true);
    setCampaignsError("");
    try {
      const data = await getAdminCampaigns(authToken, "vendor");
      const items = Array.isArray(data) ? data : data?.items || [];
      setCampaigns(items);
    } catch (err) {
      handleRequestError(err, setCampaignsError, "Unable to load campaigns.");
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const loadOrders = async (
    authToken = token,
    { page = 1, append = false } = {},
  ) => {
    if (!authToken) return;
    setIsLoadingOrders(true);
    setOrdersError("");
    const limit = 20;
    try {
      const data = await getAdminOrders(authToken, { page, limit });
      const items = Array.isArray(data)
        ? data
        : data?.items || data?.orders || data?.data || [];
      const total = Number.isFinite(data?.total) ? data.total : items.length;
      const statusCounts = data?.statusCounts || {};

      setOrders((prev) => {
        const updated = append ? [...prev, ...items] : items;
        setOrdersHasMore(updated.length < total);
        return updated;
      });
      setOrdersTotal(total);
      setOrdersPage(page);
      setOrderStatusSummary(statusCounts);
    } catch (err) {
      handleRequestError(err, setOrdersError, "Unable to load orders.");
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const loadTransactions = async (authToken = token) => {
    if (!authToken) return;
    setIsLoadingTransactions(true);
    setTransactionsError("");
    try {
      const data = await getAdminTransactionsFiltered(authToken, { limit: 1000 });
      setTransactions(data?.transactions || []);
    } catch (err) {
      handleRequestError(
        err,
        setTransactionsError,
        "Unable to load transactions.",
      );
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const loadQrs = async (
    authToken = token,
    { page = 1, append = false } = {},
  ) => {
    if (!authToken) return;
    setIsLoadingQrs(true);
    setQrsError("");
    const limit = 150;
    try {
      const data = await getAdminQrs(authToken, { page, limit });
      const items = Array.isArray(data)
        ? data
        : data?.items || data?.data || [];
      const total = Number.isFinite(data?.total) ? data.total : items.length;
      const statusCounts = data?.statusCounts || {};

      setQrs((prev) => {
        const updated = append ? [...prev, ...items] : items;
        setQrsHasMore(updated.length < total);
        return updated;
      });
      setQrsTotal(total);
      setQrsPage(page);
      setQrStatusSummary(statusCounts);
    } catch (err) {
      handleRequestError(err, setQrsError, "Unable to load QR codes.");
    } finally {
      setIsLoadingQrs(false);
    }
  };

  const loadWithdrawals = async (authToken = token) => {
    if (!authToken) return;
    setIsLoadingWithdrawals(true);
    setWithdrawalsError("");
    try {
      const data = await getAdminWithdrawals(authToken);
      setWithdrawals(data || []);
    } catch (err) {
      handleRequestError(
        err,
        setWithdrawalsError,
        "Unable to load withdrawals.",
      );
    } finally {
      setIsLoadingWithdrawals(false);
    }
  };

  const loadNotifications = async (authToken = token) => {
    if (!authToken) return;
    setIsLoadingNotifications(true);
    setNotificationsError("");
    try {
      const data = await getAdminNotifications(authToken);
      const items = Array.isArray(data) ? data : data?.items || [];
      setNotifications(items);
    } catch (err) {
      if (err?.status === 404) {
        setNotifications([]);
      } else {
        handleRequestError(
          err,
          setNotificationsError,
          "Unable to load notifications.",
        );
      }
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const loadLogs = async (authToken = token, params = {}) => {
    if (!authToken) return;
    setLogsLoading(true);
    setLogsError("");
    try {
      const { logs: logData, total } = await getAdminActivityLogs(authToken, {
        page: logsPage,
        ...params,
      });
      setLogs(logData || []);
      setLogsTotal(total || 0);
    } catch (err) {
      handleRequestError(err, setLogsError, "Unable to load activity logs.");
    } finally {
      setLogsLoading(false);
    }
  };

  const loadSettings = async (authToken = token) => {
    if (!authToken) return;
    setSettingsLoading(true);
    setSettingsError("");
    try {
      const data = await getAdminSystemSettings(authToken);
      const defaultFraudThresholds = {
        maxRedemptionsPerUser: 5,
        maxRedeemerSharePercent: 40,
      };
      const normalizedMetadata = {
        ...(data?.metadata || {}),
      };
      normalizedMetadata.blogUsers = normalizeBlogUsers(
        normalizedMetadata.blogUsers,
        normalizedMetadata.blogCredentials,
      );
      if (
        !Array.isArray(normalizedMetadata.homeBanners) ||
        normalizedMetadata.homeBanners.length === 0
      ) {
        normalizedMetadata.homeBanners = cloneHomeBanners(defaultHomeBanners);
      }
      const rawRedeemStore =
        normalizedMetadata.redeemStore &&
        typeof normalizedMetadata.redeemStore === "object"
          ? normalizedMetadata.redeemStore
          : {};
      const normalizedRedeemProducts = normalizeRedeemProducts(
        rawRedeemStore.products,
      );
      const normalizedRedeemCategories = normalizeRedeemStoreCategories([
        ...(Array.isArray(rawRedeemStore.categories)
          ? rawRedeemStore.categories
          : []),
        ...normalizedRedeemProducts
          .map((product) => product.category)
          .filter(Boolean),
      ]);
      normalizedMetadata.redeemStore = {
        tabs: normalizeRedeemStoreTabs(rawRedeemStore.tabs),
        categories: normalizedRedeemCategories,
        products: normalizedRedeemProducts,
      };
      normalizedMetadata.blogs = normalizeBlogEntries(normalizedMetadata.blogs);
      const normalized = {
        ...(data || {}),
        metadata: normalizedMetadata,
        waitlistEnabled:
          data?.waitlistEnabled ?? data?.metadata?.waitlistEnabled ?? false,
        fraudThresholds:
          data?.fraudThresholds ??
          data?.metadata?.fraudThresholds ??
          defaultFraudThresholds,
      };
      setSettings(normalized);
    } catch (err) {
      handleRequestError(
        err,
        setSettingsError,
        "Unable to load system settings.",
      );
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadFinanceSummary = async (authToken = token) => {
    if (!authToken) return;
    setFinanceLoading(true);
    setFinanceError("");
    try {
      const data = await getAdminFinanceSummary(authToken);
      setFinanceSummary(data || null);
    } catch (err) {
      handleRequestError(
        err,
        setFinanceError,
        "Unable to load finance summary.",
      );
    } finally {
      setFinanceLoading(false);
    }
  };

  const loadSupportTickets = async (authToken = token) => {
    if (!authToken) return;
    setSupportLoading(true);
    setSupportError("");
    try {
      const data = await getAdminSupportTickets(authToken);
      setSupportTickets(Array.isArray(data) ? data : data?.tickets || []);
    } catch (err) {
      handleRequestError(
        err,
        setSupportError,
        "Unable to load support tickets.",
      );
    } finally {
      setSupportLoading(false);
    }
  };

  const loadAll = async (authToken = token) => {
    if (!authToken) return;
    setIsRefreshing(true);
    await Promise.all([
      loadDashboardStats(authToken),
      loadUsers(authToken),
      loadVendors(authToken),
      loadBrands(authToken),
      loadCampaigns(authToken),
      loadOrders(authToken),
      loadTransactions(authToken),
      loadQrs(authToken),
      loadWithdrawals(authToken),
      loadNotifications(authToken),
      loadFinanceSummary(authToken),
      loadSupportTickets(authToken),
    ]);
    setIsRefreshing(false);
  };

  const loadSectionData = async (authToken = token) => {
    if (!authToken) return;
    setIsRefreshing(true);
    const tasks = [];

    if (isOverviewRoute) {
      tasks.push(
        loadDashboardStats(authToken),
        loadUsers(authToken),
        loadVendors(authToken),
        loadBrands(authToken),
        loadOrders(authToken),
        loadTransactions(authToken),
        loadQrs(authToken),
        loadWithdrawals(authToken),
        loadNotifications(authToken),
        loadFinanceSummary(authToken),
      );
    } else if (isAnalyticsRoute) {
      tasks.push(
        loadDashboardStats(authToken),
        loadTransactions(authToken),
        loadQrs(authToken),
        loadUsers(authToken),
      );
    } else if (isOperationsRoute) {
      tasks.push(loadVendors(authToken), loadBrands(authToken));
    } else if (isCampaignsRoute) {
      tasks.push(loadCampaigns(authToken));
    } else if (isOrdersRoute) {
      tasks.push(
        loadOrders(authToken),
        loadQrs(authToken),
        loadVendors(authToken),
        loadBrands(authToken),
      );
    } else if (isPayoutsRoute) {
      tasks.push(loadWithdrawals(authToken), loadTransactions(authToken));
    } else if (isFinanceRoute) {
      tasks.push(
        loadFinanceSummary(authToken),
        loadTransactions(authToken),
        loadOrders(authToken),
      );
    } else if (isUsersRoute) {
      tasks.push(loadUsers(authToken));
    } else if (isSupportRoute) {
      tasks.push(loadSupportTickets(authToken));
    } else if (isVendorsRoute) {
      tasks.push(loadVendors(authToken), loadBrands(authToken));
    } else if (isTransactionsRoute) {
      tasks.push(loadTransactions(authToken));
    } else if (isQrsRoute) {
      tasks.push(loadQrs(authToken));
    } else if (isLogsRoute) {
      tasks.push(loadLogs(authToken));
    } else if (isRedeemCatalogRoute || isAddProductRoute) {
      tasks.push(loadSettings(authToken));
    } else if (isBlogsRoute) {
      tasks.push(loadSettings(authToken));
    } else if (isProductTrackRoute) {
      tasks.push(loadTransactions(authToken), loadSettings(authToken));
    } else if (isSettingsRoute) {
      tasks.push(loadSettings(authToken), loadBrands(authToken));
    }

    if (tasks.length) {
      await Promise.all(tasks);
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (!token) return;
    loadAdmin(token);
  }, [token]);

  useEffect(() => {
    if (!token || !adminInfo || adminInfo.role !== "admin") return;
    loadSectionData(token);
  }, [token, adminInfo, activeSection, activeSubSection]);

  useEffect(() => {
    if (!isSupportRoute) return;
    setSupportView(isProductReportsRoute ? "product" : "all");
  }, [isSupportRoute, isProductReportsRoute]);

  useEffect(() => {
    setVendorTechFeeDrafts((prev) => {
      const next = { ...prev };
      const vendorIds = new Set();
      let changed = false;

      (vendors || []).forEach((vendor) => {
        if (!vendor?.id) return;
        vendorIds.add(vendor.id);
        if (next[vendor.id] === undefined) {
          const fee = getVendorTechFee(vendor);
          next[vendor.id] = fee > 0 ? Number(fee).toFixed(2) : "";
          changed = true;
        }
      });

      Object.keys(next).forEach((vendorId) => {
        if (!vendorIds.has(vendorId)) {
          delete next[vendorId];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [vendors]);

  useEffect(() => {
    setVendorPlanTypeDrafts((prev) => {
      const next = { ...prev };
      const vendorIds = new Set();
      let changed = false;

      (vendors || []).forEach((vendor) => {
        if (!vendor?.id) return;
        vendorIds.add(vendor.id);
        const currentPlan = String(
          vendor?.Brand?.defaultPlanType || "prepaid",
        ).toLowerCase();
        if (next[vendor.id] === undefined) {
          next[vendor.id] = currentPlan;
          changed = true;
        }
      });

      Object.keys(next).forEach((vendorId) => {
        if (!vendorIds.has(vendorId)) {
          delete next[vendorId];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [vendors]);

  useEffect(() => {
    if (!token || !campaignAnalyticsId) return;
    loadCampaignAnalytics(token, campaignAnalyticsId);
  }, [token, campaignAnalyticsId]);

  useEffect(() => {
    if (campaignAnalyticsId) return;
    setCampaignAnalytics(null);
  }, [campaignAnalyticsId]);

  useEffect(() => {
    localStorage.setItem(
      ADMIN_SIDEBAR_KEY,
      sidebarCollapsed ? "collapsed" : "expanded",
    );
  }, [sidebarCollapsed]);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setAuthError("Enter email and password to continue.");
      return;
    }
    setAuthError("");
    setAuthStatus("");
    setIsSigningIn(true);
    try {
      const data = await loginWithEmail(email.trim(), password);
      if (data.role !== "admin") {
        throw new Error("This account is not an admin.");
      }
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setToken(data.token);
      setAdminInfo({ name: data.name, email: data.email, role: data.role });
      setEmail("");
      setPassword("");
      setAuthStatus("Signed in successfully.");
    } catch (err) {
      setAuthError(err.message || "Sign in failed.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = () => {
    clearSession("Signed out.");
    setUsers([]);
    setVendors([]);
    setCampaigns([]);
    setOrders([]);
    setTransactions([]);
    setQrs([]);
    setWithdrawals([]);
    setFinanceSummary(null);
    setSupportTickets([]);
    setSupportReplies({});
    setSupportView("all");
    setSelectedUser(null);
    setIsUserWalletOpen(false);
    setOrdersTotal(0);
    setOrdersPage(1);
    setOrderStatusSummary({});
    setOrdersHasMore(false);
    setQrsTotal(0);
    setQrsPage(1);
    setQrStatusSummary({});
    setQrsHasMore(false);
  };

  const handleUserStatusSave = async (userId, currentStatus) => {
    const nextStatus = userStatusUpdates[userId] || currentStatus;
    if (!nextStatus) return;
    setUserActionStatus("");
    setUserActionError("");
    try {
      await updateAdminUserStatus(token, userId, nextStatus);
      setUserActionStatus("User status updated.");
      await loadUsers(token);
    } catch (err) {
      handleRequestError(
        err,
        setUserActionError,
        "Unable to update user status.",
      );
    }
  };

  const handleVendorStatusSave = async (vendorId, currentStatus) => {
    const nextStatus = vendorStatusUpdates[vendorId] || currentStatus;
    if (!nextStatus) return;
    setVendorActionStatus("");
    setVendorActionError("");
    try {
      await updateAdminVendorStatus(token, vendorId, nextStatus);
      setVendorActionStatus("Vendor status updated.");
      await loadVendors(token);
    } catch (err) {
      handleRequestError(
        err,
        setVendorActionError,
        "Unable to update vendor status.",
      );
    }
  };

  const handleVendorTechFeeChange = (vendorId, value) => {
    setVendorTechFeeDrafts((prev) => ({ ...prev, [vendorId]: value }));
    setVendorActionStatus("");
    setVendorActionError("");
  };

  const handleVendorTechFeeSave = async (vendor) => {
    if (!vendor?.id) return;

    const rawValue = vendorTechFeeDrafts[vendor.id];
    const nextFee = Number(rawValue);
    if (!Number.isFinite(nextFee) || nextFee <= 0 || nextFee > MAX_QR_PRICE) {
      setVendorActionError(
        `Tech fee must be between 0.01 and ${MAX_QR_PRICE}.`,
      );
      return;
    }

    setVendorActionStatus("");
    setVendorActionError("");
    setVendorTechFeeSaving((prev) => ({ ...prev, [vendor.id]: true }));

    try {
      const normalizedFee = Number(nextFee.toFixed(2));
      await updateAdminVendorDetails(token, vendor.id, {
        techFeePerQr: normalizedFee,
      });
      setVendorActionStatus("Tech fee updated.");
      setVendorTechFeeDrafts((prev) => ({
        ...prev,
        [vendor.id]: normalizedFee.toFixed(2),
      }));
      await loadVendors(token);
    } catch (err) {
      handleRequestError(
        err,
        setVendorActionError,
        "Unable to update tech fee.",
      );
    } finally {
      setVendorTechFeeSaving((prev) => ({ ...prev, [vendor.id]: false }));
    }
  };

  const handlePlanTypeUpdate = async (vendor, newType) => {
    if (!vendor?.Brand?.id || !newType) return;
    const normalizedType = String(newType).toLowerCase();
    if (!["prepaid", "postpaid"].includes(normalizedType)) return;
    setVendorActionStatus("");
    setVendorActionError("");
    setVendorPlanTypeSaving((prev) => ({ ...prev, [vendor.id]: true }));

    try {
      await updateAdminBrandDetails(token, vendor.Brand.id, {
        defaultPlanType: normalizedType,
      });
      setVendorActionStatus("Plan type updated.");
      setVendorPlanTypeDrafts((prev) => ({
        ...prev,
        [vendor.id]: normalizedType,
      }));
      await loadVendors(token);
    } catch (err) {
      handleRequestError(
        err,
        setVendorActionError,
        "Unable to update plan type.",
      );
    } finally {
      setVendorPlanTypeSaving((prev) => ({ ...prev, [vendor.id]: false }));
    }
  };

  const handleBrandFormChange = (field) => (event) => {
    setBrandForm((prev) => ({ ...prev, [field]: event.target.value }));
    setBrandCreationError("");
    setBrandCreationMessage("");
    setCreatedBrandCredentials(null);
    setCreatedBrandDetails(null);
    if (field === "logoUrl") {
      setBrandLogoUploadStatus("");
      setBrandLogoUploadError("");
    }
  };

  const handleBrandLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!token) {
      setBrandLogoUploadError("Please sign in first.");
      return;
    }
    setBrandLogoUploadStatus("");
    setBrandLogoUploadError("");
    setIsUploadingBrandLogo(true);
    try {
      const data = await uploadImage(token, file);
      const uploadedUrl = data?.url;
      if (!uploadedUrl) {
        throw new Error("Upload failed. No URL returned.");
      }
      setBrandForm((prev) => ({ ...prev, logoUrl: uploadedUrl }));
      setBrandLogoUploadStatus("Logo uploaded.");
    } catch (err) {
      setBrandLogoUploadError(err.message || "Failed to upload logo.");
    } finally {
      setIsUploadingBrandLogo(false);
      event.target.value = "";
    }
  };

  const handleCreateBrand = async () => {
    if (!brandForm.brandName.trim()) {
      setBrandCreationError("Brand name is required.");
      return;
    }
    const priceValue =
      brandForm.qrPricePerUnit === "" ? null : Number(brandForm.qrPricePerUnit);
    if (
      priceValue !== null &&
      (!Number.isFinite(priceValue) ||
        priceValue <= 0 ||
        priceValue > MAX_QR_PRICE)
    ) {
      setBrandCreationError(
        `QR price per unit must be between 0.01 and ${MAX_QR_PRICE}.`,
      );
      return;
    }

    setIsCreatingBrand(true);
    setBrandCreationError("");
    setBrandCreationMessage("");
    setCreatedBrandCredentials(null);
    setCreatedBrandDetails(null);

    try {
      const payload = {
        name: brandForm.brandName.trim(),
        logoUrl: brandForm.logoUrl.trim() || undefined,
        website: brandForm.website.trim() || undefined,
        vendorEmail: brandForm.vendorEmail.trim() || undefined,
        vendorPhone: brandForm.vendorPhone.trim() || undefined,
        qrPricePerUnit: priceValue ?? undefined,
      };

      const data = await createAdminBrand(token, payload);
      setBrandCreationMessage(
        "Brand created and vendor credentials generated.",
      );
      setCreatedBrandCredentials(data?.credentials || null);
      setCreatedBrandDetails({
        brand: data?.brand,
        vendor: data?.vendor,
      });
      setBrandForm(getDefaultBrandFormState());
      setBrandLogoUploadStatus("");
      setBrandLogoUploadError("");
      await loadVendors(token);
    } catch (err) {
      const errorMessage =
        err?.data?.error || err?.message || "Unable to create brand.";
      setBrandCreationError(errorMessage);
    } finally {
      setIsCreatingBrand(false);
    }
  };

  const handleWalletCredit = async () => {
    if (!walletCredit.vendorId.trim() || !walletCredit.amount) {
      setWalletError("Vendor ID and amount are required.");
      return;
    }
    if (!walletCredit.description.trim()) {
      setWalletError("Please add a justification for this adjustment.");
      return;
    }
    setWalletError("");
    setWalletStatus("");
    setIsCreditingWallet(true);
    try {
      await adjustVendorWalletAdmin(token, {
        vendorId: walletCredit.vendorId.trim(),
        amount: Number(walletCredit.amount),
        description: walletCredit.description.trim(),
        type: walletCredit.type,
      });
      setWalletStatus(
        walletCredit.type === "debit"
          ? "Wallet debited successfully."
          : "Wallet credited successfully.",
      );
      setWalletCredit({
        vendorId: "",
        amount: "",
        description: "",
        type: "credit",
      });
      await loadTransactions(token);
    } catch (err) {
      handleRequestError(
        err,
        setWalletError,
        "Unable to adjust vendor wallet.",
      );
    } finally {
      setIsCreditingWallet(false);
    }
  };

  const handleCampaignStatusUpdate = async () => {
    if (!campaignControl.id.trim()) {
      setCampaignError("Campaign ID is required.");
      return;
    }
    setCampaignError("");
    setCampaignStatus("");
    setIsUpdatingCampaign(true);
    try {
      await updateAdminCampaignStatus(
        token,
        campaignControl.id.trim(),
        campaignControl.status,
      );
      setCampaignStatus("Campaign status updated.");
      setCampaignControl((prev) => ({ ...prev, id: "" }));
      await loadCampaigns(token);
    } catch (err) {
      handleRequestError(
        err,
        setCampaignError,
        "Unable to update campaign status.",
      );
    } finally {
      setIsUpdatingCampaign(false);
    }
  };

  const getHomeBanners = () => {
    const banners = settings?.metadata?.homeBanners;
    return Array.isArray(banners) ? banners : [];
  };

  const setHomeBanners = (nextBanners) => {
    setSettings((prev) => ({
      ...(prev || {}),
      metadata: {
        ...(prev?.metadata || {}),
        homeBanners: nextBanners,
      },
    }));
  };

  const handleBannerFieldChange = (index, field, value) => {
    const banners = getHomeBanners();
    const next = banners.map((banner, idx) =>
      idx === index ? { ...(banner || {}), [field]: value } : banner,
    );
    setHomeBanners(next);
  };

  const handleAddBanner = () => {
    const banners = getHomeBanners();
    setHomeBanners([
      ...banners,
      {
        title: "",
        subtitle: "",
        accent: "",
        img: "",
        link: "",
      },
    ]);
  };

  const handleRemoveBanner = (index) => {
    const banners = getHomeBanners();
    const next = banners.filter((_, idx) => idx !== index);
    setHomeBanners(next);
  };

  const handleBannerImageUpload = async (index, file) => {
    if (!file) return;
    if (!token) {
      setBannerUploadState((prev) => ({
        ...prev,
        [index]: { status: "", error: "Sign in to upload." },
      }));
      return;
    }

    setBannerUploadState((prev) => ({
      ...prev,
      [index]: { status: "Uploading...", error: "" },
    }));

    try {
      const data = await uploadImage(token, file);
      const uploadedUrl = data?.url;
      if (!uploadedUrl) {
        throw new Error("Upload failed. No URL returned.");
      }
      handleBannerFieldChange(index, "img", uploadedUrl);
      setBannerUploadState((prev) => ({
        ...prev,
        [index]: { status: "Banner image uploaded.", error: "" },
      }));
    } catch (err) {
      setBannerUploadState((prev) => ({
        ...prev,
        [index]: { status: "", error: err.message || "Upload failed." },
      }));
    }
  };

  const getBlogs = () => {
    const blogs = settings?.metadata?.blogs;
    return Array.isArray(blogs) ? blogs : [];
  };

  const setBlogs = (nextBlogs) => {
    setSettings((prev) => ({
      ...(prev || {}),
      metadata: {
        ...(prev?.metadata || {}),
        blogs: nextBlogs,
      },
    }));
  };

  const getBlogUsers = () => {
    const users = settings?.metadata?.blogUsers;
    return Array.isArray(users) ? users : [];
  };

  const setBlogUsers = (nextUsers) => {
    setSettings((prev) => ({
      ...(prev || {}),
      metadata: {
        ...(prev?.metadata || {}),
        blogUsers: nextUsers,
      },
    }));
  };

  const handleAddBlogUser = () => {
    setBlogUsers([createBlogUserDraft(), ...getBlogUsers()]);
  };

  const handleBlogUserChange = (index, field, value) => {
    setBlogUsers(
      getBlogUsers().map((user, idx) =>
        idx === index ? { ...(user || {}), [field]: value } : user,
      ),
    );
  };

  const handleRemoveBlogUser = (index) => {
    setBlogUsers(getBlogUsers().filter((_, idx) => idx !== index));
  };

  const handleBlogFieldChange = (index, field, value) => {
    const blogs = getBlogs();
    const next = blogs.map((blog, idx) => {
      if (idx === index) {
        const updated = { ...(blog || {}), [field]: value };
        if (field === "title") {
          updated.slug = value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
        }
        return updated;
      }
      return blog;
    });
    setBlogs(next);
  };

  const handleAddBlog = () => {
    const newBlog = createBlogDraft();
    setBlogs([newBlog, ...getBlogs()]);
    setEditingBlogId(newBlog.id);
  };

  const handleRemoveBlog = (index) => {
    const blogsList = getBlogs();
    const blogToRemove = blogsList[index];
    setBlogs(blogsList.filter((_, idx) => idx !== index));
    if (blogToRemove && blogToRemove.id === editingBlogId) {
      setEditingBlogId(null);
    }
  };

  const handleBlogImageUpload = async (index, file) => {
    if (!file) return;
    if (!token) {
      setBlogUploadState((prev) => ({
        ...prev,
        [index]: { status: "", error: "Sign in to upload." },
      }));
      return;
    }

    setBlogUploadState((prev) => ({
      ...prev,
      [index]: { status: "Uploading...", error: "" },
    }));

    try {
      const data = await uploadImage(token, file);
      const uploadedUrl = data?.url;
      if (!uploadedUrl) {
        throw new Error("Upload failed. No URL returned.");
      }
      handleBlogFieldChange(index, "coverImage", uploadedUrl);
      setBlogUploadState((prev) => ({
        ...prev,
        [index]: { status: "Cover image uploaded.", error: "" },
      }));
    } catch (err) {
      setBlogUploadState((prev) => ({
        ...prev,
        [index]: { status: "", error: err.message || "Upload failed." },
      }));
    }
  };

  const getRedeemStoreConfig = () => {
    const redeemStore = settings?.metadata?.redeemStore;
    if (!redeemStore || typeof redeemStore !== "object") {
      return {
        tabs: normalizeRedeemStoreTabs(defaultRedeemStoreTabs),
        categories: normalizeRedeemStoreCategories(
          defaultRedeemStoreCategories,
        ),
        products: [],
      };
    }
    return redeemStore;
  };

  const getRedeemStoreProducts = () => {
    const products = getRedeemStoreConfig().products;
    return Array.isArray(products) ? products : [];
  };

  const setRedeemStoreProducts = (nextProducts) => {
    setSettings((prev) => {
      const metadata = prev?.metadata || {};
      const currentRedeemStore =
        metadata?.redeemStore && typeof metadata.redeemStore === "object"
          ? metadata.redeemStore
          : {};
      const normalizedProducts = Array.isArray(nextProducts)
        ? nextProducts
        : [];
      const mergedCategories = normalizeRedeemStoreCategories([
        ...(Array.isArray(currentRedeemStore.categories)
          ? currentRedeemStore.categories
          : []),
        ...normalizedProducts
          .map((product) => product?.category)
          .filter(Boolean),
      ]);

      return {
        ...(prev || {}),
        metadata: {
          ...metadata,
          redeemStore: {
            tabs: normalizeRedeemStoreTabs(currentRedeemStore.tabs),
            categories: mergedCategories,
            products: normalizedProducts,
          },
        },
      };
    });
  };

  const handleAddRedeemProduct = () => {
    if (!settings) return;
    setEditingRedeemProductIndex(-1);
    setRedeemProductDraft(createRedeemProductDraft());
    setRedeemProductDraftUpload({ status: "", error: "" });
    setRedeemProductDraftError("");
    navigate("/admin/add-product");
  };

  const handleCloseRedeemProductModal = () => {
    if (settingsLoading) return;
    setEditingRedeemProductIndex(-1);
    setRedeemProductDraft(createRedeemProductDraft());
    setRedeemProductDraftUpload({ status: "", error: "" });
    setRedeemProductDraftError("");
    navigate("/admin/redeem-catalog");
  };

  const handleEditRedeemProduct = (index) => {
    const product = redeemStoreProducts[index];
    if (!product) return;

    setEditingRedeemProductIndex(index);
    setRedeemProductDraft({
      ...product,
      isEditing: true,
    });
    navigate("/admin/add-product");
  };

  const handleRedeemProductDraftFieldChange = (field, value) => {
    const nextValue =
      field === "amount" || field === "stock"
        ? value === ""
          ? ""
          : (() => {
              const numeric = Number(value);
              return Number.isFinite(numeric) ? Math.max(0, numeric) : "";
            })()
        : value;
    setRedeemProductDraft((prev) => ({
      ...(prev || {}),
      [field]: nextValue,
    }));
    if (redeemProductDraftError) {
      setRedeemProductDraftError("");
    }
  };

  const handleRedeemProductDraftImageUpload = async (file) => {
    if (!file) return;
    if (!token) {
      setRedeemProductDraftUpload({
        status: "",
        error: "Sign in to upload.",
      });
      return;
    }

    setRedeemProductDraftUpload({
      status: "Uploading...",
      error: "",
    });

    try {
      const data = await uploadImage(token, file);
      const uploadedUrl = data?.url;
      if (!uploadedUrl) {
        throw new Error("Upload failed. No URL returned.");
      }
      setRedeemProductDraft((prev) => {
        const currentImages = Array.isArray(prev?.images) ? prev.images : (prev?.image ? [prev.image] : []);
        const nextImages = [...new Set([...currentImages, uploadedUrl].filter(Boolean))];
        return {
          ...(prev || {}),
          image: prev?.image || uploadedUrl,
          images: nextImages,
        };
      });
      setRedeemProductDraftUpload({
        status: "Product image uploaded.",
        error: "",
      });
    } catch (err) {
      setRedeemProductDraftUpload({
        status: "",
        error: err.message || "Upload failed.",
      });
    }
  };

  const persistRedeemProductChanges = async (nextProducts) => {
    if (!settings) return;
    setSettingsLoading(true);
    try {
      const currentRedeemStore =
        settings?.metadata?.redeemStore &&
        typeof settings.metadata.redeemStore === "object"
          ? settings.metadata.redeemStore
          : {};

      const normalizedRedeemProducts = normalizeRedeemProducts(nextProducts);

      const normalizedRedeemStore = {
        tabs: normalizeRedeemStoreTabs(currentRedeemStore.tabs),
        categories: normalizeRedeemStoreCategories([
          ...(Array.isArray(currentRedeemStore.categories)
            ? currentRedeemStore.categories
            : []),
          ...normalizedRedeemProducts
            .map((product) => product.category)
            .filter(Boolean),
        ]),
        products: normalizedRedeemProducts,
      };

      const metadata = {
        ...(settings.metadata || {}),
        redeemStore: normalizedRedeemStore,
        waitlistEnabled: settings.waitlistEnabled ?? false,
        fraudThresholds: settings.fraudThresholds,
      };

      await updateAdminSystemSettings(token, {
        techFeePerQr: settings.techFeePerQr,
        minPayoutAmount: settings.minPayoutAmount,
        maxDailyPayout: settings.maxDailyPayout,
        qrExpiryDays: settings.qrExpiryDays,
        platformName: settings.platformName,
        supportEmail: settings.supportEmail,
        termsUrl: settings.termsUrl,
        privacyUrl: settings.privacyUrl,
        metadata,
        waitlistEnabled: settings.waitlistEnabled,
        fraudThresholds: settings.fraudThresholds,
      });

      setSettingsMessage("Store updated successfully.");
      await loadSettings(token);
    } catch (err) {
      console.error("Failed to persist redeem products:", err);
      setSettingsError("Failed to save changes. Please try again.");
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveRedeemProduct = async (productData) => {
    if (!settings) return;

    // Validate
    if (!productData.name) {
      setRedeemProductDraftError("Product name is required.");
      return;
    }

    const currentProducts = getRedeemStoreProducts();
    const normalizedData = normalizeRedeemProductEntry(
      productData,
      editingRedeemProductIndex >= 0
        ? editingRedeemProductIndex
        : currentProducts.length,
    );

    // Check dupes only if adding new or changing ID
    if (editingRedeemProductIndex === -1) {
      const exists = currentProducts.some(
        (p) =>
          String(p?.id || "").toLowerCase() ===
          String(normalizedData.id).toLowerCase(),
      );
      if (exists) {
        setRedeemProductDraftError(
          "Product ID already exists. Use a unique ID.",
        );
        return;
      }
    } else {
      // If editing, check if ID clashes with *other* products
      const exists = currentProducts.some(
        (p, idx) =>
          idx !== editingRedeemProductIndex &&
          String(p?.id || "").toLowerCase() ===
            String(normalizedData.id).toLowerCase(),
      );
      if (exists) {
        setRedeemProductDraftError(
          "Product ID already exists. Use a unique ID.",
        );
        return;
      }
    }

    let nextProducts = [...currentProducts];
    if (editingRedeemProductIndex >= 0) {
      nextProducts[editingRedeemProductIndex] = normalizedData;
    } else {
      nextProducts.push(normalizedData);
    }

    setRedeemStoreProducts(nextProducts);
    await persistRedeemProductChanges(nextProducts);
    handleCloseRedeemProductModal();
  };

  const handleRemoveRedeemProduct = (index) => {
    if (!settings) return;
    setProductToDeleteIndex(index);
    setIsDeleteRedeemProductModalOpen(true);
  };

  const confirmDeleteRedeemProduct = async () => {
    if (!settings || productToDeleteIndex === -1) return;
    const currentProducts = getRedeemStoreProducts();
    const nextProducts = currentProducts.filter(
      (_, idx) => idx !== productToDeleteIndex,
    );

    setRedeemStoreProducts(nextProducts);

    // Cleanup upload state (optional but good practice)
    setRedeemProductUploadState((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        const numericKey = Number(key);
        if (!Number.isFinite(numericKey) || numericKey === productToDeleteIndex)
          return;
        next[numericKey > productToDeleteIndex ? numericKey - 1 : numericKey] =
          value;
      });
      return next;
    });

    setIsDeleteRedeemProductModalOpen(false);
    setProductToDeleteIndex(-1);

    await persistRedeemProductChanges(nextProducts);
  };

  const handleToggleProductStatusConfirm = (index) => {
    const product = getRedeemStoreProducts()[index];
    if (!product) return;
    const currentStatus = String(product.status || "active").toLowerCase();
    setProductStatusToggleModal({ isOpen: true, index, currentStatus });
  };

  const confirmToggleProductStatus = async () => {
    const { index, currentStatus } = productStatusToggleModal;
    if (index === -1) return;
    const nextStatus = currentStatus === "inactive" ? "active" : "inactive";
    const currentProducts = getRedeemStoreProducts();
    const nextProducts = [...currentProducts];
    nextProducts[index] = { ...nextProducts[index], status: nextStatus };
    setRedeemStoreProducts(nextProducts);
    await persistRedeemProductChanges(nextProducts);
    setProductStatusToggleModal({ isOpen: false, index: -1, currentStatus: "" });
  };

  const handleRedeemProductFieldChange = (index, field, value) => {
    if (!settings) return;
    const currentProducts = getRedeemStoreProducts();
    const nextProducts = currentProducts.map((product, idx) => {
      if (idx !== index) return product;
      const nextValue =
        field === "amount" || field === "stock"
          ? value === ""
            ? ""
            : (() => {
                const numeric = Number(value);
                return Number.isFinite(numeric) ? Math.max(0, numeric) : "";
              })()
          : value;
      return {
        ...(product || {}),
        [field]: nextValue,
      };
    });
    setRedeemStoreProducts(nextProducts);
  };

  const handleRedeemProductImageUpload = async (index, file) => {
    if (!file) return;
    if (!token) {
      setRedeemProductUploadState((prev) => ({
        ...prev,
        [index]: { status: "", error: "Sign in to upload." },
      }));
      return;
    }

    setRedeemProductUploadState((prev) => ({
      ...prev,
      [index]: { status: "Uploading...", error: "" },
    }));

    try {
      const data = await uploadImage(token, file);
      const uploadedUrl = data?.url;
      if (!uploadedUrl) {
        throw new Error("Upload failed. No URL returned.");
      }
      handleRedeemProductFieldChange(index, "image", uploadedUrl);
      setRedeemProductUploadState((prev) => ({
        ...prev,
        [index]: { status: "Product image uploaded.", error: "" },
      }));
    } catch (err) {
      setRedeemProductUploadState((prev) => ({
        ...prev,
        [index]: { status: "", error: err.message || "Upload failed." },
      }));
    }
  };

  const handleSettingsUpdate = async () => {
    if (!settings) return;
    setSettingsMessage("");
    setSettingsError("");
    setSettingsLoading(true);
    try {
      const currentRedeemStore =
        settings?.metadata?.redeemStore &&
        typeof settings.metadata.redeemStore === "object"
          ? settings.metadata.redeemStore
          : {};
      const normalizedRedeemProducts = normalizeRedeemProducts(
        currentRedeemStore.products,
      );
      const normalizedRedeemStore = {
        tabs: normalizeRedeemStoreTabs(currentRedeemStore.tabs),
        categories: normalizeRedeemStoreCategories([
          ...(Array.isArray(currentRedeemStore.categories)
            ? currentRedeemStore.categories
            : []),
          ...normalizedRedeemProducts
            .map((product) => product.category)
            .filter(Boolean),
        ]),
        products: normalizedRedeemProducts,
      };
      const metadata = {
        ...(settings.metadata || {}),
        redeemStore: normalizedRedeemStore,
        waitlistEnabled: settings.waitlistEnabled ?? false,
        fraudThresholds: settings.fraudThresholds,
      };
      await updateAdminSystemSettings(token, {
        techFeePerQr: settings.techFeePerQr,
        minPayoutAmount: settings.minPayoutAmount,
        maxDailyPayout: settings.maxDailyPayout,
        qrExpiryDays: settings.qrExpiryDays,
        platformName: settings.platformName,
        supportEmail: settings.supportEmail,
        termsUrl: settings.termsUrl,
        privacyUrl: settings.privacyUrl,
        metadata,
        waitlistEnabled: settings.waitlistEnabled,
        fraudThresholds: settings.fraudThresholds,
      });
      setSettingsMessage("System settings updated successfully.");
      await loadSettings(token);
    } catch (err) {
      handleRequestError(
        err,
        setSettingsError,
        "Unable to update system settings.",
      );
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleVendorDetailsSave = async () => {
    if (!vendorEditForm.vendorId) {
      setVendorEditError("Select a vendor to update.");
      return;
    }
    setVendorEditError("");
    setVendorEditStatus("");
    setIsUpdatingVendorDetails(true);
    try {
      await updateAdminVendorDetails(token, vendorEditForm.vendorId, {
        businessName: vendorEditForm.businessName,
        contactPhone: vendorEditForm.contactPhone,
        contactEmail: vendorEditForm.contactEmail,
        gstin: vendorEditForm.gstin,
        address: vendorEditForm.address,
      });
      setVendorEditStatus("Vendor profile updated.");
      await loadVendorOverview(token, vendorEditForm.vendorId);
      await loadVendors(token);
    } catch (err) {
      handleRequestError(
        err,
        setVendorEditError,
        "Unable to update vendor profile.",
      );
    } finally {
      setIsUpdatingVendorDetails(false);
    }
  };

  const handleBrandDetailsSave = async () => {
    if (!brandEditForm.brandId) {
      setBrandEditError("Select a brand to update.");
      return;
    }
    setBrandEditError("");
    setBrandEditStatus("");
    setIsUpdatingBrandDetails(true);
    try {
      await updateAdminBrandDetails(token, brandEditForm.brandId, {
        name: brandEditForm.name,
        logoUrl: brandEditForm.logoUrl,
        website: brandEditForm.website,
      });
      setBrandEditStatus("Brand details updated.");
      await loadBrandOverview(token, brandEditForm.brandId);
      await loadBrands(token);
      await loadVendors(token);
    } catch (err) {
      handleRequestError(
        err,
        setBrandEditError,
        "Unable to update brand details.",
      );
    } finally {
      setIsUpdatingBrandDetails(false);
    }
  };

  const handleBrandStatusSave = async () => {
    if (!brandStatusUpdate.brandId) {
      setBrandStatusError("Select a brand to update status.");
      return;
    }
    setBrandStatusError("");
    setBrandStatusMessage("");
    setIsUpdatingBrandStatus(true);
    try {
      await updateAdminBrandStatus(token, brandStatusUpdate.brandId, {
        status: brandStatusUpdate.status,
        reason: brandStatusUpdate.reason || undefined,
      });
      setBrandStatusMessage("Brand status updated.");
      await loadBrandOverview(token, brandStatusUpdate.brandId);
      await loadBrands(token);
      await loadVendors(token);
    } catch (err) {
      handleRequestError(
        err,
        setBrandStatusError,
        "Unable to update brand status.",
      );
    } finally {
      setIsUpdatingBrandStatus(false);
    }
  };

  const handleCampaignDetailsSave = async () => {
    if (!campaignEditForm.id) {
      setCampaignEditError("Select a campaign to update.");
      return;
    }
    setCampaignEditError("");
    setCampaignEditStatus("");
    setIsUpdatingCampaignDetails(true);
    try {
      const payload = {};
      if (campaignEditForm.title) payload.title = campaignEditForm.title;
      if (campaignEditForm.description)
        payload.description = campaignEditForm.description;
      if (campaignEditForm.cashbackAmount !== "") {
        payload.cashbackAmount = Number(campaignEditForm.cashbackAmount);
      }
      if (campaignEditForm.startDate)
        payload.startDate = campaignEditForm.startDate;
      if (campaignEditForm.endDate) payload.endDate = campaignEditForm.endDate;
      if (campaignEditForm.totalBudget !== "") {
        payload.totalBudget = Number(campaignEditForm.totalBudget);
      }
      if (campaignEditForm.subtotal !== "") {
        payload.subtotal = Number(campaignEditForm.subtotal);
      }
      await updateAdminCampaignDetails(token, campaignEditForm.id, payload);
      setCampaignEditStatus("Campaign details updated.");
      await loadCampaignAnalytics(token, campaignEditForm.id);
      await loadCampaigns(token);
    } catch (err) {
      handleRequestError(
        err,
        setCampaignEditError,
        "Unable to update campaign details.",
      );
    } finally {
      setIsUpdatingCampaignDetails(false);
    }
  };

  const [initialAccountTab, setInitialAccountTab] = useState("overview");

  const handleAccountView = (account) => {
    if (!account) return;

    /* If we are just toggling the modal for the same account without a specific tab request (or same tab), close it. */
    const isSameVendor =
      account.vendorId && account.vendorId === selectedVendorId;
    const isSameBrand = account.brandId && account.brandId === selectedBrandId;
    const isSameAccount =
      (isSameVendor || isSameBrand) &&
      (!account.vendorId || account.vendorId === selectedVendorId) &&
      (!account.brandId || account.brandId === selectedBrandId);

    // If requesting a specific tab, we might want to switch tabs even if modal is open
    const requestedTab = account.initialTab || "overview";

    if (
      isAccountModalOpen &&
      isSameAccount &&
      requestedTab === initialAccountTab
    ) {
      setIsAccountModalOpen(false);
      return;
    }

    if (account.vendorId || account.brandId) {
      setSelectedVendorId(account.vendorId || "");
      setSelectedBrandId(account.brandId || "");
      setInitialAccountTab(requestedTab);
      setIsAccountModalOpen(true);
    }
  };

  const closeAccountModal = () => {
    setIsAccountModalOpen(false);
  };

  const handleVendorDelete = async (vendor) => {
    if (!token) {
      alert("Admin session expired. Please refresh.");
      return;
    }

    // Try multiple possible paths for the User ID
    const userId = vendor.userId || vendor.User?.id || vendor.id;

    if (!userId) {
      alert("Could not identify the user associated with this vendor.");
      return;
    }

    const displayName =
      vendor.Brand?.name || vendor.businessName || vendor.User?.name || "Vendor";

    if (
      !window.confirm(
        `Are you sure you want to permanently delete the account for "${displayName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setVendorActionStatus("Processing deletion...");
    setVendorActionError("");

    try {
      await deleteAdminUser(token, userId);
      setVendorActionStatus("Vendor account deleted successfully.");
      // Force refresh vendors list
      if (typeof loadVendors === "function") {
        loadVendors(token);
      }
    } catch (err) {
      const errMsg = err.message || "Failed to delete account.";
      setVendorActionError(errMsg);
    }
  };

  useEffect(() => {
    if (!isAccountModalOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsAccountModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAccountModalOpen]);

  const handleDownloadOrderPdf = async (order) => {
    if (!order || !order.id) return;
    try {
      setIsPreparingBatchPdf(true);
      setQrBatchStatus("Fetching QRs...");

      // Fetch QRs for this specific order
      const data = await getAdminQrBatch(token, { orderId: order.id });
      const qrsToPrint = Array.isArray(data)
        ? data
        : data?.items || data?.qrs || [];

      if (!qrsToPrint.length) {
        setQrBatchError("No QRs found for this order.");
        setIsPreparingBatchPdf(false);
        return;
      }
      setBatchQrs(qrsToPrint);
      setQrBatchStatus(`Generating PDF for ${qrsToPrint.length} QRs...`);

      // Wait until hidden QR canvases are rendered before reading image data.
      await waitForPdfCanvases(qrsToPrint);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const cols = 2; // 2 columns
      const rows = 4; // 4 rows per page
      const boxWidth = 90;
      const boxHeight = 60;
      const xGap = (pageWidth - cols * boxWidth) / 3;
      const yGap = (pageHeight - rows * boxHeight) / 5;
      const perQrPrice = order.quantity
        ? Number(order.printCost || 0) / order.quantity
        : 0;
      const perQrLabel =
        Number.isFinite(perQrPrice) && perQrPrice > 0
          ? formatAmount(perQrPrice)
          : "0.00";
      const printCostLabel = formatAmount(order.printCost || 0);
      const headerOffset = 36;

      // Draw Header for context
      doc.setFontSize(16);
      doc.text(
        `QR Batch: ${order.campaignTitle || "Campaign"}`,
        pageWidth / 2,
        15,
        { align: "center" },
      );
      doc.setFontSize(10);
      doc.text(
        `Order ID: ${order.id} | Qty: ${order.quantity}`,
        pageWidth / 2,
        22,
        { align: "center" },
      );
      doc.text(
        `QR price: INR ${perQrLabel}/QR | Print cost: INR ${printCostLabel}`,
        pageWidth / 2,
        28,
        {
          align: "center",
        },
      );

      // Loop and draw QRs
      for (let i = 0; i < qrsToPrint.length; i++) {
        const qr = qrsToPrint[i];
        const canvasId = getPdfCanvasId(qr.uniqueHash);
        const canvas = document.getElementById(canvasId);

        if (canvas) {
          const imgData = canvas.toDataURL("image/png");
          const col = i % cols;
          const row = Math.floor(i / cols) % rows;

          // Add new page if needed
          if (i > 0 && i % (cols * rows) === 0) {
            doc.addPage();
          }

          const x = xGap + col * (boxWidth + xGap);
          const y = headerOffset + yGap + row * (boxHeight + yGap); // Offset for header

          // Card Border
          doc.setDrawColor(200, 200, 200);
          doc.rect(x, y, boxWidth, boxHeight, "S");

          // QR Image
          doc.addImage(imgData, "PNG", x + 5, y + 5, 50, 50);

          // Text details next to QR
          doc.setFontSize(9);
          doc.text("Scan to Claim", x + 60, y + 15);
          doc.setFontSize(12);
          doc.setTextColor(0, 128, 0); // Green
          doc.text(`INR ${qr.cashbackAmount}`, x + 60, y + 25);
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(8);
          doc.text(
            qr.uniqueHash ? qr.uniqueHash.slice(0, 8) : "",
            x + 60,
            y + 35,
          );
          doc.text("Powered by Incentify", x + 60, y + 50);
        } else {
          console.warn(`Canvas not found for QR ${qr.uniqueHash}`);
        }
      }

      doc.save(`Order_${order.id}_QRs.pdf`);
      setQrBatchStatus("Done!");
    } catch (err) {
      console.error("PDF Gen Error:", err);
      setQrBatchError("Failed to generate PDF");
    } finally {
      setIsPreparingBatchPdf(false);
      setBatchQrs([]);
    }
  };

  const renderOrderActions = (order) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleDownloadOrderPdf(order)}
        disabled={isPreparingBatchPdf}
        className="p-1.5 rounded-lg text-slate-500 hover:text-[#059669] hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
        title="Download QR PDF"
      >
        <Download size={16} />
      </button>
      {order.status === "paid" && (
        <button
          onClick={() => handleOrderStatusSave(order.id, "shipped")}
          className="px-2 py-1 text-xs rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 font-semibold"
        >
          Mark Shipped
        </button>
      )}
    </div>
  );

  const attentionRequests = useMemo(() => {
    const items = [];

    if (Array.isArray(withdrawals)) {
      withdrawals
        .filter(
          (withdrawal) =>
            String(withdrawal?.status || "").toLowerCase() === "pending",
        )
        .forEach((withdrawal) => {
          const vendorLabel =
            withdrawal?.Wallet?.Vendor?.businessName ||
            withdrawal?.Wallet?.User?.name ||
            withdrawal?.Wallet?.User?.email ||
            "Vendor";
          const createdAtValue = withdrawal?.createdAt
            ? new Date(withdrawal.createdAt).getTime()
            : 0;
          const amountLabel =
            withdrawal?.amount !== undefined && withdrawal?.amount !== null
              ? `INR ${formatAmount(withdrawal.amount)}`
              : null;

          items.push({
            id: withdrawal.id,
            type: "withdrawal",
            title: `Withdrawal request #${String(withdrawal?.id || "").slice(-6)}`,
            subtitle: vendorLabel,
            meta: "Pending payout",
            amountLabel,
            status: withdrawal?.status,
            date: formatDate(withdrawal?.createdAt),
            createdAt: createdAtValue,
          });
        });
    }

    if (Array.isArray(orders)) {
      orders
        .filter((order) =>
          QR_ORDER_ATTENTION_STATUSES.includes(
            String(order?.status || "").toLowerCase(),
          ),
        )
        .forEach((order) => {
          const vendorLabel =
            order?.vendor?.businessName ||
            order?.vendor?.brandName ||
            order?.vendor?.email ||
            "Vendor";
          const campaignTitle = order?.campaignTitle || "Campaign";
          const createdAtValue = order?.createdAt
            ? new Date(order.createdAt).getTime()
            : 0;
          const amountLabel =
            order?.totalAmount !== undefined && order?.totalAmount !== null
              ? `INR ${formatAmount(order.totalAmount)}`
              : null;
          const normalizedStatus = String(
            order?.status || "pending",
          ).toLowerCase();
          const statusTag =
            normalizedStatus === "paid" ? "approved" : normalizedStatus;
          const statusLabel =
            normalizedStatus === "paid"
              ? "Approved"
              : normalizedStatus === "pending"
                ? "Pending"
                : order?.status;

          items.push({
            id: order.id,
            type: "order",
            title: `QR order #${String(order?.id || "").slice(-6)}`,
            subtitle: vendorLabel,
            meta: `Campaign: ${campaignTitle} | Qty: ${order?.quantity ?? 0}`,
            amountLabel,
            status: statusTag,
            statusLabel,
            date: formatDate(order?.createdAt),
            createdAt: createdAtValue,
          });
        });
    }

    return items;
  }, [orders, withdrawals]);

  const notificationActivities = useMemo(() => {
    if (!Array.isArray(notifications)) return [];
    return notifications.map((notification) => {
      const metadata = notification.metadata || {};
      const isAdminOrder = notification.type === "admin-order";
      const vendorLabel = metadata.vendorLabel || metadata.vendorName || null;
      const campaignLabel = metadata.campaignTitle || null;
      const quantityLabel =
        metadata.quantity !== undefined && metadata.quantity !== null
          ? `Qty: ${metadata.quantity}`
          : null;
      const statusLabel =
        metadata.status || (notification.isRead ? "read" : "unread");
      const metaParts = [];
      if (campaignLabel) metaParts.push(`Campaign: ${campaignLabel}`);
      if (quantityLabel) metaParts.push(quantityLabel);
      if (metadata.requestedUsername) {
        metaParts.push(`Username: ${metadata.requestedUsername}`);
      }
      if (
        metadata.status &&
        (!campaignLabel ||
          campaignLabel.toLowerCase() !== metadata.status.toLowerCase())
      ) {
        metaParts.push(`Status: ${metadata.status}`);
      }
      const metaText =
        metaParts.length > 0
          ? metaParts.join(" | ")
          : notification.type
            ? `Type: ${notification.type}`
            : "Notification";
      const amountLabel =
        metadata.totalAmount !== undefined && metadata.totalAmount !== null
          ? `INR ${formatAmount(metadata.totalAmount)}`
          : null;

      const defaultTitle = isAdminOrder
        ? `QR order ${metadata.orderId ? `#${String(metadata.orderId).slice(-6)}` : "paid"}`
        : "Notification";

      return {
        id: notification.id,
        type: isAdminOrder ? "order" : "notification",
        title: notification.title || defaultTitle,
        subtitle: vendorLabel || notification.message,
        meta: metaText,
        amountLabel,
        status: statusLabel,
        date: formatDate(notification.createdAt),
        createdAt: notification.createdAt
          ? new Date(notification.createdAt).getTime()
          : 0,
        payload: metadata,
      };
    });
  }, [notifications]);

  const vendorNotificationActivities = useMemo(() => {
    const combined = [...attentionRequests, ...notificationActivities];
    return combined
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 6);
  }, [attentionRequests, notificationActivities]);

  const pendingWithdrawalsInFlight =
    withdrawals?.filter(
      (withdrawal) =>
        String(withdrawal?.status || "").toLowerCase() === "pending",
    )?.length || 0;
  const pendingWithdrawalCount =
    pendingWithdrawalsInFlight || dashboardStats?.pendingWithdrawals || 0;
  const ordersAwaitingAction =
    orders?.filter((order) =>
      QR_ORDER_ATTENTION_STATUSES.includes(
        String(order?.status || "").toLowerCase(),
      ),
    )?.length || 0;
  const orderAttentionCount =
    ordersAwaitingAction || dashboardStats?.ordersAttention || 0;

  // Count pending QR orders (paid but not shipped)
  const pendingQrOrders =
    orders?.filter((order) =>
      ["paid", "pending"].includes(String(order?.status || "").toLowerCase()),
    )?.length || 0;
  const pendingQrOrderCount =
    pendingQrOrders || dashboardStats?.ordersAttention || 0;

  const totalQrsCount = dashboardStats?.totalQrs || 0;

  const derivedUserStatusCounts = (users || []).reduce(
    (acc, user) => {
      const status = String(user?.status || "").toLowerCase();
      if (status === "active") acc.active += 1;
      if (status === "inactive") acc.inactive += 1;
      if (status === "blocked") acc.blocked += 1;
      return acc;
    },
    { active: 0, inactive: 0, blocked: 0 },
  );
  const effectiveUserStatusCounts = {
    active:
      dashboardStats?.userStatusCounts?.active ??
      derivedUserStatusCounts.active,
    inactive:
      dashboardStats?.userStatusCounts?.inactive ??
      derivedUserStatusCounts.inactive,
    blocked:
      dashboardStats?.userStatusCounts?.blocked ??
      derivedUserStatusCounts.blocked,
  };
  const effectiveVendorStatusCounts = dashboardStats?.vendorStatusCounts || {
    active: vendors?.filter((v) => v.status === "active")?.length || 0,
  };
  const totalBalance = dashboardStats?.totalWalletBalance || 0;
  const platformRevenue =
    financeSummary?.platformRevenue ?? dashboardStats?.platformRevenue ?? 0;

  const notificationCount = pendingWithdrawalCount + orderAttentionCount;

  const filteredLogs = useMemo(() => {
    let list = logs || [];
    if (logsFilter === "qr") {
      list = list.filter((log) => String(log.action || "").includes("qr"));
    } else if (logsFilter === "wallet") {
      list = list.filter((log) => String(log.action || "").includes("wallet"));
    } else if (logsFilter === "admin") {
      list = list.filter(
        (log) => String(log.actorRole || "").toLowerCase() === "admin",
      );
    } else if (logsFilter === "fraud") {
      list = list.filter((log) => String(log.action || "").includes("flag"));
    }
    if (!searchLower) return list;
    return list.filter((log) => {
      const action = String(log.action || "").toLowerCase();
      const role = String(log.actorRole || "").toLowerCase();
      const metadata = JSON.stringify(log.metadata || {}).toLowerCase();
      return (
        action.includes(searchLower) ||
        role.includes(searchLower) ||
        metadata.includes(searchLower)
      );
    });
  }, [logs, logsFilter, searchLower]);

  const handleCampaignRowStatusSave = async (campaignId, currentStatus) => {
    if (!campaignId) return;
    const normalizedCurrent = String(currentStatus || "").toLowerCase();
    const nextStatus = String(
      campaignStatusUpdates[campaignId] || normalizedCurrent,
    ).toLowerCase();
    const allowedStatuses = ["active", "paused", "rejected", "completed"];

    setCampaignActionStatus("");
    setCampaignActionError("");

    if (!allowedStatuses.includes(nextStatus)) {
      setCampaignActionError("Select a valid status to update.");
      return;
    }
    if (nextStatus === normalizedCurrent) {
      return;
    }

    try {
      await updateAdminCampaignStatus(token, campaignId, nextStatus);
      setCampaignActionStatus("Campaign status updated.");
      setCampaignStatusUpdates((prev) => {
        const updated = { ...prev };
        delete updated[campaignId];
        return updated;
      });
      await loadCampaigns(token);
    } catch (err) {
      handleRequestError(
        err,
        setCampaignActionError,
        "Unable to update campaign status.",
      );
    }
  };

  const handleDeleteCampaign = async (campaign) => {
    if (!campaign?.id) return;
    const name = campaign.title || "this campaign";
    if (
      !window.confirm(`Delete ${name}? This removes all QRs for this campaign.`)
    ) {
      return;
    }

    setCampaignActionStatus("");
    setCampaignActionError("");
    setDeletingCampaignId(campaign.id);

    try {
      await deleteAdminCampaign(token, campaign.id);
      setCampaignActionStatus("Campaign deleted.");
      setCampaigns((prev) => prev.filter((item) => item.id !== campaign.id));
      setCampaignStatusUpdates((prev) => {
        if (!prev[campaign.id]) return prev;
        const updated = { ...prev };
        delete updated[campaign.id];
        return updated;
      });
    } catch (err) {
      handleRequestError(
        err,
        setCampaignActionError,
        "Unable to delete campaign.",
      );
    } finally {
      setDeletingCampaignId(null);
    }
  };

  const handleOrderStatusSave = async (orderId, currentStatus) => {
    if (!orderId) return;
    const normalizedCurrent = String(currentStatus || "").toLowerCase();
    const nextStatus = String(
      orderStatusUpdates[orderId] || normalizedCurrent,
    ).toLowerCase();
    const allowedStatuses = ["pending", "paid", "shipped"];

    setOrderActionStatus("");
    setOrderActionError("");

    if (!allowedStatuses.includes(nextStatus)) {
      setOrderActionError("Select a valid order status.");
      return;
    }
    if (nextStatus === normalizedCurrent) {
      return;
    }

    try {
      await updateAdminOrderStatus(token, orderId, nextStatus);
      setOrderActionStatus("Order status updated.");
      setOrderStatusUpdates((prev) => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
      await loadOrders(token);
    } catch (err) {
      handleRequestError(
        err,
        setOrderActionError,
        "Unable to update order status.",
      );
    }
  };

  const handleWithdrawalProcess = async () => {
    if (!withdrawalAction.id.trim()) {
      setWithdrawalError("Withdrawal ID is required.");
      return;
    }
    setWithdrawalError("");
    setWithdrawalStatus("");
    try {
      await processAdminWithdrawal(token, withdrawalAction.id.trim(), {
        status: withdrawalAction.status,
        referenceId: withdrawalAction.referenceId.trim() || undefined,
        adminNote: withdrawalAction.adminNote.trim() || undefined,
      });
      setWithdrawalStatus("Withdrawal updated.");
      setWithdrawalAction({
        id: "",
        status: "processed",
        referenceId: "",
        adminNote: "",
      });
      await loadWithdrawals(token);
      await loadTransactions(token);
    } catch (err) {
      handleRequestError(
        err,
        setWithdrawalError,
        "Unable to process withdrawal.",
      );
    }
  };

  const handleSupportReply = async (ticketId) => {
    if (!ticketId) return;
    const reply = supportReplies[ticketId] || {};
    const responseText = String(reply.response || "").trim();
    const status = reply.status || "resolved";

    if (!responseText) {
      setSupportActionError("Response message is required.");
      return;
    }

    setSupportActionError("");
    setSupportActionStatus("");
    try {
      await replyAdminSupportTicket(token, ticketId, {
        response: responseText,
        status,
      });
      setSupportActionStatus("Support ticket updated.");
      setSupportReplies((prev) => {
        const updated = { ...prev };
        delete updated[ticketId];
        return updated;
      });
      await loadSupportTickets(token);
    } catch (err) {
      handleRequestError(
        err,
        setSupportActionError,
        "Unable to update ticket.",
      );
    }
  };

  const handleDownloadQrBatchPdf = async (batch) => {
    if (isPreparingBatchPdf) return;
    if (!batch?.campaignId) {
      setQrBatchError("Batch information is incomplete.");
      return;
    }

    setQrBatchError("");
    setQrBatchStatus("");
    setIsPreparingBatchPdf(true);

    try {
      const data = await getAdminQrBatch(token, {
        campaignId: batch.campaignId,
        cashbackAmount: batch.cashbackAmount,
        limit: 2000,
      });
      const items = Array.isArray(data) ? data : data?.items || [];
      const total = Number.isFinite(data?.total) ? data.total : items.length;

      if (!items.length) {
        setQrBatchError("No QRs available for this batch.");
        return;
      }

      setBatchQrs(items);
      await waitForPdfCanvases(items);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const qrSize = 40;
      const margin = 14;
      const itemsPerRow = 4;
      const rowsPerPage = 6;
      const rowSpacing = qrSize + 28;
      const spacing =
        (pageWidth - margin * 2 - qrSize * itemsPerRow) /
        Math.max(itemsPerRow - 1, 1);
      const priceLabel = formatAmount(batch.cashbackAmount);
      const campaignTitle = batch.campaignTitle || "Campaign";
      const brandName = batch.brandName || "Brand";
      const vendorLabel = batch.vendorLabel || "Vendor";
      let skipped = 0;

      const drawHeader = () => {
        doc.setFontSize(16);
        doc.text(`QR Batch - INR ${priceLabel}`, margin, 18);
        doc.setFontSize(10);
        doc.text(`Campaign: ${campaignTitle}`, margin, 26);
        doc.text(`Brand: ${brandName}`, margin, 32);
        doc.text(`Vendor: ${vendorLabel}`, margin, 38);
      };

      drawHeader();

      const itemsPerPage = itemsPerRow * rowsPerPage;

      items.forEach((qr, index) => {
        const localIndex = index % itemsPerPage;
        if (index > 0 && localIndex === 0) {
          doc.addPage();
          drawHeader();
        }

        const col = localIndex % itemsPerRow;
        const row = Math.floor(localIndex / itemsPerRow);
        const xPos = margin + col * (qrSize + spacing);
        const yPos = 46 + row * rowSpacing;

        const canvas = document.getElementById(getPdfCanvasId(qr.uniqueHash));
        if (!canvas) {
          skipped += 1;
          return;
        }

        const imgData = canvas.toDataURL("image/png");
        doc.addImage(imgData, "PNG", xPos, yPos, qrSize, qrSize);

        const perPrice =
          Number(qr.cashbackAmount) || Number(batch.cashbackAmount) || 0;
        doc.setFontSize(8);
        doc.text(qr.uniqueHash.slice(0, 8), xPos, yPos + qrSize + 6);
        doc.text(`INR ${formatAmount(perPrice)}`, xPos, yPos + qrSize + 12);
      });

      const truncated = total > items.length;
      if (skipped > 0 || truncated) {
        const parts = [];
        if (skipped > 0) parts.push(`${skipped} QR(s) not ready`);
        if (truncated) parts.push(`showing ${items.length} of ${total}`);
        setQrBatchStatus(`Downloaded PDF. ${parts.join(", ")}.`);
      } else {
        setQrBatchStatus("QR batch PDF downloaded.");
      }

      const timestamp = new Date()
        .toISOString()
        .slice(0, 16)
        .replace(/[:T]/g, "-");
      doc.save(`qrs-${priceLabel}-${timestamp}.pdf`);
    } catch (err) {
      console.error("PDF Gen Error:", err);
      setQrBatchError("Failed to generate PDF");
    } finally {
      setIsPreparingBatchPdf(false);
      setBatchQrs([]);
    }
  };

  const handleNavClick = (id) => {
    const route = navRouteMap[id] || `/admin/${id}`;
    navigate(route);
    setSidebarOpen(false);
  };
  const handleRequestClick = (request) => {
    if (!request?.type) return;
    if (request.type === "order") {
      const payload = request?.payload || {};
      const orderId = payload.orderId || payload.id;
      if (orderId) {
        const orderFromList = orders.find((order) => order.id === orderId);
        const fallbackOrder = orderFromList || {
          id: orderId,
          campaignTitle: payload.campaignTitle,
          quantity: payload.quantity,
          cashbackAmount: payload.cashbackAmount,
        };
        handleDownloadOrderPdf(fallbackOrder);
      }
      handleNavClick("orders");
      return;
    }
    if (request.type === "withdrawal") {
      handleNavClick("payouts");
      return;
    }
    if (request.type === "notification") {
      const vendorId = request?.payload?.vendorId || "";
      const brandId = request?.payload?.brandId || "";
      if (vendorId || brandId) {
        handleAccountView({ vendorId, brandId });
      }
    }
  };

  // --- Filtering & Derived State for Dashboard Views ---


  // Vendors
  const normalizedVendorView = String(vendorView || "all").toLowerCase();
  const vendorStatusFilter = {
    active: ["active"],
    paused: ["paused", "expired", "pending", "rejected"],
  };
  const allowedVendorStatuses = vendorStatusFilter[normalizedVendorView];

  const normalizedUserView = String(userView || "all").toLowerCase();
  const userStatusFilter = {
    active: ["active"],
    inactive: ["inactive"],
    blocked: ["blocked"],
  };
  const allowedUserStatuses = userStatusFilter[normalizedUserView];
  const filteredVendors = (vendors || []).filter((v) => {
    if (allowedVendorStatuses) {
      const vendorStatus = String(v?.status || "").toLowerCase();
      if (!allowedVendorStatuses.includes(vendorStatus)) {
        return false;
      }
    }
    if (!searchLower) return true;
    const name = v.businessName?.toLowerCase() || "";
    const email =
      v.contactEmail?.toLowerCase() || v.User?.email?.toLowerCase() || "";
    return name.includes(searchLower) || email.includes(searchLower);
  });
  const limitedVendors = showAllVendors
    ? filteredVendors
    : filteredVendors.slice(0, 8);

  // Users
  const filteredUsers = (users || []).filter((u) => {
    if (allowedUserStatuses) {
      const userStatus = String(u?.status || "").toLowerCase();
      if (!allowedUserStatuses.includes(userStatus)) {
        return false;
      }
    }
    if (!searchLower) return true;
    const name = u.name?.toLowerCase() || "";
    const email = u.email?.toLowerCase() || "";
    return name.includes(searchLower) || email.includes(searchLower);
  });
  const limitedUsers = showAllUsers ? filteredUsers : filteredUsers.slice(0, 8);

  const supportCounts = useMemo(() => {
    const items = Array.isArray(supportTickets) ? supportTickets : [];
    const product = items.filter((ticket) =>
      isProductReportSubject(ticket?.subject),
    ).length;
    return {
      total: items.length,
      product,
      other: Math.max(items.length - product, 0),
    };
  }, [supportTickets]);

  const filteredSupportTickets = useMemo(() => {
    const items = Array.isArray(supportTickets) ? supportTickets : [];
    const byType = items.filter((ticket) => {
      const isProduct = isProductReportSubject(ticket?.subject);
      if (supportView === "product") return isProduct;
      if (supportView === "other") return !isProduct;
      return true;
    });

    if (!searchLower) return byType;

    return byType.filter((ticket) => {
      const haystack = [
        ticket?.id,
        ticket?.subject,
        ticket?.message,
        ticket?.User?.name,
        ticket?.User?.email,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(searchLower);
    });
  }, [supportTickets, supportView, searchLower]);

  const qrsTotalLabel = qrsTotal || qrs.length || 0;
  const qrStatusCounts = useMemo(() => {
    const counts = { active: 0, pending: 0, redeemed: 0, blocked: 0 };
    const summary = qrStatusSummary || {};
    const normalizedEntries = Object.entries(summary);
    if (normalizedEntries.length > 0) {
      normalizedEntries.forEach(([status, value]) => {
        const normalized = (status || "").toLowerCase();
        const amount = Number(value) || 0;
        if (normalized.includes("act")) {
          counts.active += amount;
        } else if (normalized.includes("pend")) {
          counts.pending += amount;
        } else if (
          normalized.includes("redeem") ||
          normalized.includes("used")
        ) {
          counts.redeemed += amount;
        } else if (
          normalized.includes("block") ||
          normalized.includes("revoked")
        ) {
          counts.blocked += amount;
        } else {
          counts.active += amount;
        }
      });
      return counts;
    }

    qrs.forEach((qr) => {
      const status = (qr?.status || "active").toLowerCase();
      if (status.includes("pend")) counts.pending += 1;
      else if (status.includes("redeem") || status.includes("used"))
        counts.redeemed += 1;
      else if (status.includes("block") || status.includes("revoked"))
        counts.blocked += 1;
      else counts.active += 1;
    });

    return counts;
  }, [qrStatusSummary, qrs]);

  const qrsCoverageLabel =
    qrsTotal > qrs.length ? `Showing ${qrs.length} of ${qrsTotal}` : "";

  const qrBatchSummary = useMemo(() => {
    if (!qrs?.length) return [];
    const batches = new Map();

    qrs.forEach((qr) => {
      const campaign = qr?.Campaign;
      const brand = campaign?.Brand;
      const vendor = brand?.Vendor;
      const campaignId = qr?.campaignId || campaign?.id || "unknown";
      const cashbackAmount = Number(qr?.cashbackAmount ?? 0);
      const key = `${campaignId}-${Number.isFinite(cashbackAmount) ? cashbackAmount : "na"}`;
      const existing = batches.get(key) || {
        id: key,
        campaignId,
        campaignTitle: campaign?.title || "Campaign",
        brandName: brand?.name || "Brand",
        vendorLabel: vendor?.businessName || vendor?.User?.email || "Vendor",
        cashbackAmount: Number.isFinite(cashbackAmount) ? cashbackAmount : 0,
        total: 0,
        active: 0,
        redeemed: 0,
        lastCreatedAt: null,
      };

      existing.total += 1;
      const status = String(qr?.status || "").toLowerCase();
      if (status.includes("redeem") || status.includes("used")) {
        existing.redeemed += 1;
      } else if (!status.includes("block") && !status.includes("revoked")) {
        existing.active += 1;
      }

      const createdAt = qr?.createdAt ? new Date(qr.createdAt).getTime() : 0;
      if (
        !existing.lastCreatedAt ||
        createdAt > new Date(existing.lastCreatedAt).getTime()
      ) {
        existing.lastCreatedAt = qr?.createdAt || existing.lastCreatedAt;
      }

      batches.set(key, existing);
    });

    return Array.from(batches.values()).sort((a, b) => {
      const timeA = a.lastCreatedAt ? new Date(a.lastCreatedAt).getTime() : 0;
      const timeB = b.lastCreatedAt ? new Date(b.lastCreatedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [qrs]);

  const qrBatchSearchTerm = (qrBatchSearch || searchQuery || "").trim().toLowerCase();
  const filteredQrBatchSummary = useMemo(() => {
    if (!qrBatchSearchTerm) return qrBatchSummary;
    return qrBatchSummary.filter((batch) => {
      const haystack =
        `${batch.campaignTitle} ${batch.brandName} ${batch.vendorLabel}`.toLowerCase();
      return haystack.includes(qrBatchSearchTerm);
    });
  }, [qrBatchSummary, qrBatchSearchTerm]);

  const sortedQrBatchSummary = useMemo(() => {
    const items = [...filteredQrBatchSummary];
    const getTime = (value) => (value ? new Date(value).getTime() : 0);
    switch (qrBatchSort) {
      case "qty":
        return items.sort(
          (a, b) =>
            b.total - a.total ||
            getTime(b.lastCreatedAt) - getTime(a.lastCreatedAt),
        );
      case "active":
        return items.sort(
          (a, b) =>
            b.active - a.active ||
            getTime(b.lastCreatedAt) - getTime(a.lastCreatedAt),
        );
      case "cashback":
        return items.sort(
          (a, b) =>
            (b.cashbackAmount || 0) - (a.cashbackAmount || 0) ||
            getTime(b.lastCreatedAt) - getTime(a.lastCreatedAt),
        );
      case "oldest":
        return items.sort(
          (a, b) => getTime(a.lastCreatedAt) - getTime(b.lastCreatedAt),
        );
      default:
        return items.sort(
          (a, b) => getTime(b.lastCreatedAt) - getTime(a.lastCreatedAt),
        );
    }
  }, [filteredQrBatchSummary, qrBatchSort]);

  const qrBatchPreviewLimit = 8;
  const visibleQrBatchSummary = showAllQrBatches
    ? sortedQrBatchSummary
    : sortedQrBatchSummary.slice(0, qrBatchPreviewLimit);
  const qrBatchActiveTotal = sortedQrBatchSummary.reduce(
    (sum, batch) => sum + batch.active,
    0,
  );

  const orderStatusCounts = useMemo(() => {
    const counts = {
      pending: 0,
      paid: 0,
      shipped: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0,
    };
    const summary = orderStatusSummary || {};
    const entries = Object.entries(summary);
    if (entries.length > 0) {
      entries.forEach(([status, value]) => {
        const normalized = (status || "").toLowerCase();
        const amount = Number(value) || 0;
        if (normalized.includes("pend")) counts.pending += amount;
        else if (normalized.includes("paid")) counts.paid += amount;
        else if (normalized.includes("ship")) counts.shipped += amount;
        else if (normalized.includes("complete")) counts.completed += amount;
        else if (normalized.includes("reject")) counts.rejected += amount;
        else if (normalized.includes("cancel")) counts.cancelled += amount;
      });
      return counts;
    }

    orders.forEach((order) => {
      const status = String(order?.status || "pending").toLowerCase();
      if (status.includes("pend")) counts.pending += 1;
      else if (status.includes("paid")) counts.paid += 1;
      else if (status.includes("ship")) counts.shipped += 1;
      else if (status.includes("complete")) counts.completed += 1;
      else if (status.includes("reject")) counts.rejected += 1;
      else if (status.includes("cancel")) counts.cancelled += 1;
    });

    return counts;
  }, [orderStatusSummary, orders]);

  const orderNotificationCount =
    (orderStatusCounts.pending || 0) + (orderStatusCounts.paid || 0);

  const sortedOrders = useMemo(() => {
    const priority = {
      pending: 0,
      paid: 1,
      processing: 2,
      shipped: 3,
      completed: 4,
      rejected: 5,
      cancelled: 6,
    };
    return [...orders].sort((a, b) => {
      const statusA = String(a?.status || "pending").toLowerCase();
      const statusB = String(b?.status || "pending").toLowerCase();
      const priorityA = priority[statusA] ?? 99;
      const priorityB = priority[statusB] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      const dateA = new Date(a?.createdAt || 0).getTime();
      const dateB = new Date(b?.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [orders]);

  const filteredCampaigns = useMemo(() => {
    const list = campaigns || [];
    if (!searchLower) return list;
    return list.filter((c) => {
      const title = String(c?.title || "").toLowerCase();
      const desc = String(c?.description || "").toLowerCase();
      const brand = String(c?.Brand?.name || c?.brand?.name || "").toLowerCase();
      const id = String(c?.id || "").toLowerCase();
      return (
        title.includes(searchLower) ||
        desc.includes(searchLower) ||
        brand.includes(searchLower) ||
        id.includes(searchLower)
      );
    });
  }, [campaigns, searchLower]);

  const campaignStatusCounts = useMemo(
    () => buildStatusCounts(filteredCampaigns || [], "status"),
    [filteredCampaigns],
  );

  // --- Dashboard Data Filtering ---
  const filteredDashboardData = useMemo(() => {
    let _transactions = transactions || [];
    let _qrs = qrs || [];
    let _orders = sortedOrders || []; // Use sorted orders as base

    // Filter by Brand
    if (filterBrandId !== "all") {
      const bId = filterBrandId;
      _transactions = _transactions.filter(
        (t) =>
          t.Wallet?.Vendor?.Brand?.id === bId ||
          t.Wallet?.Vendor?.brandId === bId,
      );
      _orders = _orders.filter((o) => {
        const orderBrandId =
          o.brandId || o.vendor?.brandId || o.vendor?.Brand?.id;
        return orderBrandId === bId;
      });
      _qrs = _qrs.filter(
        (q) => q.Campaign?.Brand?.id === bId || q.Campaign?.brandId === bId,
      );
    }

    // Filter by Vendor
    if (filterVendorId !== "all") {
      const vId = filterVendorId;
      _transactions = _transactions.filter((t) => {
        const vid = t.Wallet?.Vendor?.id || t.Wallet?.vendorId;
        return vid === vId;
      });
      _orders = _orders.filter((o) => {
        const vid = o.vendorId || o.vendor?.id;
        return vid === vId;
      });
      _qrs = _qrs.filter((q) => {
        const vid =
          q.vendorId ||
          q.Campaign?.vendorId ||
          q.Campaign?.Vendor?.id ||
          q.Campaign?.Brand?.Vendor?.id;
        return vid === vId;
      });
    }

    // Filter by Campaign
    if (filterCampaignId !== "all") {
      const cId = filterCampaignId;
      // Transactions: difficult to filter by campaign without explicit link. Skipping tx filter for campaign for now unless category matches?
      // _transactions = _transactions.filter(...)

      _qrs = _qrs.filter((q) => q.campaignId === cId || q.Campaign?.id === cId);
      _orders = _orders.filter(
        (o) => o.campaignId === cId || o.Campaign?.id === cId,
      );
    }

    // Filter by Search Query
    if (searchLower) {
      _transactions = _transactions.filter((t) => {
        const id = String(t.id || "").toLowerCase();
        const category = String(t.category || "").toLowerCase();
        const desc = String(t.description || "").toLowerCase();
        const email = String(t.Wallet?.User?.email || t.Wallet?.Vendor?.contactEmail || "").toLowerCase();
        const name = String(t.Wallet?.User?.name || t.Wallet?.Vendor?.businessName || "").toLowerCase();
        return (
          id.includes(searchLower) ||
          category.includes(searchLower) ||
          desc.includes(searchLower) ||
          email.includes(searchLower) ||
          name.includes(searchLower)
        );
      });

      _qrs = _qrs.filter((q) => {
        const id = String(q.id || "").toLowerCase();
        const campaignTitle = String(q.Campaign?.title || "").toLowerCase();
        const brandName = String(q.Campaign?.Brand?.name || "").toLowerCase();
        const code = String(q.code || "").toLowerCase();
        return (
          id.includes(searchLower) ||
          campaignTitle.includes(searchLower) ||
          brandName.includes(searchLower) ||
          code.includes(searchLower)
        );
      });

      _orders = _orders.filter((o) => {
        const id = String(o.id || "").toLowerCase();
        const userEmail = String(o.User?.email || o.user?.email || "").toLowerCase();
        const campaignTitle = String(o.Campaign?.title || o.campaign?.title || "").toLowerCase();
        const brandName = String(o.Campaign?.Brand?.name || o.vendor?.Brand?.name || "").toLowerCase();
        return (
          id.includes(searchLower) ||
          userEmail.includes(searchLower) ||
          campaignTitle.includes(searchLower) ||
          brandName.includes(searchLower)
        );
      });
    }

    return { transactions: _transactions, qrs: _qrs, orders: _orders };
  }, [
    transactions,
    qrs,
    sortedOrders,
    filterVendorId,
    filterCampaignId,
    filterBrandId,
    searchLower,
  ]);

  const {
    transactions: effectiveTransactions,
    qrs: effectiveQrs,
    orders: effectiveOrders,
  } = filteredDashboardData;

  // Transactions - Include all transaction types (Recharges and Settlements)
  // Now using effectiveTransactions
  const vendorTransactions = effectiveTransactions || [];

  const filteredVendorTransactionsByTime = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return vendorTransactions
      .filter((tx) => {
        if (!tx.createdAt) return true;
        const txDate = new Date(tx.createdAt);
        if (txTimeframe === "today") {
          return txDate >= startOfToday;
        }
        if (txTimeframe === "week") {
          const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
          return txDate >= oneWeekAgo;
        }
        if (txTimeframe === "month") {
          const oneMonthAgo = new Date(now.getTime() - 30 * 86400000);
          return txDate >= oneMonthAgo;
        }
        if (txTimeframe === "year") {
          const oneYearAgo = new Date(now.getTime() - 365 * 86400000);
          return txDate >= oneYearAgo;
        }
        if (txTimeframe === "custom") {
          if (txCustomStart) {
            const start = new Date(txCustomStart);
            start.setHours(0, 0, 0, 0);
            if (txDate < start) return false;
          }
          if (txCustomEnd) {
            const end = new Date(txCustomEnd);
            end.setHours(23, 59, 59, 999);
            if (txDate > end) return false;
          }
          return true;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [vendorTransactions, txTimeframe, txCustomStart, txCustomEnd]);

  const limitedVendorTransactions = showAllTransactions
    ? filteredVendorTransactionsByTime
    : filteredVendorTransactionsByTime.slice(0, 10);

  const filteredRecentVendorTransactions = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    if (activityTimeframe === "today") {
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
    } else if (activityTimeframe === "week") {
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (activityTimeframe === "month") {
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    } else if (activityTimeframe === "year") {
      startDate.setFullYear(now.getFullYear() - 1);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else if (activityTimeframe === "custom") {
      startDate = activityCustomStart ? new Date(activityCustomStart) : new Date(now.getTime() - 7 * 86400000);
      endDate = activityCustomEnd ? new Date(activityCustomEnd) : new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    return (effectiveTransactions || [])
      .filter((tx) => {
        const d = new Date(tx.createdAt);
        if (activityTimeframe === "custom") {
          if (d < startDate || d > endDate) return false;
        } else {
          if (d < startDate) return false;
        }

        // Filter by Transaction Type (All, Recharge, Withdrawal)
        if (recentTxTypeFilter === "recharge") {
          const category = String(tx.category || "").toUpperCase();
          const isRecharge = tx.type === "credit" || category.includes("RECHARGE") || category === "ADMIN_CREDIT";
          if (!isRecharge) return false;
        } else if (recentTxTypeFilter === "withdrawal") {
          const isDebit = tx.type === "debit";
          if (!isDebit) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [effectiveTransactions, activityTimeframe, activityCustomStart, activityCustomEnd, recentTxTypeFilter]);

  // Orders (Server side usually, but slicing for preview)
  const limitedOrders = showAllOrders
    ? effectiveOrders
    : effectiveOrders.slice(0, 8);

  // QRs
  const limitedQrs = showAllQrs ? effectiveQrs : effectiveQrs.slice(0, 12);

  // Campaigns
  const limitedCampaigns = showAllCampaigns ? filteredCampaigns : filteredCampaigns.slice(0, 6);

  // Analytics - Transaction Series (these were missing)
  const transactionSeries = useMemo(
    () => buildTransactionSeries(effectiveTransactions, analyticsRange),
    [effectiveTransactions, analyticsRange],
  );
  const transactionTotals = useMemo(
    () => ({
      credit: transactionSeries.credit.reduce((sum, val) => sum + val, 0),
      debit: transactionSeries.debit.reduce((sum, val) => sum + val, 0),
    }),
    [transactionSeries],
  );

  // Analytics Metric Data (was missing)
  const analyticsMetricData = useMemo(() => {
    if (analyticsMetric === "transactions") {
      return {
        label: "Transaction Volume",
        series: transactionSeries.net,
        value: transactionTotals.credit - transactionTotals.debit,
        isCurrency: true,
      };
    }
    if (analyticsMetric === "users") {
      const userSeries = buildCountSeries(
        users,
        analyticsRange,
        (u) => u.createdAt,
      );
      return {
        label: "New Users",
        series: userSeries.counts,
        value: userSeries.counts.reduce((sum, val) => sum + val, 0),
        isCurrency: false,
      };
    }
    if (analyticsMetric === "qrs") {
      const qrSeries = buildCountSeries(
        effectiveQrs,
        analyticsRange,
        (q) => q.createdAt,
      );
      return {
        label: "QR Codes Generated",
        series: qrSeries.counts,
        value: qrSeries.counts.reduce((sum, val) => sum + val, 0),
        isCurrency: false,
      };
    }
    return { label: "Metric", series: [], value: 0, isCurrency: false };
  }, [
    analyticsMetric,
    analyticsRange,
    transactionSeries,
    transactionTotals,
    users,
    effectiveQrs,
  ]);

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Analytics Stats Cards
  const totalUsersCount = dashboardStats?.users || users.length || 0;
  const totalVendorsCount = dashboardStats?.vendors || vendors.length || 0;
  const displayedVendorsCount = useMemo(() => {
    if (filterVendorId !== "all") return 1;
    if (filterBrandId !== "all")
      return vendors.filter(
        (v) => v.brandId === filterBrandId || v.Brand?.id === filterBrandId,
      ).length;
    return vendors.length || 0;
  }, [vendors, filterVendorId, filterBrandId]);

  const displayedQrsCount = effectiveQrs.length || 0;

  const currentDisplayedBalance = useMemo(() => {
    if (filterVendorId !== "all") {
      const v = vendors.find((v) => v.id === filterVendorId);
      return toFiniteNumber(v?.Wallet?.balance);
    }
    if (filterBrandId !== "all") {
      return vendors
        .filter(
          (v) => v.brandId === filterBrandId || v.Brand?.id === filterBrandId,
        )
        .reduce((sum, v) => sum + toFiniteNumber(v.Wallet?.balance), 0);
    }
    return vendors.reduce(
      (sum, v) => sum + toFiniteNumber(v.Wallet?.balance),
      0,
    );
  }, [vendors, filterVendorId, filterBrandId]);

  const analyticsStats = [
    { label: "Total Users", value: totalUsersCount, isCurrency: false },
    {
      label: "Active Vendors",
      value: displayedVendorsCount,
      isCurrency: false,
    },
    { label: "Total QRs", value: displayedQrsCount, isCurrency: false },
    {
      label: "Platform Balance",
      value: currentDisplayedBalance,
      isCurrency: true,
    },
  ];

  const fraudThresholds = settings?.fraudThresholds || {
    maxRedemptionsPerUser: 5,
    maxRedeemerSharePercent: 40,
  };
  const homeBanners = getHomeBanners();
  const blogEntries = getBlogs();
  const blogUsers = getBlogUsers();
  const redeemStoreProducts = getRedeemStoreProducts();
  const redeemCatalogSummary = useMemo(() => {
    const summary = {
      total: redeemStoreProducts.length,
      active: 0,
      inactive: 0,
      withImage: 0,
      missingAmount: 0,
    };
    redeemStoreProducts.forEach((product) => {
      const isInactive =
        String(product?.status || "active").toLowerCase() === "inactive";
      if (isInactive) summary.inactive += 1;
      else summary.active += 1;
      if (String(product?.image || "").trim()) summary.withImage += 1;
      const amount = Number(product?.amount ?? product?.points);
      if (!Number.isFinite(amount) || amount <= 0) summary.missingAmount += 1;
    });
    return summary;
  }, [redeemStoreProducts]);
  const topRedeemer = campaignAnalytics?.topRedeemers?.[0];
  const topRedeemerCount = topRedeemer?._count?._all || 0;
  const redeemedCount = campaignAnalytics?.metrics?.redeemedQrs || 0;
  const topRedeemerShare = redeemedCount
    ? (topRedeemerCount / redeemedCount) * 100
    : 0;
  const abuseSignals = [];
  if (
    topRedeemerCount &&
    topRedeemerCount >= fraudThresholds.maxRedemptionsPerUser
  ) {
    abuseSignals.push(`User redeemed ${topRedeemerCount} times.`);
  }
  if (
    topRedeemerShare &&
    topRedeemerShare >= fraudThresholds.maxRedeemerSharePercent
  ) {
    abuseSignals.push(
      `Top user share ${topRedeemerShare.toFixed(1)}% exceeds threshold.`,
    );
  }

  const activityChartData = useMemo(() => {
    let txs = effectiveTransactions || [];
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (activityTimeframe === "today") {
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
    } else if (activityTimeframe === "week") {
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (activityTimeframe === "month") {
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    } else if (activityTimeframe === "year") {
      startDate.setFullYear(now.getFullYear() - 1);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else if (activityTimeframe === "custom") {
      startDate = activityCustomStart ? new Date(activityCustomStart) : new Date(now.getTime() - 7 * 86400000);
      endDate = activityCustomEnd ? new Date(activityCustomEnd) : new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    const buckets = {};

    if (activityTimeframe === "today") {
      for (let h = 0; h <= now.getHours(); h++) {
        const label = `${h.toString().padStart(2, "0")}:00`;
        buckets[label] = { name: label, moneyIn: 0, moneyOut: 0, timestamp: h };
      }
    } else if (activityTimeframe === "year") {
      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        const label = cursor.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        if (!buckets[label]) {
          buckets[label] = { name: label, moneyIn: 0, moneyOut: 0, timestamp: cursor.getTime() };
        }
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else {
      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        const label = cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (!buckets[label]) {
          buckets[label] = { name: label, moneyIn: 0, moneyOut: 0, timestamp: cursor.getTime() };
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const filteredTxs = txs.filter((tx) => {
      const d = new Date(tx.createdAt);
      if (activityTimeframe === "custom") {
        return d >= startDate && d <= endDate;
      }
      return d >= startDate;
    });

    filteredTxs.forEach((tx) => {
      const d = new Date(tx.createdAt);
      let key = "";

      if (activityTimeframe === "today") {
        key = `${d.getHours().toString().padStart(2, "0")}:00`;
      } else if (activityTimeframe === "year") {
        key = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      } else {
        key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }

      if (!buckets[key]) {
        buckets[key] = { name: key, moneyIn: 0, moneyOut: 0, timestamp: activityTimeframe === "today" ? d.getHours() : d.getTime() };
      }
      const amount = Number(tx.amount) || 0;
      if (tx.type === "credit") {
        buckets[key].moneyIn += amount;
      } else if (tx.type === "debit") {
        buckets[key].moneyOut += amount;
      }
    });

    return Object.values(buckets).sort((a, b) => a.timestamp - b.timestamp);
  }, [effectiveTransactions, activityTimeframe, activityCustomStart, activityCustomEnd]);

  const activityTotals = useMemo(() => {
    return activityChartData.reduce((acc, curr) => {
      acc.moneyIn += curr.moneyIn;
      acc.moneyOut += curr.moneyOut;
      return acc;
    }, { moneyIn: 0, moneyOut: 0 });
  }, [activityChartData]);

  if (!token) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4 text-slate-900 dark:bg-[#020202] dark:text-white transition-colors duration-300 font-admin-body relative overflow-hidden">
        {/* Abstract Background Pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse"
            style={{ animationDuration: "8s" }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse"
            style={{ animationDelay: "2s", animationDuration: "10s" }}
          />
        </div>

        <div className="w-full max-w-[440px] relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center mb-8">
            <div className="h-14 mb-4">
              <img
                src={
                  effectiveTheme === "dark"
                    ? "/dark theme incentify logo.png"
                    : "/light theme incentify logo.png"
                }
                alt="Assured Rewards"
                className="h-full w-auto object-contain"
              />
            </div>
            <span className="px-3 py-1 rounded-full bg-[#059669]/20 text-[#059669] text-xs font-bold uppercase tracking-wider border border-[#059669]/20">
              Admin Portal
            </span>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white/80 backdrop-blur-xl p-8 text-slate-900 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.25)] dark:border-white/10 dark:bg-[#0f0f11]/80 dark:shadow-[0_40px_90px_-60px_rgba(0,0,0,0.8)] transition-all duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <ShieldCheck size={18} className="text-[#059669]" />
                Secure Login
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSignIn();
              }}
              className="mt-8 space-y-5"
            >
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#059669] transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@incentify.local"
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 px-10 py-3 text-sm text-slate-900 shadow-sm focus:border-[#059669] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#059669] dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-black/40 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
                  Password
                </label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-[#059669] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#059669] dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-black/40 transition-all placeholder:text-slate-400 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSigningIn}
                className="mt-2 w-full rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold py-3 shadow-lg shadow-[#059669]/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSigningIn ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {authStatus && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center">
                {authStatus}
              </div>
            )}
            {authError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-medium text-center">
                {authError}
              </div>
            )}
            <div className="mt-6 text-xs text-center text-slate-400 dark:text-slate-500">
              Use the seeded admin credentials or create a new admin from the
              backend.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-100 text-slate-900 dark:bg-[#020202] dark:text-white transition-colors duration-300 font-admin-body">
      {/* New Sidebar */}
      <div
        className={`hidden lg:block ${sidebarCollapsed ? "lg:w-20" : "lg:w-64"} transition-all duration-300`}
      >
        <AdminSidebar
          collapsed={sidebarCollapsed}
          activeNav={activeNav}
          onNavClick={handleNavClick}
          adminInfo={adminInfo}
          onLogout={handleSignOut}
          orderNotificationCount={orderNotificationCount}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <button
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            aria-label="Close sidebar"
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <AdminSidebar
              collapsed={false}
              activeNav={activeNav}
              onNavClick={(id) => {
                handleNavClick(id);
                setSidebarOpen(false);
              }}
              adminInfo={adminInfo}
              onLogout={handleSignOut}
              orderNotificationCount={orderNotificationCount}
            />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div
        className="flex-1 min-h-screen overflow-y-auto bg-slate-100 dark:bg-transparent"
        style={
          effectiveTheme === "light"
            ? {
                backgroundImage:
                  "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }
            : {}
        }
      >
        {/* Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/90 border-b border-slate-200/80 dark:bg-[#0d0d0e]/90 dark:border-white/5">
          <div className="px-6 py-3 flex items-center justify-between gap-4">
            {/* Left: toggles + page title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors flex-shrink-0"
                aria-label="Open menu"
              >
                <Menu size={19} />
              </button>
              <button
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className="hidden lg:inline-flex p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors flex-shrink-0"
                aria-label="Toggle sidebar collapse"
                title="Toggle sidebar"
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen size={19} />
                ) : (
                  <PanelLeftClose size={19} />
                )}
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate leading-tight">
                    {headerTitle}
                  </h1>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-white/40 truncate">
                  {getGreeting()} —{" "}
                  {new Date().toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
            </div>

            {/* Right: search + actions + avatar */}
            <div className="flex items-center gap-2 flex-shrink-0">


              {/* Refresh */}
              <button
                onClick={() => loadAll(token)}
                disabled={isRefreshing}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
                aria-label="Refresh"
                title="Refresh all data"
              >
                <RefreshCw
                  size={17}
                  className={isRefreshing ? "animate-spin" : ""}
                />
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
                  className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell size={17} />
                  {notificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#059669] text-[9px] font-bold text-white flex items-center justify-center">
                      {notificationCount}
                    </span>
                  )}
                </button>

                {isNotificationDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsNotificationDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#0f0f11] z-50 animate-in fade-in slide-in-from-top-1 duration-100">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2 mb-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Notifications ({notificationCount})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {vendorNotificationActivities.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                            No notifications yet.
                          </div>
                        ) : (
                          vendorNotificationActivities.map((act) => (
                            <button
                              key={act.id}
                              onClick={() => {
                                handleRequestClick(act);
                                setIsNotificationDropdownOpen(false);
                              }}
                              className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-start gap-3"
                            >
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {act.title}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {act.subtitle}
                                </p>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                                  {act.date}
                                </p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Admin avatar pill */}
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10 ml-1">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#059669] to-[#047857] flex items-center justify-center text-white text-[10px] font-bold shadow-sm flex-shrink-0">
                  {adminInfo?.name
                    ? adminInfo.name
                        .trim()
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "A"}
                </div>
                <div className="hidden lg:block">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                    {adminInfo?.name || "Admin"}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Administrator
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main
          className="p-6 space-y-6 max-w-[1800px] mx-auto"
          style={{ background: "transparent" }}
        >
          {/* Overview Section - Admin Stats */}
          {isOverviewRoute && (
            <section
              id="overview"
              className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {/* KPI Cards — 2 rows of 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[
                  {
                    label: "Customers",
                    value: totalUsersCount,
                    sub: `${effectiveUserStatusCounts.active} active`,
                    icon: Users,
                    color: "emerald",
                    nav: "users",
                  },
                  {
                    label: "Vendors",
                    value: totalVendorsCount,
                    sub: `${effectiveVendorStatusCounts.active || 0} active`,
                    icon: Store,
                    color: "blue",
                    nav: "vendors",
                  },
                  {
                    label: "Campaigns",
                    value: dashboardStats?.activeCampaigns || 0,
                    sub: `${campaigns.length} total`,
                    icon: Megaphone,
                    color: "violet",
                    nav: "campaigns",
                  },
                  {
                    label: "Wallet Float",
                    value: `₹${formatAmount(totalBalance)}`,
                    sub: "All vendor wallets",
                    icon: Wallet,
                    color: "amber",
                    nav: "operations",
                  },
                  {
                    label: "Revenue",
                    value: `₹${formatAmount(platformRevenue)}`,
                    sub: "Platform tech fees",
                    icon: TrendingUp,
                    color: "emerald",
                    nav: "finance",
                  },
                  {
                    label: "Pending Payouts",
                    value: pendingWithdrawalCount,
                    sub:
                      pendingWithdrawalCount > 0 ? "Needs review" : "All clear",
                    icon: HandCoins,
                    color: pendingWithdrawalCount > 0 ? "amber" : "emerald",
                    nav: "payouts",
                  },
                ].map((card) => {
                  const Icon = card.icon;
                  const colorMap = {
                    emerald: {
                      bg: "bg-emerald-50 dark:bg-emerald-500/10",
                      text: "text-emerald-600 dark:text-emerald-400",
                      sub: "text-emerald-600/70 dark:text-emerald-400/60",
                    },
                    blue: {
                      bg: "bg-blue-50 dark:bg-blue-500/10",
                      text: "text-blue-600 dark:text-blue-400",
                      sub: "text-blue-600/70 dark:text-blue-400/60",
                    },
                    violet: {
                      bg: "bg-violet-50 dark:bg-violet-500/10",
                      text: "text-violet-600 dark:text-violet-400",
                      sub: "text-violet-600/70 dark:text-violet-400/60",
                    },
                    amber: {
                      bg: "bg-amber-50 dark:bg-amber-500/10",
                      text: "text-amber-600 dark:text-amber-400",
                      sub: "text-amber-600/70 dark:text-amber-400/60",
                    },
                  };
                  const c = colorMap[card.color] || colorMap.emerald;
                  return (
                    <button
                      key={card.label}
                      onClick={() => handleNavClick(card.nav)}
                      className="group flex items-start gap-4 bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5 text-left hover:border-slate-300 dark:hover:border-white/10 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/20 transition-all duration-200"
                    >
                      <div
                        className={`w-11 h-11 shrink-0 rounded-lg ${c.bg} flex items-center justify-center`}
                      >
                        <Icon className={c.text} size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                          {card.label}
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                          {card.value}
                        </div>
                        <div className={`text-xs mt-1 font-medium ${c.sub}`}>
                          {card.sub}
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className="mt-1 text-slate-300 dark:text-white/10 group-hover:text-slate-400 dark:group-hover:text-white/30 transition-colors"
                      />
                    </button>
                  );
                })}
              </div>



              {/* Platform Activity Chart */}
              <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-6">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Platform Activity
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      Money flow across the platform
                    </p>
                  </div>
                  {/* Pill filter tabs */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="inline-flex items-center bg-slate-100 dark:bg-white/[0.06] rounded-lg p-0.5">
                      {[
                        { label: "Today", value: "today" },
                        { label: "Week", value: "week" },
                        { label: "Month", value: "month" },
                        { label: "Year", value: "year" },
                        { label: "Custom", value: "custom" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setActivityTimeframe(opt.value)}
                          className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 ${
                            activityTimeframe === opt.value
                              ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {activityTimeframe === "custom" && (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <input
                          type="date"
                          value={activityCustomStart}
                          onChange={(e) => setActivityCustomStart(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                        />
                        <span className="text-slate-400 text-xs font-medium">—</span>
                        <input
                          type="date"
                          value={activityCustomEnd}
                          onChange={(e) => setActivityCustomEnd(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-50/30 dark:from-emerald-500/10 dark:to-emerald-500/5 rounded-xl p-4 border border-emerald-100 dark:border-emerald-500/10">
                    <div className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider mb-1">
                      Money In
                    </div>
                    <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">
                      ₹{formatAmount(activityTotals.moneyIn)}
                    </div>
                    <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5" />
                  </div>
                  <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-50/30 dark:from-indigo-500/10 dark:to-indigo-500/5 rounded-xl p-4 border border-indigo-100 dark:border-indigo-500/10">
                    <div className="text-[10px] font-bold text-indigo-600/70 dark:text-indigo-400/70 uppercase tracking-wider mb-1">
                      Money Out
                    </div>
                    <div className="text-xl font-extrabold text-indigo-700 dark:text-indigo-400">
                      ₹{formatAmount(activityTotals.moneyOut)}
                    </div>
                    <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-indigo-500/10 dark:bg-indigo-500/5" />
                  </div>
                </div>

                {/* Area / Line Chart */}
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={activityChartData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="gradientMoneyIn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradientMoneyOut" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.15} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        dy={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickFormatter={(val) => val >= 1000 ? `₹${(val/1000).toFixed(0)}k` : `₹${val}`}
                        width={55}
                        domain={[0, "dataMax"]}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255,255,255,0.95)',
                          backdropFilter: 'blur(8px)',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                          padding: '10px 14px',
                        }}
                        labelStyle={{ color: '#0f172a', fontWeight: '700', fontSize: '12px', marginBottom: '6px' }}
                        itemStyle={{ fontSize: '12px', padding: '2px 0' }}
                        formatter={(value, name) => [
                          `₹${formatAmount(value)}`,
                          name === 'moneyIn' ? '↑ Money In' : '↓ Money Out'
                        ]}
                        cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="moneyIn"
                        name="moneyIn"
                        stroke="#059669"
                        strokeWidth={2.5}
                        fill="url(#gradientMoneyIn)"
                        dot={{ r: 3, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 5, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                      >
                        <LabelList
                          dataKey="moneyIn"
                          position="top"
                          formatter={(value) => value > 0 ? `₹${formatAmount(value)}` : ""}
                          fill="#059669"
                          fontSize={11}
                          fontWeight={700}
                        />
                      </Area>
                      <Area
                        type="monotone"
                        dataKey="moneyOut"
                        name="moneyOut"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fill="url(#gradientMoneyOut)"
                        dot={{ r: 3, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
                  <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span className="w-3 h-[3px] rounded-full bg-emerald-500" /> Money In (Recharges)
                  </span>
                  <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span className="w-3 h-[3px] rounded-full bg-indigo-500" /> Money Out (Payouts)
                  </span>
                </div>

                {/* Recent Transactions */}
                {effectiveTransactions?.length > 0 && (
                  <div className="mt-6 border-t border-slate-200 dark:border-white/[0.06] pt-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Recent Transactions
                      </h4>
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-0.5 rounded-lg border border-slate-200/50 dark:border-white/5">
                        {[
                          { label: "All", value: "all" },
                          { label: "Recharges", value: "recharge" },
                          { label: "Withdrawals", value: "withdrawal" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setRecentTxTypeFilter(opt.value);
                              setRecentTxLimit(4);
                            }}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all duration-200 ${
                              recentTxTypeFilter === opt.value
                                ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {filteredRecentVendorTransactions.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                          No transactions found matching this type.
                        </div>
                      ) : (
                        filteredRecentVendorTransactions.slice(0, recentTxLimit).map((tx) => {
                          const vendor = tx.Wallet?.Vendor;
                          const vendorName = vendor?.businessName || vendor?.User?.name || vendor?.id || "Platform User";
                          const isDebit = tx.type === "debit";
                          
                          const category = String(tx.category || "").toUpperCase();
                          let displayLabel = isDebit ? "Withdrawal" : "Recharge";
                          if (category.includes("RECHARGE") || category === "ADMIN_CREDIT") {
                            displayLabel = "Recharge";
                          } else if (category.includes("WITHDRAW")) {
                            displayLabel = "Withdrawal";
                          } else if (category === "CAMPAIGN_PAYOUT" || category.includes("PAYOUT") || category.includes("SETTLEMENT")) {
                            displayLabel = "Settlement";
                          }

                          return (
                            <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] hover:bg-slate-100/80 dark:hover:bg-white/[0.04] transition-colors">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDebit ? 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                                  {isDebit ? <ArrowLeftRight size={14} /> : <CircleDollarSign size={14} />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">{vendorName}</p>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      displayLabel === "Recharge" 
                                        ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                        : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                                    }`}>
                                      {displayLabel}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{formatDate(tx.createdAt)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-bold ${isDebit ? 'text-slate-800 dark:text-slate-200' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                  {isDebit ? "-" : "+"}₹{formatAmount(tx.amount)}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">{tx.status || 'completed'}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {filteredRecentVendorTransactions.length > 4 && (
                      <div className="flex items-center justify-center mt-4">
                        {recentTxLimit < filteredRecentVendorTransactions.length ? (
                          <button
                            onClick={() => setRecentTxLimit((prev) => prev + 4)}
                            className="px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-sm font-semibold text-white transition-all shadow-sm"
                          >
                            Show More
                          </button>
                        ) : (
                          <button
                            onClick={() => setRecentTxLimit(4)}
                            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm text-slate-700 font-medium transition-colors dark:bg-white/5 dark:hover:bg-white/10 dark:text-white"
                          >
                            Show Less
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Items + Notifications */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Action Items */}
                <div className="lg:col-span-3 bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Action Required
                    </h3>
                    {pendingWithdrawalCount +
                      orderAttentionCount +
                      pendingQrOrderCount >
                      0 && (
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                        {pendingWithdrawalCount +
                          orderAttentionCount +
                          pendingQrOrderCount}{" "}
                        pending
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {[
                      {
                        label: "Pending Withdrawals",
                        count: pendingWithdrawalCount,
                        icon: HandCoins,
                        nav: "payouts",
                        accent: "amber",
                      },
                      {
                        label: "Orders Awaiting Action",
                        count: orderAttentionCount,
                        icon: Package,
                        nav: "orders",
                        accent: "blue",
                      },
                      {
                        label: "Pending QR Orders",
                        count: pendingQrOrderCount,
                        icon: QrCode,
                        nav: "orders",
                        accent: "violet",
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      const accentColors = {
                        amber: {
                          dot: "bg-amber-500",
                          text: "text-amber-600 dark:text-amber-400",
                          iconBg: "bg-amber-50 dark:bg-amber-500/10",
                        },
                        blue: {
                          dot: "bg-blue-500",
                          text: "text-blue-600 dark:text-blue-400",
                          iconBg: "bg-blue-50 dark:bg-blue-500/10",
                        },
                        violet: {
                          dot: "bg-violet-500",
                          text: "text-violet-600 dark:text-violet-400",
                          iconBg: "bg-violet-50 dark:bg-violet-500/10",
                        },
                      };
                      const ac = accentColors[item.accent];
                      return (
                        <button
                          key={item.label}
                          onClick={() => handleNavClick(item.nav)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50/80 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-transparent hover:border-slate-200 dark:hover:border-white/[0.06] transition-all duration-150 text-left group"
                        >
                          <div
                            className={`w-9 h-9 shrink-0 rounded-lg ${ac.iconBg} flex items-center justify-center`}
                          >
                            <Icon className={ac.text} size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {item.label}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.count > 0 && (
                              <span className="relative flex h-2 w-2">
                                <span
                                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${ac.dot} opacity-75`}
                                />
                                <span
                                  className={`relative inline-flex rounded-full h-2 w-2 ${ac.dot}`}
                                />
                              </span>
                            )}
                            <span
                              className={`text-lg font-bold ${item.count > 0 ? ac.text : "text-slate-300 dark:text-white/20"}`}
                            >
                              {item.count}
                            </span>
                            <ChevronRight
                              size={14}
                              className="text-slate-300 dark:text-white/10 group-hover:text-slate-400 dark:group-hover:text-white/30 transition-colors"
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notifications */}
                <div className="lg:col-span-2">
                  <RecentActivitiesCard
                    title="Notifications"
                    activities={vendorNotificationActivities}
                    emptyMessage={
                      isLoadingNotifications
                        ? "Loading..."
                        : "No pending requests."
                    }
                    onItemClick={handleRequestClick}
                  />
                  {notificationsError && (
                    <div className="text-xs text-rose-400 mt-2">
                      {notificationsError}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Navigate */}
              <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap
                    className="text-emerald-600 dark:text-emerald-400"
                    size={14}
                  />
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Quick Navigate
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleNavClick(action.id)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.04] text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-500/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all duration-150"
                      >
                        <Icon size={14} />
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Analytics Section */}
          {isAnalyticsRoute && (
            <section
              id="analytics"
              className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {/* Header + Range Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Analytics
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Platform performance metrics
                  </p>
                </div>
                <div className="flex bg-slate-100 dark:bg-white/5 rounded-lg p-0.5">
                  {rangeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setAnalyticsRange(option.value)}
                      className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                        analyticsRange === option.value
                          ? "bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm"
                          : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filters — combined Vendor/Brand + Campaign */}
              <div className="flex flex-col md:flex-row gap-3 bg-white dark:bg-[#111113] p-4 rounded-xl border border-slate-200 dark:border-white/[0.06]">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.08em]">
                    Vendor / Brand
                  </label>
                  <select
                    value={filterVendorId}
                    onChange={(e) => {
                      const vId = e.target.value;
                      setFilterVendorId(vId);
                      if (vId === "all") {
                        setFilterBrandId("all");
                      } else {
                        const v = vendors.find((v) => v.id === vId);
                        setFilterBrandId(v?.brandId || v?.Brand?.id || "all");
                      }
                      setFilterCampaignId("all");
                    }}
                    className={adminInputClass}
                  >
                    <option value="all">All Vendors</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.businessName || v.User?.name || v.contactEmail}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.08em]">
                    Campaign
                  </label>
                  <select
                    value={filterCampaignId}
                    onChange={(e) => setFilterCampaignId(e.target.value)}
                    className={adminInputClass}
                  >
                    <option value="all">All Campaigns</option>
                    {campaigns
                      .filter((c) => {
                        const campaignVendorId = c.Brand?.vendorId || c.brand?.vendorId || c.vendorId;
                        const matchesVendor =
                          filterVendorId === "all" ||
                          campaignVendorId === filterVendorId;
                        const matchesBrand =
                          filterBrandId === "all" ||
                          c.brandId === filterBrandId ||
                          c.Brand?.id === filterBrandId;
                        return matchesVendor && matchesBrand;
                      })
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title || "Untitled"}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {analyticsStats.map((stat) => {
                  const icons = {
                    "Total Users": Users,
                    "Active Vendors": Building2,
                    "Total QRs": QrCode,
                    "Platform Balance": Wallet,
                  };
                  const colors = {
                    "Total Users": "blue",
                    "Active Vendors": "emerald",
                    "Total QRs": "violet",
                    "Platform Balance": "amber",
                  };
                  const colorMap = {
                    blue: {
                      bg: "bg-blue-50 dark:bg-blue-500/10",
                      text: "text-blue-600 dark:text-blue-400",
                    },
                    emerald: {
                      bg: "bg-emerald-50 dark:bg-emerald-500/10",
                      text: "text-emerald-600 dark:text-emerald-400",
                    },
                    violet: {
                      bg: "bg-violet-50 dark:bg-violet-500/10",
                      text: "text-violet-600 dark:text-violet-400",
                    },
                    amber: {
                      bg: "bg-amber-50 dark:bg-amber-500/10",
                      text: "text-amber-600 dark:text-amber-400",
                    },
                  };
                  const Icon = icons[stat.label] || Activity;
                  const c = colorMap[colors[stat.label]] || colorMap.emerald;
                  return (
                    <div
                      key={stat.label}
                      className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 flex items-start gap-3"
                    >
                      <div
                        className={`w-10 h-10 shrink-0 rounded-lg ${c.bg} flex items-center justify-center`}
                      >
                        <Icon className={c.text} size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                          {stat.label}
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white truncate">
                          {isLoadingDashboard
                            ? "..."
                            : stat.isCurrency
                              ? `₹${formatAmount(stat.value)}`
                              : (stat.value ?? "-")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {dashboardError && (
                <div className="text-xs text-rose-400">{dashboardError}</div>
              )}

              {/* Charts — 2 column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Credit vs Debit Bar Chart */}
                <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                        <BarChart3
                          className="text-emerald-600 dark:text-emerald-400"
                          size={16}
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Revenue Breakdown
                        </h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Money In vs Money Out · Last {analyticsRange}d
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          Money In
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          Money Out
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Summary row */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-emerald-50/60 dark:bg-emerald-500/5 rounded-lg px-3 py-2.5 border border-emerald-100 dark:border-emerald-500/10">
                      <div className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-400/50 uppercase tracking-wider">
                        Total Money In
                      </div>
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        ₹{formatAmount(transactionTotals.credit)}
                      </div>
                    </div>
                    <div className="bg-rose-50/60 dark:bg-rose-500/5 rounded-lg px-3 py-2.5 border border-rose-100 dark:border-rose-500/10">
                      <div className="text-[10px] font-bold text-rose-600/60 dark:text-rose-400/50 uppercase tracking-wider">
                        Total Money Out
                      </div>
                      <div className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                        ₹{formatAmount(transactionTotals.debit)}
                      </div>
                    </div>
                  </div>
                  {/* Dual bar chart: credits + debits stacked */}
                  <div className="relative">
                    <BarChart
                      data={transactionSeries.credit.map(
                        (c, i) => c + (transactionSeries.debit[i] || 0),
                      )}
                      labels={
                        transactionSeries.buckets?.map((d) => {
                          const date = d.date || new Date(d.key || d);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }) || []
                      }
                      barColor="#059669"
                      height={200}
                    />
                    {/* Overlay debit bars */}
                    <div
                      className="absolute inset-0"
                      style={{ pointerEvents: "none" }}
                    >
                      <BarChart
                        data={transactionSeries.debit}
                        labels={[]}
                        barColor="#e11d48"
                        height={200}
                        showLabels={false}
                      />
                    </div>
                  </div>
                </div>

                {/* Net Flow Line Chart */}
                <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                        <TrendingUp
                          className="text-blue-600 dark:text-blue-400"
                          size={16}
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Net Cash Flow
                        </h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Trend over last {analyticsRange} days
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Net value */}
                  <div className="bg-slate-50/80 dark:bg-white/[0.02] rounded-lg px-3 py-2.5 border border-slate-100 dark:border-white/[0.04] mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Net Flow
                        </div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                          ₹
                          {formatAmount(
                            transactionTotals.credit - transactionTotals.debit,
                          )}
                        </div>
                      </div>
                      <div
                        className={`text-xs font-semibold px-2 py-1 rounded-md ${
                          transactionTotals.credit - transactionTotals.debit >=
                          0
                            ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10"
                            : "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10"
                        }`}
                      >
                        {transactionTotals.credit - transactionTotals.debit >= 0
                          ? "Positive"
                          : "Negative"}
                      </div>
                    </div>
                  </div>
                  <LineChartComponent
                    data={transactionSeries.net}
                    labels={
                      transactionSeries.buckets?.map((d) => {
                        const date = d.date || new Date(d.key || d);
                        return `${date.getDate()}/${date.getMonth() + 1}`;
                      }) || []
                    }
                    lineColor="#3b82f6"
                    fillColor="rgba(59,130,246,0.08)"
                    height={200}
                  />
                </div>
              </div>
            </section>
          )}

          {/* QR Processing Section */}
          {isOrdersRoute && (
            <section
              id="orders"
              className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    QR Processing
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Manage and download generated QR batches
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-md">
                    Total: {ordersTotal} batches
                  </span>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-white/5 p-4 rounded-xl border border-slate-200/60 dark:border-white/10 shadow-sm">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Vendor / Brand
                  </label>
                  <select
                    value={filterVendorId}
                    onChange={(e) => {
                      const vId = e.target.value;
                      setFilterVendorId(vId);
                      if (vId === "all") {
                        setFilterBrandId("all");
                      } else {
                        const v = vendors.find((v) => v.id === vId);
                        setFilterBrandId(v?.brandId || v?.Brand?.id || "all");
                      }
                      setFilterCampaignId("all");
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#059669] focus:outline-none focus:ring-1 focus:ring-[#059669] dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="all">All Vendors</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.businessName || v.User?.name || v.contactEmail}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Product / Campaign
                  </label>
                  <select
                    value={filterCampaignId}
                    onChange={(e) => setFilterCampaignId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#059669] focus:outline-none focus:ring-1 focus:ring-[#059669] dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="all">All Campaigns</option>
                    {campaigns
                      .filter((c) => {
                        const campaignVendorId = c.Brand?.vendorId || c.brand?.vendorId || c.vendorId;
                        const matchesVendor =
                          filterVendorId === "all" ||
                          campaignVendorId === filterVendorId;
                        const matchesBrand =
                          filterBrandId === "all" ||
                          c.brandId === filterBrandId ||
                          c.Brand?.id === filterBrandId;
                        return matchesVendor && matchesBrand;
                      })
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title || "Untitled"}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Batches Table */}
              <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Vendor & Brand
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Campaign (Product)
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Created At
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                      {isLoadingOrders ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="p-8 text-center text-slate-500"
                          >
                            Loading batches...
                          </td>
                        </tr>
                      ) : orders.filter((order) => {
                          const matchesVendor =
                            filterVendorId === "all" ||
                            order.vendorId === filterVendorId ||
                            order.vendor?.id === filterVendorId;
                          const matchesCampaign =
                            filterCampaignId === "all" ||
                            order.campaignId === filterCampaignId;
                          return matchesVendor && matchesCampaign;
                        }).length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="p-8 text-center text-slate-500"
                          >
                            No QR batches found matching filters.
                          </td>
                        </tr>
                      ) : (
                        orders
                          .filter((order) => {
                            const matchesVendor =
                              filterVendorId === "all" ||
                              order.vendorId === filterVendorId ||
                              order.vendor?.id === filterVendorId;
                            const matchesCampaign =
                              filterCampaignId === "all" ||
                              order.campaignId === filterCampaignId;
                            return matchesVendor && matchesCampaign;
                          })
                          .map((order) => {
                            const vendorName =
                              order.vendor?.businessName ||
                              order.vendor?.name ||
                              "Unknown Vendor";
                            const brandName =
                              order.brandName || order.vendor?.brandName || "-";

                            return (
                              <tr
                                key={order.id}
                                className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                              >
                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-white/5">
                                  <div>
                                    <div className="font-medium text-slate-900 dark:text-white">
                                      {vendorName}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {brandName}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-white/5">
                                  <div className="font-medium text-slate-700 dark:text-slate-200">
                                    {order.campaignTitle || "Untitled Campaign"}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    ID: {String(order.id).slice(0, 8)}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-white/5">
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    <QrCode size={12} />
                                    {order.quantity}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-white/5">
                                  {formatDate(order.createdAt)}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-white/5">
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                      order.status === "paid"
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                        : order.status === "shipped"
                                          ? "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                                          : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                    }`}
                                  >
                                    {order.status || "pending"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-white/5 text-right">
                                  <button
                                    onClick={() =>
                                      handleDownloadOrderPdf(order)
                                    }
                                    disabled={isPreparingBatchPdf}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#059669] text-white hover:bg-[#047857] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
                                  >
                                    {isPreparingBatchPdf &&
                                    batchQrs.length > 0 &&
                                    batchQrs[0].orderId === order.id ? (
                                      <>
                                        <RefreshCw
                                          size={12}
                                          className="animate-spin"
                                        />
                                        Generating...
                                      </>
                                    ) : (
                                      <>
                                        <Download size={12} />
                                        Download PDF
                                      </>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Pagination if needed, currently showing all loaded */}
                {orders.length > 0 && (
                  <div className="p-4 border-t border-slate-200 dark:border-white/10 text-xs text-center text-slate-500">
                    Showing recent batches. Use "Reports" for older history.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Operations Section */}
          {isOperationsRoute && (
            <section
              id="operations"
              className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Operations
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Manual adjustments and platform controls
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={adminCardClass}>
                  <div className="flex items-center gap-2 mb-6">
                    <Wallet width={18} className="text-[#059669]" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Adjust Vendor Wallet
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Vendor ID
                        </label>
                        <input
                          type="text"
                          value={walletCredit.vendorId}
                          onChange={(e) =>
                            setWalletCredit({
                              ...walletCredit,
                              vendorId: e.target.value,
                            })
                          }
                          placeholder="e.g. 12345"
                          className={adminInputClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Transaction Type
                        </label>
                        <select
                          value={walletCredit.type}
                          onChange={(e) =>
                            setWalletCredit({
                              ...walletCredit,
                              type: e.target.value,
                            })
                          }
                          className={adminInputClass}
                        >
                          <option value="credit" className={adminOptionClass}>
                            Credit (Deposit)
                          </option>
                          <option value="debit" className={adminOptionClass}>
                            Debit (Withdraw)
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Amount (INR)
                      </label>
                      <input
                        type="number"
                        value={walletCredit.amount}
                        onChange={(e) =>
                          setWalletCredit({
                            ...walletCredit,
                            amount: e.target.value,
                          })
                        }
                        placeholder="0.00"
                        className={adminInputClass}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Justification
                      </label>
                      <textarea
                        value={walletCredit.description}
                        onChange={(e) =>
                          setWalletCredit({
                            ...walletCredit,
                            description: e.target.value,
                          })
                        }
                        placeholder="Reason for this manual adjustment..."
                        className={`${adminInputClass} min-h-[80px]`}
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleWalletCredit}
                        disabled={isCreditingWallet}
                        className={`w-full ${adminPrimaryButtonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isCreditingWallet ? (
                          <span className="flex items-center justify-center gap-2">
                            Processing...
                          </span>
                        ) : (
                          "Apply Adjustment"
                        )}
                      </button>
                    </div>

                    {walletStatus && (
                      <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg text-sm border border-emerald-500/20 text-center">
                        {walletStatus}
                      </div>
                    )}
                    {walletError && (
                      <div className="p-3 bg-rose-500/10 text-rose-500 rounded-lg text-sm border border-rose-500/20 text-center">
                        {walletError}
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional controls can go here */}
                <div className={adminCardClass}>
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart2 width={18} className="text-[#059669]" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Campaign Analytics
                    </h3>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    Enter a campaign ID below to fetch detailed analytics
                    including QR generation stats, redemption rates, and budget
                    utilization.
                  </p>

                  {/* Campaign Analytics Form would go here, reusing same styles */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Campaign ID
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={campaignAnalyticsId}
                          onChange={(e) =>
                            setCampaignAnalyticsId(e.target.value)
                          }
                          className={adminInputClass}
                        >
                          <option value="">Select a campaign...</option>
                          {campaigns.map((campaign) => (
                            <option key={campaign.id} value={campaign.id}>
                              {campaign.title || "Untitled"} �{" "}
                              {campaign.Brand?.name || "Unknown Brand"}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() =>
                            loadCampaignAnalytics(token, campaignAnalyticsId)
                          }
                          disabled={
                            !campaignAnalyticsId || isLoadingCampaignAnalytics
                          }
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-lg transition-colors"
                        >
                          <Search size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campaign Analytics Feedback */}
              {isLoadingCampaignAnalytics && (
                <div className="flex items-center justify-center p-8 bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                  <div className="flex flex-col items-center gap-2 text-slate-500 font-medium animate-pulse">
                    <BarChart2 size={24} className="opacity-50" />
                    Loading analytics data...
                  </div>
                </div>
              )}

              {campaignAnalyticsError && (
                <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 flex items-center gap-3">
                  <AlertTriangle size={20} />
                  {campaignAnalyticsError}
                </div>
              )}

              {/* Campaign Analytics Results */}
              {campaignAnalytics && (
                <div className="grid gap-6 lg:grid-cols-[2fr,1fr] animate-in fade-in slide-in-from-bottom-4">
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3 text-xs">
                      <div className="rounded-lg bg-slate-50/70 dark:bg-white/5 p-3">
                        <div className="text-slate-500">Total QRs</div>
                        <div className="text-lg font-semibold text-slate-900 dark:text-white">
                          {campaignAnalytics.metrics?.totalQrs || 0}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50/70 dark:bg-white/5 p-3">
                        <div className="text-slate-500">Redeemed</div>
                        <div className="text-lg font-semibold text-slate-900 dark:text-white">
                          {campaignAnalytics.metrics?.redeemedQrs || 0}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50/70 dark:bg-white/5 p-3">
                        <div className="text-slate-500">Failed</div>
                        <div className="text-lg font-semibold text-slate-900 dark:text-white">
                          {campaignAnalytics.metrics?.failedQrs || 0}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50/70 dark:bg-white/5 p-3">
                        <div className="text-slate-500">Wallet per QR</div>
                        <div className="text-lg font-semibold text-slate-900 dark:text-white">
                          INR{" "}
                          {formatAmount(
                            campaignAnalytics.metrics?.walletDeductionPerQr ||
                              0,
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50/70 dark:bg-white/5 p-3">
                        <div className="text-slate-500">Wallet total</div>
                        <div className="text-lg font-semibold text-slate-900 dark:text-white">
                          INR{" "}
                          {formatAmount(
                            campaignAnalytics.metrics?.walletDeductionTotal ||
                              0,
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50/70 dark:bg-white/5 p-3">
                        <div className="text-slate-500">Redemption rate</div>
                        <div className="text-lg font-semibold text-slate-900 dark:text-white">
                          {campaignAnalytics.metrics?.redemptionRate || "0.00"}%
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 text-xs">
                      <div className="rounded-lg bg-slate-50/70 dark:bg-white/5 p-3">
                        <div className="text-slate-500">Status</div>
                        <div className="text-slate-900 dark:text-white">
                          {campaignAnalytics.campaign?.status || "-"}
                        </div>
                        <div className="text-slate-500 mt-1">
                          Validity:{" "}
                          {formatDate(campaignAnalytics.validity?.startDate)} ?{" "}
                          {formatDate(campaignAnalytics.validity?.endDate)}
                        </div>
                        <div className="text-slate-500">
                          Days remaining:{" "}
                          {campaignAnalytics.validity?.daysRemaining ?? 0}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50/70 dark:bg-white/5 p-3">
                        <div className="text-slate-500">Usage</div>
                        <div className="text-slate-900 dark:text-white">
                          Orders: {campaignAnalytics.metrics?.orders || 0}
                        </div>
                        <div className="text-slate-500">
                          Ordered QRs:{" "}
                          {campaignAnalytics.metrics?.orderedQuantity || 0}
                        </div>
                        <div className="text-slate-500">
                          Unique redeemers:{" "}
                          {campaignAnalytics.metrics?.uniqueRedeemers || 0}
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 text-xs">
                      <div className="rounded-lg bg-slate-50/70 dark:bg-white/5 p-3">
                        <div className="text-slate-500">Budget Check</div>
                        <div className="text-slate-900 dark:text-white">
                          Total:{" "}
                          {campaignAnalytics.budget?.total !== null &&
                          campaignAnalytics.budget?.total !== undefined
                            ? `INR ${formatAmount(campaignAnalytics.budget.total)}`
                            : "Not set"}
                        </div>
                        <div className="text-slate-500">
                          Used: INR{" "}
                          {formatAmount(campaignAnalytics.budget?.used || 0)}
                        </div>
                        <div className="text-slate-500">
                          Remaining:{" "}
                          {campaignAnalytics.budget?.remaining !== null &&
                          campaignAnalytics.budget?.remaining !== undefined
                            ? `INR ${formatAmount(campaignAnalytics.budget.remaining)}`
                            : "-"}
                        </div>
                        <div
                          className={`text-xs font-semibold mt-2 ${campaignAnalytics.budget?.usagePercent >= 100 ? "text-rose-500" : "text-emerald-500"}`}
                        >
                          Usage: {campaignAnalytics.budget?.usagePercent ?? 0}%
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-slate-200/60 dark:bg-white/10">
                          <div
                            className={`h-2 rounded-full ${campaignAnalytics.budget?.usagePercent >= 100 ? "bg-rose-500" : "bg-emerald-500"}`}
                            style={{
                              width: `${Math.min(campaignAnalytics.budget?.usagePercent || 0, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50/70 dark:bg-white/5 p-3">
                        <div className="text-slate-500">QR Abuse Monitor</div>
                        {abuseSignals.length ? (
                          <ul className="text-xs text-rose-500 mt-2 space-y-1">
                            {abuseSignals.map((signal, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="mt-0.5">�</span>
                                <span>{signal}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-slate-500 mt-2">
                            No anomalies detected.
                          </div>
                        )}
                        {campaignAnalytics.topRedeemers?.length > 0 && (
                          <div className="text-[11px] text-slate-500 mt-3">
                            Top redeemer:{" "}
                            {campaignAnalytics.topRedeemers[0]?.redeemedByUserId?.slice(
                              0,
                              8,
                            ) || "User"}{" "}
                            (
                            {campaignAnalytics.topRedeemers[0]?._count?._all ||
                              0}{" "}
                            scans)
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 text-xs">
                      <div className="rounded-lg bg-slate-50/70 dark:bg-white/5 p-3">
                        <div className="font-semibold text-slate-900 dark:text-white mb-2">
                          Recent QRs
                        </div>
                        {campaignAnalytics.recentQrs?.length ? (
                          <div className="space-y-1 text-slate-500 dark:text-slate-400">
                            {campaignAnalytics.recentQrs.map((qr) => (
                              <div
                                key={qr.uniqueHash}
                                className="flex items-center justify-between"
                              >
                                <span>{qr.uniqueHash.slice(0, 8)}...</span>
                                <span className={getStatusClasses(qr.status)}>
                                  {qr.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-500">
                            No QR activity yet.
                          </div>
                        )}
                      </div>
                      <div className="rounded-lg bg-slate-50/70 dark:bg-white/5 p-3">
                        <div className="font-semibold text-slate-900 dark:text-white mb-2">
                          Recent Redemptions
                        </div>
                        {campaignAnalytics.recentRedemptions?.length ? (
                          <div className="space-y-1 text-slate-500 dark:text-slate-400">
                            {campaignAnalytics.recentRedemptions.map((qr) => (
                              <div
                                key={qr.uniqueHash}
                                className="flex items-center justify-between"
                              >
                                <span>{qr.uniqueHash.slice(0, 8)}...</span>
                                <span>{formatDate(qr.redeemedAt)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-500">
                            No redemptions yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Edit Campaign
                    </h4>
                    <input
                      type="text"
                      value={campaignEditForm.title}
                      onChange={(e) =>
                        setCampaignEditForm({
                          ...campaignEditForm,
                          title: e.target.value,
                        })
                      }
                      placeholder="Title"
                      className={adminInputClass}
                    />
                    <textarea
                      rows="3"
                      value={campaignEditForm.description}
                      onChange={(e) =>
                        setCampaignEditForm({
                          ...campaignEditForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Description"
                      className={adminInputClass}
                    />
                    <input
                      type="number"
                      value={campaignEditForm.cashbackAmount}
                      onChange={(e) =>
                        setCampaignEditForm({
                          ...campaignEditForm,
                          cashbackAmount: e.target.value,
                        })
                      }
                      placeholder="Cashback amount"
                      className={adminInputClass}
                    />
                    <input
                      type="date"
                      value={campaignEditForm.startDate}
                      onChange={(e) =>
                        setCampaignEditForm({
                          ...campaignEditForm,
                          startDate: e.target.value,
                        })
                      }
                      className={adminInputClass}
                    />
                    <input
                      type="date"
                      value={campaignEditForm.endDate}
                      onChange={(e) =>
                        setCampaignEditForm({
                          ...campaignEditForm,
                          endDate: e.target.value,
                        })
                      }
                      className={adminInputClass}
                    />
                    <input
                      type="number"
                      value={campaignEditForm.totalBudget}
                      onChange={(e) =>
                        setCampaignEditForm({
                          ...campaignEditForm,
                          totalBudget: e.target.value,
                        })
                      }
                      placeholder="Total budget"
                      className={adminInputClass}
                    />
                    <input
                      type="number"
                      value={campaignEditForm.subtotal}
                      onChange={(e) =>
                        setCampaignEditForm({
                          ...campaignEditForm,
                          subtotal: e.target.value,
                        })
                      }
                      placeholder="Subtotal"
                      className={adminInputClass}
                    />
                    <button
                      type="button"
                      onClick={handleCampaignDetailsSave}
                      disabled={isUpdatingCampaignDetails}
                      className={`${adminPrimaryButtonClass} disabled:opacity-50`}
                    >
                      {isUpdatingCampaignDetails ? "Saving..." : "Save Changes"}
                    </button>
                    {campaignEditStatus && (
                      <div className="text-xs text-emerald-500">
                        {campaignEditStatus}
                      </div>
                    )}
                    {campaignEditError && (
                      <div className="text-xs text-rose-400">
                        {campaignEditError}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Campaigns Section */}
          {isCampaignsRoute && (
            <section id="campaigns" className="space-y-6 mt-12">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Campaigns
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    Review vendor campaign requests and approve or pause
                    activity.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {campaigns.length > 6 && (
                    <button
                      onClick={() => setShowAllCampaigns((prev) => !prev)}
                      className={adminGhostButtonClass}
                    >
                      {showAllCampaigns
                        ? "Show less"
                        : `View all (${campaigns.length})`}
                    </button>
                  )}
                  <button
                    onClick={() => loadCampaigns()}
                    disabled={isLoadingCampaigns}
                    className={adminGhostButtonClass}
                  >
                    <RefreshCw size={14} className="inline-block mr-1" />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr,2fr]">
                <div className={`${adminPanelClass} p-6`}>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Quick Status Override
                  </h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={campaignControl.id}
                      onChange={(e) =>
                        setCampaignControl({
                          ...campaignControl,
                          id: e.target.value,
                        })
                      }
                      placeholder="Campaign ID"
                      className={adminInputClass}
                    />
                    <select
                      value={campaignControl.status}
                      onChange={(e) =>
                        setCampaignControl({
                          ...campaignControl,
                          status: e.target.value,
                        })
                      }
                      className={adminInputClass}
                    >
                      <option value="active" className={adminOptionClass}>
                        Active
                      </option>
                      <option value="paused" className={adminOptionClass}>
                        Paused
                      </option>
                      <option value="rejected" className={adminOptionClass}>
                        Rejected
                      </option>
                      <option value="completed" className={adminOptionClass}>
                        Completed
                      </option>
                    </select>
                    <button
                      onClick={handleCampaignStatusUpdate}
                      disabled={isUpdatingCampaign}
                      className={`w-full ${adminPrimaryButtonClass} disabled:opacity-50`}
                    >
                      {isUpdatingCampaign ? "Updating..." : "Update Campaign"}
                    </button>
                    {campaignStatus && (
                      <div className="text-sm text-emerald-400">
                        {campaignStatus}
                      </div>
                    )}
                    {campaignError && (
                      <div className="text-sm text-rose-400">
                        {campaignError}
                      </div>
                    )}
                  </div>
                </div>

                <div className={`${adminPanelClass} p-6 space-y-4`}>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 font-semibold">
                      Pending: {campaignStatusCounts.pending || 0}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold">
                      Active: {campaignStatusCounts.active || 0}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-500/10 text-slate-500 font-semibold">
                      Paused: {campaignStatusCounts.paused || 0}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 font-semibold">
                      Rejected: {campaignStatusCounts.rejected || 0}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 font-semibold">
                      Completed: {campaignStatusCounts.completed || 0}
                    </span>
                  </div>
                  {isLoadingCampaigns && (
                    <div className="text-sm text-slate-500">
                      Loading campaigns...
                    </div>
                  )}
                  {campaignsError && (
                    <div className="text-xs text-rose-400">
                      {campaignsError}
                    </div>
                  )}
                  {!isLoadingCampaigns && campaigns.length === 0 && (
                    <div className="text-sm text-slate-500">
                      No vendor campaigns yet.
                    </div>
                  )}
                  {limitedCampaigns.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-white/5">
                          <tr>
                            <th className="text-left py-3 px-3 text-slate-900 dark:text-white/60 font-medium">
                              Campaign
                            </th>
                            <th className="text-left py-3 px-3 text-slate-900 dark:text-white/60 font-medium">
                              Brand
                            </th>
                            <th className="text-left py-3 px-3 text-slate-900 dark:text-white/60 font-medium">
                              Vendor
                            </th>
                            <th className="text-left py-3 px-3 text-slate-900 dark:text-white/60 font-medium">
                              Budget
                            </th>
                            <th className="text-left py-3 px-3 text-slate-900 dark:text-white/60 font-medium">
                              Status
                            </th>
                            <th className="text-left py-3 px-3 text-slate-900 dark:text-white/60 font-medium">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {limitedCampaigns.map((campaign) => {
                            const currentStatus = String(
                              campaign.status || "pending",
                            ).toLowerCase();
                            const brandLabel = campaign.Brand?.name || "-";
                            const vendorLabel =
                              campaign.Brand?.Vendor?.businessName ||
                              campaign.Brand?.Vendor?.User?.email ||
                              campaign.Brand?.Vendor?.contactEmail ||
                              "-";
                            return (
                              <tr
                                key={campaign.id}
                                className="border-t border-slate-200/70 dark:border-white/5"
                              >
                                <td className="py-3 px-3 text-slate-900 dark:text-white">
                                  <div className="font-semibold">
                                    {campaign.title || "Campaign"}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {campaign.id.slice(0, 8)}...
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-slate-900 dark:text-white/70">
                                  {brandLabel}
                                </td>
                                <td className="py-3 px-3 text-slate-900 dark:text-white/70">
                                  {vendorLabel}
                                </td>
                                <td className="py-3 px-3 text-slate-900 dark:text-white/70">
                                  INR {formatAmount(campaign.totalBudget)}
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClasses(
                                      currentStatus,
                                    )}`}
                                  >
                                    {currentStatus}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={
                                        campaignStatusUpdates[campaign.id] ||
                                        currentStatus
                                      }
                                      onChange={(e) =>
                                        setCampaignStatusUpdates({
                                          ...campaignStatusUpdates,
                                          [campaign.id]: e.target.value,
                                        })
                                      }
                                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#059669]"
                                    >
                                      <option
                                        value="pending"
                                        disabled
                                        className={adminOptionClass}
                                      >
                                        Pending
                                      </option>
                                      <option
                                        value="active"
                                        className={adminOptionClass}
                                      >
                                        Active
                                      </option>
                                      <option
                                        value="paused"
                                        className={adminOptionClass}
                                      >
                                        Paused
                                      </option>
                                      <option
                                        value="rejected"
                                        className={adminOptionClass}
                                      >
                                        Rejected
                                      </option>
                                      <option
                                        value="completed"
                                        className={adminOptionClass}
                                      >
                                        Completed
                                      </option>
                                    </select>
                                    <button
                                      onClick={() =>
                                        handleCampaignRowStatusSave(
                                          campaign.id,
                                          currentStatus,
                                        )
                                      }
                                      className="px-3 py-1 rounded-lg bg-[#059669] hover:bg-[#047857] text-slate-900 dark:text-white text-xs font-semibold transition-colors"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteCampaign(campaign)
                                      }
                                      disabled={
                                        deletingCampaignId === campaign.id
                                      }
                                      className="px-3 py-1 rounded-lg border border-rose-200/70 text-rose-600 hover:text-rose-700 hover:border-rose-300 text-xs font-semibold disabled:opacity-60 dark:border-rose-400/40 dark:text-rose-300"
                                    >
                                      {deletingCampaignId === campaign.id
                                        ? "Deleting..."
                                        : "Delete"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCampaignAnalyticsId(campaign.id)
                                      }
                                      className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-xs font-semibold text-slate-900 dark:text-white"
                                    >
                                      Inspect
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {campaignActionStatus && (
                    <div className="text-xs text-emerald-400">
                      {campaignActionStatus}
                    </div>
                  )}
                  {campaignActionError && (
                    <div className="text-xs text-rose-400">
                      {campaignActionError}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Orders Section */}
          {isOrdersRoute && (
            <section
              id="orders"
              className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              {qrBatchSummary.length > 0 && (
                <div className={`${adminPanelClass} p-6 space-y-5`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        QR Batch Overview
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Summarized from QR inventory (campaign, cashback, batch
                        size).
                        {qrsCoverageLabel ? ` ${qrsCoverageLabel}.` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold">
                        Active: {qrBatchActiveTotal}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white/60 font-semibold">
                        Batches: {sortedQrBatchSummary.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="relative w-full sm:w-72">
                        <Search
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          value={qrBatchSearch}
                          onChange={(event) => {
                            setQrBatchSearch(event.target.value);
                            setShowAllQrBatches(false);
                          }}
                          placeholder="Search campaign, brand, vendor"
                          className="w-full rounded-lg border border-slate-200 bg-white/80 px-9 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669] dark:border-white/10 dark:bg-[#0f0f11] dark:text-white dark:placeholder:text-white/40"
                        />
                      </div>
                      <select
                        value={qrBatchSort}
                        onChange={(event) => setQrBatchSort(event.target.value)}
                        className="w-full sm:w-44 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#059669] dark:border-white/10 dark:bg-[#0f0f11] dark:text-white"
                      >
                        <option value="recent">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="qty">Highest Qty</option>
                        <option value="active">Most Active</option>
                        <option value="cashback">Highest Cashback</option>
                      </select>
                    </div>
                    {sortedQrBatchSummary.length > qrBatchPreviewLimit && (
                      <button
                        onClick={() => setShowAllQrBatches((prev) => !prev)}
                        className={adminGhostButtonClass}
                      >
                        {showAllQrBatches
                          ? "Show less"
                          : `View all (${sortedQrBatchSummary.length})`}
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {sortedQrBatchSummary.length === 0
                      ? "No batches match your search."
                      : showAllQrBatches
                        ? `Showing ${sortedQrBatchSummary.length} batches.`
                        : `Showing ${visibleQrBatchSummary.length} of ${sortedQrBatchSummary.length} batches.`}
                  </div>

                  {sortedQrBatchSummary.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200/70 dark:border-white/10 p-6 text-sm text-slate-500 dark:text-slate-400">
                      No QR batches to display.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-white/5">
                          <tr>
                            <th className="text-left py-2.5 px-3 text-slate-900 dark:text-white/60 font-medium">
                              Campaign
                            </th>
                            <th className="text-right py-2.5 px-3 text-slate-900 dark:text-white/60 font-medium">
                              Cashback
                            </th>
                            <th className="text-right py-2.5 px-3 text-slate-900 dark:text-white/60 font-medium">
                              Qty
                            </th>
                            <th className="text-right py-2.5 px-3 text-slate-900 dark:text-white/60 font-medium">
                              Active
                            </th>
                            <th className="text-right py-2.5 px-3 text-slate-900 dark:text-white/60 font-medium">
                              Redeemed
                            </th>
                            <th className="text-left py-2.5 px-3 text-slate-900 dark:text-white/60 font-medium">
                              Last Batch
                            </th>
                            <th className="text-left py-2.5 px-3 text-slate-900 dark:text-white/60 font-medium">
                              PDF
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleQrBatchSummary.map((batch) => (
                            <tr
                              key={batch.id}
                              className="border-t border-slate-200/70 dark:border-white/5 hover:bg-slate-50/60 dark:hover:bg-white/[0.04] transition-colors"
                            >
                              <td className="py-2.5 px-3 text-slate-900 dark:text-white">
                                <div className="font-semibold">
                                  {batch.campaignTitle}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {batch.brandName} - {batch.vendorLabel}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-900 dark:text-white/70">
                                INR {formatAmount(batch.cashbackAmount)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-900 dark:text-white/70">
                                {batch.total}
                              </td>
                              <td className="py-2.5 px-3 text-right text-emerald-500">
                                {batch.active}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-900 dark:text-white/70">
                                {batch.redeemed}
                              </td>
                              <td className="py-2.5 px-3 text-slate-900 dark:text-white/60 text-xs">
                                {formatDate(batch.lastCreatedAt)}
                              </td>
                              <td className="py-2.5 px-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDownloadQrBatchPdf(batch)
                                  }
                                  disabled={isPreparingBatchPdf}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                                >
                                  <Download size={14} />
                                  {isPreparingBatchPdf
                                    ? "Preparing..."
                                    : "Download"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {qrBatchStatus && (
                    <div className="text-xs text-emerald-400">
                      {qrBatchStatus}
                    </div>
                  )}
                  {qrBatchError && (
                    <div className="text-xs text-rose-400">{qrBatchError}</div>
                  )}
                </div>
              )}
              {/* Loading Overlay for PDF */}
              {isPreparingBatchPdf && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="bg-white dark:bg-[#1a1a1c] p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                    <RefreshCw
                      className="animate-spin text-[#059669]"
                      size={32}
                    />
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                        Generating PDF
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {qrBatchStatus}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Hidden Canvas Container for PDF Generation */}
          <div
            style={{
              position: "absolute",
              left: "-9999px",
              top: "-9999px",
              visibility: "hidden",
            }}
          >
            {batchQrs.map((qr) => (
              <QRCodeCanvas
                key={qr.uniqueHash}
                id={getPdfCanvasId(qr.uniqueHash)}
                value={getQrValue(qr.uniqueHash)} // Need getQrValue available here
                size={256}
                level="H"
                includeMargin={true}
              />
            ))}
          </div>

          {/* Payouts/Withdrawals Section */}
          {isPayoutsRoute && (
            <section id="payouts" className="space-y-6 mt-12">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Payouts
              </h2>
              <div className={`${adminPanelClass} p-6`}>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Process Withdrawal
                </h3>
                <div className="grid gap-4 lg:grid-cols-2 mb-4">
                  <input
                    type="text"
                    value={withdrawalAction.id}
                    onChange={(e) =>
                      setWithdrawalAction({
                        ...withdrawalAction,
                        id: e.target.value,
                      })
                    }
                    placeholder="Withdrawal ID"
                    className={adminInputClass}
                  />
                  <select
                    value={withdrawalAction.status}
                    onChange={(e) =>
                      setWithdrawalAction({
                        ...withdrawalAction,
                        status: e.target.value,
                      })
                    }
                    className={adminInputClass}
                  >
                    <option value="processed" className={adminOptionClass}>
                      Processed
                    </option>
                    <option value="rejected" className={adminOptionClass}>
                      Rejected
                    </option>
                  </select>
                  <input
                    type="text"
                    value={withdrawalAction.referenceId}
                    onChange={(e) =>
                      setWithdrawalAction({
                        ...withdrawalAction,
                        referenceId: e.target.value,
                      })
                    }
                    placeholder="Reference ID (optional)"
                    className={adminInputClass}
                  />
                  <input
                    type="text"
                    value={withdrawalAction.adminNote}
                    onChange={(e) =>
                      setWithdrawalAction({
                        ...withdrawalAction,
                        adminNote: e.target.value,
                      })
                    }
                    placeholder="Admin note (optional)"
                    className={adminInputClass}
                  />
                </div>
                <button
                  onClick={handleWithdrawalProcess}
                  className={`${adminPrimaryButtonClass} disabled:opacity-50`}
                >
                  Process Withdrawal
                </button>
                {withdrawalStatus && (
                  <div className="mt-2 text-sm text-emerald-400">
                    {withdrawalStatus}
                  </div>
                )}
                {withdrawalError && (
                  <div className="mt-2 text-sm text-rose-400">
                    {withdrawalError}
                  </div>
                )}

                {withdrawalPreview.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-md font-semibold text-slate-900 dark:text-white mb-3">
                      Pending Withdrawals
                    </h4>
                    <div className="space-y-2">
                      {withdrawalPreview.map((withdrawal) => (
                        <div
                          key={withdrawal.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-white/90 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 transition-colors"
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              ID: {withdrawal.id}
                            </div>
                            <div className="text-xs text-slate-900 dark:text-white/60">
                              {formatDate(withdrawal.createdAt)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              INR {formatAmount(withdrawal.amount)}
                            </div>
                            <div
                              className={`text-xs font-semibold ${getStatusClasses(withdrawal.status)}`}
                            >
                              {withdrawal.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {filteredWithdrawals.length > 0 && (
                <div className={`${adminPanelClass} overflow-hidden`}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-white/5 uppercase text-xs tracking-wide text-slate-500 dark:text-slate-300">
                        <tr>
                          <th className="px-4 py-3 text-left">ID</th>
                          <th className="px-4 py-3 text-left">Requester</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">Reference</th>
                          <th className="px-4 py-3 text-left">Reason / Note</th>
                          <th className="px-4 py-3 text-left">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWithdrawals.map((withdrawal) => {
                          const requester =
                            withdrawal?.Wallet?.Vendor?.businessName ||
                            withdrawal?.Wallet?.User?.name ||
                            withdrawal?.Wallet?.User?.email ||
                            "-";
                          const reason =
                            withdrawal?.rejectionReason ||
                            withdrawal?.adminNote ||
                            "-";
                          return (
                            <tr
                              key={withdrawal.id}
                              className="border-t border-slate-200/70 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                            >
                              <td className="px-4 py-3 text-slate-900 dark:text-white font-mono text-xs">
                                {withdrawal.id?.slice(0, 8)}...
                              </td>
                              <td className="px-4 py-3 text-slate-900 dark:text-white">
                                {requester}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-900 dark:text-white font-semibold">
                                INR {formatAmount(withdrawal.amount)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusClasses(withdrawal.status)}`}
                                >
                                  {withdrawal.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                                {withdrawal.referenceId || "-"}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[200px]">
                                {reason}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                                {formatDate(withdrawal.createdAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Finance & Revenue Section */}
          {isFinanceRoute && (
            <section id="finance" className="space-y-6 mt-12">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Finance & Revenue
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Vendor recharges, tech fee earnings, payout liabilities, and
                    settlement reporting.
                  </p>
                </div>
              </div>

              {financeLoading && (
                <div className="text-slate-900 dark:text-white/60">
                  Loading finance summary...
                </div>
              )}
              {financeError && (
                <div className="text-rose-400">{financeError}</div>
              )}

              {financeSummary && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className={adminCardClass}>
                      <div className={statLabelClass}>Vendor Recharges</div>
                      <div className="flex items-center justify-between">
                        <span className={statValueClass}>
                          INR {formatAmount(financeSummary.vendorRecharges)}
                        </span>
                        <Wallet
                          className="text-slate-300 dark:text-white/20"
                          size={24}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {financeSummary.vendorRechargeCount || 0} deposits
                      </div>
                    </div>

                    <div className={adminCardClass}>
                      <div className={statLabelClass}>Tech Fee Earnings</div>
                      <div className="flex items-center justify-between">
                        <span className={statValueClass}>
                          INR {formatAmount(financeSummary.techFeeEarnings)}
                        </span>
                        <TrendingUp
                          className="text-slate-300 dark:text-white/20"
                          size={24}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        From QR print fees
                      </div>
                    </div>

                    <div className={adminCardClass}>
                      <div className={statLabelClass}>Payout Liabilities</div>
                      <div className="flex items-center justify-between">
                        <span className={statValueClass}>
                          INR {formatAmount(financeSummary.payoutLiabilities)}
                        </span>
                        <HandCoins
                          className="text-slate-300 dark:text-white/20"
                          size={24}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {financeSummary.withdrawals?.pending?.count || 0}{" "}
                        pending payouts
                      </div>
                    </div>

                    <div className={adminCardClass}>
                      <div className={statLabelClass}>Wallet Float</div>
                      <div className="flex items-center justify-between">
                        <span className={statValueClass}>
                          INR {formatAmount(financeSummary.walletFloat)}
                        </span>
                        <Banknote
                          className="text-slate-300 dark:text-white/20"
                          size={24}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Total wallet balances
                      </div>
                    </div>
                  </div>

                  <div className={`${adminPanelClass} overflow-hidden`}>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70 dark:border-white/10">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          Settlement Reports
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Recent payouts and campaign settlements.
                        </p>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Showing {financeSummary.settlements?.length || 0}{" "}
                        records
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-white/5 uppercase text-xs tracking-wide text-slate-500 dark:text-slate-300">
                          <tr>
                            <th className="px-4 py-3 text-left">Date</th>
                            <th className="px-4 py-3 text-left">Party</th>
                            <th className="px-4 py-3 text-left">Category</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(financeSummary.settlements || []).map((tx) => {
                            const vendor = tx.Wallet?.Vendor;
                            const user = tx.Wallet?.User;
                            const partyLabel =
                              vendor?.businessName ||
                              vendor?.User?.name ||
                              user?.name ||
                              user?.email ||
                              "-";
                            const amountClass =
                              tx.type === "debit"
                                ? "text-rose-500 dark:text-rose-300"
                                : "text-emerald-500 dark:text-emerald-300";
                            return (
                              <tr
                                key={tx.id}
                                className="border-t border-slate-200/70 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                              >
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                                  {formatDate(tx.createdAt)}
                                </td>
                                <td className="px-4 py-3 text-slate-900 dark:text-white">
                                  {partyLabel}
                                </td>
                                <td className="px-4 py-3 text-slate-900 dark:text-white/70 text-xs tracking-wide">
                                  {(tx.category || "N/A").replace(/_/g, " ")}
                                </td>
                                <td
                                  className={`px-4 py-3 text-right font-semibold ${amountClass}`}
                                >
                                  {tx.type === "debit" ? "-" : "+"}INR{" "}
                                  {formatAmount(tx.amount)}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusClasses(tx.status)}`}
                                  >
                                    {tx.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {/* Continue with remaining sections... */}
          {isTransactionsRoute && (
            <section id="transactions" className="space-y-6 mt-12">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Vendor Transactions
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-300 max-w-xl">
                    Manual admin recharges are hidden so the table stays focused
                    on vendor payouts and cashback settlements tied to
                    campaigns.
                  </p>
                </div>
                {filteredVendorTransactionsByTime.length > 8 && (
                  <button
                    onClick={() => setShowAllTransactions((prev) => !prev)}
                    className={`${adminGhostButtonClass} whitespace-nowrap`}
                  >
                    {showAllTransactions
                      ? "Show less"
                      : `View all (${filteredVendorTransactionsByTime.length})`}
                  </button>
                )}
              </div>

              {/* Timeframe Filter Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Timeframe:
                  </span>
                  <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-lg">
                    {[
                      { label: "All", value: "all" },
                      { label: "Today", value: "today" },
                      { label: "Week", value: "week" },
                      { label: "Month", value: "month" },
                      { label: "Year", value: "year" },
                      { label: "Custom", value: "custom" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setTxTimeframe(opt.value)}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 ${
                          txTimeframe === opt.value
                            ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {txTimeframe === "custom" && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <input
                        type="date"
                        value={txCustomStart}
                        onChange={(e) => setTxCustomStart(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                      />
                      <span className="text-slate-400 text-xs font-medium">—</span>
                      <input
                        type="date"
                        value={txCustomEnd}
                        onChange={(e) => setTxCustomEnd(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Showing {limitedVendorTransactions.length} of {filteredVendorTransactionsByTime.length} transactions
                </div>
              </div>

              {isLoadingTransactions && (
                <div className="text-slate-900 dark:text-white/60">
                  Loading...
                </div>
              )}
              {transactionsError && (
                <div className="text-rose-400">{transactionsError}</div>
              )}
              {!isLoadingTransactions && filteredVendorTransactionsByTime.length === 0 ? (
                <div className="text-slate-900 dark:text-white/60">
                  No vendor settlements found for the selected timeframe.
                </div>
              ) : (
                <div className={`${adminPanelClass} overflow-hidden`}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-white/5 uppercase text-xs tracking-wide text-slate-500 dark:text-slate-300">
                        <tr>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Vendor</th>
                          <th className="px-4 py-3 text-left">Campaign</th>
                          <th className="px-4 py-3 text-left">Category</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {limitedVendorTransactions.map((tx) => {
                          const vendor = tx.Wallet?.Vendor;
                          const vendorName =
                            vendor?.businessName ||
                            vendor?.User?.name ||
                            vendor?.id ||
                            "Vendor";
                          const vendorContact =
                            vendor?.contactEmail ||
                            vendor?.User?.email ||
                            vendor?.contactPhone ||
                            vendor?.User?.name ||
                            "-";
                          const campaignLabel = extractCampaignTitle(
                            tx.description,
                          );
                          const amountClass =
                            tx.type === "debit"
                              ? "text-rose-500 dark:text-rose-300"
                              : "text-emerald-500 dark:text-emerald-300";
                          return (
                            <tr
                              key={tx.id}
                              className="border-t border-slate-200/70 dark:border-white/5 last:border-b-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                            >
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                                {formatDate(tx.createdAt)}
                              </td>
                              <td className="px-4 py-3 text-slate-900 dark:text-white">
                                <div className="font-semibold">
                                  {vendorName}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {vendorContact}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-800 dark:text-slate-200 max-w-[180px] whitespace-normal">
                                {campaignLabel}
                              </td>
                              <td className="px-4 py-3 text-slate-900 dark:text-white/70 text-xs tracking-wide">
                                {(tx.category || "N/A").replace(/_/g, " ")}
                              </td>
                              <td
                                className={`px-4 py-3 text-right font-semibold ${amountClass}`}
                              >
                                {tx.type === "debit" ? "-" : "+"}INR{" "}
                                {formatAmount(tx.amount)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusClasses(tx.status)}`}
                                >
                                  {tx.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Users Management Section */}
          {isUsersRoute && (
            <section
              id="users"
              className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Users Management
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Manage and monitor all customer accounts
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {showAllUsers ? (
                    <button
                      onClick={() => setShowAllUsers(false)}
                      className={adminGhostButtonClass}
                    >
                      Show Less
                    </button>
                  ) : (
                    filteredUsers.length > 6 && (
                      <button
                        onClick={() => setShowAllUsers(true)}
                        className="px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-sm font-semibold text-white transition-colors shadow-sm"
                      >
                        View All ({filteredUsers.length})
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Active",
                    value: effectiveUserStatusCounts.active || 0,
                    color: "emerald",
                    dot: "bg-emerald-400 animate-pulse",
                  },
                  {
                    label: "Inactive",
                    value: effectiveUserStatusCounts.inactive || 0,
                    color: "amber",
                    dot: "bg-amber-400",
                  },
                  {
                    label: "Blocked",
                    value: effectiveUserStatusCounts.blocked || 0,
                    color: "rose",
                    dot: "bg-rose-400",
                  },
                  {
                    label: "Total",
                    value: users.length,
                    color: "slate",
                    dot: "bg-slate-400",
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className={`bg-white dark:bg-[#111113] border rounded-xl px-4 py-3 flex items-center gap-3
                    ${
                      card.color === "emerald"
                        ? "border-emerald-200/60 dark:border-emerald-500/20"
                        : card.color === "amber"
                          ? "border-amber-200/60 dark:border-amber-500/20"
                          : card.color === "rose"
                            ? "border-rose-200/60 dark:border-rose-500/20"
                            : "border-slate-200/60 dark:border-white/10"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${card.dot}`}
                    />
                    <div>
                      <p
                        className={`text-xl font-bold leading-tight
                        ${
                          card.color === "emerald"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : card.color === "amber"
                              ? "text-amber-600 dark:text-amber-400"
                              : card.color === "rose"
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {card.value}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                        {card.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {isLoadingUsers && (
                <div className="text-slate-500 dark:text-slate-400 text-sm">
                  Loading users...
                </div>
              )}
              {usersError && (
                <div className="text-rose-400 text-sm">{usersError}</div>
              )}

              {limitedUsers.length > 0 && (
                <div className="bg-white dark:bg-[#111113] border border-slate-200/60 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[750px]">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/70 dark:bg-white/[0.02]">
                          <th className="text-left py-3 px-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="text-left py-3 px-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="text-left py-3 px-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="text-left py-3 px-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Wallet
                          </th>
                          <th className="text-left py-3 px-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Joined
                          </th>
                          <th className="text-right py-3 px-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                        {limitedUsers.map((user) => {
                          const initials = user.name
                            ? user.name
                                .trim()
                                .split(" ")
                                .map((p) => p[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()
                            : (user.email?.[0] || "U").toUpperCase();
                          const canSave =
                            (userStatusUpdates[user.id] || user.status) !==
                            user.status;
                          return (
                            <tr
                              key={user.id}
                              className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                            >
                              {/* User col with avatar */}
                              <td className="py-3.5 px-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                                    {initials}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate leading-tight">
                                      {user.name || (
                                        <span className="text-slate-400 italic">
                                          No name
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                      ID: {String(user.id).slice(0, 8)}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              {/* Contact */}
                              <td className="py-3.5 px-5">
                                <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                                  {user.email || "—"}
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                  {user.phoneNumber || "—"}
                                </p>
                              </td>
                              {/* Status badge */}
                              <td className="py-3.5 px-5">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getStatusClasses(user.status)}`}
                                >
                                  {user.status}
                                </span>
                              </td>
                              {/* Wallet */}
                              <td className="py-3.5 px-5">
                                <span
                                  className={`text-sm font-semibold ${user?.Wallet?.balance > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}
                                >
                                  {user?.Wallet
                                    ? `₹${formatAmount(user.Wallet.balance)}`
                                    : "—"}
                                </span>
                              </td>
                              {/* Joined */}
                              <td className="py-3.5 px-5">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {new Date(user.createdAt).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )}
                                </span>
                              </td>
                              {/* Actions */}
                              <td className="py-3.5 px-5">
                                <div className="flex items-center justify-end gap-1.5">
                                  <select
                                    value={
                                      userStatusUpdates[user.id] || user.status
                                    }
                                    onChange={(e) =>
                                      setUserStatusUpdates({
                                        ...userStatusUpdates,
                                        [user.id]: e.target.value,
                                      })
                                    }
                                    className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#059669]"
                                  >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="blocked">Blocked</option>
                                  </select>
                                  <button
                                    onClick={() =>
                                      handleUserStatusSave(user.id, user.status)
                                    }
                                    disabled={!canSave}
                                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#059669] hover:bg-[#047857] text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setSelectedUser(user)}
                                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setIsUserWalletOpen(true);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors"
                                  >
                                    Wallet
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {userActionStatus && (
                    <div className="px-5 py-3 border-t border-slate-100 dark:border-white/5 text-xs text-emerald-500 font-medium">
                      {userActionStatus}
                    </div>
                  )}
                  {userActionError && (
                    <div className="px-5 py-3 border-t border-slate-100 dark:border-white/5 text-xs text-rose-400">
                      {userActionError}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Support & Disputes Section */}
          {isSupportRoute && (
            <section id="support" className="space-y-6 mt-12">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {isProductReportsRoute
                      ? "Product Reports"
                      : "Disputes & Support"}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {isProductReportsRoute
                      ? "Review user product issue reports and respond from one queue."
                      : "Review customer issues, respond to disputes, and close tickets."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-sm text-slate-900 dark:text-white/60">
                    Total: {supportCounts.total}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-amber-100/70 dark:bg-amber-500/20 text-sm text-amber-700 dark:text-amber-300">
                    Product: {supportCounts.product}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSupportView("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    supportView === "all"
                      ? "bg-[#059669] text-white"
                      : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  All ({supportCounts.total})
                </button>
                <button
                  type="button"
                  onClick={() => setSupportView("product")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    supportView === "product"
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Product Reports ({supportCounts.product})
                </button>
                <button
                  type="button"
                  onClick={() => setSupportView("other")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    supportView === "other"
                      ? "bg-slate-700 text-white dark:bg-slate-600"
                      : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Other Tickets ({supportCounts.other})
                </button>
                {filteredSupportTickets.length !== supportCounts.total && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Showing {filteredSupportTickets.length}
                  </span>
                )}
              </div>

              {supportLoading && (
                <div className="text-slate-900 dark:text-white/60">
                  Loading tickets...
                </div>
              )}
              {supportError && (
                <div className="text-rose-400">{supportError}</div>
              )}
              {supportActionStatus && (
                <div className="text-emerald-400 text-sm">
                  {supportActionStatus}
                </div>
              )}
              {supportActionError && (
                <div className="text-rose-400 text-sm">
                  {supportActionError}
                </div>
              )}

              {filteredSupportTickets.length > 0 ? (
                <div className={`${adminPanelClass} overflow-hidden`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-white/5">
                        <tr>
                          <th className="text-left py-4 px-6 text-slate-900 dark:text-white/60 font-medium">
                            Ticket
                          </th>
                          <th className="text-left py-4 px-6 text-slate-900 dark:text-white/60 font-medium">
                            Customer
                          </th>
                          <th className="text-left py-4 px-6 text-slate-900 dark:text-white/60 font-medium">
                            Status
                          </th>
                          <th className="text-left py-4 px-6 text-slate-900 dark:text-white/60 font-medium">
                            Message
                          </th>
                          <th className="text-left py-4 px-6 text-slate-900 dark:text-white/60 font-medium">
                            Response
                          </th>
                          <th className="text-left py-4 px-6 text-slate-900 dark:text-white/60 font-medium">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSupportTickets.map((ticket) => {
                          const draft = supportReplies[ticket.id] || {};
                          const responseValue =
                            draft.response ?? ticket.response ?? "";
                          const statusValue =
                            draft.status ?? ticket.status ?? "open";
                          const isProductReport = isProductReportSubject(
                            ticket.subject,
                          );
                          return (
                            <tr
                              key={ticket.id}
                              className="border-t border-slate-200/70 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors align-top"
                            >
                              <td className="py-4 px-6 text-slate-900 dark:text-white">
                                <div className="font-semibold">
                                  {ticket.subject || "Support Ticket"}
                                </div>
                                {isProductReport && (
                                  <div className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                    Product Report
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-400">
                                  ID: {ticket.id?.slice(0, 8)}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">
                                  {formatDate(ticket.createdAt)}
                                </div>
                              </td>
                              <td className="py-4 px-6 text-slate-900 dark:text-white/70">
                                <div className="font-semibold">
                                  {ticket.User?.name || "Customer"}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {ticket.User?.email || "-"}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <select
                                  value={statusValue}
                                  onChange={(e) =>
                                    setSupportReplies((prev) => ({
                                      ...prev,
                                      [ticket.id]: {
                                        ...draft,
                                        status: e.target.value,
                                      },
                                    }))
                                  }
                                  className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#059669]"
                                >
                                  <option
                                    value="open"
                                    className={adminOptionClass}
                                  >
                                    Open
                                  </option>
                                  <option
                                    value="in_review"
                                    className={adminOptionClass}
                                  >
                                    In Review
                                  </option>
                                  <option
                                    value="resolved"
                                    className={adminOptionClass}
                                  >
                                    Resolved
                                  </option>
                                </select>
                              </td>
                              <td className="py-4 px-6 text-slate-600 dark:text-slate-300 max-w-[220px]">
                                <div className="text-xs whitespace-pre-wrap">
                                  {ticket.message || "-"}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <textarea
                                  rows={3}
                                  value={responseValue}
                                  onChange={(e) =>
                                    setSupportReplies((prev) => ({
                                      ...prev,
                                      [ticket.id]: {
                                        ...draft,
                                        response: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Write a response..."
                                  className="w-full min-w-[200px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#059669] transition-colors resize-none"
                                />
                              </td>
                              <td className="py-4 px-6">
                                <button
                                  onClick={() => handleSupportReply(ticket.id)}
                                  className="px-3 py-1 rounded-lg bg-[#059669] hover:bg-[#047857] text-slate-900 dark:text-white text-xs font-semibold transition-colors"
                                >
                                  Update
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                !supportLoading && (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {supportView === "product"
                      ? "No product report tickets found."
                      : "No disputes or support tickets."}
                  </div>
                )
              )}
            </section>
          )}

          {/* Vendors Management Section */}
          {shouldRenderVendorsSection && (
            <section id="vendors" className="space-y-6 mt-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Vendors Management
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Monitor and manage all vendor accounts.
                  </p>
                </div>
                {showVendorSummaries && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-sm font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                      Active: {effectiveVendorStatusCounts.active || 0}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-sm font-semibold text-slate-600 dark:text-white/60 border border-slate-200/60 dark:border-white/10">
                      Total: {vendors.length}
                    </span>
                    {showAllVendors ? (
                      <button
                        onClick={() => setShowAllVendors(false)}
                        className={adminGhostButtonClass}
                      >
                        Show Less
                      </button>
                    ) : (
                      filteredVendors.length > 6 && (
                        <button
                          onClick={() => setShowAllVendors(true)}
                          className="px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-sm font-semibold text-white transition-colors shadow-sm"
                        >
                          View All ({filteredVendors.length})
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
              {/* Brand Creation Removed */}
              {showVendorSummaries && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div
                    id="vendors-active"
                    className="bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 border-l-emerald-400 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center">
                          <CheckCircle2
                            size={20}
                            className="text-emerald-500"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                            Active Vendors
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Vendors currently in active status.
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-2xl font-bold text-emerald-500 leading-none">
                          {effectiveVendorStatusCounts.active || 0}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
                          accounts
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Monitoring currently active accounts.
                      </span>
                    </div>
                  </div>
                  <div
                    id="vendors-paused"
                    className="bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 border-l-amber-400 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 flex items-center justify-center">
                          <AlertCircle size={20} className="text-amber-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                            Paused / Rejected
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Vendors needing admin attention.
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-2xl font-bold text-amber-500 leading-none">
                          {(effectiveVendorStatusCounts.paused || 0) +
                            (effectiveVendorStatusCounts.rejected || 0) +
                            (effectiveVendorStatusCounts.expired || 0)}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
                          accounts
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Includes paused, rejected, and expired vendors.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {showVendorTable && isLoadingVendors && (
                <div className="text-slate-900 dark:text-white/60">
                  Loading vendors...
                </div>
              )}
              {showVendorTable && vendorsError && (
                <div className="text-rose-400">{vendorsError}</div>
              )}

              {showVendorTable && limitedVendors.length > 0 && (
                <div className={`${adminPanelClass} overflow-hidden`}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] text-sm table-auto">
                      <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/5">
                        <tr>
                          <th className="text-left py-4 px-6 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-xs">
                            Brand & Vendor
                          </th>
                          <th className="text-left py-4 px-6 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-xs">
                            Contact Info
                          </th>
                          <th className="text-left py-4 px-6 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-xs">
                            Tech Fee
                          </th>
                          <th className="text-left py-4 px-6 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-xs">
                            Status
                          </th>
                          <th className="text-left py-4 px-6 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-xs">
                            Plan Type
                          </th>
                          <th className="text-right py-4 px-6 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-xs">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {limitedVendors.map((vendor) => {
                          const brandName = vendor.Brand?.name || "No Brand";
                          const businessName =
                            vendor.businessName ||
                            vendor.User?.name ||
                            "Vendor";
                          const brandLogo = vendor.Brand?.logoUrl;
                          const currentTechFee = getVendorTechFee(vendor);
                          const currentTechFeeValue = Number.isFinite(
                            Number(currentTechFee),
                          )
                            ? Number(Number(currentTechFee).toFixed(2))
                            : null;
                          const techFeeDraft =
                            vendorTechFeeDrafts[vendor.id] ??
                            (currentTechFeeValue !== null &&
                            currentTechFeeValue > 0
                              ? currentTechFeeValue.toFixed(2)
                              : "");
                          const parsedTechFeeDraft = Number(techFeeDraft);
                          const normalizedTechFeeDraft = Number.isFinite(
                            parsedTechFeeDraft,
                          )
                            ? Number(parsedTechFeeDraft.toFixed(2))
                            : null;
                          const isTechFeeValid =
                            normalizedTechFeeDraft !== null &&
                            normalizedTechFeeDraft > 0 &&
                            normalizedTechFeeDraft <= MAX_QR_PRICE;
                          const hasTechFeeChanged =
                            normalizedTechFeeDraft !== currentTechFeeValue;
                          const isSavingTechFee = Boolean(
                            vendorTechFeeSaving[vendor.id],
                          );
                          const canSaveTechFee =
                            isTechFeeValid &&
                            hasTechFeeChanged &&
                            !isSavingTechFee;
                          const currentPlanType = String(
                            vendor?.Brand?.defaultPlanType || "prepaid",
                          ).toLowerCase();
                          const planTypeDraft = String(
                            vendorPlanTypeDrafts[vendor.id] || currentPlanType,
                          ).toLowerCase();
                          const isSavingPlanType = Boolean(
                            vendorPlanTypeSaving[vendor.id],
                          );
                          const canSavePlanType =
                            Boolean(vendor?.Brand?.id) &&
                            ["prepaid", "postpaid"].includes(planTypeDraft) &&
                            planTypeDraft !== currentPlanType &&
                            !isSavingPlanType;
                          const currentStatus = String(
                            vendor.status || "",
                          ).toLowerCase();
                          const statusDraft = String(
                            vendorStatusUpdates[vendor.id] || vendor.status,
                          ).toLowerCase();
                          const canSaveStatus =
                            Boolean(statusDraft) &&
                            statusDraft !== currentStatus;
                          const techFeeLabel =
                            currentTechFeeValue !== null &&
                            currentTechFeeValue > 0
                              ? `INR ${formatAmount(currentTechFeeValue)}`
                              : "-";
                          const contactPhone =
                            vendor.contactPhone ||
                            vendor.User?.phoneNumber ||
                            "-";
                          const contactEmail =
                            vendor.contactEmail || vendor.User?.email || "-";

                          return (
                            <tr
                              key={vendor.id}
                              className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group"
                            >
                              <td className="py-4 px-6 align-top">
                                <div className="flex items-start gap-3">
                                  <div className="relative h-10 w-10 shrink-0">
                                    <div className="absolute inset-0 rounded-xl bg-slate-100 dark:bg-white/10 border border-slate-200/70 dark:border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                      {brandName.slice(0, 2).toUpperCase()}
                                    </div>
                                    {brandLogo && (
                                      <img
                                        src={brandLogo}
                                        alt={brandName}
                                        className="absolute inset-0 h-10 w-10 rounded-xl object-cover border border-slate-200/70 dark:border-white/10 bg-white"
                                        onError={(e) => {
                                          e.currentTarget.style.display =
                                            "none";
                                        }}
                                      />
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 dark:text-white leading-tight">
                                      {brandName}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {businessName}
                                    </span>
                                    <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                      ID: {vendor.id.slice(0, 8)}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-6 align-top">
                                <div className="flex flex-col gap-1">
                                  {contactEmail !== "-" && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                                      <Mail size={12} className="opacity-50" />
                                      <span
                                        className="truncate max-w-[180px]"
                                        title={contactEmail}
                                      >
                                        {contactEmail}
                                      </span>
                                    </div>
                                  )}
                                  {contactPhone !== "-" && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                      <Phone size={12} className="opacity-50" />
                                      <span>{contactPhone}</span>
                                    </div>
                                  )}
                                  <div className="text-[10px] text-slate-400 mt-1">
                                    Since {formatDate(vendor.createdAt)}
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-6 align-top">
                                <div className="flex items-center gap-2">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                      INR
                                    </span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0.01"
                                      max={MAX_QR_PRICE}
                                      value={techFeeDraft}
                                      onChange={(event) =>
                                        handleVendorTechFeeChange(
                                          vendor.id,
                                          event.target.value,
                                        )
                                      }
                                      className={`w-28 pl-9 pr-2 py-1.5 rounded-lg border text-xs font-semibold bg-white dark:bg-black/20 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#059669] ${
                                        techFeeDraft !== "" && !isTechFeeValid
                                          ? "border-rose-300 dark:border-rose-500/50"
                                          : "border-slate-200 dark:border-white/10"
                                      }`}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleVendorTechFeeSave(vendor)
                                    }
                                    disabled={!canSaveTechFee}
                                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#059669] hover:bg-[#047857] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isSavingTechFee ? "Saving..." : "Save"}
                                  </button>
                                </div>
                                {!hasTechFeeChanged && (
                                  <div className="text-[10px] text-slate-400 mt-1">
                                    Current: {techFeeLabel}
                                  </div>
                                )}
                              </td>

                              <td className="py-4 px-6 align-top">
                                <div className="flex items-center gap-2">
                                  <select
                                    value={statusDraft}
                                    onChange={(event) =>
                                      setVendorStatusUpdates((prev) => ({
                                        ...prev,
                                        [vendor.id]: event.target.value,
                                      }))
                                    }
                                    className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#059669]"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="active">Active</option>
                                    <option value="paused">Paused</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="expired">Expired</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleVendorStatusSave(
                                        vendor.id,
                                        vendor.status,
                                      )
                                    }
                                    disabled={!canSaveStatus}
                                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#059669] hover:bg-[#047857] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Save
                                  </button>
                                </div>
                              </td>

                              <td className="py-4 px-6 align-top">
                                {vendor?.Brand?.id ? (
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={planTypeDraft}
                                      onChange={(event) =>
                                        setVendorPlanTypeDrafts((prev) => ({
                                          ...prev,
                                          [vendor.id]: event.target.value,
                                        }))
                                      }
                                      className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#059669]"
                                    >
                                      <option value="prepaid">Prepaid</option>
                                      <option value="postpaid">Postpaid</option>
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handlePlanTypeUpdate(
                                          vendor,
                                          planTypeDraft,
                                        )
                                      }
                                      disabled={!canSavePlanType}
                                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#059669] hover:bg-[#047857] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isSavingPlanType ? "Saving..." : "Save"}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    No brand
                                  </span>
                                )}
                              </td>

                              <td className="py-4 px-6 align-top text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAccountView({
                                        vendorId: vendor.id,
                                        brandId: vendor.Brand?.id,
                                      })
                                    }
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-gray-200 transition-all shadow-sm hover:shadow dark:shadow-white/5 active:scale-95"
                                  >
                                    Manage
                                    <ArrowRight size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleVendorDelete(vendor)}
                                    className="p-2 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors border border-red-100 dark:border-red-900/20 active:scale-90"
                                    title="Delete Account"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {vendorActionStatus && (
                    <div className="p-4 text-sm text-emerald-400">
                      {vendorActionStatus}
                    </div>
                  )}
                  {vendorActionError && (
                    <div className="p-4 text-sm text-rose-400">
                      {vendorActionError}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* QR Registry Section */}
          {isQrsRoute && (
            <section id="qrs" className="space-y-6 mt-12">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  QR Code Registry
                </h2>
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded-lg bg-[#059669]/20 text-sm text-[#059669]">
                    Active: {qrStatusCounts.active || 0}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-sm text-slate-900 dark:text-white/60">
                    Total: {qrsTotalLabel}
                  </span>
                  {qrsHasMore && (
                    <button
                      onClick={() => {
                        setShowAllQrs(true);
                        loadQrs(token, { page: qrsPage + 1, append: true });
                      }}
                      className={adminGhostButtonClass}
                    >
                      Load More
                    </button>
                  )}
                  {qrs.length > 8 &&
                    (showAllQrs ? (
                      <button
                        onClick={() => setShowAllQrs(false)}
                        className={adminGhostButtonClass}
                      >
                        Show Less
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowAllQrs(true)}
                        className="px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-sm text-slate-900 dark:text-white transition-colors"
                      >
                        View All ({qrsTotalLabel})
                      </button>
                    ))}
                </div>
              </div>

              {isLoadingQrs && (
                <div className="text-slate-900 dark:text-white/60">
                  Loading QR codes...
                </div>
              )}
              {qrsError && <div className="text-rose-400">{qrsError}</div>}

              {limitedQrs.length > 0 && (
                <div className={`${adminPanelClass} overflow-hidden`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-white/5">
                        <tr>
                          <th className="text-left py-4 px-6 text-slate-900 dark:text-white/60 font-medium">
                            QR ID
                          </th>
                          <th className="text-left py-4 px-6 text-slate-900 dark:text-white/60 font-medium">
                            Vendor ID
                          </th>
                          <th className="text-left py-4 px-6 text-slate-900 dark:text-white/60 font-medium">
                            Campaign
                          </th>
                          <th className="text-left py-4 px-6 text-slate-900 dark:text-white/60 font-medium">
                            Status
                          </th>
                          <th className="text-left py-4 px-6 text-slate-900 dark:text-white/60 font-medium">
                            Scans
                          </th>
                          <th className="text-left py-4 px-6 text-slate-900 dark:text-white/60 font-medium">
                            Created
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {limitedQrs.map((qr) => (
                          <tr
                            key={qr.id}
                            className="border-t border-slate-200/70 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                          >
                            <td className="py-4 px-6 text-slate-900 dark:text-white font-mono text-xs">
                              {qr.id.substring(0, 8)}...
                            </td>
                            <td className="py-4 px-6 text-slate-900 dark:text-white/60">
                              {qr.vendorId || "-"}
                            </td>
                            <td className="py-4 px-6 text-slate-900 dark:text-white/60">
                              {qr.campaignId || "-"}
                            </td>
                            <td className="py-4 px-6">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusClasses(qr.status)}`}
                              >
                                {qr.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-slate-900 dark:text-white">
                              {qr.scanCount || 0}
                            </td>
                            <td className="py-4 px-6 text-slate-900 dark:text-white/60 text-xs">
                              {formatDate(qr.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Activity Logs Section */}
          {isLogsRoute && (
            <section
              id="logs"
              className="space-y-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Activity Logs
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Audit trail of all system activities and user actions.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-sm text-slate-900 dark:text-white/60">
                    Total: {logsTotal}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "all", label: "All" },
                      { id: "qr", label: "QR Scans" },
                      { id: "wallet", label: "Wallet" },
                      { id: "admin", label: "Admin" },
                      { id: "fraud", label: "Fraud Alerts" },
                    ].map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setLogsFilter(filter.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          logsFilter === filter.id
                            ? "bg-[#059669] text-white"
                            : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button
                      disabled={logsPage <= 1}
                      onClick={() => setLogsPage((p) => p - 1)}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 disabled:opacity-50"
                    >
                      <ChevronRight className="rotate-180" size={16} />
                    </button>
                    <button
                      disabled={logs.length < 50} // Assuming default limit
                      onClick={() => setLogsPage((p) => p + 1)}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 disabled:opacity-50"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {logsLoading && (
                <div className="text-slate-500">Loading logs...</div>
              )}
              {logsError && <div className="text-rose-500">{logsError}</div>}

              {!logsLoading && filteredLogs.length > 0 && (
                <div className={`${adminPanelClass} overflow-hidden`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-white/5">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                            Time
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                            Action
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                            Actor
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {filteredLogs.map((log) => (
                          <tr
                            key={log.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                          >
                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium text-slate-900 dark:text-white block">
                                {log.action}
                              </span>
                              <span className="text-xs text-slate-500">
                                {log.entityType} � {log.entityId?.slice(0, 8)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-slate-900 dark:text-white">
                                {log.User?.name || "System"}
                              </div>
                              <div className="text-xs text-slate-500">
                                {log.User?.email || log.actorRole}
                              </div>
                            </td>
                            <td
                              className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-md truncate"
                              title={JSON.stringify(log.metadata)}
                            >
                              {log.details || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {!logsLoading && logs.length > 0 && filteredLogs.length === 0 && (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  No logs match the selected filter.
                </div>
              )}
            </section>
          )}

          {/* Compliance & Audit Section */}
          {isComplianceRoute && (
            <CompliancePanel token={token} apiBase={API_BASE_URL} />
          )}

          {/* Redeem Catalog Section */}
          {isRedeemCatalogRoute && (
            <section
              id="redeem-catalog"
              className="space-y-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <div className={`${adminPanelClass} p-5 space-y-5`}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                          Redeem Product Catalog
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Upload and manage products shown in the customer redeem
                          store.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAddRedeemProduct}
                          disabled={
                            !settings || settingsLoading
                          }
                          className={`${adminPrimaryButtonClass} disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2`}
                        >
                          <Plus size={14} /> Add Product
                        </button>
                        <button
                          type="button"
                          onClick={handleSettingsUpdate}
                          disabled={!settings || settingsLoading}
                          className={`${adminGhostButtonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {settingsLoading ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                      <div className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50 dark:bg-black/20 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Total
                        </p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                          {redeemCatalogSummary.total}
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/10 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                          Active
                        </p>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-200 mt-1">
                          {redeemCatalogSummary.active}
                        </p>
                      </div>
                      <div className="rounded-xl border border-amber-200/70 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-amber-700 dark:text-amber-300">
                          Inactive
                        </p>
                        <p className="text-lg font-bold text-amber-700 dark:text-amber-200 mt-1">
                          {redeemCatalogSummary.inactive}
                        </p>
                      </div>
                      <div className="rounded-xl border border-blue-200/70 dark:border-blue-500/30 bg-blue-50/80 dark:bg-blue-500/10 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-blue-700 dark:text-blue-300">
                          With Image
                        </p>
                        <p className="text-lg font-bold text-blue-700 dark:text-blue-200 mt-1">
                          {redeemCatalogSummary.withImage}
                        </p>
                      </div>
                      <div className="rounded-xl border border-rose-200/70 dark:border-rose-500/30 bg-rose-50/80 dark:bg-rose-500/10 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-rose-700 dark:text-rose-300">
                          Missing Amount
                        </p>
                        <p className="text-lg font-bold text-rose-700 dark:text-rose-200 mt-1">
                          {redeemCatalogSummary.missingAmount}
                        </p>
                      </div>
                    </div>

                    {settingsLoading && (
                      <div className="rounded-lg border border-slate-200/70 dark:border-white/10 bg-slate-50 dark:bg-black/20 px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                        Loading catalog...
                      </div>
                    )}
                    {settingsError && (
                      <div className="rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
                        {settingsError}
                      </div>
                    )}
                    {settingsMessage && (
                      <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-300">
                        {settingsMessage}
                      </div>
                    )}
                  </div>

                  {settings && (
                    <div className={`${adminPanelClass} p-6 space-y-6`}>
                      <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-white/10 pb-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Edit Products
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {redeemStoreProducts.length} item
                          {redeemStoreProducts.length === 1 ? "" : "s"}
                        </div>
                      </div>

                      {redeemStoreProducts.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/20 bg-slate-50/70 dark:bg-black/20 p-6 text-sm text-slate-500 dark:text-slate-400">
                          <p>
                            No redeem products yet. Click "Add Product" to create
                            your first item.
                          </p>
                          <button
                            type="button"
                            onClick={handleAddRedeemProduct}
                            disabled={settingsLoading || isRedeemProductModalOpen}
                            className={`${adminGhostButtonClass} mt-4 disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <span className="inline-flex items-center gap-2">
                              <Plus size={14} /> Create First Product
                            </span>
                          </button>
                        </div>
                      )}

                      <div className="overflow-hidden rounded-xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-black/20">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-white/5 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold">
                              <tr>
                                <th className="px-5 py-3">Product</th>
                                <th className="px-5 py-3">Category</th>
                                <th className="px-5 py-3">Points</th>
                                <th className="px-5 py-3">Stock</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
                              {redeemStoreProducts.map((product, index) => (
                                <tr
                                  key={`${product?.id || "product"}-${index}`}
                                  className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors"
                                >
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-100 dark:bg-white/10 overflow-hidden">
                                        {product?.image ? (
                                          <AuthImage
                                            src={resolveAssetUrl(product.image)}
                                            alt=""
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <div className="h-full w-full flex items-center justify-center text-slate-300">
                                            <Package size={16} />
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <div className="font-medium text-slate-900 dark:text-white">
                                          {product?.name || "Untitled"}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                          {product?.id}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                                    {product?.category || "-"}
                                  </td>
                                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                                    {product?.amount}
                                  </td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                                    {product?.stock !== "" ? product.stock : "-"}
                                  </td>
                                  <td className="px-5 py-3">
                                    <button
                                      onClick={() => handleToggleProductStatusConfirm(index)}
                                      title="Click to toggle status"
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors hover:opacity-80 ${
                                        String(product?.status).toLowerCase() ===
                                        "inactive"
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                                      }`}
                                    >
                                      {String(product?.status).toLowerCase() ===
                                      "inactive"
                                        ? "Inactive"
                                        : "Active"}
                                    </button>
                                  </td>
                                  <td className="px-5 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() =>
                                          handleEditRedeemProduct(index)
                                        }
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-white/10 transition-colors"
                                        title="Edit"
                                      >
                                        <FileText size={16} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleRemoveRedeemProduct(index)
                                        }
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-colors"
                                        title="Remove"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
          )}
            </section>
          )}

          {/* Product Track Section (Redemption Order Tracking) */}
          {isProductTrackRoute && (
            <section
              id="product-track"
              className="space-y-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <div className={`${adminPanelClass} p-5 space-y-5`}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      Order Tracking
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Track and manage customer redeem store order statuses.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadTransactions(token)}
                      disabled={isLoadingTransactions}
                      className={`${adminGhostButtonClass} disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2`}
                    >
                      <RefreshCw size={14} className={isLoadingTransactions ? "animate-spin" : ""} />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      placeholder="Search by order ID, customer name, email, or product..."
                      className="w-full rounded-lg border border-slate-200 bg-white/80 px-9 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669] dark:border-white/10 dark:bg-[#0f0f11] dark:text-white dark:placeholder:text-white/40"
                    />
                  </div>
                </div>

                {/* Loading / Error States */}
                {isLoadingTransactions ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-r-transparent"></div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-3">
                      Loading redemption orders...
                    </div>
                  </div>
                ) : transactionsError ? (
                  <div className="text-xs text-rose-500 font-semibold p-4 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                    {transactionsError}
                  </div>
                ) : (
                  <>
                    {/* Orders Table */}
                    {(() => {
                      const allOrders = (transactions || []).filter((tx) => {
                        const desc = String(tx?.description || "").toLowerCase();
                        return desc.includes("redeem") || desc.includes("order");
                      });

                      const filtered = allOrders.filter((order) => {
                        if (!order) return false;
                        const query = productSearchQuery.toLowerCase().trim();
                        if (!query) return true;
                        
                        const id = String(order.id || "").toLowerCase();
                        const desc = String(order.description || "").toLowerCase();
                        const productName = desc.replace(/^(store redeem:|redeem:)\s*/i, "").toLowerCase();
                        const userEmail = String(order.Wallet?.User?.email || "").toLowerCase();
                        const userName = String(order.Wallet?.User?.name || "").toLowerCase();
                        
                        return (
                          id.includes(query) ||
                          productName.includes(query) ||
                          userEmail.includes(query) ||
                          userName.includes(query)
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                            <Package
                              size={48}
                              className="mx-auto text-slate-400 mb-3"
                            />
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              No redemption orders found.
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-hidden rounded-xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-black/20">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 dark:bg-white/5 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold">
                                <tr>
                                  <th className="px-5 py-3">Order ID</th>
                                  <th className="px-5 py-3">Customer</th>
                                  <th className="px-5 py-3">Product</th>
                                  <th className="px-5 py-3">Points</th>
                                  <th className="px-5 py-3">Date</th>
                                  <th className="px-5 py-3">Status</th>
                                  <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
                                {filtered.map((order) => {
                                  const orderStatus = order.metadata?.orderStatus || redeemOrderStatuses[order.id] || "SUCCESS";
                                  const productName = order.description.replace(/^(Store redeem:|Redeem:)\s*/i, "");
                                  
                                  const statusBadgeClass = orderStatus === "SUCCESS"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                                    : orderStatus === "PROCESSING"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                                    : orderStatus === "SHIPPED"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300"
                                    : "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300";

                                  return (
                                    <tr
                                      key={order.id}
                                      className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors"
                                    >
                                      <td className="px-5 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                                        <span 
                                          onClick={() => {
                                            setSelectedProductForDetail(order);
                                            setIsProductDetailOpen(true);
                                          }}
                                          className="cursor-pointer hover:underline hover:text-primary font-bold text-slate-800 dark:text-slate-200"
                                        >
                                          #{order.id.slice(-8).toUpperCase()}
                                        </span>
                                      </td>
                                      <td className="px-5 py-3">
                                        <div className="font-semibold text-slate-900 dark:text-white">
                                          {order.Wallet?.User?.name || "Customer"}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                          {order.Wallet?.User?.email || "-"}
                                        </div>
                                      </td>
                                      <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                                        {productName}
                                      </td>
                                      <td className="px-5 py-3 text-rose-500 font-bold">
                                        -{formatAmount(order.amount)}
                                      </td>
                                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">
                                        {formatDate(order.createdAt)}
                                      </td>
                                      <td className="px-5 py-3">
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${statusBadgeClass}`}>
                                          {orderStatus === "SUCCESS" ? "Placed" : orderStatus}
                                        </span>
                                      </td>
                                      <td className="px-5 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <button
                                            onClick={() => {
                                              setSelectedProductForDetail(order);
                                              setIsProductDetailOpen(true);
                                            }}
                                            className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-primary dark:hover:bg-white/10 transition-colors"
                                            title="View Timeline"
                                          >
                                            <Eye size={16} />
                                          </button>
                                          <select
                                            value={orderStatus}
                                            onChange={(e) => handleUpdateRedeemOrderStatus(order.id, e.target.value)}
                                            className="text-xs rounded-lg border border-slate-200 bg-white px-2 py-1 focus:outline-none focus:border-primary dark:border-white/10 dark:bg-black/40 dark:text-white cursor-pointer"
                                          >
                                            <option value="SUCCESS">Placed</option>
                                            <option value="PROCESSING">Processing</option>
                                            <option value="SHIPPED">Shipped</option>
                                            <option value="DELIVERED">Delivered</option>
                                          </select>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Order Tracking Detail Modal */}
              {isProductDetailOpen && selectedProductForDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#0f0f11] border border-slate-200/60 dark:border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70 dark:border-white/10">
                      <div>
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">Order Tracking Details</span>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                          Order #{selectedProductForDetail.id.slice(-8).toUpperCase()}
                        </h3>
                      </div>
                      <button
                        onClick={() => {
                          setIsProductDetailOpen(false);
                          setSelectedProductForDetail(null);
                        }}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 transition-colors"
                        aria-label="Close"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6 overflow-y-auto flex-1">
                      {/* Summary card */}
                      {(() => {
                        const productName = selectedProductForDetail.description.replace(/^(Store redeem:|Redeem:)\s*/i, "").trim().toLowerCase();
                        const products = getRedeemStoreProducts();
                        const matchedProduct = products.find(p => p.name?.toLowerCase().trim() === productName);
                        
                        const displayImage = matchedProduct?.image || selectedProductForDetail.metadata?.image;

                        return (
                          <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                            <div className="w-20 h-20 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 overflow-hidden shrink-0 flex items-center justify-center self-center sm:self-start">
                              {displayImage ? (
                                <AuthImage
                                  src={resolveAssetUrl(displayImage)}
                                  alt={productName}
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-slate-300 dark:text-zinc-600">
                                  <Package size={24} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex justify-between text-sm gap-2">
                                <span className="text-slate-500 dark:text-slate-400">Product:</span>
                                <span className="font-semibold text-slate-900 dark:text-white text-right">
                                  {selectedProductForDetail.description.replace(/^(Store redeem:|Redeem:)\s*/i, "")}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm gap-2">
                                <span className="text-slate-500 dark:text-slate-400">Customer:</span>
                                <span className="font-semibold text-slate-900 dark:text-white text-right">
                                  {selectedProductForDetail.Wallet?.User?.name || "Customer"}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm gap-2">
                                <span className="text-slate-500 dark:text-slate-400">Email:</span>
                                <span className="font-semibold text-slate-500 dark:text-slate-400 font-mono text-xs text-right break-all">
                                  {selectedProductForDetail.Wallet?.User?.email || "-"}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm gap-2">
                                <span className="text-slate-500 dark:text-slate-400">Address:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-right max-w-[200px] break-words">
                                  {selectedProductForDetail.metadata?.address || "No address provided"}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm gap-2">
                                <span className="text-slate-500 dark:text-slate-400">Amount Charged:</span>
                                <span className="font-bold text-rose-500 text-right">
                                  -{formatAmount(selectedProductForDetail.amount)} Points
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Timeline status track */}
                      {(() => {
                        const getStepDate = (stepKey, hoursOffset) => {
                          if (selectedProductForDetail.metadata?.statusTimestamps && selectedProductForDetail.metadata.statusTimestamps[stepKey]) {
                            return new Date(selectedProductForDetail.metadata.statusTimestamps[stepKey]);
                          }
                          try {
                            const saved = JSON.parse(localStorage.getItem("redeem_order_timestamps") || "{}");
                            const orderTimes = saved[selectedProductForDetail.id];
                            if (orderTimes && orderTimes[stepKey]) {
                              return new Date(orderTimes[stepKey]);
                            }
                          } catch (e) {}
                          if (stepKey === "SUCCESS") return new Date(selectedProductForDetail.createdAt);
                          const date = new Date(selectedProductForDetail.createdAt);
                          return new Date(date.getTime() + hoursOffset * 60 * 60 * 1000);
                        };

                        const currentStatus = selectedProductForDetail.metadata?.orderStatus || redeemOrderStatuses[selectedProductForDetail.id] || "SUCCESS";
                        const timelineSteps = [
                          { label: "Order Placed", key: "SUCCESS", done: true, icon: Clock, date: getStepDate("SUCCESS", 0) },
                          { label: "Processing", key: "PROCESSING", done: currentStatus === "PROCESSING" || currentStatus === "SHIPPED" || currentStatus === "DELIVERED", icon: Package, date: getStepDate("PROCESSING", 2) },
                          { label: "Shipped", key: "SHIPPED", done: currentStatus === "SHIPPED" || currentStatus === "DELIVERED", icon: ShieldCheck, date: getStepDate("SHIPPED", 24) },
                          { label: "Delivered", key: "DELIVERED", done: currentStatus === "DELIVERED", icon: CheckCircle2, date: getStepDate("DELIVERED", 48) }
                        ];

                        return (
                          <div className="space-y-6 px-2">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Delivery Progress Timeline</h4>
                            {timelineSteps.map((step, i) => (
                              <div key={i} className="flex gap-4 relative">
                                {i !== timelineSteps.length - 1 && (
                                  <div className={`absolute left-3 top-7 bottom-0 w-[2px] ${step.done ? "bg-emerald-500" : "bg-slate-200 dark:bg-white/5"}`} />
                                )}
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm z-10 ${
                                    step.done ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-white/5 text-slate-400"
                                  }`}
                                >
                                  <step.icon size={12} />
                                </div>
                                <div className="flex-1 pb-4">
                                  <p className={`text-sm font-bold leading-none ${step.done ? "text-slate-950 dark:text-slate-50" : "text-slate-400"}`}>
                                    {step.label}
                                  </p>
                                  {step.done && (
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                      {formatDate(step.date)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center gap-3 px-6 py-4 bg-slate-50 dark:bg-[#131317] border-t border-slate-200/70 dark:border-white/10">
                      <div className="flex gap-2">
                        {["SUCCESS", "PROCESSING", "SHIPPED", "DELIVERED"].map((st) => (
                          <button
                            key={st}
                            onClick={() => handleUpdateRedeemOrderStatus(selectedProductForDetail.id, st)}
                             className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              (selectedProductForDetail.metadata?.orderStatus || redeemOrderStatuses[selectedProductForDetail.id] || "SUCCESS") === st
                                ? "bg-primary text-white"
                                : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                            }`}
                          >
                            {st === "SUCCESS" ? "Placed" : st.charAt(0) + st.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          setIsProductDetailOpen(false);
                          setSelectedProductForDetail(null);
                        }}
                        className={`${adminGhostButtonClass}`}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Blog Upload Section */}
          {isBlogsRoute && (
            <section
              id="blogs"
              className="space-y-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Upload Blog
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Create and manage blog posts for the platform.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setIsBlogUsersModalOpen(true)}
                    className={`${adminGhostButtonClass} flex items-center gap-2 justify-center`}
                  >
                    <Users size={16} /> Blog Users ({blogUsers.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleAddBlog}
                    className={`${adminPrimaryButtonClass} flex items-center gap-2 justify-center`}
                  >
                    <Plus size={16} /> Add Blog
                  </button>
                </div>
              </div>

              {settingsLoading && (
                <div className="text-slate-500">Loading blog settings...</div>
              )}
              {settingsError && (
                <div className="text-rose-500">{settingsError}</div>
              )}
              {settingsMessage && (
                <div className="text-emerald-500">{settingsMessage}</div>
              )}

              {settings && (
                <div className="space-y-5">
                  {(() => {
                    const editingBlogIndex = editingBlogId !== null ? blogEntries.findIndex(b => b.id === editingBlogId) : -1;
                    const isEditing = editingBlogIndex !== -1;
                    const blog = isEditing ? blogEntries[editingBlogIndex] : null;

                    if (isEditing && blog) {
                      return (
                        <div className={`${adminPanelClass} p-6 space-y-6 animate-in fade-in duration-300`}>
                          {/* Editor Header */}
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200/60 dark:border-white/10">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setEditingBlogId(null)}
                                className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors"
                                title="Back to Blogs"
                              >
                                <ArrowLeft size={16} />
                              </button>
                              <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                  Editing: {blog.title || "Untitled Post"}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Status: {blog.status === "published" ? "Published" : "Draft"}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveBlog(editingBlogIndex)}
                              className="px-3.5 py-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} /> Remove Blog
                            </button>
                          </div>

                          {/* Editor Body */}
                          <div className="grid lg:grid-cols-[200px_1fr] gap-6">
                            <div className="space-y-3">
                              <div className="aspect-[4/3] rounded-lg border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-black/20 overflow-hidden flex items-center justify-center relative group">
                                {blog.coverImage ? (
                                  <AuthImage
                                    src={resolveAssetUrl(blog.coverImage)}
                                    alt={blog.coverImageAlt || blog.title || "Blog cover preview"}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5 p-4 text-center">
                                    <Newspaper size={24} className="opacity-40" />
                                    <span className="text-xs font-medium">No cover image</span>
                                  </div>
                                )}
                              </div>
                              <label className="w-full px-3 py-2.5 rounded-lg border border-slate-200/60 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-center gap-2 transition-colors shadow-sm">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    handleBlogImageUpload(editingBlogIndex, file);
                                    e.target.value = "";
                                  }}
                                />
                                <Upload size={14} /> Upload Cover
                              </label>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                                  <span>Image ALT Text</span>
                                </label>
                                <input
                                  type="text"
                                  value={blog.coverImageAlt || ""}
                                  onChange={(e) =>
                                    handleBlogFieldChange(editingBlogIndex, "coverImageAlt", e.target.value)
                                  }
                                  placeholder="Image ALT text (SEO)"
                                  className={adminInputClass}
                                />
                              </div>
                              {blogUploadState[editingBlogIndex]?.status && (
                                <p className="text-[11px] text-emerald-500 text-center font-medium">
                                  {blogUploadState[editingBlogIndex].status}
                                </p>
                              )}
                              {blogUploadState[editingBlogIndex]?.error && (
                                <p className="text-[11px] text-rose-500 text-center font-medium">
                                  {blogUploadState[editingBlogIndex].error}
                                </p>
                              )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  Title
                                </label>
                                <input
                                  type="text"
                                  value={blog.title || ""}
                                  onChange={(e) =>
                                    handleBlogFieldChange(editingBlogIndex, "title", e.target.value)
                                  }
                                  className={adminInputClass}
                                  placeholder="Enter blog title"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  Slug
                                </label>
                                <input
                                  type="text"
                                  value={blog.slug || ""}
                                  onChange={(e) =>
                                    handleBlogFieldChange(editingBlogIndex, "slug", e.target.value)
                                  }
                                  placeholder="how-to-earn-cashback"
                                  className={adminInputClass}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  Author
                                </label>
                                <input
                                  type="text"
                                  value={blog.author || ""}
                                  onChange={(e) =>
                                    handleBlogFieldChange(editingBlogIndex, "author", e.target.value)
                                  }
                                  className={adminInputClass}
                                  placeholder="Author name"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  Category
                                </label>
                                <input
                                  type="text"
                                  value={blog.category || ""}
                                  onChange={(e) =>
                                    handleBlogFieldChange(editingBlogIndex, "category", e.target.value)
                                  }
                                  className={adminInputClass}
                                  placeholder="e.g. Tips, Cashback, Guides"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  Publish Date
                                </label>
                                <input
                                  type="date"
                                  value={blog.publishedAt || ""}
                                  onChange={(e) =>
                                    handleBlogFieldChange(editingBlogIndex, "publishedAt", e.target.value)
                                  }
                                  className={adminInputClass}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  Status
                                </label>
                                <select
                                  value={blog.status || "draft"}
                                  onChange={(e) =>
                                    handleBlogFieldChange(editingBlogIndex, "status", e.target.value)
                                  }
                                  className={adminInputClass}
                                >
                                  <option className={adminOptionClass} value="draft">
                                    Draft
                                  </option>
                                  <option className={adminOptionClass} value="published">
                                    Published
                                  </option>
                                </select>
                              </div>
                              <div className="md:col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  Excerpt
                                </label>
                                <textarea
                                  rows={2}
                                  value={blog.excerpt || ""}
                                  onChange={(e) =>
                                    handleBlogFieldChange(editingBlogIndex, "excerpt", e.target.value)
                                  }
                                  className={adminInputClass}
                                  placeholder="Brief description of the blog post..."
                                />
                              </div>
                              <div className="md:col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  Content
                                </label>
                                <div>
                                  <BlogContentToolbar
                                    value={blog.content || ""}
                                    onChange={(value) =>
                                      handleBlogFieldChange(editingBlogIndex, "content", value)
                                    }
                                    textareaRef={{ get current() { return blogTextareaRefs.current[editingBlogIndex]; } }}
                                  />
                                  <textarea
                                    ref={(el) => (blogTextareaRefs.current[editingBlogIndex] = el)}
                                    rows={12}
                                    value={blog.content || ""}
                                    onChange={(e) =>
                                      handleBlogFieldChange(editingBlogIndex, "content", e.target.value)
                                    }
                                    className={`${adminInputClass} rounded-t-none font-mono text-sm`}
                                    placeholder="Write your blog content here in markdown..."
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 flex items-center justify-between border-t border-slate-200/60 dark:border-white/10 mt-6">
                            <button
                              type="button"
                              onClick={() => setEditingBlogId(null)}
                              className={adminGhostButtonClass}
                            >
                              Back to Blogs
                            </button>
                            <button
                              onClick={handleSettingsUpdate}
                              disabled={settingsLoading}
                              className={adminPrimaryButtonClass}
                            >
                              {settingsLoading ? "Saving..." : "Save Blogs"}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // Otherwise, render grid view
                    return (
                      <div className="space-y-6">
                        {blogEntries.length === 0 ? (
                          <div className={`${adminPanelClass} p-8 text-center`}>
                            <Newspaper className="mx-auto mb-3 text-slate-400" size={28} />
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">
                              No blogs added yet
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Use Add Blog to create the first post.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {blogEntries.map((item, idx) => (
                              <div
                                key={item.id || idx}
                                onClick={() => setEditingBlogId(item.id)}
                                className={`${adminPanelClass} overflow-hidden flex flex-col group cursor-pointer hover:border-[#059669] dark:hover:border-[#059669] hover:shadow-md transition-all duration-200`}
                              >
                                {/* Cover Image */}
                                <div className="relative aspect-[16/10] bg-slate-100 dark:bg-black/40 overflow-hidden border-b border-slate-200/60 dark:border-white/10">
                                  {item.coverImage ? (
                                    <AuthImage
                                      src={resolveAssetUrl(item.coverImage)}
                                      alt={item.title || "Blog cover"}
                                      className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                      <Newspaper size={28} className="opacity-40" />
                                      <span className="text-xs font-medium">No cover image</span>
                                    </div>
                                  )}
                                  {/* Status Badge */}
                                  <div className="absolute top-3 right-3">
                                    <span
                                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                        item.status === "published"
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                      }`}
                                    >
                                      {item.status === "published" ? "Published" : "Draft"}
                                    </span>
                                  </div>
                                </div>

                                {/* Details */}
                                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                      <span>{item.category || "Uncategorized"}</span>
                                      <span>{item.publishedAt || "No date"}</span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base line-clamp-2 group-hover:text-[#059669] transition-colors leading-tight">
                                      {item.title || "Untitled Post"}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                      {item.excerpt || "No summary provided."}
                                    </p>
                                  </div>

                                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                    <span className="truncate">
                                      {item.author && item.author.toLowerCase() !== "admin" ? `By ${item.author}` : ""}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveBlog(idx);
                                      }}
                                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 hover:dark:bg-rose-500/20 transition-colors cursor-pointer"
                                      title="Delete Blog"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="pt-2">
                          <button
                            onClick={handleSettingsUpdate}
                            disabled={settingsLoading}
                            className={adminPrimaryButtonClass}
                          >
                            {settingsLoading ? "Saving..." : "Save Blogs"}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </section>
          )}

          {isBlogUsersModalOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className={`${adminPanelClass} w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl`}>
                <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-200/70 dark:border-white/10 bg-white dark:bg-[#101214]">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300 flex items-center justify-center">
                      <Users size={21} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                          Blog Users
                        </h3>
                        <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {blogUsers.length} total
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Manage team accounts that can sign in at /blog and upload posts.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddBlogUser}
                      className={`${adminPrimaryButtonClass} flex items-center gap-2`}
                    >
                      <Plus size={16} /> Add User
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBlogUsersModalOpen(false)}
                      className="p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
                      aria-label="Close blog users"
                    >
                      <X size={19} />
                    </button>
                  </div>
                </div>

                <div className="max-h-[calc(90vh-154px)] overflow-y-auto px-6 py-5 bg-slate-50/70 dark:bg-black/20">
                  {blogUsers.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.04] p-10 text-center">
                      <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-400">
                        <Users size={28} />
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">
                        No blog users added yet
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Add a user to grant access to the /blog upload page.
                      </p>
                    </div>
                  )}

                  <div className="grid gap-4">
                    {blogUsers.map((user, index) => {
                      const displayName = user.name || user.email || `Blog User ${index + 1}`;
                      const initials = displayName
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "BU";
                      const hasAccess = user.access !== false;

                      return (
                        <div
                          key={user.id || index}
                          className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-white/[0.04] p-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${hasAccess ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"}`}>
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {displayName}
                                  </p>
                                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${hasAccess ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"}`}>
                                    {hasAccess ? "Enabled" : "Disabled"}
                                  </span>
                                </div>
                                <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                  {user.email || "Email ID not set"}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                              <button
                                type="button"
                                onClick={() => handleBlogUserChange(index, "access", !hasAccess)}
                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${hasAccess ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"}`}
                              >
                                {hasAccess ? "Disable Access" : "Enable Access"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveBlogUser(index)}
                                className="px-3 py-2 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Name
                              </label>
                              <input
                                type="text"
                                value={user.name || ""}
                                onChange={(e) => handleBlogUserChange(index, "name", e.target.value)}
                                className={adminInputClass}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Email ID
                              </label>
                              <input
                                type="email"
                                value={user.email || ""}
                                onChange={(e) => handleBlogUserChange(index, "email", e.target.value)}
                                className={adminInputClass}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Password
                              </label>
                              <input
                                type="text"
                                value={user.password || ""}
                                onChange={(e) => handleBlogUserChange(index, "password", e.target.value)}
                                className={adminInputClass}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200/70 dark:border-white/10 bg-white dark:bg-[#101214]">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Save after changing users or access.
                  </p>
                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsBlogUsersModalOpen(false)}
                      className={adminGhostButtonClass}
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={handleSettingsUpdate}
                      disabled={settingsLoading}
                      className={adminPrimaryButtonClass}
                    >
                      {settingsLoading ? "Saving..." : "Save Users"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Settings Section */}
          {isSettingsRoute && (
            <section
              id="settings"
              className="space-y-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    System Settings
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Global platform configuration. Changes affect all users
                    immediately.
                  </p>
                </div>
              </div>

              {settingsLoading && (
                <div className="text-slate-500">Loading settings...</div>
              )}
              {settingsError && (
                <div className="text-rose-500">{settingsError}</div>
              )}
              {settingsMessage && (
                <div className="text-emerald-500">{settingsMessage}</div>
              )}

              {settings && (
                <div className={`${adminPanelClass} p-6 max-w-3xl space-y-6`}>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Financial Controls
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Tech Fee per QR (INR)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={settings.techFeePerQr ?? ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              techFeePerQr: parseFloat(e.target.value),
                            })
                          }
                          className={adminInputClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Min. Payout Amount (INR)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={settings.minPayoutAmount ?? ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              minPayoutAmount: parseFloat(e.target.value),
                            })
                          }
                          className={adminInputClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Max Daily Payout (INR)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={settings.maxDailyPayout ?? ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              maxDailyPayout: parseFloat(e.target.value),
                            })
                          }
                          className={adminInputClass}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/60 dark:border-white/10 pt-6 space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Platform Details
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Platform Name
                        </label>
                        <input
                          type="text"
                          value={settings.platformName ?? ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              platformName: e.target.value,
                            })
                          }
                          className={adminInputClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Support Email
                        </label>
                        <input
                          type="email"
                          value={settings.supportEmail ?? ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              supportEmail: e.target.value,
                            })
                          }
                          className={adminInputClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Terms URL
                        </label>
                        <input
                          type="text"
                          value={settings.termsUrl ?? ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              termsUrl: e.target.value,
                            })
                          }
                          placeholder="https://example.com/terms"
                          className={adminInputClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Privacy URL
                        </label>
                        <input
                          type="text"
                          value={settings.privacyUrl ?? ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              privacyUrl: e.target.value,
                            })
                          }
                          placeholder="https://example.com/privacy"
                          className={adminInputClass}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/60 dark:border-white/10 pt-6 space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Fraud & QR Rules
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Default QR Expiry (Days)
                        </label>
                        <input
                          type="number"
                          value={settings.qrExpiryDays ?? ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              qrExpiryDays: parseInt(e.target.value),
                            })
                          }
                          className={adminInputClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Max Redemptions per User
                        </label>
                        <input
                          type="number"
                          value={
                            settings.fraudThresholds?.maxRedemptionsPerUser ??
                            ""
                          }
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              fraudThresholds: {
                                ...(settings.fraudThresholds || {}),
                                maxRedemptionsPerUser: parseInt(e.target.value),
                              },
                            })
                          }
                          className={adminInputClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Max Redeemer Share (%)
                        </label>
                        <input
                          type="number"
                          value={
                            settings.fraudThresholds?.maxRedeemerSharePercent ??
                            ""
                          }
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              fraudThresholds: {
                                ...(settings.fraudThresholds || {}),
                                maxRedeemerSharePercent: parseFloat(
                                  e.target.value,
                                ),
                              },
                            })
                          }
                          className={adminInputClass}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/60 dark:border-white/10 pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          Home Banners
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          These banners appear on the customer home screen.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddBanner}
                        className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white flex items-center gap-2"
                      >
                        <Plus size={14} /> Add Banner
                      </button>
                    </div>

                    {homeBanners.length === 0 && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        No banners configured yet. Add one to populate the home
                        screen.
                      </div>
                    )}

                    <div className="space-y-4">
                      {homeBanners.map((banner, index) => (
                        <div
                          key={`${banner?.id || "banner"}-${index}`}
                          className="rounded-xl border border-slate-200/60 dark:border-white/10 p-4 space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              Banner {index + 1}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveBanner(index)}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Title
                              </label>
                              <input
                                type="text"
                                value={banner?.title || ""}
                                onChange={(e) =>
                                  handleBannerFieldChange(
                                    index,
                                    "title",
                                    e.target.value,
                                  )
                                }
                                className={adminInputClass}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Subtitle
                              </label>
                              <input
                                type="text"
                                value={banner?.subtitle || ""}
                                onChange={(e) =>
                                  handleBannerFieldChange(
                                    index,
                                    "subtitle",
                                    e.target.value,
                                  )
                                }
                                className={adminInputClass}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Accent Gradient
                              </label>
                              <GradientPicker
                                value={banner?.accent || ""}
                                onChange={(val) =>
                                  handleBannerFieldChange(index, "accent", val)
                                }
                              />
                              <input
                                type="text"
                                value={banner?.accent || ""}
                                onChange={(e) =>
                                  handleBannerFieldChange(
                                    index,
                                    "accent",
                                    e.target.value,
                                  )
                                }
                                placeholder="from-blue-600 to-indigo-900"
                                className={`${adminInputClass} text-[10px] py-1 opacity-70`}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Link to Brand
                              </label>
                              <select
                                value={
                                  banner?.link?.startsWith("/brand-details/")
                                    ? banner.link.replace("/brand-details/", "")
                                    : ""
                                }
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleBannerFieldChange(
                                    index,
                                    "link",
                                    val
                                      ? `/brand-details/${val}`
                                      : "/brand-details",
                                  );
                                }}
                                className={adminInputClass}
                              >
                                <option value="">
                                  Default (All Brands / None)
                                </option>
                                {brands.map((b) => (
                                  <option
                                    key={b.id || b._id}
                                    value={b.id || b._id}
                                  >
                                    {b.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="h-20 w-32 rounded-lg border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-black/20 overflow-hidden flex items-center justify-center">
                              {banner?.img ? (
                                <AuthImage
                                  src={resolveAssetUrl(banner.img)}
                                  alt="Banner preview"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  No image
                                </span>
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <label className="px-3 py-2 rounded-lg border border-slate-200/60 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 w-fit">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      handleBannerImageUpload(index, file);
                                      e.target.value = "";
                                    }}
                                  />
                                  <span className="flex items-center gap-2">
                                    <Upload size={14} /> Upload Image
                                  </span>
                                </label>
                                <input
                                  type="text"
                                  value={banner?.img || ""}
                                  onChange={(e) =>
                                    handleBannerFieldChange(
                                      index,
                                      "img",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Image URL"
                                  className={adminInputClass}
                                />
                              </div>
                              {bannerUploadState[index]?.status && (
                                <div className="text-[11px] text-emerald-500">
                                  {bannerUploadState[index].status}
                                </div>
                              )}
                              {bannerUploadState[index]?.error && (
                                <div className="text-[11px] text-rose-500">
                                  {bannerUploadState[index].error}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={handleSettingsUpdate}
                      disabled={settingsLoading}
                      className={adminPrimaryButtonClass}
                    >
                      {settingsLoading ? "Saving..." : "Save Settings"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Add/Edit Product Page */}
          {isAddProductRoute && (
            <section
              id="add-product"
              className="space-y-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <RedeemProductModal
                product={redeemProductDraft}
                onClose={handleCloseRedeemProductModal}
                onSave={handleSaveRedeemProduct}
                isSaving={settingsLoading}
              />
            </section>
          )}

          {/* Account Settings Section */}
          {isAccountRoute && (
            <section
              id="account"
              className="space-y-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Account Settings
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Your admin profile and session information.
                  </p>
                </div>
              </div>

              <div className={`${adminPanelClass} p-6 max-w-3xl space-y-6`}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-black/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Name
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                      {adminInfo?.name || "Admin"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-black/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Email
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                      {adminInfo?.email || "Not available"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-black/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Role
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                      {adminInfo?.role || "admin"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-black/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Session
                    </p>
                    <p className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      Active
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleNavClick("security")}
                    className={adminGhostButtonClass}
                  >
                    Open Security
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick("settings")}
                    className={adminGhostButtonClass}
                  >
                    Open System Settings
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Security Section */}
          {isSecurityRoute && (
            <section
              id="security"
              className="space-y-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Security
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Session safety and sign-in controls.
                  </p>
                </div>
              </div>

              <div className={`${adminPanelClass} p-6 max-w-3xl space-y-5`}>
                <div className="rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Current Session Token
                  </p>
                  <p className="mt-2 text-sm font-mono text-slate-800 dark:text-slate-200 break-all">
                    {token ? `${token.slice(0, 12)}...${token.slice(-6)}` : "-"}
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200/80 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/5 p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Use sign out if this browser is shared or you suspect
                    unauthorized access.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-colors"
                  >
                    Sign Out
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick("account")}
                    className={adminGhostButtonClass}
                  >
                    Back to Account
                  </button>
                </div>
              </div>
            </section>
          )}

          {isAccountModalOpen && (
            <VendorAccountManager
              vendorId={selectedVendorId}
              brandId={selectedBrandId}
              token={token}
              initialTab={initialAccountTab}
              onClose={closeAccountModal}
              onUpdate={() => {
                loadVendors(token);
                loadBrands(token);
              }}
            />
          )}

          {/* User Account Manager Modal */}
          {selectedUser && !isUserWalletOpen && (
            <UserAccountManager
              user={selectedUser}
              token={token}
              onClose={() => setSelectedUser(null)}
              onUpdate={() => {
                loadUsers(token);
              }}
            />
          )}

          {isUserWalletOpen && selectedUser && (
            <UserWalletModal
              user={selectedUser}
              token={token}
              onClose={() => {
                setIsUserWalletOpen(false);
                setSelectedUser(null);
              }}
            />
          )}

          {productStatusToggleModal.isOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div
                className={`${adminPanelClass} w-full max-w-sm p-6 space-y-4 shadow-xl scale-100 animate-in zoom-in-95 duration-200`}
              >
                <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                  <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-500/10">
                    <AlertCircle size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Change Status?
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Are you sure you want to change this product's status to{" "}
                  <strong>
                    {productStatusToggleModal.currentStatus === "inactive" ? "Active" : "Inactive"}
                  </strong>?
                </p>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setProductStatusToggleModal({ isOpen: false, index: -1, currentStatus: "" })}
                    className={adminGhostButtonClass}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmToggleProductStatus}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {isDeleteRedeemProductModalOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div
                className={`${adminPanelClass} w-full max-w-sm p-6 space-y-4 shadow-xl scale-100 animate-in zoom-in-95 duration-200`}
              >
                <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                  <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-500/10">
                    <Trash2 size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Delete Product?
                  </h3>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Are you sure you want to delete this product? This action
                  cannot be undone.
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteRedeemProductModalOpen(false);
                      setProductToDeleteIndex(-1);
                    }}
                    className={adminGhostButtonClass}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteRedeemProduct}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors shadow-sm"
                  >
                    Delete Product
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;


"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "@/lib/router";
import { QRCodeCanvas } from "qrcode.react";
import VendorNavbar from "../components/VendorNavbar";
import { format, differenceInDays, subDays, parseISO } from "date-fns";
import { jsPDF } from "jspdf";

import {
  Menu,
  X,
  LayoutDashboard,
  Store,
  BadgeCheck,
  Megaphone,
  Package,
  Wallet,
  QrCode,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Smartphone,
  Printer,
  Ban,
  Plus,
  Info,
  ArrowRight,
  ClipboardCheck,
  Bell,
  MessageSquare,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  RefreshCw,
  Trash2,
  Edit2,
  Check,
  CheckCircle2,
  Archive,
  Upload,
  Globe,
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  Users,
  HelpCircle,
  Image as ImageIcon,
  FileText,
  Save,
  Building2,
  MapPin,
  Search,
  Lock,
  Share2,
  ExternalLink,
  SlidersHorizontal,
  ChevronDown,
  Filter,
} from "lucide-react";
import {
  getMe,
  getVendorQrs,
  getVendorQrInventorySeries,
  downloadVendorInventoryQrPdf,
  startVendorInventoryBulkQrExport,
  getVendorBulkQrExportJobs,
  cancelVendorBulkExportJob,
  deleteVendorBulkExportJob,
  downloadVendorBulkQrExport,
  getVendorWallet,
  getVendorTransactions,
  getVendorBrand,
  getVendorCampaigns,
  getVendorCampaignStats,
  getVendorOrders,
  getVendorProfile,
  upsertVendorBrand,
  updateUserProfile,
  sendEmailVerificationOtp,
  verifyEmailVerificationOtp,
  getVendorProducts,
  addVendorProduct,
  updateVendorProduct,
  deleteVendorProduct,
  uploadImage,
  loginWithEmail,
  createVendorCampaign,
  updateVendorCampaignStatus,
  deleteVendorQrBatch,
  orderVendorQrs,
  rechargeVendorWallet,
  updateVendorProfile,
  payVendorCampaign,
  downloadVendorOrderPdf,
  downloadCampaignQrPdf,
  fetchCampaignQrPdfBlob,
  startCampaignBulkQrExport,
  getRazorpayConfig,
  createPaymentOrder,
  verifyPayment,
  getUserNotifications,
  markUserNotificationRead,
  changeUserPassword,
  sendEmailOtp,
  resetPasswordWithOtp,
  getVendorRedemptions,
  getVendorRedemptionsMap,
  getVendorSummaryAnalytics,
  getVendorCustomers,
  exportVendorCustomers,
  getVendorInvoices,
  downloadVendorInvoicePdf,
  fetchVendorInvoicePdfBlob,
  shareVendorInvoice,
} from "../lib/api";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import CampaignCard from "../components/vendor/CampaignCard";
import {
  formatAmount,
  formatShortDate,
  parseNumericValue,
  buildAllocationGroups,
} from "../lib/vendorUtils";
import * as L from "leaflet/dist/leaflet-src.esm.js";
import "leaflet/dist/leaflet.css";
import { getApiBaseUrl } from "../lib/apiClient";
import VendorAnalytics from "../components/VendorAnalytics";
import VendorSupport from "../components/vendor/VendorSupport";
import CustomerDetailsModal from "../components/vendor/CustomerDetailsModal";
import AdvancedFilters from "../components/vendor/AdvancedFilters";
import ProductEditModal from "../components/ProductEditModal";
import StarBorder from "../components/StarBorder";
import { WelcomeModal } from "../components/vendor/WelcomeModal";

import { ConfirmModal } from "../components/ui/ConfirmModal";
import MonthDatePicker from "../components/ui/MonthDatePicker";
import { useToast } from "../components/ui";
import {
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  DANGER_BUTTON,
  SUCCESS_BUTTON,
  GHOST_BUTTON,
  ICON_BUTTON,
  LINK_BUTTON,
  combineClasses,
  getTabButtonClass,
} from "../styles/buttonStyles";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const VENDOR_PLAN_TYPE_KEY = "cashback_vendor_plan_type";
const VENDOR_TOKEN_KEY = "cashback_vendor_token";
const CAMPAIGN_QR_CHUNK_DOWNLOAD_THRESHOLD = 10000;
const CAMPAIGN_QR_CHUNK_SIZE = 5000;
const BULK_EXPORT_JOB_POLL_MS = 10000;
const QR_EXPORT_LABEL_FORMAT_VERSION = 2;
// Redundant formatAmount removed

const formatCompactAmount = (value) => {
  if (value === undefined || value === null) return "0.00";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);

  const abs = Math.abs(numeric);
  if (abs < 1000) return formatAmount(numeric);

  const sign = numeric < 0 ? "-" : "";
  const inThousands = Math.trunc((abs / 1000) * 1000) / 1000;
  let compactText = inThousands.toFixed(3);
  compactText = compactText
    .replace(/\.0+$/, "")
    .replace(/(\.\d*[1-9])0+$/, "$1");

  return `${sign}${compactText}K`;
};

const triggerBlobDownload = (blob, fileName) => {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.style.display = "none";
  link.href = blobUrl;
  link.download = fileName;
  link.target = "_blank";
  link.rel = "noopener";
  document.body.appendChild(link);
  window.setTimeout(() => {
    link.click();
  }, 0);
  window.setTimeout(() => {
    link.remove();
  }, 300);
  window.setTimeout(() => {
    window.URL.revokeObjectURL(blobUrl);
  }, 2000);
};

// Redundant formatShortDate removed

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "dd MMM yyyy, p");
};

const notificationTypeConfig = {
  "qr-redeemed": {
    icon: QrCode,
    badgeClass:
      "bg-primary-strong/10 text-primary-strong border-primary-strong/20 dark:bg-primary-strong/15 dark:text-primary dark:border-primary-strong/30",
    label: "QR Redeemed",
  },
  "wallet-recharge": {
    icon: ArrowDownRight,
    badgeClass:
      "bg-primary/10 text-primary border-primary/20 dark:bg-primary/15 dark:text-primary dark:border-primary/30",
    label: "Wallet Credit",
  },
  "wallet-debit": {
    icon: ArrowUpRight,
    badgeClass:
      "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
    label: "Wallet Debit",
  },
  "wallet-adjustment": {
    icon: Wallet,
    badgeClass:
      "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30",
    label: "Wallet Adjustment",
  },
  "campaign-created": {
    icon: Megaphone,
    badgeClass:
      "bg-primary/10 text-primary border-primary/20 dark:bg-primary/15 dark:text-primary dark:border-primary/30",
    label: "Campaign",
  },
  "pdf-downloaded": {
    icon: Download,
    badgeClass:
      "bg-primary/10 text-primary border-primary/20 dark:bg-primary/15 dark:text-primary dark:border-primary/30",
    label: "PDF Download",
  },
  "bulk-export-started": {
    icon: Archive,
    badgeClass:
      "bg-cyan-500/10 text-cyan-700 border-cyan-500/20 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30",
    label: "Bulk Export",
  },
  "bulk-export-ready": {
    icon: Download,
    badgeClass:
      "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    label: "Export Ready",
  },
  "bulk-export-failed": {
    icon: Archive,
    badgeClass:
      "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
    label: "Export Failed",
  },
  "campaign-activation-started": {
    icon: QrCode,
    badgeClass:
      "bg-cyan-500/10 text-cyan-700 border-cyan-500/20 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30",
    label: "QR Funding",
  },
  "campaign-activation-ready": {
    icon: CheckCircle2,
    badgeClass:
      "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    label: "QR Ready",
  },
  "campaign-activation-failed": {
    icon: Ban,
    badgeClass:
      "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
    label: "QR Funding Failed",
  },
  default: {
    icon: Bell,
    badgeClass:
      "bg-gray-500/10 text-gray-600 border-gray-500/20 dark:bg-gray-500/15 dark:text-gray-300 dark:border-gray-500/30",
    label: "Notification",
  },
};

const getToastTypeByNotification = (type) => {
  const successTypes = [
    "qr-redeemed",
    "wallet-recharge",
    "bulk-export-ready",
    "campaign-activation-ready",
  ];
  const errorTypes = ["bulk-export-failed", "campaign-activation-failed"];
  const warningTypes = ["wallet-debit", "wallet-adjustment"];

  if (successTypes.includes(type)) return "success";
  if (errorTypes.includes(type)) return "error";
  if (warningTypes.includes(type)) return "warning";
  return "info";
};

const NotificationItem = React.memo(
  ({ item, onClick, getMeta, formatDate }) => {
    const meta = getMeta(item);
    const Icon = meta.icon;
    return (
      <button
        type="button"
        onClick={() => onClick(item)}
        className={`w-full text-left p-4 transition-all duration-200 cursor-pointer border-b border-gray-100 dark:border-zinc-800/40 last:border-b-0 ${
          item.isRead
            ? "bg-transparent hover:bg-gray-50/60 dark:hover:bg-zinc-900/40"
            : "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.04] hover:bg-emerald-500/[0.06] dark:hover:bg-emerald-500/[0.08]"
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`h-9 w-9 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-300 ${meta.badgeClass}`}
          >
            <Icon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                {!item.isRead && (
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
                <span
                  className={`text-[13px] line-clamp-1 leading-snug tracking-tight ${
                    item.isRead
                      ? "font-semibold text-gray-700 dark:text-zinc-300"
                      : "font-black text-gray-900 dark:text-white"
                  }`}
                >
                  {item.title || meta.label}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 whitespace-nowrap pt-0.5">
                {formatDate(item.createdAt)}
              </span>
            </div>
            <p
              className={`text-xs mt-1.5 leading-relaxed line-clamp-2 ${
                item.isRead
                  ? "text-gray-500 dark:text-zinc-400 font-medium"
                  : "text-gray-700 dark:text-zinc-300 font-semibold"
              }`}
            >
              {item.message || "No details available."}
            </p>
          </div>
        </div>
      </button>
    );
  },
);

const getNotificationMeta = (notification) => {
  if (!notification?.type) return notificationTypeConfig.default;
  return (
    notificationTypeConfig[notification.type] || notificationTypeConfig.default
  );
};

const API_BASE_URL = getApiBaseUrl();

const resolveAssetUrl = (value) => {
  if (!value) return "";
  const source = String(value).trim().replace(/\\/g, "/");
  if (!source) return "";
  if (/^(https?:\/\/|data:|blob:)/i.test(source)) return source;
  if (source.startsWith("/")) {
    return API_BASE_URL ? `${API_BASE_URL}${source}` : source;
  }
  if (/^(api\/)?uploads\//i.test(source)) {
    return API_BASE_URL ? `${API_BASE_URL}/${source}` : `/${source}`;
  }
  return source;
};

const normalizeQrStatus = (status) =>
  String(status || "")
    .toLowerCase()
    .trim();

const isRedeemedQrStatus = (status) => {
  const normalized = normalizeQrStatus(status);
  return (
    normalized.includes("redeem") ||
    normalized.includes("claim") ||
    normalized.includes("used")
  );
};

const isInactiveQrStatus = (status) => {
  const normalized = normalizeQrStatus(status);
  return (
    normalized.includes("expire") ||
    normalized.includes("block") ||
    normalized.includes("revoke") ||
    normalized.includes("inactive") ||
    normalized.includes("cancel") ||
    normalized.includes("void")
  );
};

const formatTransactionDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "dd MMM yyyy, p");
};

// Redundant parseNumericValue removed

const parseOptionalNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeWholeNumberInput = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  return String(Math.max(0, Math.trunc(numeric)));
};

const getAllocationRowTotal = (row) => {
  const cashback = parseOptionalNumber(row?.cashbackAmount);
  const quantity = parseOptionalNumber(row?.quantity);
  if (cashback === null || quantity === null) return null;
  return cashback * quantity;
};

const formatAllocationTotal = (row) => {
  const total = getAllocationRowTotal(row);
  return total === null ? "" : total.toFixed(2);
};

const getGeneratedPrice = (qr) => {
  const qrValue = parseNumericValue(qr?.cashbackAmount, 0);
  if (qrValue > 0) {
    return qrValue;
  }
  return parseNumericValue(qr?.Campaign?.cashbackAmount, 0);
};

// Redundant buildAllocationGroups removed

const CAMPAIGN_FEE_GST_RATE = 0.18;
const VOUCHER_COST_MAP = { digital_voucher: 0.2, printed_qr: 0.5, none: 0 };

const resolveLiveTechFeePerQr = (value) => {
  const parsed = parseNumericValue(value, 0);
  return parsed > 1 ? parsed : 1.5;
};

const getCampaignPaymentSummary = (campaign, qrPricePerUnit) => {
  const allocations = Array.isArray(campaign?.allocations)
    ? campaign.allocations
    : [];
  const totalQty = allocations.reduce(
    (sum, allocation) => sum + (parseInt(allocation?.quantity, 10) || 0),
    0,
  );
  const baseBudget = parseNumericValue(
    campaign?.subtotal,
    parseNumericValue(campaign?.totalBudget, 0),
  );
  const feeTaxMultiplier = 1 + CAMPAIGN_FEE_GST_RATE;
  const printFeePerQrInclTax =
    parseNumericValue(qrPricePerUnit, 0) * feeTaxMultiplier;
  const printCost = totalQty * printFeePerQrInclTax;
  const voucherFeePerQr = VOUCHER_COST_MAP[campaign?.voucherType] || 0;
  const voucherFeePerQrInclTax = voucherFeePerQr * feeTaxMultiplier;
  const voucherCost = totalQty * voucherFeePerQrInclTax;
  const totalCost = baseBudget + printCost + voucherCost;
  return {
    totalQty,
    baseBudget,
    printFeePerQrInclTax,
    printCost,
    voucherCost,
    voucherFeePerQr,
    voucherFeePerQrInclTax,
    totalCost,
  };
};

// Redundant toRoman removed

const getClusterCustomerCount = (cluster) => {
  if (!cluster) return 0;
  if (typeof cluster.totalCustomers === "number") return cluster.totalCustomers;
  if (typeof cluster.customerCount === "number") return cluster.customerCount;

  const ids = Array.isArray(cluster.customerIds)
    ? cluster.customerIds
    : cluster.customerIds instanceof Set
      ? Array.from(cluster.customerIds)
      : [];

  return new Set(ids.filter(Boolean).map((value) => String(value))).size;
};

const INDIAN_STATE_OR_UT_NAMES = new Set([
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
  "goa", "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka",
  "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram",
  "nagaland", "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu", "telangana",
  "tripura", "uttar pradesh", "uttarakhand", "west bengal", "delhi", "jammu and kashmir",
  "ladakh", "chandigarh", "puducherry", "andaman and nicobar islands",
  "dadra and nagar haveli and daman and diu", "lakshadweep",
]);

const isStateOnlyLocation = (location) => {
  const city = String(location?.city || "").trim().toLowerCase();
  const state = String(location?.state || "").trim().toLowerCase();
  return Boolean(city) && INDIAN_STATE_OR_UT_NAMES.has(city) && (!state || state === city);
};
const formatLocationLabel = (location) => {
  if (!location) return "Unknown Area";
  const displayName = String(location.displayName || "").trim();
  if (displayName && displayName.toLowerCase() !== "unknown area") {
    return displayName;
  }

  const city = String(location.city || "").trim();
  const state = String(location.state || "").trim();
  const pincode = String(location.pincode || "").trim();

  const parts = [];
  if (city) parts.push(city);
  if (state && state !== city) parts.push(state);

  if (parts.length > 0) {
    const label = parts.join(", ");
    return pincode ? `${label} - ${pincode}` : label;
  }

  return pincode || "Unknown Area";
};

const VendorDashboard = () => {
  const { section } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Map URL section to internal state identifiers if necessary, or use directly
  // 'overview', 'brand', 'campaigns', 'products', 'wallet', 'scan'
  const allowedTabs = new Set([
    "overview",
    "brand",
    "campaigns",
    "products",
    "wallet",
    "customers",
    "notifications",
    "support",
    "locations",
    "billing",
  ]);
  const normalizedSection =
    section === "qr-generation"
      ? "campaigns"
      : section === "settings"
        ? "brand"
        : section;
  const activeTab = allowedTabs.has(normalizedSection)
    ? normalizedSection
    : "overview";
  const displayTab = activeTab;
  const [showOtpReset, setShowOtpReset] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("reset") === "true") {
      setShowOtpReset(true);
    }
  }, [location.search]);

  useEffect(() => {
    if (section === "reports" || section === "product-reports") {
      navigate("/vendor/overview", { replace: true });
    }
  }, [section, navigate]);

  useEffect(() => {
    if (section === "notifications") {
      setIsNotificationsOpen(true);
    }
  }, [section]);

  const [token, setToken] = useState(() =>
    localStorage.getItem(VENDOR_TOKEN_KEY),
  );
  const [vendorInfo, setVendorInfo] = useState(null);
  const timeOfDayGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good night";
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authStatus, setAuthStatus] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsError, setNotificationsError] = useState("");
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMarkingNotificationsRead, setIsMarkingNotificationsRead] =
    useState(false);
  const [bulkExportJobs, setBulkExportJobs] = useState([]);
  const [bulkExportJobsError, setBulkExportJobsError] = useState("");
  const [isLoadingBulkExportJobs, setIsLoadingBulkExportJobs] = useState(false);
  const [startingBulkExportKey, setStartingBulkExportKey] = useState("");
  const [downloadingBulkExportJobId, setDownloadingBulkExportJobId] =
    useState("");
  const [cancellingJobId, setCancellingJobId] = useState(null);
  const [deletingExportJobId, setDeletingExportJobId] = useState(null);
  const lastNotificationCountRef = useRef(null);
  const lastAutoFilledCashbackRef = useRef(null);
  const notificationsDropdownRef = useRef(null);
  const notificationsTriggerRef = useRef(null);
  const { info, success, error: toastError } = useToast();

  const [wallet, setWallet] = useState(null);
  const [walletError, setWalletError] = useState("");
  const [walletStatus, setWalletStatus] = useState("");
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [isRecharging, setIsRecharging] = useState(false);

  const [campaignId, setCampaignId] = useState("");
  const [qrOrderStatus, setQrOrderStatus] = useState("");
  const [qrOrderError, setQrOrderError] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);
  const [lastOrderHashes, setLastOrderHashes] = useState([]);
  const [lastBatchSummary, setLastBatchSummary] = useState(null);
  const [selectedQrCampaign, setSelectedQrCampaign] = useState("");
  const [selectedQrProduct, setSelectedQrProduct] = useState("");
  const [selectedQrSeries, setSelectedQrSeries] = useState("");
  const [qrInventorySeries, setQrInventorySeries] = useState([]);
  const [qrRows, setQrRows] = useState([
    { id: Date.now(), cashbackAmount: "", quantity: 10 },
  ]);

  const [qrs, setQrs] = useState([]);
  const [qrError, setQrError] = useState("");
  const [isLoadingQrs, setIsLoadingQrs] = useState(false);
  const [deletingBatchKey, setDeletingBatchKey] = useState(null);
  const [qrPage, setQrPage] = useState(1);
  const [qrTotal, setQrTotal] = useState(0);
  const [qrStatusCounts, setQrStatusCounts] = useState({});
  const [qrHasMore, setQrHasMore] = useState(false);
  const [qrActionStatus, setQrActionStatus] = useState("");

  const [orders, setOrders] = useState([]);
  const [ordersError, setOrdersError] = useState("");
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [orderStatusCounts, setOrderStatusCounts] = useState({});
  const [ordersHasMore, setOrdersHasMore] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [transactionsError, setTransactionsError] = useState("");
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [dashboardFilters, setDashboardFilters] = useState({
    dateFrom: "",
    dateTo: "",
    campaignId: "",
    location: "",
    mobile: "",
    productId: "",
    invoiceNo: "",
  });
  const [locationsData, setLocationsData] = useState([]);
  const [isLoadingOverviewLocations, setIsLoadingOverviewLocations] =
    useState(false);
  const [overviewLocationsError, setOverviewLocationsError] = useState("");
  const [customersData, setCustomersData] = useState([]);
  const [invoicesData, setInvoicesData] = useState([]);
  const [recentRedemptions, setRecentRedemptions] = useState([]);
  const [isLoadingRecentRedemptions, setIsLoadingRecentRedemptions] =
    useState(false);
  const [recentRedemptionsError, setRecentRedemptionsError] = useState("");
  const [isLoadingExtraTab, setIsLoadingExtraTab] = useState(false);
  const [extraTabError, setExtraTabError] = useState("");
  const [clusterCityFilter, setClusterCityFilter] = useState(null);
  const [clusterLocationFilter, setClusterLocationFilter] = useState(null);
  const activeClusterFilterRef = useRef(null);
  const [invoiceShareStatus, setInvoiceShareStatus] = useState("");

  const [selectedCustomerModal, setSelectedCustomerModal] = useState(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [showAllInventory, setShowAllInventory] = useState(false);

  const [companyProfile, setCompanyProfile] = useState({
    businessName: "",
    contactPhone: "",
    contactEmail: "",
    gstin: "",
    address: "",
    designation: "",
    alternatePhone: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [accountProfile, setAccountProfile] = useState({
    name: "",
    email: "",
    username: "",
    phoneNumber: "",
  });
  const [accountStatus, setAccountStatus] = useState("");
  const [accountError, setAccountError] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [showProfileOtp, setShowProfileOtp] = useState(false);
  const [profileOtp, setProfileOtp] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordStatus, setPasswordStatus] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [otpReset, setOtpReset] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [redemptionTrend, setRedemptionTrend] = useState([]);
  const [isLoadingRedemptionTrend, setIsLoadingRedemptionTrend] =
    useState(false);
  const [redemptionTrendError, setRedemptionTrendError] = useState("");
  const [otpStatus, setOtpStatus] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResettingOtp, setIsResettingOtp] = useState(false);

  const [brandProfile, setBrandProfile] = useState({
    id: "",
    name: "",
    logoUrl: "",
    website: "",
    qrPricePerUnit: "",
    defaultPlanType: localStorage.getItem(VENDOR_PLAN_TYPE_KEY) || "prepaid",
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [registrationForm, setRegistrationForm] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    category: "",
    description: "",
    logo: null,
    logoPreview: null,
  });
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);

  // Brand Logo Upload State
  const [isUploadingBrandLogo, setIsUploadingBrandLogo] = useState(false);
  const [brandLogoStatus, setBrandLogoStatus] = useState("");
  const [brandLogoError, setBrandLogoError] = useState("");
  const [imageLoadError, setImageLoadError] = useState(false);

  const handleBrandLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!token) {
      setBrandLogoError("Please sign in first.");
      return;
    }
    setIsUploadingBrandLogo(true);
    setBrandLogoStatus("");
    setBrandLogoError("");
    try {
      const data = await uploadImage(token, file);
      const uploadedUrl = data?.url;
      if (!uploadedUrl) {
        throw new Error("Upload failed. No URL returned.");
      }
      setBrandProfile((prev) => ({ ...prev, logoUrl: uploadedUrl }));
      setBrandLogoStatus("Brand logo uploaded.");
      setImageLoadError(false);
    } catch (err) {
      setBrandLogoError(err.message || "Failed to upload logo.");
    } finally {
      setIsUploadingBrandLogo(false);
      event.target.value = "";
    }
  };

  const handleRegistrationChange = (field) => (e) => {
    setRegistrationForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const openSuccessModal = (title, message) => {
    setSuccessModal({
      isOpen: true,
      title,
      message,
    });
  };

  const closeSuccessModal = () => {
    setSuccessModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRegistrationForm((prev) => ({
          ...prev,
          logo: file,
          logoPreview: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegistrationSubmit = (e) => {
    e.preventDefault();
    // In a real app, this would call an API
    setTimeout(() => {
      // Generate Mock Credentials
      const mockCreds = {
        vendorId: `VND-${Math.floor(10000 + Math.random() * 90000)}`,
        password: `pass${Math.floor(1000 + Math.random() * 9000)}`,
      };
      setGeneratedCredentials(mockCreds);
      setRegistrationSubmitted(true);
    }, 1500);
  };
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [isSavingRegistration, setIsSavingRegistration] = useState(false);

  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [campaignStatsMap, setCampaignStatsMap] = useState({});
  const [overviewCampaignId, setOverviewCampaignId] = useState("all");
  const [dateFilter, setDateFilter] = useState({
    from: format(subDays(new Date(), 6), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
    preset: "1w",
  });

  const dateFilterRef = useRef(dateFilter);
  const overviewCampaignIdRef = useRef(overviewCampaignId);

  useEffect(() => {
    dateFilterRef.current = dateFilter;
  }, [dateFilter]);

  useEffect(() => {
    overviewCampaignIdRef.current = overviewCampaignId;
  }, [overviewCampaignId]);

  const [campaignForm, setCampaignForm] = useState({
    title: "",
    description: "",
    cashbackAmount: "",
    totalBudget: "",
    productId: "",
    planType: localStorage.getItem(VENDOR_PLAN_TYPE_KEY) || "prepaid",
    voucherType: "digital_voucher",
    voucherDesignUrl: "assured_gift_card_placeholder.png",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 3))
      .toISOString()
      .slice(0, 10),
  });
  const [campaignStatus, setCampaignStatus] = useState("");
  const [campaignError, setCampaignError] = useState("");
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [campaignRows, setCampaignRows] = useState([
    { id: Date.now(), cashbackAmount: "", quantity: "", totalBudget: "" },
  ]);
  const [campaignTab, setCampaignTab] = useState("create"); // 'create', 'pending', 'active'
  const [collapsedCampaignGroups, setCollapsedCampaignGroups] = useState({});
  const toggleCampaignGroup = (groupName) => {
    setCollapsedCampaignGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  useEffect(() => {
    if (location.state?.campaignTab) {
      setCampaignTab(location.state.campaignTab);
    }
  }, [location.state]);
  const [selectedPendingCampaign, setSelectedPendingCampaign] = useState(null);
  const [selectedActiveCampaign, setSelectedActiveCampaign] = useState(null);
  const [campaignQrBreakdownMap, setCampaignQrBreakdownMap] = useState({});
  const [loadingCampaignBreakdownId, setLoadingCampaignBreakdownId] =
    useState("");
  const [isPayingCampaign, setIsPayingCampaign] = useState(false);
  const [deletingCampaignId, setDeletingCampaignId] = useState(null);
  const [campaignToDelete, setCampaignToDelete] = useState(null);
  const [campaignActionType, setCampaignActionType] = useState(null);
  const [bulkExportPrompt, setBulkExportPrompt] = useState(null);
  const [isConfirmingBulkExport, setIsConfirmingBulkExport] = useState(false);

  const handleAddCampaignRow = () => {
    setCampaignRows((prev) => [
      ...prev,
      { id: Date.now(), cashbackAmount: "", quantity: "", totalBudget: "" },
    ]);
  };

  const handleRemoveCampaignRow = (id) => {
    setCampaignRows((prev) => {
      const remaining = prev.filter((row) => row.id !== id);
      return remaining.length
        ? remaining
        : [
            {
              id: Date.now(),
              cashbackAmount: "",
              quantity: "",
              totalBudget: "",
            },
          ];
    });
  };

  const handleCampaignRowChange = (id, field, value) => {
    setCampaignRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const normalizedValue =
            field === "cashbackAmount" || field === "quantity"
              ? normalizeWholeNumberInput(value)
              : value;
          const updatedRow = { ...row, [field]: normalizedValue };
          if (field === "cashbackAmount" || field === "quantity") {
            const cb = parseFloat(updatedRow.cashbackAmount);
            const qty = parseFloat(updatedRow.quantity);
            if (!isNaN(cb) && !isNaN(qty) && cb > 0 && qty > 0) {
              updatedRow.totalBudget = (cb * qty).toFixed(2);
            } else {
              updatedRow.totalBudget = "";
            }
          }
          return updatedRow;
        }
        return row;
      }),
    );
  };

  const campaignAllocationSummary = useMemo(() => {
    return campaignRows.reduce(
      (summary, row) => {
        const quantityValue = parseOptionalNumber(row.quantity);
        const rowTotal = getAllocationRowTotal(row);
        summary.subtotal += rowTotal ?? 0;
        if (Number.isFinite(quantityValue)) {
          summary.quantity += Math.max(0, Math.floor(quantityValue));
        }
        return summary;
      },
      { subtotal: 0, quantity: 0 },
    );
  }, [campaignRows]);

  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState({
    name: "",
    variant: "",
    category: "",
    description: "",
    imageUrl: "",
  });
  const [productStatus, setProductStatus] = useState("");
  const [productError, setProductError] = useState("");
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [productImageUploadStatus, setProductImageUploadStatus] = useState("");
  const [productImageUploadError, setProductImageUploadError] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  // Redundant states removed
  const [productModalContext, setProductModalContext] = useState(null); // 'campaign' or 'qr'
  const [failedProductImages, setFailedProductImages] = useState(
    () => new Set(),
  );
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });

  // QR Row Handlers
  const handleAddQrRow = () => {
    setQrRows((prev) => [
      ...prev,
      { id: Date.now(), cashbackAmount: "", quantity: 10 },
    ]);
  };
  const handleRemoveQrRow = (id) => {
    setQrRows((prev) => {
      const remaining = prev.filter((row) => row.id !== id);
      return remaining.length
        ? remaining
        : [{ id: Date.now(), cashbackAmount: "", quantity: 10 }];
    });
  };
  const handleQrRowChange = (id, field, value) => {
    setQrRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedQrCampaign),
    [campaigns, selectedQrCampaign],
  );
  const selectedCampaignStatus = String(selectedCampaign?.status || "")
    .toLowerCase()
    .trim();
  const selectedCampaignIsPending = selectedCampaignStatus === "pending";
  const selectedCampaignRequiresProduct = selectedCampaignStatus === "active";

  const campaignPriceHints = useMemo(() => {
    const map = {};
    qrs.forEach((qr) => {
      const campaignId = qr.Campaign?.id || qr.campaignId;
      if (!campaignId) return;
      const price = getGeneratedPrice(qr);
      if (!price) return;
      const createdAt = new Date(qr.createdAt || 0).getTime();
      const existing = map[campaignId];
      if (!existing || createdAt > existing.createdAt) {
        map[campaignId] = { price, createdAt };
      }
    });
    return map;
  }, [qrs]);

  const selectedCampaignCashback = parseNumericValue(
    selectedCampaign?.cashbackAmount,
    0,
  );
  const selectedCampaignBudget = parseNumericValue(
    selectedCampaign?.totalBudget,
    0,
  );
  const selectedCampaignPriceHint = selectedCampaign
    ? campaignPriceHints[selectedCampaign.id]?.price || 0
    : 0;
  const effectiveCampaignCashback =
    selectedCampaignCashback > 0
      ? selectedCampaignCashback
      : selectedCampaignPriceHint;

  const isAuthenticated = Boolean(token);
  const qrPricePerUnit = resolveLiveTechFeePerQr(brandProfile?.qrPricePerUnit);
  const brandLogoPreviewSrc = resolveAssetUrl(brandProfile.logoUrl);

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

  const getQrCanvasId = (hash) => `qr-canvas-${hash}`;

  const setStatusWithTimeout = (message) => {
    setQrActionStatus(message);
    setTimeout(() => setQrActionStatus(""), 2000);
  };

  const getStatusClasses = (status) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "redeemed") return "text-primary dark:text-primary";
    if (normalized === "paid" || normalized === "shipped") {
      return "text-primary dark:text-primary";
    }
    if (normalized === "expired") return "text-rose-600 dark:text-rose-400";
    if (normalized === "assigned") return "text-amber-600 dark:text-amber-400";
    if (normalized === "generated" || normalized === "active") {
      return "text-primary-strong dark:text-primary";
    }
    return "text-gray-500 dark:text-gray-400";
  };

  const copyToClipboard = async (value) => {
    const textValue = String(value ?? "");
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textValue);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = textValue;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleCopyHash = async (hash) => {
    const ok = await copyToClipboard(hash);
    setStatusWithTimeout(ok ? "QR hash copied." : "Unable to copy QR hash.");
  };

  const handleDownloadQr = (hash) => {
    const canvas = document.getElementById(getQrCanvasId(hash));
    if (!canvas) {
      setStatusWithTimeout("QR not ready yet.");
      return;
    }
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `qr-${hash.slice(0, 8)}.png`;
    link.click();
  };

  const handleDownloadGroupPdf = (group) => {
    if (!group || !group.qrs || group.qrs.length === 0) return;

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
    const displayPrice = parseNumericValue(
      group.price,
      group.qrs[0]?.cashbackAmount ?? 0,
    );
    const priceLabel = formatAmount(displayPrice);
    const campaignTitle = group.campaignTitle || "Campaign";

    const drawHeader = () => {
      doc.setFontSize(16);
      doc.text(`QR Batch - INR ${priceLabel}`, margin, 18);
      doc.setFontSize(10);
      doc.text(`Campaign: ${campaignTitle}`, margin, 26);
    };
    drawHeader();

    const itemsPerPage = itemsPerRow * rowsPerPage;

    group.qrs.forEach((qr, index) => {
      const localIndex = index % itemsPerPage;
      if (index > 0 && localIndex === 0) {
        doc.addPage();
        drawHeader();
      }

      const col = localIndex % itemsPerRow;
      const row = Math.floor(localIndex / itemsPerRow);
      const xPos = margin + col * (qrSize + spacing);
      const yPos = 36 + row * rowSpacing;

      const canvas = document.getElementById(getQrCanvasId(qr.uniqueHash));
      if (!canvas) return;

      const imgData = canvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", xPos, yPos, qrSize, qrSize);

      const perPrice = getGeneratedPrice(qr) || displayPrice;
      doc.setFontSize(8);
      doc.text(qr.uniqueHash.slice(0, 8), xPos, yPos + qrSize + 6);
      doc.text(`INR ${formatAmount(perPrice)}`, xPos, yPos + qrSize + 12);
    });

    doc.save(`qrs-${priceLabel}-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`);
  };

  const handleDeleteQrBatch = async ({
    campaignId,
    priceKey,
    price,
    count,
  }) => {
    if (!token) return;
    const priceLabel = formatAmount(price);
    const confirmMessage = `Delete ${count} QR${count !== 1 ? "s" : ""} at INR ${priceLabel}? Only unused QRs will be removed.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    const batchKey = `${campaignId}-${priceKey ?? price}`;
    setDeletingBatchKey(batchKey);
    setQrError("");

    try {
      const result = await deleteVendorQrBatch(
        token,
        campaignId,
        priceKey ?? price,
      );
      const deleted = result.deleted ?? result.count ?? 0;
      const skipped = result.skipped ?? 0;
      if (skipped > 0) {
        setStatusWithTimeout(
          `Deleted ${deleted} QRs. Skipped ${skipped} redeemed/blocked.`,
        );
      } else {
        setStatusWithTimeout(`Deleted ${deleted} QRs from batch.`);
      }
      await loadQrs();
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      setQrError(err.message || "Failed to delete QR batch.");
      setTimeout(() => setQrError(""), 3000);
    } finally {
      setDeletingBatchKey(null);
    }
  };

  const handlePrintQr = (hash) => {
    const canvas = document.getElementById(getQrCanvasId(hash));
    if (!canvas) {
      setStatusWithTimeout("QR not ready yet.");
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    const printWindow = window.open("", "_blank", "width=480,height=520");
    if (!printWindow) {
      setStatusWithTimeout("Popup blocked.");
      return;
    }
    printWindow.document.write(
      `<html><head><title>Print QR</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center;"><img src="${dataUrl}" style="width:320px;height:320px;" /></body></html>`,
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => printWindow.print();
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({
    show: false,
    progress: 0,
    message: "",
  });

  const runDownloadWithProgress = async (downloadTask, initialMessage) => {
    setDownloadProgress({
      show: true,
      progress: 12,
      message: initialMessage || "Preparing your PDF...",
    });

    let progressValue = 12;
    const progressTimer = setInterval(() => {
      progressValue = Math.min(progressValue + 10, 92);
      setDownloadProgress((prev) => ({
        ...prev,
        progress: progressValue,
      }));
    }, 150);

    try {
      setDownloadProgress((prev) => ({
        ...prev,
        progress: Math.max(prev.progress, 30),
        message: "Generating file...",
      }));
      await downloadTask();
      clearInterval(progressTimer);
      setDownloadProgress({
        show: true,
        progress: 100,
        message: "Download complete!",
      });
      setTimeout(() => {
        setDownloadProgress({ show: false, progress: 0, message: "" });
      }, 450);
    } catch (err) {
      clearInterval(progressTimer);
      setDownloadProgress({ show: false, progress: 0, message: "" });
      throw err;
    }
  };
  const handleDownloadOrderPdf = async (orderId) => {
    if (!token || !orderId) return;
    setIsDownloadingPdf(orderId);

    try {
      await runDownloadWithProgress(
        () => downloadVendorOrderPdf(token, orderId),
        "Preparing order PDF...",
      );

      setStatusWithTimeout("PDF downloaded successfully.");
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      const errorMsg = err.message || "Failed to download PDF.";
      setStatusWithTimeout(errorMsg);
      toastError("Download Failed", errorMsg);
    } finally {
      setIsDownloadingPdf(null);
    }
  };

  const getCampaignQrCountEstimate = (campaign) => {
    if (!campaign?.id) return 0;
    const stats =
      campaignStatsMap[campaign.id] ||
      campaignStatsMap[`title:${campaign.title}`];
    const statsTotal = Number(stats?.totalQRsOrdered);
    if (Number.isFinite(statsTotal) && statsTotal > 0) {
      return Math.floor(statsTotal);
    }

    const sheetCount = Number(campaign?.sheetCount);
    const qrsPerSheet = Number(campaign?.qrsPerSheet);
    if (
      Number.isFinite(sheetCount) &&
      sheetCount > 0 &&
      Number.isFinite(qrsPerSheet) &&
      qrsPerSheet > 0
    ) {
      return Math.floor(sheetCount * qrsPerSheet);
    }

    if (Array.isArray(campaign?.allocations)) {
      return campaign.allocations.reduce((sum, allocation) => {
        const qty = Number.parseInt(allocation?.quantity, 10);
        return sum + (Number.isFinite(qty) && qty > 0 ? qty : 0);
      }, 0);
    }

    return 0;
  };

  const getInventoryQrCountEstimate = (seriesCode = selectedQrSeries) => {
    if (seriesCode) {
      const selectedSeries = qrInventorySeries.find(
        (series) => series.seriesCode === seriesCode,
      );
      return Number(selectedSeries?.availableCount) || 0;
    }

    return qrInventorySeries.reduce(
      (sum, series) => sum + (Number(series?.availableCount) || 0),
      0,
    );
  };

  const downloadCampaignPdfInChunks = async ({
    campaignId,
    totalQrs,
    chunkSize = CAMPAIGN_QR_CHUNK_SIZE,
    baseParams = {},
  }) => {
    const safeTotalQrs = Math.max(1, Number.parseInt(totalQrs, 10) || 1);
    const safeChunkSize = Math.max(
      200,
      Number.parseInt(chunkSize, 10) || CAMPAIGN_QR_CHUNK_SIZE,
    );
    const totalParts = Math.max(1, Math.ceil(safeTotalQrs / safeChunkSize));

    setDownloadProgress({
      show: true,
      progress: 8,
      message: `Preparing ${totalParts} part${totalParts === 1 ? "" : "s"}...`,
    });

    for (let part = 1; part <= totalParts; part += 1) {
      const offset = (part - 1) * safeChunkSize;
      const limit = Math.min(safeChunkSize, safeTotalQrs - offset);
      const baseProgress = Math.min(
        94,
        Math.round(((part - 1) / totalParts) * 90) + 8,
      );

      setDownloadProgress({
        show: true,
        progress: baseProgress,
        message: `Downloading part ${part} of ${totalParts}...`,
      });

      await downloadCampaignQrPdf(token, campaignId, {
        ...baseParams,
        offset,
        limit,
        part,
        totalParts,
      });

      setDownloadProgress({
        show: true,
        progress: Math.min(97, Math.round((part / totalParts) * 97)),
        message:
          part === totalParts
            ? "Finalizing download..."
            : `Downloaded ${part}/${totalParts} parts...`,
      });
    }

    setDownloadProgress({
      show: true,
      progress: 100,
      message: "Download complete!",
    });
    setTimeout(() => {
      setDownloadProgress({ show: false, progress: 0, message: "" });
    }, 500);

    return totalParts;
  };

  const downloadSelectedCampaignSheetsPdf = async ({
    campaignId,
    sheetIndexes,
    qrsPerSheet,
    onlyRecharged,
    exactAmount,
    qrQuantity,
  }) => {
    const normalizedSheetIndexes = Array.from(
      new Set(
        (Array.isArray(sheetIndexes) ? sheetIndexes : [])
          .map((value) => Number.parseInt(value, 10))
          .filter((value) => Number.isFinite(value) && value >= 0),
      ),
    ).sort((a, b) => a - b);

    if (!normalizedSheetIndexes.length) return 0;

    const totalSheets = normalizedSheetIndexes.length;
    let remainingToLimit = qrQuantity && qrQuantity > 0 ? qrQuantity : Infinity;

    setDownloadProgress({
      show: true,
      progress: 8,
      message: `Preparing ${totalSheets} selected sheet${totalSheets === 1 ? "" : "s"}...`,
    });

    const { PDFDocument } = await import("pdf-lib");
    const mergedPdf = await PDFDocument.create();

    let successfulSheets = 0;

    for (let index = 0; index < totalSheets; index += 1) {
      if (remainingToLimit <= 0) break;

      const sheetIndex = normalizedSheetIndexes[index];
      const position = index + 1;

      setDownloadProgress({
        show: true,
        progress: Math.min(88, Math.round((index / totalSheets) * 80) + 10),
        message: `Downloading sheet ${sheetIndex + 1} (${position}/${totalSheets})...`,
      });

      try {
        const sheetLimit = Math.min(remainingToLimit, qrsPerSheet || 25);
        const { blob } = await fetchCampaignQrPdfBlob(token, campaignId, {
          fast: 1,
          skipLogo: 1,
          sheetIndex,
          qrsPerSheet,
          limit: sheetLimit,
          ...(onlyRecharged ? { onlyRecharged: 1 } : {}),
          ...(exactAmount ? { exactAmount } : {}),
        });
        const sourcePdf = await PDFDocument.load(await blob.arrayBuffer());
        const copiedPages = await mergedPdf.copyPages(
          sourcePdf,
          sourcePdf.getPageIndices(),
        );
        copiedPages.forEach((page) => mergedPdf.addPage(page));
        successfulSheets += 1;

        // Use a safe estimate if the response header doesn't specify count
        remainingToLimit -= sheetLimit;
      } catch (err) {
        if (
          err?.status === 400 &&
          err?.message?.toLowerCase().includes("no qr codes found")
        ) {
          console.warn(`Skipped empty sheet ${sheetIndex + 1}`);
        } else {
          throw err;
        }
      }

      setDownloadProgress({
        show: true,
        progress: Math.min(94, Math.round((position / totalSheets) * 94)),
        message:
          position === totalSheets
            ? "Finalizing merged PDF..."
            : `Merged ${position}/${totalSheets} sheets...`,
      });
    }

    if (successfulSheets === 0) {
      throw new Error("No matching QR codes found on the selected sheets.");
    }

    const mergedPdfBytes = await mergedPdf.save();
    const mergedBlob = new Blob([mergedPdfBytes], {
      type: "application/pdf",
    });
    const firstSheetLabel = normalizedSheetIndexes[0] + 1;
    const lastSheetLabel =
      normalizedSheetIndexes[normalizedSheetIndexes.length - 1] + 1;
    const sheetLabel =
      totalSheets <= 3
        ? normalizedSheetIndexes.map((sheetIndex) => sheetIndex + 1).join("-")
        : `${firstSheetLabel}-to-${lastSheetLabel}_${totalSheets}-sheets`;
    const mergedFileName = `QR_Campaign_${campaignId.slice(-8)}_Sheets_${sheetLabel}_${Date.now()}.pdf`;
    triggerBlobDownload(mergedBlob, mergedFileName);

    setDownloadProgress({
      show: true,
      progress: 100,
      message: "Download complete!",
    });
    setTimeout(() => {
      setDownloadProgress({ show: false, progress: 0, message: "" });
    }, 500);

    return totalSheets;
  };

  const handleDownloadCampaignPdf = async (campaign, options = {}) => {
    const campaignId = campaign?.id;
    if (!token || !campaignId) return;
    setIsDownloadingPdf(campaignId);
    const estimatedQrs = getCampaignQrCountEstimate(campaign);
    const parsedSheetIndexes = Array.isArray(options?.sheetIndexes)
      ? options.sheetIndexes
          .map((value) => Number.parseInt(value, 10))
          .filter((value) => Number.isFinite(value) && value >= 0)
      : [];
    const uniqueSheetIndexes = Array.from(new Set(parsedSheetIndexes)).sort(
      (a, b) => a - b,
    );
    const parsedSingleSheetIndex = Number.parseInt(options?.sheetIndex, 10);
    const resolvedSheetIndex =
      uniqueSheetIndexes.length === 1
        ? uniqueSheetIndexes[0]
        : Number.isFinite(parsedSingleSheetIndex) && parsedSingleSheetIndex >= 0
          ? parsedSingleSheetIndex
          : null;
    const isMultiSheetDownload = uniqueSheetIndexes.length > 1;
    const isSheetDownload =
      Number.isFinite(resolvedSheetIndex) && resolvedSheetIndex >= 0;
    const parsedOffset = Number.parseInt(options?.offset, 10);
    const resolvedOffset =
      Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : null;
    const parsedLimit = Number.parseInt(
      options?.limit ?? options?.qrQuantity,
      10,
    );
    const resolvedLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;
    const isRangeDownload =
      !isMultiSheetDownload &&
      !isSheetDownload &&
      resolvedOffset !== null &&
      resolvedLimit !== null;
    const resolvedQrsPerSheet =
      Number.parseInt(campaign?.qrsPerSheet, 10) > 0
        ? Number.parseInt(campaign.qrsPerSheet, 10)
        : undefined;
    const downloadParams = {
      fast: 1,
      skipLogo: 1,
      ...(options?.onlyRecharged ? { onlyRecharged: 1 } : {}),
      ...(options?.exactAmount ? { exactAmount: options.exactAmount } : {}),
      ...(options?.statusLabel ? { batchLabel: options.statusLabel } : {}),
      ...(options?.qrRange ? { qrRange: options.qrRange } : {}),
      ...(resolvedOffset !== null ? { offset: resolvedOffset } : {}),
      ...(resolvedLimit !== null ? { limit: resolvedLimit } : {}),
      ...(isSheetDownload
        ? {
            sheetIndex: resolvedSheetIndex,
            qrsPerSheet: resolvedQrsPerSheet,
          }
        : {}),
    };

    try {
      if (isMultiSheetDownload) {
        const mergedCount = await downloadSelectedCampaignSheetsPdf({
          campaignId,
          sheetIndexes: uniqueSheetIndexes,
          qrsPerSheet: resolvedQrsPerSheet,
          onlyRecharged: !!options?.onlyRecharged,
          exactAmount: options?.exactAmount,
        });
        setStatusWithTimeout(
          `Merged ${mergedCount} selected sheets into one PDF successfully.`,
        );
      } else if (isSheetDownload) {
        await runDownloadWithProgress(
          () => downloadCampaignQrPdf(token, campaignId, downloadParams),
          `Preparing sheet ${resolvedSheetIndex + 1} PDF...`,
        );
        setStatusWithTimeout(
          `Sheet ${resolvedSheetIndex + 1} QR PDF downloaded successfully.`,
        );
      } else if (isRangeDownload) {
        const scopeLabel = options?.statusLabel || "Selected batch";
        await runDownloadWithProgress(
          () => downloadCampaignQrPdf(token, campaignId, downloadParams),
          `Preparing ${scopeLabel.toLowerCase()} PDF...`,
        );
        setStatusWithTimeout(`${scopeLabel} QR PDF downloaded successfully.`);
      } else if (estimatedQrs >= CAMPAIGN_QR_CHUNK_DOWNLOAD_THRESHOLD) {
        const totalParts = await downloadCampaignPdfInChunks({
          campaignId,
          totalQrs: estimatedQrs,
          baseParams: downloadParams,
        });
        setStatusWithTimeout(
          `Downloaded ${totalParts} PDF part${totalParts === 1 ? "" : "s"} for ${estimatedQrs.toLocaleString()} QRs.`,
        );
      } else {
        await runDownloadWithProgress(
          () => downloadCampaignQrPdf(token, campaignId, downloadParams),
          "Preparing full campaign PDF...",
        );
        setStatusWithTimeout("Full campaign QR PDF downloaded successfully.");
      }
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      const backendChunkHint =
        !isMultiSheetDownload &&
        err?.status === 413 &&
        (err?.data?.code === "CAMPAIGN_PDF_TOO_LARGE" ||
          /chunked download/i.test(String(err?.message || "")));

      if (backendChunkHint) {
        try {
          const hintedTotalQrs = Number(err?.data?.totalQrs);
          const hintedChunkSize = Number(err?.data?.recommendedChunkSize);
          const fallbackTotalQrs =
            Number.isFinite(hintedTotalQrs) && hintedTotalQrs > 0
              ? hintedTotalQrs
              : estimatedQrs || CAMPAIGN_QR_CHUNK_DOWNLOAD_THRESHOLD;

          const totalParts = await downloadCampaignPdfInChunks({
            campaignId,
            totalQrs: fallbackTotalQrs,
            chunkSize:
              Number.isFinite(hintedChunkSize) && hintedChunkSize > 0
                ? hintedChunkSize
                : CAMPAIGN_QR_CHUNK_SIZE,
            baseParams: downloadParams,
          });

          setStatusWithTimeout(
            `Downloaded ${totalParts} PDF part${totalParts === 1 ? "" : "s"} successfully.`,
          );
          return;
        } catch (chunkErr) {
          if (handleVendorAccessError(chunkErr)) return;
          const chunkErrorMsg =
            chunkErr.message || "Failed to download campaign PDF in parts.";
          setStatusWithTimeout(chunkErrorMsg);
          toastError("Download Failed", chunkErrorMsg);
          return;
        }
      }

      setDownloadProgress({ show: false, progress: 0, message: "" });
      const errorMsg = err.message || "Failed to download PDF.";
      setStatusWithTimeout(errorMsg);
      toastError("Download Failed", errorMsg);
    } finally {
      setIsDownloadingPdf(null);
    }
  };

  const handleDownloadInventoryPdf = async () => {
    if (!token) return;
    const downloadKey = `inventory:${selectedQrSeries || "all"}`;
    setIsDownloadingPdf(downloadKey);
    const selectedSeriesCount = getInventoryQrCountEstimate(selectedQrSeries);

    try {
      if (selectedSeriesCount >= CAMPAIGN_QR_CHUNK_DOWNLOAD_THRESHOLD) {
        await handleStartInventoryBulkExport();
        return;
      }

      await runDownloadWithProgress(
        () =>
          downloadVendorInventoryQrPdf(token, {
            seriesCode: selectedQrSeries || undefined,
            fast: 1,
          }),
        selectedQrSeries
          ? `Preparing ${selectedQrSeries} inventory PDF...`
          : "Preparing full inventory PDF...",
      );
      setStatusWithTimeout("Inventory QR PDF downloaded successfully.");
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      const errorMsg = err.message || "Failed to download inventory PDF.";
      setStatusWithTimeout(errorMsg);
      toastError("Download Failed", errorMsg);
    } finally {
      setIsDownloadingPdf(null);
    }
  };

  const handleDownloadBulkExportJob = async (
    job,
    { authToken = token, silent = false } = {},
  ) => {
    if (!authToken || !job?.id) return;

    setDownloadingBulkExportJobId(job.id);
    try {
      await downloadVendorBulkQrExport(authToken, job.id);

      if (!silent) {
        const label = job.scopeLabel || "QR export";
        setStatusWithTimeout(`${label} downloaded successfully.`);
        info("Bulk Export Downloaded", `${label} is now available offline.`);
      }

      await loadBulkExportJobs(authToken, {
        silent: true,
      });
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      if (!silent) {
        const errorMsg = err.message || "Failed to download bulk export.";
        setStatusWithTimeout(errorMsg);
        toastError("Download Failed", errorMsg);
      }
      throw err;
    } finally {
      setDownloadingBulkExportJobId("");
    }
  };

  const loadBulkExportJobs = async (
    authToken = token,
    { silent = false } = {},
  ) => {
    if (!authToken) return [];

    if (!silent) {
      setIsLoadingBulkExportJobs(true);
      setBulkExportJobsError("");
    }

    try {
      const data = await getVendorBulkQrExportJobs(authToken, { limit: 20 });
      const items = Array.isArray(data?.jobs)
        ? data.jobs
        : Array.isArray(data)
          ? data
          : [];
      setBulkExportJobs(items);

      // A successful fetch clears any lingering error (even from silent polls).
      setBulkExportJobsError("");

      return items;
    } catch (err) {
      if (handleVendorAccessError(err)) return [];
      if (!silent) {
        setBulkExportJobsError(err.message || "Unable to load export jobs.");
        toastError(
          "Export Queue Failed",
          err.message || "Unable to load export jobs.",
        );
      }
      return [];
    } finally {
      if (!silent) {
        setIsLoadingBulkExportJobs(false);
      }
    }
  };

  const startCampaignBulkExportJob = async (campaign) => {
    if (!token || !campaign?.id) return;

    const exportKey = `campaign:${campaign.id}`;
    setStartingBulkExportKey(exportKey);
    try {
      const payload =
        campaign.planType === "postpaid" && Number(campaign.qrsPerSheet) > 0
          ? {
              qrsPerSheet: Number(campaign.qrsPerSheet),
              qrLabelFormatVersion: QR_EXPORT_LABEL_FORMAT_VERSION,
            }
          : { qrLabelFormatVersion: QR_EXPORT_LABEL_FORMAT_VERSION };
      const response = await startCampaignBulkQrExport(
        token,
        campaign.id,
        payload,
      );
      const job = response?.job || response;
      if (job?.id) {
        setBulkExportJobs((prev) => [
          job,
          ...prev.filter((item) => item.id !== job.id),
        ]);
      }
      setStatusWithTimeout("Background campaign export started.");
      info(
        "Background Export Started",
        `${campaign.title} is being prepared in the background.`,
      );
      await loadBulkExportJobs(token, {
        silent: true,
      });
    } catch (err) {
      if (err?.status === 404 || err?.status === 501) {
        setBulkExportPrompt(null);
        await handleDownloadCampaignPdf(campaign);
        return;
      }
      if (handleVendorAccessError(err)) throw err;
      const errorMsg = err.message || "Failed to start campaign export.";
      setStatusWithTimeout(errorMsg);
      toastError("Export Failed", errorMsg);
      throw err;
    } finally {
      setStartingBulkExportKey("");
    }
  };

  const startInventoryBulkExportJob = async (seriesCode = selectedQrSeries) => {
    if (!token) return;

    const exportKey = `inventory:${seriesCode || "all"}`;
    setStartingBulkExportKey(exportKey);
    try {
      const response = await startVendorInventoryBulkQrExport(token, {
        seriesCode: seriesCode || undefined,
      });
      const job = response?.job || response;
      if (job?.id) {
        setBulkExportJobs((prev) => [
          job,
          ...prev.filter((item) => item.id !== job.id),
        ]);
      }
      setStatusWithTimeout("Background inventory export started.");
      info(
        "Background Export Started",
        seriesCode
          ? `${seriesCode} inventory export is running in the background.`
          : "Inventory export is running in the background.",
      );
      await loadBulkExportJobs(token, {
        silent: true,
      });
    } catch (err) {
      if (err?.status === 404 || err?.status === 501) {
        setBulkExportPrompt(null);
        await handleDownloadInventoryPdf();
        return;
      }
      if (handleVendorAccessError(err)) throw err;
      const errorMsg = err.message || "Failed to start inventory export.";
      setStatusWithTimeout(errorMsg);
      toastError("Export Failed", errorMsg);
      throw err;
    } finally {
      setStartingBulkExportKey("");
    }
  };

  const handleStartCampaignBulkExport = (campaign) => {
    if (!campaign?.id) return;

    const estimatedQrs = getCampaignQrCountEstimate(campaign);
    setBulkExportPrompt({
      kind: "campaign",
      campaign,
      title: "Start background QR export?",
      message: `${
        estimatedQrs > 0
          ? `${estimatedQrs.toLocaleString()} QR codes`
          : "This campaign"
      } will be queued and generated in the background. You can continue using the dashboard, and we will notify you when the file is ready to download.`,
      confirmText: "Start Export",
    });
  };

  const handleStartInventoryBulkExport = (
    seriesCode = selectedQrSeries || null,
  ) => {
    const estimatedQrs = getInventoryQrCountEstimate(seriesCode);
    const scopeLabel = seriesCode ? `series ${seriesCode}` : "all inventory";

    setBulkExportPrompt({
      kind: "inventory",
      seriesCode,
      title: "Start background inventory export?",
      message: `${
        estimatedQrs > 0
          ? `${estimatedQrs.toLocaleString()} inventory QR codes`
          : "The selected inventory"
      } from ${scopeLabel} will be packaged in the background. You can keep working while the export runs, and download will trigger when it is ready.`,
      confirmText: "Start Export",
    });
  };

  const handleCloseBulkExportPrompt = () => {
    if (isConfirmingBulkExport) return;
    setBulkExportPrompt(null);
  };

  const handleConfirmBulkExportPrompt = async () => {
    if (!bulkExportPrompt) return;

    setIsConfirmingBulkExport(true);
    try {
      if (bulkExportPrompt.kind === "campaign") {
        await startCampaignBulkExportJob(bulkExportPrompt.campaign);
      } else if (bulkExportPrompt.kind === "inventory") {
        await startInventoryBulkExportJob(bulkExportPrompt.seriesCode);
      }
      setBulkExportPrompt(null);
    } finally {
      setIsConfirmingBulkExport(false);
    }
  };

  const handleCancelExportJob = async (job) => {
    if (!token || !job?.id) return;
    if (
      !window.confirm("Are you sure you want to cancel this background export?")
    )
      return;

    setCancellingJobId(job.id);
    try {
      await cancelVendorBulkExportJob(token, job.id);
      success("Export Cancelled", "The background export was cancelled.");
      await loadBulkExportJobs(token, { silent: true });
    } catch (err) {
      console.error("Cancel API Error:", err);
      if (!handleVendorAccessError(err)) {
        toastError(
          "Failed to Cancel",
          err.message || "Could not cancel the export.",
        );
      }
    } finally {
      setCancellingJobId(null);
    }
  };

  const handleDeleteExportJob = async (job) => {
    if (!token || !job?.id) return;

    setDeletingExportJobId(job.id);
    try {
      await deleteVendorBulkExportJob(token, job.id);
    } catch (err) {
      // 404 means job already gone — treat as success and remove from UI
      if (
        !err?.message?.includes("404") &&
        !err?.message?.includes("not found")
      ) {
        console.error("Delete API Error:", err);
        if (!handleVendorAccessError(err)) {
          toastError(
            "Failed to Delete",
            err.message || "Could not delete the export record.",
          );
          setDeletingExportJobId(null);
          return;
        }
      }
    }
    // Remove from local list immediately, then refresh
    setBulkExportJobs((prev) => prev.filter((j) => j.id !== job.id));
    setDeletingExportJobId(null);
  };

  const clearSession = (message) => {
    localStorage.removeItem(VENDOR_TOKEN_KEY);
    setToken(null);
    setVendorInfo(null);
    setAuthStatus(message || "");
    setNotifications([]);
    setNotificationsError("");
    setIsLoadingNotifications(false);
    setIsNotificationsOpen(false);
    setBulkExportJobs([]);
    setBulkExportJobsError("");
    setIsLoadingBulkExportJobs(false);
    setStartingBulkExportKey("");
    setDownloadingBulkExportJobId("");
    setBulkExportPrompt(null);
    setIsConfirmingBulkExport(false);
    lastNotificationCountRef.current = null;
    setLastBatchSummary(null);
    setDeletingBatchKey(null);
    lastAutoFilledCashbackRef.current = null;
    setSelectedActiveCampaign(null);
    setCampaignQrBreakdownMap({});
    setLoadingCampaignBreakdownId("");
    setQrs([]);
    setQrTotal(0);
    setQrPage(1);
    setQrStatusCounts({});
    setQrHasMore(false);
    setOrders([]);
    setOrdersTotal(0);
    setOrdersPage(1);
    setOrderStatusCounts({});
    setOrdersHasMore(false);
    setTransactions([]);
    setTransactionsError("");
    setIsLoadingTransactions(false);
    setShowAllTransactions(false);
    setAccountProfile({
      name: "",
      email: "",
      username: "",
      phoneNumber: "",
    });
    setAccountStatus("");
    setAccountError("");
    setIsSavingAccount(false);
    setPasswordForm({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordStatus("");
    setPasswordError("");
    setIsChangingPassword(false);
    setShowOtpReset(false);
    setOtpReset({
      email: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
    });
    setOtpStatus("");
    setOtpError("");
    setIsSendingOtp(false);
    setIsResettingOtp(false);
  };

  const handleVendorAccessError = (err) => {
    if (err?.status === 401) {
      clearSession("Session expired.");
      return true;
    }
    if (err?.status === 403) {
      setAuthError(err.message || "Access denied.");
      return true;
    }
    return false;
  };

  const loadVendor = async (authToken) => {
    try {
      const data = await getMe(authToken);
      if (data?.role && data.role !== "vendor") {
        clearSession("This account is not a vendor.");
        setAuthError("This account is not a vendor.");
        return;
      }
      setVendorInfo(data);
    } catch (err) {
      if (err.status === 401) {
        clearSession("Session expired.");
      } else {
        setAuthError(err.message || "Unable to load vendor profile.");
      }
    }
  };

  const loadNotifications = async (authToken = token) => {
    if (!authToken) return;
    setIsLoadingNotifications(true);
    setNotificationsError("");
    try {
      const data = await getUserNotifications(authToken);
      const list = Array.isArray(data) ? data : data?.items || [];
      setNotifications(list);
      if (
        lastNotificationCountRef.current !== null &&
        list.length > lastNotificationCountRef.current
      ) {
        const diff = list.length - lastNotificationCountRef.current;
        const newest = list[0];
        const toastType = getToastTypeByNotification(newest.type);
        const toastTitle = diff === 1 ? newest.title : "New Notifications";
        const toastMsg =
          diff === 1
            ? newest.message
            : `${newest.title} (and ${diff - 1} more)`;

        if (toastType === "success") success(toastTitle, toastMsg);
        else if (toastType === "error") toastError(toastTitle, toastMsg);
        else if (toastType === "warning") info(toastTitle, toastMsg);
        else info(toastTitle, toastMsg);
      }
      lastNotificationCountRef.current = list.length;
    } catch (err) {
      if (err?.status === 401) {
        clearSession("Session expired.");
        return;
      }
      setNotificationsError(err.message || "Unable to load notifications.");
      toastError(
        "Notifications Failed",
        err.message || "Unable to load notifications.",
      );
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const handleNotificationRead = async (notification) => {
    if (!notification?.id || notification.isRead || !token) return;
    try {
      await markUserNotificationRead(token, notification.id);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, isRead: true } : item,
        ),
      );
    } catch (err) {
      toastError(
        "Notification Update Failed",
        err.message || "Unable to mark notification as read.",
      );
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!token) return;

    const unreadItems = notifications.filter(
      (item) => item?.id && !item.isRead,
    );
    if (!unreadItems.length) return;

    setIsMarkingNotificationsRead(true);
    setNotificationsError("");
    try {
      const results = await Promise.allSettled(
        unreadItems.map((item) => markUserNotificationRead(token, item.id)),
      );

      const successIds = new Set(
        unreadItems
          .filter((_, index) => results[index]?.status === "fulfilled")
          .map((item) => item.id),
      );
      const failedCount = unreadItems.length - successIds.size;

      if (successIds.size > 0) {
        setNotifications((prev) =>
          prev.map((item) =>
            successIds.has(item.id) ? { ...item, isRead: true } : item,
          ),
        );
        success(
          "Inbox Cleared",
          `Successfully marked ${successIds.size} ${
            successIds.size === 1 ? "notification" : "notifications"
          } as read.`,
        );
      }

      if (failedCount > 0) {
        toastError(
          "Some Notifications Failed",
          `${failedCount} notification${failedCount === 1 ? "" : "s"} could not be marked read.`,
        );
      }
    } catch (err) {
      toastError(
        "Notification Update Failed",
        err.message || "Unable to mark notifications as read.",
      );
    } finally {
      setIsMarkingNotificationsRead(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    await handleNotificationRead(notification);

    if (
      notification?.type === "bulk-export-ready" &&
      notification?.metadata?.jobId
    ) {
      const matchingJob = bulkExportJobs.find(
        (job) => job.id === notification.metadata.jobId,
      ) || {
        id: notification.metadata.jobId,
        scopeLabel: notification.title || "QR export",
      };
      try {
        await handleDownloadBulkExportJob(matchingJob);
      } catch {
        // Keep default navigation behavior if download fails.
      }
    }

    const metadataTab = notification?.metadata?.tab;
    let target = metadataTab ? `/vendor/${metadataTab}` : "/vendor/overview";
    switch (notification?.type) {
      case "qr-redeemed":
        target = "/vendor/customers";
        break;
      case "wallet-recharge":
      case "wallet-debit":
      case "wallet-adjustment":
        target = "/vendor/wallet";
        break;
      case "campaign-created":
      case "pdf-downloaded":
      case "bulk-export-started":
      case "bulk-export-ready":
      case "bulk-export-failed":
      case "campaign-activation-started":
      case "campaign-activation-ready":
      case "campaign-activation-failed":
        target = "/vendor/campaigns";
        break;
      default:
        break;
    }
    setIsNotificationsOpen(false);
    navigate(target);
  };

  const loadWallet = async (authToken = token) => {
    if (!authToken) return false;
    setIsLoadingWallet(true);
    setWalletError("");
    try {
      const data = await getVendorWallet(authToken);
      setWallet(data);
      return true;
    } catch (err) {
      if (handleVendorAccessError(err)) return false;
      if (err.status === 404) {
        setWallet(null);
      } else {
        setWalletError(err.message || "Unable to load wallet.");
      }
      return true;
    } finally {
      setIsLoadingWallet(false);
    }
  };

  const loadQrs = async (
    authToken = token,
    { page = 1, append = false } = {},
  ) => {
    if (!authToken) return;
    setIsLoadingQrs(true);
    setQrError("");
    const limit = 120;
    try {
      const data = await getVendorQrs(authToken, { page, limit });
      const items = Array.isArray(data)
        ? data
        : data?.items || data?.data || [];
      const total = Number.isFinite(data?.total) ? data.total : items.length;
      const statusCounts = data?.statusCounts || {};

      setQrs((prev) => {
        const updated = append ? [...prev, ...items] : items;
        setQrHasMore(updated.length < total);
        return updated;
      });
      setQrTotal(total);
      setQrPage(page);
      setQrStatusCounts(statusCounts);
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      if (err.status === 404) {
        setQrs([]);
        setQrTotal(0);
        setQrHasMore(false);
      } else {
        setQrError(err.message || "Unable to load QR inventory.");
      }
    } finally {
      setIsLoadingQrs(false);
    }
  };

  const loadCampaignQrBreakdown = async (campaign, authToken = token) => {
    const campaignId = campaign?.id;
    if (!authToken || !campaignId) return;

    const expectedTotalRaw = Number(
      campaignStatsMap[campaignId]?.totalQRsOrdered ??
        campaignStatsMap[`title:${campaign?.title}`]?.totalQRsOrdered,
    );
    const expectedTotal = Number.isFinite(expectedTotalRaw)
      ? Math.max(0, expectedTotalRaw)
      : 0;

    setLoadingCampaignBreakdownId(campaignId);

    try {
      const grouped = new Map();
      const limit = 200;
      let page = 1;
      let pages = 1;
      let matchedCount = 0;
      let safety = 0;

      while (page <= pages && safety < 150) {
        const data = await getVendorQrs(authToken, { page, limit });
        const items = Array.isArray(data)
          ? data
          : data?.items || data?.data || [];
        const total = Number.isFinite(Number(data?.total))
          ? Number(data.total)
          : items.length;
        pages = Number.isFinite(Number(data?.pages))
          ? Number(data.pages)
          : Math.max(1, Math.ceil(total / limit));

        items.forEach((qr) => {
          const qrCampaignId = qr?.Campaign?.id || qr?.campaignId || null;
          if (qrCampaignId !== campaignId) return;

          matchedCount += 1;
          const price = parseNumericValue(
            qr?.cashbackAmount,
            parseNumericValue(qr?.Campaign?.cashbackAmount, 0),
          );
          const key = price.toFixed(2);
          if (!grouped.has(key)) {
            grouped.set(key, {
              price,
              priceKey: key,
              quantity: 0,
              activeCount: 0,
              redeemedCount: 0,
            });
          }

          const group = grouped.get(key);
          group.quantity += 1;
          if (isRedeemedQrStatus(qr?.status)) {
            group.redeemedCount += 1;
          } else if (!isInactiveQrStatus(qr?.status)) {
            group.activeCount += 1;
          }
        });

        if (expectedTotal > 0 && matchedCount >= expectedTotal) {
          break;
        }
        if (items.length < limit) {
          break;
        }

        page += 1;
        safety += 1;
      }

      const priceGroups = Array.from(grouped.values()).sort(
        (a, b) => b.price - a.price,
      );

      setCampaignQrBreakdownMap((prev) => ({
        ...prev,
        [campaignId]: {
          priceGroups,
          matchedCount,
          complete: expectedTotal > 0 ? matchedCount >= expectedTotal : true,
          loadedAt: Date.now(),
        },
      }));
    } catch (err) {
      if (handleVendorAccessError(err)) return;
    } finally {
      setLoadingCampaignBreakdownId((prev) =>
        prev === campaignId ? "" : prev,
      );
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
      const data = await getVendorOrders(authToken, { page, limit });
      const items = Array.isArray(data)
        ? data
        : data?.items || data?.data || [];
      const total = Number.isFinite(data?.total) ? data.total : items.length;
      const statusCounts = data?.statusCounts || {};

      setOrders((prev) => {
        const updated = append ? [...prev, ...items] : items;
        setOrdersHasMore(updated.length < total);
        return updated;
      });
      setOrdersTotal(total);
      setOrdersPage(page);
      setOrderStatusCounts(statusCounts);
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      if (err.status === 404) {
        setOrders([]);
        setOrdersTotal(0);
        setOrdersHasMore(false);
      } else {
        setOrdersError(err.message || "Unable to load orders.");
      }
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const loadTransactions = async (authToken = token) => {
    if (!authToken) return;
    setIsLoadingTransactions(true);
    setTransactionsError("");
    try {
      const data = await getVendorTransactions(authToken);
      setTransactions(Array.isArray(data) ? data : data?.transactions || []);
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      if (err.status === 404) {
        setTransactions([]);
      } else {
        setTransactionsError(err.message || "Unable to load transactions.");
      }
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleWalletInvoiceDownload = async (invoiceId) => {
    if (!invoiceId) return;
    try {
      await downloadVendorInvoicePdf(token, invoiceId);
    } catch (err) {
      toastError("Download Failed", err.message || "Failed to download invoice.");
    }
  };

  const loadQrInventorySeries = async (authToken = token) => {
    if (!authToken) return;
    try {
      const data = await getVendorQrInventorySeries(authToken);
      setQrInventorySeries(Array.isArray(data?.series) ? data.series : []);
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      setQrInventorySeries([]);
    }
  };

  const buildExtraFilterParams = () => {
    const params = {};
    const activeClusterFilter = activeClusterFilterRef.current;
    if (dashboardFilters.dateFrom) params.dateFrom = dashboardFilters.dateFrom;
    if (dashboardFilters.dateTo) params.dateTo = dashboardFilters.dateTo;
    if (dashboardFilters.campaignId)
      params.campaignId = dashboardFilters.campaignId;
    if (activeClusterFilter?.customerIds) {
      params.customerIds = activeClusterFilter.customerIds;
      if (activeClusterFilter.selectedLocation) {
        params.selectedLocation = activeClusterFilter.selectedLocation;
      }
    } else {
      if (activeClusterFilter?.city) params.city = activeClusterFilter.city;
      if (activeClusterFilter?.state) params.state = activeClusterFilter.state;
      if (dashboardFilters.location) params.location = dashboardFilters.location.trim();
    }
    if (dashboardFilters.productId)
      params.productId = dashboardFilters.productId;
    if (dashboardFilters.mobile) params.mobile = dashboardFilters.mobile.trim();
    if (dashboardFilters.invoiceNo)
      params.invoiceNo = dashboardFilters.invoiceNo.trim();
    return params;
  };

  const buildLocationPointsFromRedemptions = (redemptions) => {
    const rows = Array.isArray(redemptions) ? redemptions : [];
    const grouped = new Map();

    rows.forEach((row) => {
      const lat = Number(row?.lat);
      const lng = Number(row?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const key = `${lat.toFixed(4)}:${lng.toFixed(4)}`;
      const prev = grouped.get(key) || {
        lat: Number(lat.toFixed(4)),
        lng: Number(lng.toFixed(4)),
        count: 0,
        totalAmount: 0,
        city: row?.city || null,
        state: row?.state || null,
      };

      prev.count += 1;
      prev.totalAmount = Number(
        (Number(prev.totalAmount || 0) + Number(row?.amount || 0)).toFixed(2),
      );
      grouped.set(key, prev);
    });

    return Array.from(grouped.values());
  };

  const buildCustomersFromRedemptions = (redemptions) => {
    const rows = Array.isArray(redemptions) ? redemptions : [];
    const grouped = new Map();

    rows.forEach((row) => {
      const customerId =
        row?.customer?.id || row?.userId || row?.customer?.phone || "unknown";
      const prev = grouped.get(customerId) || {
        userId: row?.customer?.id || null,
        name: row?.customer?.name || "Unknown",
        mobile: row?.customer?.phone || null,
        codeCount: 0,
        rewardsEarned: 0,
        firstScanLocation:
          [row?.city, row?.state, row?.pincode].filter(Boolean).join(", ") ||
          "-",
        memberSince: row?.createdAt || null,
        lastScanned: row?.createdAt || null,
      };

      prev.codeCount += 1;
      prev.rewardsEarned = Number(
        (Number(prev.rewardsEarned || 0) + Number(row?.amount || 0)).toFixed(2),
      );
      if (
        !prev.memberSince ||
        new Date(row?.createdAt) < new Date(prev.memberSince)
      ) {
        prev.memberSince = row?.createdAt || prev.memberSince;
      }
      if (
        !prev.lastScanned ||
        new Date(row?.createdAt) > new Date(prev.lastScanned)
      ) {
        prev.lastScanned = row?.createdAt || prev.lastScanned;
      }

      grouped.set(customerId, prev);
    });

    return Array.from(grouped.values()).sort(
      (a, b) => new Date(b.lastScanned || 0) - new Date(a.lastScanned || 0),
    );
  };

  // Location names are resolved by the authenticated API. Calling the public
  // geocoder from a browser causes CORS failures and rate-limit errors.
  const reverseGeocodePoints = async (points) => points;

  const inferNearbyLocationLabels = (points) => {
    const knownPoints = points.filter(
      (point) =>
        formatLocationLabel(point).toLowerCase() !== "unknown area" &&
        !isStateOnlyLocation(point),
    );
    if (knownPoints.length === 0) return points;

    const distanceInMeters = (a, b) => {
      const toRadians = (value) => (value * Math.PI) / 180;
      const earthRadius = 6371000;
      const lat1 = Number(a.lat);
      const lat2 = Number(b.lat);
      const dLat = toRadians(lat2 - lat1);
      const dLng = toRadians(Number(b.lng) - Number(a.lng));
      const distance =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
          Math.cos(toRadians(lat2)) *
          Math.sin(dLng / 2) ** 2;
      return 2 * earthRadius * Math.atan2(Math.sqrt(distance), Math.sqrt(1 - distance));
    };

    return points.map((point) => {
      if (
        formatLocationLabel(point).toLowerCase() !== "unknown area" &&
        !isStateOnlyLocation(point)
      ) {
        return point;
      }
      if (!Number.isFinite(Number(point.lat)) || !Number.isFinite(Number(point.lng))) {
        return point;
      }

      let nearest = null;
      let nearestDistance = Infinity;
      knownPoints.forEach((candidate) => {
        if (!Number.isFinite(Number(candidate.lat)) || !Number.isFinite(Number(candidate.lng))) {
          return;
        }
        const distance = distanceInMeters(point, candidate);
        if (distance < nearestDistance) {
          nearest = candidate;
          nearestDistance = distance;
        }
      });

      // GPS points within 2 km are treated as the same locality. This covers
      // legacy scans missing their address without guessing across a city.
      if (!nearest || nearestDistance > 2000) return point;
      return {
        ...point,
        city: nearest.city || "",
        state: nearest.state || "",
        pincode: nearest.pincode || "",
        displayName: formatLocationLabel(nearest),
      };
    });
  };
  const filterLocationPoints = (points, locationQuery) => {
    const needle = String(locationQuery || "").trim().toLowerCase();
    if (!needle) return points;

    return points.filter((point) =>
      formatLocationLabel(point).toLowerCase().includes(needle),
    );
  };

  const fetchLocationPoints = async (
    authToken = token,
    filtersOverride = null,
  ) => {
    const allFilters = filtersOverride || buildExtraFilterParams();
    // Free-text location is matched after reverse geocoding, not against the
    // raw database coordinates.
    const {
      city: filterCity,
      state: filterState,
      location: filterLocation,
      ...apiParams
    } = allFilters;

    try {
      const data = await getVendorRedemptionsMap(authToken, apiParams);
      let points = Array.isArray(data?.points) ? data.points : [];
      points = await reverseGeocodePoints(points);
      points = inferNearbyLocationLabels(points);

      if (filterCity || filterState) {
        const cityLower = (filterCity || "").toLowerCase();
        const stateLower = (filterState || "").toLowerCase();
        points = points.filter((p) => {
          const loc = [p.city, p.state]
            .filter(Boolean)
            .join(", ")
            .toLowerCase();
          if (cityLower && !loc.includes(cityLower)) return false;
          if (stateLower && !loc.includes(stateLower)) return false;
          return true;
        });
      }
      return filterLocationPoints(points, filterLocation);
    } catch (err) {
      if (err?.status !== 404) throw err;
      const fallback = await getVendorRedemptions(authToken, {
        ...apiParams,
        page: 1,
        limit: 200,
      });
      let points = buildLocationPointsFromRedemptions(fallback?.redemptions);
      points = await reverseGeocodePoints(points);
      points = inferNearbyLocationLabels(points);

      if (filterCity || filterState) {
        const cityLower = (filterCity || "").toLowerCase();
        const stateLower = (filterState || "").toLowerCase();
        points = points.filter((p) => {
          const loc = [p.city, p.state]
            .filter(Boolean)
            .join(", ")
            .toLowerCase();
          if (cityLower && !loc.includes(cityLower)) return false;
          if (stateLower && !loc.includes(stateLower)) return false;
          return true;
        });
      }
      return filterLocationPoints(points, filterLocation);
    }
  };

  const loadLocationsData = async (authToken = token) => {
    if (!authToken) return;
    setIsLoadingExtraTab(true);
    setExtraTabError("");
    try {
      const points = await fetchLocationPoints(authToken);
      setLocationsData(points);
      setOverviewLocationsError("");
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      setExtraTabError(err.message || "Unable to load locations.");
    } finally {
      setIsLoadingExtraTab(false);
    }
  };

  const loadOverviewLocationsPreview = async (
    authToken = token,
    filtersOverride = null,
  ) => {
    if (!authToken) return;
    setIsLoadingOverviewLocations(true);
    setOverviewLocationsError("");
    try {
      const points = await fetchLocationPoints(authToken, filtersOverride);
      setLocationsData(points);
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      setOverviewLocationsError(
        err.message || "Unable to load location analytics preview.",
      );
    } finally {
      setIsLoadingOverviewLocations(false);
    }
  };

  const loadCustomersData = async (authToken = token, filtersOverride = null) => {
    if (!authToken) return;
    setIsLoadingExtraTab(true);
    setExtraTabError("");
    try {
      const allFilters = filtersOverride || buildExtraFilterParams();

      // Pass all filters to the backend — it handles city/state filtering post-processing
      const custResult = await getVendorCustomers(authToken, allFilters);
      let customers = Array.isArray(custResult?.customers)
        ? custResult.customers
        : [];

      setCustomersData(customers);
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      setExtraTabError(err.message || "Unable to load customers.");
    } finally {
      setIsLoadingExtraTab(false);
    }
  };

  const loadInvoicesData = async (authToken = token) => {
    if (!authToken) return;
    setIsLoadingExtraTab(true);
    setExtraTabError("");
    try {
      const data = await getVendorInvoices(authToken, buildExtraFilterParams());
      setInvoicesData(Array.isArray(data?.invoices) ? data.invoices : []);
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      if (err?.status === 404) {
        setInvoicesData([]);
        setExtraTabError("");
        return;
      }
      setExtraTabError(err.message || "Unable to load invoices.");
    } finally {
      setIsLoadingExtraTab(false);
    }
  };

  const loadExtraTabData = async (authToken = token) => {
    if (!authToken) return;
    if (displayTab === "locations") {
      await loadLocationsData(authToken);
      return;
    }
    if (displayTab === "customers") {
      await loadCustomersData(authToken);
      return;
    }
    if (displayTab === "billing") {
      await loadInvoicesData(authToken);
      return;
    }
  };

  const handleClusterClick = (cluster) => {
    const customerIds = Array.isArray(cluster?.customerIds)
      ? cluster.customerIds.filter(Boolean).map((id) => String(id))
      : cluster?.customerIds instanceof Set
        ? Array.from(cluster.customerIds).filter(Boolean).map((id) => String(id))
        : [];
    const city = String(cluster?.city || "").trim();
    const state = String(cluster?.state || "").trim();
    const locationLabel = formatLocationLabel(cluster);
    const activeFilter = {
      customerIds: customerIds.length ? customerIds.join(",") : "",
      selectedLocation: locationLabel,
      city,
      state,
    };
    activeClusterFilterRef.current = activeFilter;
    setDashboardFilters((prev) => ({
      ...prev,
      location: locationLabel,
      mobile: "",
    }));
    setClusterCityFilter(locationLabel);
    setClusterLocationFilter(activeFilter);
    // Navigate in the same update as the ID filter. The customer-tab effect
    // performs the request after the route has changed.
    navigate("/vendor/customers" );
  };

  const handleClearClusterFilter = async () => {
    activeClusterFilterRef.current = null;
    setClusterCityFilter(null);
    setClusterLocationFilter(null);
    setDashboardFilters((prev) => ({ ...prev, location: "" }));
    if (token) {
      await loadCustomersData(token, {
        dateFrom: dashboardFilters.dateFrom,
        dateTo: dashboardFilters.dateTo,
        campaignId: dashboardFilters.campaignId,
        location: "",
        productId: dashboardFilters.productId,
        mobile: dashboardFilters.mobile.trim(),
        invoiceNo: dashboardFilters.invoiceNo.trim(),
      });
    }
  };

  const loadCompanyProfile = async (authToken = token) => {
    if (!authToken) return;
    setRegistrationError("");
    try {
      const data = await getVendorProfile(authToken);
      setCompanyProfile({
        businessName: data.businessName || "",
        contactPhone: data.contactPhone || accountProfile.phoneNumber || "",
        contactEmail: data.contactEmail || accountProfile.email || "",
        gstin: data.gstin || "",
        address: data.address || "",
        designation: data.designation || "",
        alternatePhone: data.alternatePhone || "",
        city: data.city || "",
        state: data.state || "",
        pincode: data.pincode || "",
      });
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      if (err.status === 404) {
        setCompanyProfile({
          businessName: "",
          contactPhone: accountProfile.phoneNumber || "",
          contactEmail: accountProfile.email || "",
          gstin: "",
          address: "",
          designation: "",
          alternatePhone: "",
          city: "",
          state: "",
          pincode: "",
        });
      } else {
        setRegistrationError(err.message || "Unable to load company profile.");
      }
    }
  };

  const loadBrandProfile = async (authToken = token) => {
    if (!authToken) return;
    setRegistrationError("");
    try {
      const data = await getVendorBrand(authToken);
      setBrandProfile({
        id: data.id || "",
        name: data.name || "",
        logoUrl: data.logoUrl || "",
        website: data.website || "",
        qrPricePerUnit:
          data.qrPricePerUnit !== undefined && data.qrPricePerUnit !== null
            ? Number(data.qrPricePerUnit)
            : "",
        defaultPlanType: data.defaultPlanType || "prepaid",
      });
      if (data.defaultPlanType) {
        localStorage.setItem(VENDOR_PLAN_TYPE_KEY, data.defaultPlanType);
      }
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      if (err.status === 404) {
        setBrandProfile({
          id: "",
          name: "",
          logoUrl: "",
          website: "",
          qrPricePerUnit: "",
          defaultPlanType: "prepaid",
        });
      } else {
        setRegistrationError(err.message || "Unable to load brand profile.");
      }
    }
  };

  const loadCampaigns = async (authToken = token) => {
    if (!authToken) return;
    setCampaignError("");
    try {
      const data = await getVendorCampaigns(authToken);
      setCampaigns(Array.isArray(data) ? data : []);
      setCampaignsLoaded(true);
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      if (err.status === 404) {
        setCampaigns([]);
      } else {
        setCampaignError(err.message || "Unable to load campaigns.");
      }
      setCampaignsLoaded(true);
    }
  };

  const loadCampaignStats = async (authToken = token) => {
    if (!authToken) return;
    try {
      const data = await getVendorCampaignStats(authToken);
      const statsList = Array.isArray(data) ? data : [];
      const map = {};
      statsList.forEach((stat) => {
        if (stat?.id) {
          map[stat.id] = stat;
        }
        if (stat?.campaign) {
          map[`title:${stat.campaign}`] = stat;
        }
      });
      setCampaignStatsMap(map);
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      // Keep stats map as-is on failure
    }
  };

  const loadRecentRedemptions = async (authToken = token, params = {}) => {
    if (!authToken) return;
    setIsLoadingRecentRedemptions(true);
    setRecentRedemptionsError("");

    const currentCampaignId = overviewCampaignIdRef.current;
    const requestParams = {
      page: 1,
      limit: 10,
      type: "redeem_success",
      campaignId:
        currentCampaignId === "all" || currentCampaignId === "unassigned"
          ? undefined
          : currentCampaignId,
      ...params,
    };

    try {
      const data = await getVendorRedemptions(authToken, requestParams);
      setRecentRedemptions(
        Array.isArray(data?.redemptions) ? data.redemptions : [],
      );
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      setRecentRedemptions([]);
      setRecentRedemptionsError(
        err.message || "Unable to load recent redemptions.",
      );
    } finally {
      setIsLoadingRecentRedemptions(false);
    }
  };

  const buildTrendFromRedemptions = (redemptions = [], from, to) => {
    const fromDate = from ? parseISO(from) : null;
    const toDate = to ? parseISO(to) : null;

    if (toDate && !Number.isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
    }

    const trendMap = new Map();

    redemptions.forEach((redemption) => {
      const rawDate =
        redemption?.createdAt ||
        redemption?.capturedAt ||
        redemption?.redeemedAt;
      if (!rawDate) return;

      const date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) return;
      if (fromDate && !Number.isNaN(fromDate.getTime()) && date < fromDate) {
        return;
      }
      if (toDate && !Number.isNaN(toDate.getTime()) && date > toDate) {
        return;
      }

      const key = format(date, "yyyy-MM-dd");
      trendMap.set(key, (trendMap.get(key) || 0) + 1);
    });

    return Array.from(trendMap.entries())
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([date, count]) => ({ date, count }));
  };

  const fetchRedemptionTrendFallback = async (
    authToken = token,
    params = {},
  ) => {
    const collected = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await getVendorRedemptions(authToken, {
        ...params,
        type: "redeem_success",
        page,
        limit: 200,
      });

      const pageItems = Array.isArray(response?.redemptions)
        ? response.redemptions
        : [];
      collected.push(...pageItems);

      const nextTotalPages = Number(response?.pagination?.totalPages) || 1;
      totalPages = Math.min(nextTotalPages, 50);
      if (!pageItems.length) break;
      page += 1;
    } while (page <= totalPages);

    return buildTrendFromRedemptions(
      collected,
      params.from || params.dateFrom,
      params.to || params.dateTo,
    );
  };

  const loadRedemptionTrend = async (authToken = token, params = {}) => {
    if (!authToken) return;
    setIsLoadingRedemptionTrend(true);
    setRedemptionTrendError("");
    const currentFilter = dateFilterRef.current;
    const currentCampaignId = overviewCampaignIdRef.current;
    const requestParams = {
      campaignId: currentCampaignId === "all" ? undefined : currentCampaignId,
      from: currentFilter.from,
      to: currentFilter.to,
      ...params,
    };
    try {
      const data = await getVendorSummaryAnalytics(authToken, requestParams);
      const apiTrend = Array.isArray(data?.trend) ? data.trend : [];

      if (apiTrend.length > 0) {
        setRedemptionTrend(apiTrend);
        return;
      }

      const fallbackTrend = await fetchRedemptionTrendFallback(
        authToken,
        requestParams,
      );
      setRedemptionTrend(fallbackTrend);
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      try {
        const fallbackTrend = await fetchRedemptionTrendFallback(
          authToken,
          requestParams,
        );
        setRedemptionTrend(fallbackTrend);
        if (fallbackTrend.length === 0) {
          setRedemptionTrendError(err.message || "Failed to load trend data.");
        }
      } catch (fallbackErr) {
        setRedemptionTrend([]);
        setRedemptionTrendError(
          fallbackErr.message || err.message || "Failed to load trend data.",
        );
      }
    } finally {
      setIsLoadingRedemptionTrend(false);
    }
  };

  const refreshCampaignPaymentState = (
    authToken = token,
    { includeQrs = true, includeOrders = false } = {},
  ) => {
    if (!authToken) return;

    const tasks = [
      loadWallet(authToken),
      loadTransactions(authToken),
      loadCampaigns(authToken),
      loadCampaignStats(authToken),
      loadRedemptionTrend(authToken),
      loadRecentRedemptions(authToken),
      loadQrInventorySeries(authToken),
      loadNotifications(authToken),
    ];

    if (includeQrs) {
      tasks.push(loadQrs(authToken, { page: 1, append: false }));
    }

    if (includeOrders) {
      tasks.push(loadOrders(authToken, { page: 1, append: false }));
    }

    void Promise.allSettled(tasks);
  };

  const loadProducts = async (authToken = token) => {
    if (!authToken) return;
    setIsLoadingProducts(true);
    setProductError("");
    try {
      const data = await getVendorProducts(authToken);
      setProducts(Array.isArray(data) ? data : []);
      setFailedProductImages(new Set());
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      if (err.status === 404) {
        setProducts([]);
      } else {
        setProductError(err.message || "Unable to load products.");
      }
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleSaveProduct = async (formData) => {
    if (!token) return;

    setIsSavingProduct(true);
    setProductError("");
    setProductStatus("");

    try {
      const payload = { ...formData };
      const imageFile = payload.imageFile;
      delete payload.imageFile;
      payload.sku =
        typeof payload.sku === "string" ? payload.sku.trim() || null : null;
      payload.mrp =
        payload.mrp === undefined || payload.mrp === null || payload.mrp === ""
          ? null
          : Number(payload.mrp);
      payload.packSize =
        typeof payload.packSize === "string"
          ? payload.packSize.trim() || null
          : null;
      payload.warranty =
        typeof payload.warranty === "string"
          ? payload.warranty.trim() || null
          : null;

      if (imageFile) {
        setIsUploadingProductImage(true);
        setProductImageUploadStatus("");
        setProductImageUploadError("");
        try {
          const uploadResult = await uploadImage(token, imageFile);
          const uploadedUrl = uploadResult?.url;
          if (!uploadedUrl) {
            throw new Error("Image upload failed. No URL returned.");
          }
          payload.imageUrl = uploadedUrl;
          setProductImageUploadStatus("Image uploaded.");
        } catch (uploadErr) {
          setProductImageUploadError(
            uploadErr.message || "Failed to upload image.",
          );
          throw uploadErr;
        } finally {
          setIsUploadingProductImage(false);
        }
      }

      if (editingProduct?.id) {
        // Update existing product
        await updateVendorProduct(token, editingProduct.id, payload);
        setProductStatus("Product updated successfully!");
      } else {
        if (!payload.brandId) {
          let effectiveBrandId = brandProfile?.id || null;
          if (!effectiveBrandId) {
            try {
              const brand = await getVendorBrand(token);
              effectiveBrandId = brand?.id || null;
            } catch (brandErr) {
              if (handleVendorAccessError(brandErr)) return;
              setProductError(
                "No brand is assigned yet. Please contact the admin.",
              );
              setIsSavingProduct(false);
              return;
            }
          }
          if (!effectiveBrandId) {
            setProductError(
              "No brand is assigned yet. Please contact the admin.",
            );
            setIsSavingProduct(false);
            return;
          }
          payload.brandId = effectiveBrandId;
        }
        // Add new product
        const newProduct = await addVendorProduct(token, payload);
        const newProductId = newProduct?.id || newProduct?.data?.id;

        setProductStatus("Product added successfully!");

        // Refresh product list
        await loadProducts();

        // Auto-select the new product if context exists
        if (newProductId) {
          if (productModalContext === "campaign") {
            setCampaignForm((prev) => ({ ...prev, productId: newProductId }));
          } else if (productModalContext === "qr") {
            setSelectedQrProduct(newProductId);
          }
        }
      }

      // Refresh product list
      if (!editingProduct?.id) {
        // already handled above for new products to ensure timing
      } else {
        await loadProducts();
      }

      // Close modal
      setShowProductModal(false);
      setEditingProduct(null);
      setProductModalContext(null);

      // Clear status after 3 seconds
      setTimeout(() => setProductStatus(""), 3000);
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      setProductError(err.message || "Failed to save product.");
      setTimeout(() => setProductError(""), 3000);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!token || !productId) return;

    if (
      !window.confirm(
        "Delete this product and all its campaigns/QRs? This action cannot be undone.",
      )
    ) {
      return;
    }

    setProductError("");
    setProductStatus("");

    try {
      await deleteVendorProduct(token, productId);
      setProductStatus(
        "Product and associated campaigns deleted successfully!",
      );

      // Reset selected campaign state (campaigns may have been deleted)
      setSelectedPendingCampaign(null);
      setSelectedActiveCampaign(null);

      // Refresh all related data
      await Promise.all([
        loadProducts(),
        loadCampaigns(token),
        loadCampaignStats(token),
        loadQrs(token, { page: 1, append: false }),
        loadOrders(token, { page: 1, append: false }),
      ]);

      // Clear status after 3 seconds
      setTimeout(() => setProductStatus(""), 3000);
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      setProductError(err.message || "Failed to delete product.");
      setTimeout(() => setProductError(""), 3000);
    }
  };

  useEffect(() => {
    if (vendorInfo?.id && Array.isArray(campaigns) && campaignsLoaded) {
      const storageKey = `hasSeenWelcome_${vendorInfo.id}`;
      const hasSeen = localStorage.getItem(storageKey);
      if (!hasSeen && campaigns.length === 0) {
        setShowWelcomeModal(true);
      }
    }
  }, [vendorInfo, campaigns, campaignsLoaded]);

  useEffect(() => {
    if (!token) return;
    const initializeVendorData = async () => {
      await loadVendor(token);
      const canContinue = await loadWallet(token);
      if (!canContinue) return;
      await Promise.all([
        loadQrs(token),
        loadQrInventorySeries(token),
        loadOrders(token),
        loadTransactions(token),
        loadCompanyProfile(token),
        loadBrandProfile(token),
        loadCampaigns(token),
        loadCampaignStats(token),
        loadRecentRedemptions(token),
        loadProducts(token),
      ]);
    };
    initializeVendorData();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (activeTab === "wallet") {
      loadWallet(token);
      loadTransactions(token);
      return;
    }
    if (
      activeTab !== "locations" &&
      activeTab !== "customers" &&
      activeTab !== "billing"
    ) {
      return;
    }
    loadExtraTabData(token);
  }, [token, activeTab]);

  useEffect(() => {
    if (!token || activeTab !== "overview") return;
    const overviewFilters =
      overviewCampaignId === "all" || overviewCampaignId === "unassigned"
        ? {}
        : { campaignId: overviewCampaignId };
    loadOverviewLocationsPreview(token, overviewFilters);
  }, [token, activeTab, overviewCampaignId]);

  useEffect(() => {
    if (!token) return;
    loadNotifications(token);
    const interval = setInterval(() => {
      loadNotifications(token);
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadBulkExportJobs(token);
    const interval = setInterval(() => {
      loadBulkExportJobs(token, { silent: true });
    }, BULK_EXPORT_JOB_POLL_MS);
    return () => clearInterval(interval);
  }, [token]);

  // Dashboard Auto-Refresh Polling
  useEffect(() => {
    if (!token || activeTab !== "overview") return;
    const interval = setInterval(() => {
      refreshCampaignPaymentState(token, {
        includeQrs: true,
        includeOrders: true,
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [token, activeTab]);

  useEffect(() => {
    if (!isNotificationsOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsNotificationsOpen(false);
      }
    };

    const handleClickOutside = (event) => {
      if (
        notificationsDropdownRef.current?.contains(event.target) ||
        notificationsTriggerRef.current?.contains(event.target)
      ) {
        return;
      }
      setIsNotificationsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (!vendorInfo) return;
    setAccountProfile({
      name: vendorInfo.name || "",
      email: vendorInfo.email || "",
      username: vendorInfo.username || "",
      phoneNumber: vendorInfo.phoneNumber || "",
    });
    setOtpReset((prev) => ({
      ...prev,
      email: vendorInfo.email || prev.email || "",
    }));
  }, [vendorInfo]);

  useEffect(() => {
    const companyUpdates = {};
    if (accountProfile.email && !companyProfile.contactEmail) {
      companyUpdates.contactEmail = accountProfile.email;
    }
    if (accountProfile.phoneNumber && !companyProfile.contactPhone) {
      companyUpdates.contactPhone = accountProfile.phoneNumber;
    }

    if (Object.keys(companyUpdates).length > 0) {
      setCompanyProfile((prev) => ({
        ...prev,
        ...companyUpdates,
      }));
    }
  }, [
    accountProfile.email,
    accountProfile.phoneNumber,
    companyProfile.contactEmail,
    companyProfile.contactPhone,
  ]);

  useEffect(() => {
    setImageLoadError(false);
  }, [brandProfile.logoUrl]);

  useEffect(() => {
    if (!selectedCampaign) {
      return;
    }

    const cashbackValue =
      effectiveCampaignCashback > 0 ? String(effectiveCampaignCashback) : "";

    setQrRows((prev) => {
      if (!prev.length) return prev;
      const [first, ...rest] = prev;
      const firstValueRaw = String(first.cashbackAmount || "").trim();
      const firstValue = parseNumericValue(first.cashbackAmount, 0);
      const autoFillValue = lastAutoFilledCashbackRef.current;
      const shouldReplace =
        !firstValueRaw ||
        (autoFillValue !== null && firstValue === autoFillValue);

      if (!shouldReplace || !cashbackValue) {
        return prev;
      }

      lastAutoFilledCashbackRef.current = parseNumericValue(cashbackValue, 0);
      return [{ ...first, cashbackAmount: cashbackValue }, ...rest];
    });
  }, [selectedCampaign, effectiveCampaignCashback]);

  // Sync brand's default plan type into campaign creation form
  useEffect(() => {
    if (brandProfile.defaultPlanType) {
      setCampaignForm((prev) => ({
        ...prev,
        planType: brandProfile.defaultPlanType,
      }));
    }
  }, [brandProfile.defaultPlanType]);

  // Scroll to top on route/tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });

    // Auto-fill wallet recharge if redirected with a shortfall
    if (displayTab === "wallet" && lastAutoFilledCashbackRef.current !== null) {
      const shortfall = lastAutoFilledCashbackRef.current;
      if (typeof shortfall === "number" && shortfall > 0) {
        setRechargeAmount(String(Math.ceil(shortfall)));
      }
    }
  }, [activeTab]);

  // Load customers after entering their tab. Other filter updates are applied
  // explicitly by the Apply action, avoiding request races while typing.
  useEffect(() => {
    if (displayTab === "customers" && token) {
      loadCustomersData(token, buildExtraFilterParams());
    }
  }, [activeTab, token]);

  const handleSignIn = async () => {
    const identifier = email.trim();
    if (!identifier || !password) {
      setAuthError("Enter email/username and password to continue.");
      return;
    }
    setAuthError("");
    setAuthStatus("");
    setIsSigningIn(true);
    try {
      const normalizedEmail = identifier.toLowerCase();
      const isEmail = normalizedEmail.includes("@");
      const data = await loginWithEmail(
        isEmail ? normalizedEmail : undefined,
        password,
        isEmail ? undefined : identifier,
      );
      if (data.role !== "vendor") {
        throw new Error("This account is not a vendor.");
      }
      localStorage.setItem(VENDOR_TOKEN_KEY, data.token);
      setToken(data.token);
      setVendorInfo({ name: data.name, email: data.email, role: data.role });
      setEmail("");
      setPassword("");
      setAuthStatus("Signed in successfully.");
    } catch (err) {
      const msg = err.message || "";
      if (
        msg.toLowerCase().includes("credentials") ||
        msg.toLowerCase().includes("invalid")
      ) {
        setAuthError("Invalid email ID or password");
      } else {
        setAuthError(msg || "Sign in failed.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = () => {
    clearSession("Signed out.");
    setWallet(null);
    setQrs([]);
    setOrders([]);
    setCompanyProfile({
      businessName: "",
      contactPhone: "",
      contactEmail: "",
      gstin: "",
      address: "",
      designation: "",
      alternatePhone: "",
      city: "",
      state: "",
      pincode: "",
    });
    setBrandProfile({
      id: "",
      name: "",
      logoUrl: "",
      website: "",
      qrPricePerUnit: "",
    });
    setAccountProfile({
      name: "",
      email: "",
      username: "",
      phoneNumber: "",
    });
    setAccountStatus("");
    setAccountError("");
    setIsSavingAccount(false);
    setPasswordForm({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordStatus("");
    setPasswordError("");
    setIsChangingPassword(false);
    setShowOtpReset(false);
    setOtpReset({
      email: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
    });
    setOtpStatus("");
    setOtpError("");
    setIsSendingOtp(false);
    setIsResettingOtp(false);
    setCampaigns([]);
    setCampaignsLoaded(false);
    setCampaignId("");
    setLastBatchSummary(null);
    setSelectedQrSeries("");
    setQrInventorySeries([]);
    setDashboardFilters({
      dateFrom: "",
      dateTo: "",
      campaignId: "",
      city: "",
      mobile: "",
      invoiceNo: "",
    });
    setLocationsData([]);
    setCustomersData([]);
    setInvoicesData([]);
    setIsLoadingExtraTab(false);
    setExtraTabError("");
    setInvoiceShareStatus("");
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const initiateRazorpayPayment = async (amount, description, onSuccess) => {
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error(
          "Razorpay SDK failed to load. Check your internet connection.",
        );
      }

      const razorpayConfig = await getRazorpayConfig(token);
      const razorpayKeyId = String(razorpayConfig?.keyId || "").trim();
      if (!razorpayKeyId) {
        throw new Error("Razorpay key is missing on the backend.");
      }

      const order = await createPaymentOrder(token, amount);
      if (!order || !order.id) {
        throw new Error("Failed to create payment order.");
      }

      let checkoutResponseReceived = false;
      let paymentFinished = false;
      let settlePayment;
      const paymentResult = new Promise((resolve) => {
        settlePayment = resolve;
      });

      const finishPayment = (result) => {
        if (paymentFinished) return;
        paymentFinished = true;
        settlePayment(result);
      };

      const options = {
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: "GoHype",
        description: description || "Payment",
        order_id: order.id,
        handler: async function (response) {
          checkoutResponseReceived = true;
          let verification;
          try {
            verification = await verifyPayment(token, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          } catch (verifyErr) {
            const message = verifyErr.message || "Payment verification failed.";
            setWalletError(message);
            finishPayment({ success: false, error: message });
            return;
          }

          if (!verification?.success) {
            const message =
              verification?.message || "Payment verification failed.";
            setWalletError(message);
            finishPayment({ success: false, error: message });
            return;
          }

          try {
            await loadWallet();
            await loadTransactions();
            if (onSuccess) await onSuccess();
            finishPayment({ success: true });
          } catch {
            const message =
              "Payment was verified, but the wallet balance could not refresh. Please reload the page.";
            setWalletStatus(message);
            finishPayment({ success: true, warning: message });
          }
        },
        prefill: {
          name: vendorInfo?.name || "",
          email: vendorInfo?.email || "",
          contact: "",
        },
        theme: {
          color: "#10B981",
        },
        modal: {
          ondismiss: () => {
            if (!checkoutResponseReceived) {
              setWalletStatus("Payment was cancelled before completion.");
              finishPayment({ success: false, cancelled: true });
            }
          },
        },
      };

      if (!options.key) {
        throw new Error("Razorpay key is missing on the backend.");
      }

      const rzp1 = new window.Razorpay(options);
      rzp1.on("payment.failed", function (response) {
        checkoutResponseReceived = true;
        const message = response.error?.description || "Payment failed.";
        setWalletError(message);
        finishPayment({ success: false, error: message });
      });
      rzp1.open();
      return paymentResult;
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      const message = err.message || "Payment initialization failed.";
      setWalletError(message);
      return { success: false, error: message };
    }
  };

  const handleRecharge = async () => {
    const amountValue = parseFloat(rechargeAmount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setWalletError("Enter a valid recharge amount.");
      return;
    }
    setIsRecharging(true);
    setWalletError("");
    setWalletStatus("");

    try {
      await initiateRazorpayPayment(amountValue, "Wallet Recharge", () => {
        setWalletStatus("Wallet recharged successfully.");
        setRechargeAmount("");
      });
    } finally {
      setIsRecharging(false);
    }
  };

  // Re-implementing handleRecharge to be cleaner with the async flow
  // The initiateRazorpayPayment is async but the payment itself is user-driven.
  // So validation happens synchronously-ish.

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    campaign: null,
    voucherType: "digital_voucher",
    voucherDesignUrl: "assured_gift_card_placeholder.png",
    voucherHeading: "THANK YOU FOR SHOPPING WITH US.",
    voucherSubtext:
      "Scan the QR code below and receive your assured cashback reward.",
    voucherExtraText: "",
    rows: [],
  });

  const handlePayCampaign = (campaign) => {
    if (!campaign) return;

    const initialRows =
      campaign.allocations && campaign.allocations.length > 0
        ? campaign.allocations.map((a) => ({
            ...a,
            id: Date.now() + Math.random(),
          }))
        : [
            {
              id: Date.now(),
              cashbackAmount: String(campaign.cashbackAmount ?? ""),
              quantity: "",
            },
          ];

    setPaymentForm({
      campaign,
      voucherType: "digital_voucher",
      voucherDesignUrl: "assured_gift_card_placeholder.png",
      voucherHeading: "THANK YOU FOR SHOPPING WITH US.",
      voucherSubtext:
        "Scan the QR code below and receive your assured cashback reward.",
      voucherExtraText: "",
      rows: initialRows,
    });
    setCampaignError("");
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    const { campaign, voucherType, rows } = paymentForm;
    if (!campaign || isPayingCampaign) return;

    // Validate rows
    // Validate rows
    const validRows = rows.filter((r) => {
      const qty = parseNumericValue(r.quantity);
      const cb = parseNumericValue(r.cashbackAmount);
      if (qty <= 0) return false;
      // Postpaid can have 0 cashback (paid later)
      if (campaign.planType === "postpaid") return true;
      return cb > 0;
    });

    if (validRows.length === 0) {
      setCampaignError(
        "Please add at least one valid allocation (Quantity > 0). For prepaid, Cashback must be > 0.",
      );
      return;
    }

    setIsPayingCampaign(true);
    setCampaignError("");

    try {
      const resolvedVoucherType = voucherType || campaign.voucherType || "none";
      const paymentRows = validRows.map((r) => ({
        cashbackAmount: parseNumericValue(r.cashbackAmount),
        quantity: parseNumericValue(r.quantity),
        totalBudget:
          parseNumericValue(r.cashbackAmount) * parseNumericValue(r.quantity),
      }));

      // Calculate total cost client-side
      const voucherCost = VOUCHER_COST_MAP[resolvedVoucherType] || 0;

      // Get base rates
      const qrBaseRate = resolveLiveTechFeePerQr(brandProfile?.qrPricePerUnit);

      const totalCost = validRows.reduce((sum, row) => {
        const cb = parseNumericValue(row.cashbackAmount);
        const qty = parseNumericValue(row.quantity);
        const isPostpaid = campaign.planType === "postpaid";
        const budget = isPostpaid ? 0 : cb * qty;

        // Fees calculation
        const vCost = voucherCost * qty * (1 + CAMPAIGN_FEE_GST_RATE);
        const qrGenCost = qrBaseRate * qty * (1 + CAMPAIGN_FEE_GST_RATE);

        return sum + budget + vCost + qrGenCost;
      }, 0);

      const currentBalance = parseNumericValue(
        wallet?.availableBalance,
        parseNumericValue(wallet?.balance, 0) -
          parseNumericValue(wallet?.lockedBalance, 0),
      );

      if (currentBalance < totalCost) {
        const shortfall = Math.max(totalCost - currentBalance, 0);
        // Pre-fill the top-up amount
        lastAutoFilledCashbackRef.current = shortfall;
        // Close modal and redirect to wallet
        setShowPaymentModal(false);
        setCampaignError("");
        setIsPayingCampaign(false);
        navigate("/vendor/wallet");
        setTimeout(() => {
          info(
            "Insufficient Balance",
            `Please add INR ${formatAmount(shortfall)} to your wallet to activate this campaign.`,
          );
        }, 300);
        return;
      }

      await payVendorCampaign(token, campaign.id, {
        voucherType: resolvedVoucherType,
        allocations: paymentRows,
        voucherDesignUrl: paymentForm.voucherDesignUrl,
        voucherHeading: paymentForm.voucherHeading,
        voucherSubtext: paymentForm.voucherSubtext,
        voucherExtraText: paymentForm.voucherExtraText,
      });

      setCampaignStatusWithTimeout("Campaign paid and activated!");
      setSelectedPendingCampaign(null);
      setShowPaymentModal(false);
      setCampaignTab("active");
      refreshCampaignPaymentState(token, {
        includeQrs: true,
      });

      openSuccessModal(
        "Campaign Activated",
        "Payment successful. Your campaign is now active.",
      );
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      const requiredAmount = parseNumericValue(err?.data?.required, NaN);
      const availableAmount = parseNumericValue(err?.data?.available, NaN);
      if (Number.isFinite(requiredAmount) && Number.isFinite(availableAmount)) {
        const shortfall = Math.max(requiredAmount - availableAmount, 0);
        setCampaignError(
          `Insufficient wallet balance. Add INR ${shortfall.toFixed(2)} in Wallet before activating this campaign.`,
        );
        return;
      }
      setCampaignError(err.message || "Payment flow failed.");
    } finally {
      setIsPayingCampaign(false);
    }
  };

  const updateCampaignStatus = async (
    campaign,
    nextStatus,
    successTitle,
    successMessage,
  ) => {
    if (!campaign?.id || !token || deletingCampaignId) return;
    setDeletingCampaignId(campaign.id);
    setCampaignError("");
    setCampaignStatus("");

    try {
      const result = await updateVendorCampaignStatus(
        token,
        campaign.id,
        nextStatus,
      );
      const updatedCampaign = result?.campaign;
      const statusMessage =
        nextStatus === "paused" ? "Campaign put on hold." : "Campaign resumed.";
      setCampaignStatusWithTimeout(statusMessage);
      setCampaigns((prev) =>
        prev.map((item) =>
          item.id === campaign.id
            ? {
                ...item,
                status: updatedCampaign?.status || nextStatus,
                updatedAt: updatedCampaign?.updatedAt || item.updatedAt,
              }
            : item,
        ),
      );
      if (selectedPendingCampaign?.id === campaign.id) {
        setSelectedPendingCampaign(null);
      }
      if (selectedActiveCampaign?.id === campaign.id) {
        setSelectedActiveCampaign(null);
      }
      setCampaignToDelete(null);
      setCampaignActionType(null);
      await Promise.all([
        loadCampaigns(),
        loadCampaignStats(),
        loadWallet(),
        loadTransactions(),
        loadQrs(token, { page: 1, append: false }),
      ]);
      openSuccessModal(successTitle, successMessage);
    } catch (err) {
      if (handleVendorAccessError(err)) {
        setCampaignToDelete(null);
        setCampaignActionType(null);
        return;
      }
      setCampaignError(err.message || "Unable to update campaign.");
    } finally {
      setDeletingCampaignId(null);
    }
  };

  const handleDeleteCampaign = (campaign) => {
    if (!campaign?.id || !token || deletingCampaignId) return;
    const nextStatus = String(campaign.status || "").toLowerCase() === "paused" ? "active" : "paused";
    setCampaignToDelete(campaign);
    setCampaignActionType(nextStatus);
    setCampaignError("");
    setCampaignStatus("");
  };

  const confirmDeleteCampaign = async () => {
    if (!campaignToDelete?.id || !token || deletingCampaignId) return;
    const nextStatus = campaignActionType === "active" ? "active" : "paused";
    await updateCampaignStatus(
      campaignToDelete,
      nextStatus,
      nextStatus === "active" ? "Campaign resumed" : "Campaign put on hold",
      nextStatus === "active"
        ? "The campaign is active again."
        : "The campaign has been put on hold and moved below active campaigns.",
    );
  };

  const handleOrderQrs = async () => {
    if (!selectedQrCampaign) {
      setQrOrderError("Please select a campaign first.");
      return;
    }

    const campaign = campaigns.find((c) => c.id === selectedQrCampaign);
    if (!campaign) {
      setQrOrderError("Selected campaign was not found.");
      return;
    }

    if (campaign.status === "pending") {
      setIsOrdering(true);
      setQrOrderError("");
      setQrOrderStatus("");
      try {
        await payVendorCampaign(token, campaign.id, {
          seriesCode: selectedQrSeries || null,
        });
        setQrOrderStatus("Campaign activated and QRs funded successfully.");
        openSuccessModal(
          "Campaign activated",
          "Campaign is active and QRs are funded from selected series.",
        );
        setCampaignTab("active");
        refreshCampaignPaymentState(token, {
          includeQrs: true,
          includeOrders: true,
        });
      } catch (err) {
        if (handleVendorAccessError(err)) return;
        setQrOrderError(err.message || "Unable to activate campaign.");
      } finally {
        setIsOrdering(false);
      }
      return;
    }

    if (campaign.status !== "active") {
      setQrOrderError("Selected campaign is not active.");
      return;
    }

    if (!selectedQrProduct) {
      setQrOrderError(
        "Please select a product first (or assign product to this campaign).",
      );
      return;
    }

    // Always fund from selected campaign's saved allocations.
    const campaignAllocations = Array.isArray(campaign.allocations)
      ? campaign.allocations
      : [];
    const validRows = campaignAllocations
      .map((row) => ({
        cashbackAmount: parseNumericValue(row?.cashbackAmount, 0),
        quantity: Math.max(0, Math.floor(Number(row?.quantity) || 0)),
      }))
      .filter((row) => row.cashbackAmount > 0 && row.quantity > 0);

    const rowsToUse =
      validRows.length > 0
        ? validRows
        : [
            {
              cashbackAmount: parseNumericValue(campaign.cashbackAmount, 0),
              quantity: 1,
            },
          ];

    if (rowsToUse.length === 0 || rowsToUse[0].cashbackAmount <= 0) {
      setQrOrderError(
        "This campaign has no valid cashback allocation. Edit campaign allocations first.",
      );
      return;
    }

    setIsOrdering(true);
    setQrOrderError("");
    setQrOrderStatus("");

    const batchTiers = rowsToUse
      .map((row) => {
        const price = parseNumericValue(row.cashbackAmount, 0);
        const quantityValue = Math.max(
          0,
          Math.floor(Number(row.quantity) || 0),
        );
        if (price <= 0 || quantityValue <= 0) return null;
        return {
          price,
          quantity: quantityValue,
          cost: price * quantityValue,
        };
      })
      .filter(Boolean);

    const uniquePrices = Array.from(
      new Set(batchTiers.map((tier) => tier.price)),
    );
    const desiredCashback = uniquePrices.length === 1 ? uniquePrices[0] : null;
    const desiredBudget = batchTiers.reduce((sum, tier) => sum + tier.cost, 0);

    // Skip the campaign update confirmation - just proceed with QR generation

    let successes = 0;
    let failures = 0;
    const newHashes = [];
    const newOrderIds = [];
    let totalPrintCost = 0;

    try {
      for (const row of rowsToUse) {
        try {
          // Use the selected campaign for all rows, pass per-row cashbackAmount
          const result = await orderVendorQrs(
            token,
            selectedQrCampaign,
            Number(row.quantity),
            Number(row.cashbackAmount),
            selectedQrSeries || null,
          );
          successes += result.count || 0;
          if (result?.order?.id) {
            newOrderIds.push(result.order.id);
            const printAmount = Number(result.order.totalAmount);
            if (Number.isFinite(printAmount)) {
              totalPrintCost += printAmount;
            }
          }
          if (Array.isArray(result.qrs) && result.qrs.length > 0) {
            newHashes.push(...result.qrs.map((item) => item.uniqueHash));
          } else if (
            Array.isArray(result.sampleHashes) &&
            result.sampleHashes.length > 0
          ) {
            newHashes.push(...result.sampleHashes);
          }
        } catch (err) {
          if (handleVendorAccessError(err)) {
            throw err;
          }
          const errorMsg =
            err.message ||
            `Failed to generate QRs for cashback INR ${row.cashbackAmount}`;
          // Show the actual error to user
          if (
            err.message?.includes("Insufficient") ||
            err.message?.includes("balance")
          ) {
            setQrOrderError(
              `Insufficient wallet balance. Please top up your wallet first.`,
            );
            setIsOrdering(false);
            return;
          }
          failures++;
        }
      }

      if (failures > 0 && successes === 0) {
        setQrOrderStatus("");
        setQrOrderError(
          "QR generation failed. Please check your allocations and wallet balance.",
        );
      } else {
        setQrOrderStatus(
          `Generated ${successes} QRs successfully.` +
            (failures > 0 ? ` (${failures} batches failed)` : ""),
        );
        if (successes > 0) {
          openSuccessModal(
            "QRs generated",
            `Generated ${successes} QR${successes !== 1 ? "s" : ""} successfully.${failures > 0 ? ` ${failures} batch${failures !== 1 ? "es" : ""} failed.` : ""}`,
          );
        }
      }

      if (successes > 0 && batchTiers.length > 0) {
        setLastBatchSummary({
          id: newOrderIds[0] || Date.now(),
          campaignTitle: campaign?.title || "Campaign",
          timestamp: new Date().toISOString(),
          tiers: batchTiers,
          totalQrs: successes,
          totalCost: batchTiers.reduce((sum, tier) => sum + tier.cost, 0),
          totalPrintCost,
          selectedSeries: selectedQrSeries || null,
          orderIds: newOrderIds,
          hashes: newHashes.slice(0, 50),
        });
      }
      if (newHashes.length > 0) {
        setLastOrderHashes(newHashes.slice(0, 10));
        await loadWallet();
        await loadTransactions();
        await loadQrs();
        await loadQrInventorySeries();
        await loadOrders();
        await loadCampaignStats();
      }
      if (failures === 0) {
        setQrRows([{ id: Date.now(), cashbackAmount: "", quantity: 10 }]);
      }
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      setQrOrderError(err.message || "QR generation failed.");
    } finally {
      setIsOrdering(false);
    }
  };

  const handleCompanyChange = (field) => (event) => {
    setCompanyProfile((prev) => ({ ...prev, [field]: event.target.value }));
    setRegistrationStatus("");
    setRegistrationError("");
  };

  const handleRegistrationSave = async () => {
    if (!companyProfile.businessName.trim()) {
      setRegistrationError("Company name is required.");
      return;
    }
    if (!brandProfile.name.trim()) {
      setRegistrationError("Brand name is required.");
      return;
    }
    setRegistrationError("");
    setRegistrationStatus("");
    setIsSavingRegistration(true);
    try {
      await Promise.all([
        updateVendorProfile(token, {
          businessName: companyProfile.businessName.trim(),
          contactPhone: companyProfile.contactPhone.trim() || null,
          contactEmail: companyProfile.contactEmail.trim() || null,
          gstin: companyProfile.gstin.trim() || null,
          address: companyProfile.address.trim() || null,
          designation: companyProfile.designation.trim() || null,
          alternatePhone: companyProfile.alternatePhone.trim() || null,
          city: companyProfile.city.trim() || null,
          state: companyProfile.state.trim() || null,
          pincode: companyProfile.pincode.trim() || null,
        }),
        upsertVendorBrand(token, {
          name: brandProfile.name.trim(),
          website: brandProfile.website.trim() || null,
          logoUrl: brandProfile.logoUrl || null,
          qrPricePerUnit:
            brandProfile.qrPricePerUnit !== ""
              ? Number(brandProfile.qrPricePerUnit)
              : undefined,
        }),
      ]);
      setRegistrationStatus("Company and brand profile updated.");
      await Promise.all([loadCompanyProfile(), loadBrandProfile()]);
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      setRegistrationError(err.message || "Unable to save profile.");
    } finally {
      setIsSavingRegistration(false);
    }
  };

  const handleAccountChange = (field) => (event) => {
    setAccountProfile((prev) => ({ ...prev, [field]: event.target.value }));
    setAccountStatus("");
    setAccountError("");
  };

  const handleAccountSave = async () => {
    if (!token) return;
    setAccountError("");
    setAccountStatus("");
    setIsSavingAccount(true);
    try {
      await sendEmailVerificationOtp(vendorInfo.email, vendorInfo.name);
      setShowProfileOtp(true);
      setAccountStatus("OTP sent to your email. Please verify to save.");
    } catch (err) {
      setAccountError(err.message || "Failed to send OTP.");
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleVerifyAndSaveProfile = async () => {
    if (!token) return;
    setAccountError("");
    setAccountStatus("");
    setIsSavingAccount(true);
    try {
      await verifyEmailVerificationOtp(vendorInfo.email, profileOtp);

      const payload = {
        name: accountProfile.name.trim() || null,
        email: accountProfile.email.trim() || null,
        username: accountProfile.username.trim() || null,
        phoneNumber: accountProfile.phoneNumber.trim() || null,
      };
      const result = await updateUserProfile(token, payload);
      const updatedUser = result?.user || result;
      if (updatedUser) {
        setVendorInfo((prev) => ({ ...prev, ...updatedUser }));
        setAccountProfile({
          name: updatedUser.name || "",
          email: updatedUser.email || "",
          username: updatedUser.username || "",
          phoneNumber: updatedUser.phoneNumber || "",
        });
        setOtpReset((prev) => ({
          ...prev,
          email: updatedUser.email || prev.email || "",
        }));
      }
      setAccountStatus("Login profile updated successfully.");
      setShowProfileOtp(false);
      setProfileOtp("");
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      setAccountError(
        err.message || "Invalid OTP or unable to update profile.",
      );
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handlePasswordFieldChange = (field) => (event) => {
    setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }));
    setPasswordStatus("");
    setPasswordError("");
  };

  const handlePasswordSubmit = async () => {
    if (!token) return;
    const oldPassword = passwordForm.oldPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!oldPassword || !newPassword) {
      setPasswordError("Enter your old password and a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setPasswordError("");
    setPasswordStatus("");
    setIsChangingPassword(true);
    try {
      await changeUserPassword(token, oldPassword, newPassword);
      setPasswordStatus("Password updated successfully.");
      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      setPasswordError(err.message || "Unable to update password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleOtpFieldChange = (field) => (event) => {
    setOtpReset((prev) => ({ ...prev, [field]: event.target.value }));
    setOtpStatus("");
    setOtpError("");
  };

  const handleSendOtp = async () => {
    const email = (otpReset.email || accountProfile.email || "")
      .trim()
      .toLowerCase();
    if (!email) {
      setOtpError("Enter the email to receive OTP.");
      return;
    }
    setIsSendingOtp(true);
    setOtpError("");
    setOtpStatus("");
    try {
      await sendEmailOtp(email);
      setOtpReset((prev) => ({ ...prev, email }));
      setOtpStatus("OTP sent to your email.");
    } catch (err) {
      setOtpError(err.message || "Unable to send OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpResetPassword = async () => {
    const email = (otpReset.email || accountProfile.email || "")
      .trim()
      .toLowerCase();
    const otp = otpReset.otp.trim();
    const newPassword = otpReset.newPassword.trim();
    const confirmPassword = otpReset.confirmPassword.trim();

    if (!email || !otp || !newPassword) {
      setOtpError("Enter email, OTP, and new password.");
      return;
    }
    if (newPassword.length < 6) {
      setOtpError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setOtpError("New password and confirmation do not match.");
      return;
    }

    setIsResettingOtp(true);
    setOtpError("");
    setOtpStatus("");
    try {
      await resetPasswordWithOtp(email, otp, newPassword);
      setOtpStatus("Password reset successfully.");
      setOtpReset((prev) => ({
        ...prev,
        otp: "",
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (err) {
      setOtpError(err.message || "Unable to reset password.");
    } finally {
      setIsResettingOtp(false);
    }
  };

  const handleCampaignChange = (field) => (event) => {
    const value = event.target.value;
    if (field === "productId" && value === "ADD_NEW_PRODUCT") {
      setProductModalContext("campaign");
      setEditingProduct(null);
      setShowProductModal(true);
      return;
    }
    setCampaignForm((prev) => ({ ...prev, [field]: value }));
    setCampaignStatus("");
    setCampaignError("");
  };

  const setCampaignStatusWithTimeout = (message) => {
    setCampaignStatus(message);
    setTimeout(() => setCampaignStatus(""), 2000);
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.title.trim()) {
      setCampaignError("Campaign title is required.");
      return;
    }
    if (!campaignForm.productId) {
      setCampaignError("Please select a product before creating a campaign.");
      return;
    }

    const isPostpaid = campaignForm.planType === "postpaid";

    const rowsWithAnyInput = campaignRows.filter((row) => {
      const cashbackInput = String(row.cashbackAmount ?? "").trim();
      const quantityInput = String(row.quantity ?? "").trim();
      const totalInput = String(row.totalBudget ?? "").trim();
      return isPostpaid
        ? quantityInput
        : cashbackInput || quantityInput || totalInput;
    });

    if (!rowsWithAnyInput.length) {
      setCampaignError(
        isPostpaid
          ? "Add at least one allocation with quantity."
          : "Add at least one allocation with cashback and quantity.",
      );
      return;
    }

    const normalizedAllocations = [];
    // Calculate total allocations from rows
    let calculatedTotalBudget = 0;
    let firstCashbackValue = 0;
    let maxCashbackValue = 0;

    if (!isPostpaid && rowsWithAnyInput.length > 0) {
      firstCashbackValue =
        parseOptionalNumber(rowsWithAnyInput[0].cashbackAmount) || 0;
    }

    for (const row of rowsWithAnyInput) {
      const qtyValue = parseOptionalNumber(row.quantity);

      if (qtyValue === null || qtyValue <= 0) {
        setCampaignError(
          "Quantity must be greater than 0 for all allocations.",
        );
        return;
      }

      if (isPostpaid) {
        // Postpaid: only quantity, no cashback or total
        normalizedAllocations.push({
          productId: campaignForm.productId,
          cashbackAmount: null,
          quantity: Math.floor(qtyValue),
          totalBudget: 0,
        });
      } else {
        // Prepaid: existing validation
        const cb = parseOptionalNumber(row.cashbackAmount);
        const derivedTotal = getAllocationRowTotal(row);

        if (cb === null || cb <= 0) {
          setCampaignError(
            "Cashback amount must be greater than 0 for all allocations.",
          );
          return;
        }
        if (derivedTotal === null || derivedTotal <= 0) {
          setCampaignError("Allocation total must be greater than 0.");
          return;
        }
        calculatedTotalBudget += derivedTotal;
        if (cb !== null && cb > maxCashbackValue) {
          maxCashbackValue = cb;
        }
        normalizedAllocations.push({
          productId: campaignForm.productId,
          cashbackAmount: cb,
          quantity: Math.floor(qtyValue),
          totalBudget: derivedTotal,
        });
      }
    }

    if (!normalizedAllocations.length) {
      setCampaignError("Please add at least one valid allocation row.");
      return;
    }

    const cashbackValue = maxCashbackValue || firstCashbackValue || 0;
    const budgetValue =
      calculatedTotalBudget > 0 ? calculatedTotalBudget : null;

    const now = new Date();
    const startDate = new Date(now);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 3);
    const startDateValue = startDate.toISOString().slice(0, 10);
    const endDateValue = endDate.toISOString().slice(0, 10);
    setCampaignError("");
    setCampaignStatus("");
    setIsSavingCampaign(true);
    try {
      let derivedBrandId = null;

      // Check if we can get brandId from selected product
      if (campaignForm.productId) {
        const product = products.find((p) => p.id === campaignForm.productId);
        if (product && product.brandId) {
          derivedBrandId = product.brandId;
        }
      }

      let effectiveBrandId = derivedBrandId || brandProfile?.id || null;

      if (!effectiveBrandId) {
        try {
          const brand = await getVendorBrand(token);
          effectiveBrandId = brand?.id || null;
        } catch (brandErr) {
          if (handleVendorAccessError(brandErr)) return;
          setCampaignError(
            "No brand is assigned yet. Please contact the admin or select a product.",
          );
          setIsSavingCampaign(false);
          return;
        }
      }

      if (!effectiveBrandId) {
        setCampaignError(
          "Unable to determine brand for this campaign. Please select a product.",
        );
        setIsSavingCampaign(false);
        return;
      }

      const result = await createVendorCampaign(token, {
        brandId: effectiveBrandId,
        productId: campaignForm.productId,
        title: campaignForm.title.trim(),
        description: campaignForm.description.trim() || undefined,
        planType: campaignForm.planType,
        voucherType: campaignForm.voucherType,
        voucherDesignUrl: campaignForm.voucherDesignUrl,
        cashbackAmount: isPostpaid
          ? null
          : cashbackValue > 0
            ? cashbackValue
            : null,
        startDate: startDateValue,
        endDate: endDateValue,
        totalBudget: isPostpaid ? 0 : budgetValue,
        subtotal: isPostpaid ? 0 : budgetValue,
        allocations: normalizedAllocations,
      });
      setCampaignStatusWithTimeout("Campaign created.");
      const nextCampaignPlanType =
        campaignForm.planType ||
        brandProfile.defaultPlanType ||
        localStorage.getItem(VENDOR_PLAN_TYPE_KEY) ||
        "prepaid";
      setCampaignForm({
        title: "",
        description: "",
        cashbackAmount: "",
        totalBudget: "",
        productId: "",
        planType: nextCampaignPlanType,
        voucherType: "none",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 3))
          .toISOString()
          .slice(0, 10),
      });
      setCampaignRows([
        { id: Date.now(), cashbackAmount: "", quantity: "", totalBudget: "" },
      ]);
      if (result?.campaign) {
        setCampaigns((prev) => {
          const filtered = prev.filter(
            (campaign) => campaign.id !== result.campaign.id,
          );
          return [result.campaign, ...filtered];
        });
      }
      // result from createVendorCampaign structure is { message, campaign }
      // But we can just reload campaigns.
      await loadCampaigns();
      await loadCampaignStats();
      setCampaignTab("pending");
      openSuccessModal(
        "Campaign created",
        isPostpaid
          ? "Your postpaid campaign has been created and sent for approval."
          : "Your campaign has been created. Proceed to payment to activate it.",
      );
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      setCampaignError(err.error || err.message || "Campaign creation failed.");
    } finally {
      setIsSavingCampaign(false);
    }
  };

  const handleProductChange = (field) => (event) => {
    setProductForm((prev) => ({ ...prev, [field]: event.target.value }));
    setProductStatus("");
    setProductError("");
    if (field === "imageUrl") {
      setProductImageUploadStatus("");
      setProductImageUploadError("");
    }
  };

  const setProductStatusWithTimeout = (message) => {
    setProductStatus(message);
    setTimeout(() => setProductStatus(""), 2000);
  };

  const handleProductImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!token) {
      setProductImageUploadError("Please sign in first.");
      return;
    }
    setIsUploadingProductImage(true);
    setProductImageUploadStatus("");
    setProductImageUploadError("");
    try {
      const data = await uploadImage(token, file);
      const uploadedUrl = data?.url;
      if (!uploadedUrl) {
        throw new Error("Upload failed. No URL returned.");
      }
      setProductForm((prev) => ({ ...prev, imageUrl: uploadedUrl }));
      setProductImageUploadStatus("Image uploaded.");
    } catch (err) {
      setProductImageUploadError(err.message || "Failed to upload image.");
    } finally {
      setIsUploadingProductImage(false);
      event.target.value = "";
    }
  };

  const handleAddProduct = async () => {
    if (!productForm.name.trim()) {
      setProductError("Product name is required.");
      return;
    }

    setProductError("");
    setProductStatus("");
    setIsSavingProduct(true);

    try {
      // Get the vendor's first brand
      let effectiveBrandId = brandProfile?.id || null;
      if (!effectiveBrandId) {
        try {
          const brand = await getVendorBrand(token);
          effectiveBrandId = brand?.id || null;
        } catch (brandErr) {
          if (handleVendorAccessError(brandErr)) return;
          setProductError(
            "No brand is assigned yet. Please contact the admin.",
          );
          setIsSavingProduct(false);
          return;
        }
      }

      if (!effectiveBrandId) {
        setProductError("No brand is assigned yet. Please contact the admin.");
        setIsSavingProduct(false);
        return;
      }

      await addVendorProduct(token, {
        brandId: effectiveBrandId,
        name: productForm.name.trim(),
        sku: productForm.sku?.trim() || null,
        mrp:
          productForm.mrp === undefined ||
          productForm.mrp === null ||
          productForm.mrp === ""
            ? null
            : Number(productForm.mrp),
        variant: productForm.variant.trim() || null,
        category: productForm.category.trim() || null,
        description: productForm.description.trim() || null,
        imageUrl: productForm.imageUrl.trim() || null,
      });
      setProductStatusWithTimeout("Product added successfully.");
      setProductForm({
        name: "",
        variant: "",
        category: "",
        description: "",
        imageUrl: "",
      });
      setProductImageUploadStatus("");
      setProductImageUploadError("");
      await loadProducts();
    } catch (err) {
      if (handleVendorAccessError(err)) return;
      setProductError(err.message || "Failed to add product.");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const pendingCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status === "pending"),
    [campaigns],
  );

  const activeCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status === "active"),
    [campaigns],
  );

  const stoppedCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status === "paused"),
    [campaigns],
  );

  const activeCampaignDisplayCampaigns = useMemo(
    () =>
      [...activeCampaigns].sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      }),
    [activeCampaigns],
  );

  const pausedCampaignDisplayCampaigns = useMemo(
    () =>
      [...stoppedCampaigns].sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      }),
    [stoppedCampaigns],
  );

  const isOverviewAll = overviewCampaignId === "all";
  const isOverviewUnassigned = overviewCampaignId === "unassigned";

  const overviewCampaignOptions = useMemo(() => {
    const options = [{ id: "all", label: "All campaigns" }];
    const sortedCampaigns = [...campaigns].sort((a, b) =>
      String(a.title || "").localeCompare(String(b.title || "")),
    );
    sortedCampaigns.forEach((campaign) => {
      options.push({
        id: campaign.id,
        label: campaign.title || "Untitled campaign",
      });
    });
    // Filter out "Unassigned QRs" from dropdown as per user request to avoid confusion
    return options;
  }, [campaigns]);

  const overviewCampaignLabel = useMemo(() => {
    const match = overviewCampaignOptions.find(
      (option) => option.id === overviewCampaignId,
    );
    return match?.label || "Campaign";
  }, [overviewCampaignId, overviewCampaignOptions]);

  const overviewFilteredQrs = useMemo(() => {
    if (overviewCampaignId === "all") return qrs;
    if (overviewCampaignId === "unassigned") {
      return qrs.filter((qr) => !(qr.Campaign?.id || qr.campaignId));
    }
    return qrs.filter(
      (qr) => (qr.Campaign?.id || qr.campaignId) === overviewCampaignId,
    );
  }, [overviewCampaignId, qrs]);

  const qrStats = useMemo(() => {
    const toNumber = (v) => Number(v) || 0;

    // 1. Calculate base stats from campaignStatsMap
    const statsValues = Object.values(campaignStatsMap).filter(
      (s) => s && s.id && !String(s.id).startsWith("title:"),
    );

    // Build a Set of active campaign IDs from the authoritative campaigns list
    const activeCampaignIds = new Set(
      campaigns.filter((c) => c.status === "active").map((c) => String(c.id)),
    );

    let campaignTotalSent = 0;
    let campaignTotalRedeemed = 0;
    let campaignTotalRecharged = 0;
    let selectedActive = 0;
    let selectedRedeemed = 0;
    let selectedTotal = 0;
    let selectedRecharged = 0;

    // Deduplicate stats by campaign name to avoid double-counting
    const seenNames = {};
    statsValues.forEach((s) => {
      const sent = toNumber(s.totalQRsOrdered);
      const redeemed = toNumber(s.totalUsersJoined);

      // Accumulate for "All campaigns" view — only truly active campaigns
      if (activeCampaignIds.has(String(s.id))) {
        const name = s.campaign || "Untitled";
        if (!seenNames[name]) {
          seenNames[name] = true;
          campaignTotalSent += sent;
          campaignTotalRedeemed += redeemed;

          // Find campaign to get allocations for recharged count
          const camp = campaigns.find((c) => String(c.id) === String(s.id));
          if (
            camp?.planType === "postpaid" &&
            Array.isArray(camp.allocations)
          ) {
            const recharged = camp.allocations.reduce((sum, allocation) => {
              const qty = Number.parseInt(allocation?.quantity, 10) || 0;
              const cb = Number.parseFloat(allocation?.cashbackAmount) || 0;
              return cb > 0 ? sum + qty : sum;
            }, 0);
            campaignTotalRecharged += recharged;
          } else {
            // For prepaid, all sent are recharged
            campaignTotalRecharged += sent;
          }
        }
      }

      if (!isOverviewAll && String(s.id) === String(overviewCampaignId)) {
        selectedTotal = sent;
        selectedRedeemed = redeemed;
        selectedActive = Math.max(0, sent - redeemed);

        const camp = campaigns.find((c) => String(c.id) === String(s.id));
        if (camp?.planType === "postpaid" && Array.isArray(camp.allocations)) {
          selectedRecharged = camp.allocations.reduce((sum, allocation) => {
            const qty = Number.parseInt(allocation?.quantity, 10) || 0;
            const cb = Number.parseFloat(allocation?.cashbackAmount) || 0;
            return cb > 0 ? sum + qty : sum;
          }, 0);
        } else {
          selectedRecharged = sent;
        }
      }
    });

    const pendingTotal = pendingCampaigns.reduce(
      (sum, c) => sum + toNumber(c.quantity),
      0,
    );

    if (!isOverviewAll) {
      // Selected Campaign View
      return {
        total: selectedTotal,
        redeemed: selectedRedeemed,
        active: Math.max(0, selectedRecharged - selectedRedeemed),
        recharged: selectedRecharged,
        inventory: 0,
        campaignManagedTotal: selectedTotal,
        pendingTotal: 0,
      };
    }

    // "All campaigns" View
    const dbTotal = Number.isFinite(qrTotal) ? qrTotal : qrs.length;
    const campaignManagedTotal = campaignTotalSent + pendingTotal;

    return {
      total: dbTotal,
      redeemed: campaignTotalRedeemed,
      active: Math.max(0, campaignTotalRecharged - campaignTotalRedeemed),
      recharged: campaignTotalRecharged,
      inventory: Math.max(0, dbTotal - campaignTotalSent),
      campaignManagedTotal,
      pendingTotal,
    };
  }, [
    campaignStatsMap,
    campaigns,
    isOverviewAll,
    overviewCampaignId,
    qrTotal,
    qrs.length,
    pendingCampaigns,
  ]);
  const notificationUnreadCount = notifications.filter(
    (item) => !item.isRead,
  ).length;
  const qrTotalLabel = qrTotal || qrs.length;
  const qrCoverageLabel =
    qrTotal > qrs.length ? `Showing latest ${qrs.length} of ${qrTotal}` : "";
  const fundableCampaigns = useMemo(
    () =>
      campaigns.filter(
        (campaign) =>
          campaign.status === "active" || campaign.status === "pending",
      ),
    [campaigns],
  );
  const campaignBulkExportJobsMap = useMemo(() => {
    const map = new Map();
    bulkExportJobs.forEach((job) => {
      if (
        job?.type === "campaign_qr_pdf" &&
        job?.campaignId &&
        job?.requestParams?.qrLabelFormatVersion ===
          QR_EXPORT_LABEL_FORMAT_VERSION &&
        !map.has(job.campaignId)
      ) {
        map.set(job.campaignId, job);
      }
    });
    return map;
  }, [bulkExportJobs]);
  const selectedInventoryBulkExportJob = useMemo(() => {
    const selectedSeriesKey = selectedQrSeries || null;
    return (
      bulkExportJobs.find((job) => {
        const jobSeries = job?.requestParams?.seriesCode || null;
        return (
          job?.type === "inventory_qr_pdf" && jobSeries === selectedSeriesKey
        );
      }) || null
    );
  }, [bulkExportJobs, selectedQrSeries]);
  const showQrGenerator = false;
  const showQrOrdersSection = false;
  const showOrderTracking = true;

  useEffect(() => {
    if (!fundableCampaigns.length) {
      if (selectedQrCampaign) setSelectedQrCampaign("");
      return;
    }
    const selectedStillActive = fundableCampaigns.some(
      (campaign) => campaign.id === selectedQrCampaign,
    );
    if (!selectedStillActive) {
      setSelectedQrCampaign(fundableCampaigns[0].id);
    }
  }, [fundableCampaigns, selectedQrCampaign]);

  useEffect(() => {
    if (!selectedQrCampaign || !products.length) return;

    const campaign = fundableCampaigns.find(
      (item) => item.id === selectedQrCampaign,
    );
    if (!campaign) return;

    const allocationProductId = Array.isArray(campaign.allocations)
      ? campaign.allocations.find((alloc) => alloc?.productId)?.productId
      : null;
    const suggestedProductId = campaign.productId || allocationProductId || "";
    if (!suggestedProductId) return;

    const suggestedExists = products.some(
      (product) => product.id === suggestedProductId,
    );
    if (!suggestedExists) return;

    if (!selectedQrProduct) {
      setSelectedQrProduct(suggestedProductId);
      return;
    }

    const currentExists = products.some(
      (product) => product.id === selectedQrProduct,
    );
    if (!currentExists) {
      setSelectedQrProduct(suggestedProductId);
    }
  }, [fundableCampaigns, products, selectedQrCampaign, selectedQrProduct]);

  useEffect(() => {
    if (!campaignsLoaded || campaigns.length === 0) return;
    if (overviewCampaignId !== "all" && overviewCampaignId !== "unassigned") {
      const isValidSelection = campaigns.some(
        (campaign) => campaign.id === overviewCampaignId,
      );
      if (!isValidSelection) {
        setOverviewCampaignId("all");
      }
    }
  }, [overviewCampaignId, campaigns, campaignsLoaded]);

  useEffect(() => {
    if (token) {
      loadRedemptionTrend(token);
    }
  }, [token, overviewCampaignId, dateFilter.from, dateFilter.to]);

  useEffect(() => {
    if (!token || activeTab !== "overview") return;
    loadRecentRedemptions(token);
  }, [token, activeTab, overviewCampaignId]);

  const overviewQrStatusCounts = useMemo(() => {
    const counts = {
      total: 0,
      generated: 0,
      assigned: 0,
      active: 0,
      redeemed: 0,
      expired: 0,
      blocked: 0,
      unknown: 0,
    };

    overviewFilteredQrs.forEach((qr) => {
      counts.total += 1;
      const status = String(qr.status || "unknown").toLowerCase();
      if (status === "claimed") {
        counts.redeemed += 1;
        return;
      }
      if (counts[status] !== undefined) {
        counts[status] += 1;
      } else {
        counts.unknown += 1;
      }
    });

    return counts;
  }, [overviewFilteredQrs]);
  const overviewSelectedCampaignCount = isOverviewAll
    ? campaigns.length
    : isOverviewUnassigned
      ? 0
      : 1;
  const selectedCampaignStats = useMemo(() => {
    if (isOverviewAll || isOverviewUnassigned) return null;
    if (campaignStatsMap[overviewCampaignId]) {
      return campaignStatsMap[overviewCampaignId];
    }
    const selectedCampaign = campaigns.find(
      (campaign) => campaign.id === overviewCampaignId,
    );
    if (selectedCampaign?.title) {
      return campaignStatsMap[`title:${selectedCampaign.title}`] || null;
    }
    return null;
  }, [
    campaignStatsMap,
    campaigns,
    isOverviewAll,
    isOverviewUnassigned,
    overviewCampaignId,
  ]);
  const selectedCampaignTotal = Number(selectedCampaignStats?.totalQRsOrdered);
  const selectedCampaignRedeemed = Number(
    selectedCampaignStats?.totalUsersJoined,
  );
  const overviewSelectedQrTotal = isOverviewAll
    ? qrStats.total
    : isOverviewUnassigned
      ? overviewQrStatusCounts.total
      : Number.isFinite(selectedCampaignTotal)
        ? selectedCampaignTotal
        : overviewQrStatusCounts.total;
  const overviewSelectedQrRedeemed = isOverviewAll
    ? qrStats.redeemed
    : isOverviewUnassigned
      ? overviewQrStatusCounts.redeemed
      : Number.isFinite(selectedCampaignRedeemed)
        ? selectedCampaignRedeemed
        : overviewQrStatusCounts.redeemed;

  const overviewRedemptionSeries = useMemo(() => {
    // Use parseISO to avoid timezone shifts when parsing "yyyy-MM-dd"
    const fromDate = parseISO(dateFilter.from);
    const toDate = parseISO(dateFilter.to);
    toDate.setHours(23, 59, 59, 999);

    const diffDays = differenceInDays(toDate, fromDate);
    const buckets = [];

    if (diffDays <= 1) {
      // Hourly bucketing for 1-2 days
      const totalHours = Math.max(
        24,
        Math.floor((toDate - fromDate) / (1000 * 60 * 60)),
      );
      for (let i = 0; i < totalHours; i++) {
        const date = new Date(fromDate);
        date.setHours(fromDate.getHours() + i, 0, 0, 0);
        if (date > toDate) break;
        const dateKey = format(date, "yyyy-MM-dd-HH");

        // Show labels every 4 hours to avoid overlap
        const shouldShow = i % 4 === 0;
        let d = format(date, "HH:00");
        let m = "";

        // On the start of the day (00:00), show the date as the month row
        if (date.getHours() === 0) {
          m = format(date, "d MMM");
        }

        buckets.push({
          key: dateKey,
          dateKey,
          name: shouldShow ? (m ? `${d} ${m}` : d) : "",
          d: shouldShow ? d : "",
          m: shouldShow ? m : "",
          fullDate: format(date, "dd MMM yyyy, HH:00"),
          redemptions: 0,
        });
      }
    } else if (diffDays <= 100) {
      // Daily bucketing for up to ~3 months
      const isLongRange = diffDays > 30; // 1M, 3M ranges
      const labelInterval = diffDays > 14 ? 4 : 1;

      for (let i = 0; i <= diffDays; i++) {
        const date = new Date(fromDate);
        date.setDate(fromDate.getDate() + i);
        if (date > toDate) break;

        const isFirst = i === 0;
        const isLast = i === diffDays;
        const dayOfMonth = date.getDate();

        const prevDate =
          i > 0 ? new Date(fromDate.getTime() + (i - 1) * 86400000) : null;
        const isYearChange =
          prevDate && date.getFullYear() !== prevDate.getFullYear();
        const isMonthChange =
          prevDate && date.getMonth() !== prevDate.getMonth();

        // Unique identifier for the axis to fix tooltip sync
        const dateKey = format(date, "yyyy-MM-dd");

        let d = format(date, "d");
        let m = "";
        let shouldShow = false;

        if (isLongRange) {
          // Special Request: Show 1 then 15 then 1 for long ranges
          if (
            isFirst ||
            isLast ||
            isYearChange ||
            dayOfMonth === 1 ||
            dayOfMonth === 15
          ) {
            shouldShow = true;
            // Spacing Guards: avoid squashing at the edges
            if (dayOfMonth === 1 || dayOfMonth === 15) {
              if (i < 3 || diffDays - i < 3) shouldShow = false;
            }
          }
        } else {
          // Short ranges (1W): use interval
          if (isFirst || isLast || isYearChange || i % labelInterval === 0) {
            shouldShow = true;
          }
        }

        if (shouldShow) {
          if (isFirst || isLast || isYearChange) {
            m = format(date, "MMM yyyy");
          } else if (dayOfMonth === 1 || isMonthChange) {
            m = format(date, "MMM");
          }
        }

        const name = shouldShow ? (m ? `${d} ${m}` : d) : "";

        buckets.push({
          key: dateKey,
          dateKey,
          name,
          d: shouldShow ? d : "",
          m: shouldShow ? m : "",
          fullDate: format(date, "dd MMM yyyy"),
          redemptions: 0,
        });
      }
    } else {
      // Monthly bucketing for longer ranges
      const startOfRange = new Date(
        fromDate.getFullYear(),
        fromDate.getMonth(),
        1,
      );
      const endOfRange = new Date(toDate.getFullYear(), toDate.getMonth(), 1);

      let current = new Date(startOfRange);
      while (current <= endOfRange) {
        const key = format(current, "yyyy-MM");
        const dateKey = key;
        buckets.push({
          key,
          dateKey,
          name: format(current, "MMM yyyy"),
          d: format(current, "MMM"),
          m: format(current, "yyyy"),
          fullDate: format(current, "MMMM yyyy"),
          redemptions: 0,
        });
        current.setMonth(current.getMonth() + 1);
      }
    }

    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    if (diffDays > 1 && redemptionTrend.length > 0) {
      // Use authoritative backend trend data for daily/monthly buckets
      redemptionTrend.forEach((item) => {
        const date = parseISO(item.date);
        if (Number.isNaN(date.getTime())) return;

        let key;
        if (diffDays <= 100) {
          key = item.date; // YYYY-MM-DD
        } else {
          key = format(date, "yyyy-MM");
        }

        const bucket = bucketMap.get(key);
        if (bucket) {
          bucket.redemptions += Number(item.count) || 0;
        }
      });
    } else {
      // Fallback to local data for hourly or if trend not yet loaded
      overviewFilteredQrs.forEach((qr) => {
        const status = String(qr.status || "").toLowerCase();
        if (status !== "redeemed" && status !== "claimed") return;
        const rawDate = qr.updatedAt || qr.createdAt;
        if (!rawDate) return;
        const date = new Date(rawDate);
        if (Number.isNaN(date.getTime())) return;
        if (date < fromDate || date > toDate) return;

        let key;
        if (diffDays <= 1) {
          key = format(date, "yyyy-MM-dd-HH");
        } else if (diffDays <= 100) {
          key = format(date, "yyyy-MM-dd");
        } else {
          key = format(date, "yyyy-MM");
        }

        const bucket = bucketMap.get(key);
        if (!bucket) return;
        bucket.redemptions += 1;
      });
    }

    return buckets.map(({ key, ...rest }) => rest);
  }, [overviewFilteredQrs, dateFilter, redemptionTrend]);

  const campaignPerformanceSeries = useMemo(() => {
    const statsValues = Object.values(campaignStatsMap).filter(
      (s) => s && s.id && !String(s.id).startsWith("title:"),
    );

    if (isOverviewAll) {
      // Build a Set of active campaign IDs from the authoritative campaigns list
      const activeCampaignIds = new Set(
        campaigns.filter((c) => c.status === "active").map((c) => String(c.id)),
      );

      // Only include stats whose ID matches an active campaign
      const activeStats = statsValues.filter((s) =>
        activeCampaignIds.has(String(s.id)),
      );

      // Deduplicate by campaign name — keep only the first entry per name
      const nameMap = {};
      activeStats.forEach((s) => {
        const name = s.campaign || "Untitled";
        if (!nameMap[name]) {
          nameMap[name] = {
            name,
            sent: Number(s.totalQRsOrdered) || 0,
            redeemed: Number(s.totalUsersJoined) || 0,
          };
        }
      });

      return Object.values(nameMap)
        .sort((a, b) => b.sent - a.sent)
        .slice(0, 8);
    }

    // Single campaign selection
    const selectedStats = campaignStatsMap[overviewCampaignId];
    if (selectedStats) {
      return [
        {
          name: selectedStats.campaign || overviewCampaignLabel,
          sent: Number(selectedStats.totalQRsOrdered) || 0,
          redeemed: Number(selectedStats.totalUsersJoined) || 0,
        },
      ];
    }

    // Fallback to overviewFilteredQrs if stats aren't loaded yet
    if (overviewFilteredQrs.length > 0) {
      const redeemedStatuses = new Set(["redeemed", "claimed"]);
      const redeemedCount = overviewFilteredQrs.filter((qr) =>
        redeemedStatuses.has(String(qr.status || "").toLowerCase()),
      ).length;
      return [
        {
          name: overviewCampaignLabel,
          sent: overviewFilteredQrs.length,
          redeemed: redeemedCount,
        },
      ];
    }

    return [];
  }, [
    campaignStatsMap,
    campaigns,
    isOverviewAll,
    overviewCampaignId,
    overviewCampaignLabel,
    overviewFilteredQrs,
  ]);

  const recentQrs = useMemo(() => {
    return [...qrs]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 12);
  }, [qrs]);

  const fallbackRecentRedemptions = useMemo(() => {
    return [...overviewFilteredQrs]
      .filter((qr) => {
        const status = String(qr?.status || "").toLowerCase();
        return status === "redeemed" || status === "claimed";
      })
      .sort(
        (a, b) =>
          new Date(b?.redeemedAt || b?.updatedAt || b?.createdAt || 0) -
          new Date(a?.redeemedAt || a?.updatedAt || a?.createdAt || 0),
      )
      .slice(0, 10)
      .map((qr) => ({
        id: `qr-${qr?.id || qr?.uniqueHash || "unknown"}`,
        createdAt: qr?.redeemedAt || qr?.updatedAt || qr?.createdAt || null,
        amount: parseNumericValue(
          qr?.cashbackAmount,
          parseNumericValue(qr?.Campaign?.cashbackAmount, 0),
        ),
        campaign: qr?.Campaign
          ? {
              id: qr.Campaign.id,
              title: qr.Campaign.title,
            }
          : null,
        qr: {
          id: qr?.id || null,
          hash: qr?.uniqueHash || qr?.hash || "-",
        },
      }));
  }, [overviewFilteredQrs]);

  const displayedRecentRedemptions =
    recentRedemptions.length > 0
      ? recentRedemptions
      : fallbackRecentRedemptions;

  const qrGallery = useMemo(() => {
    return [...qrs].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );
  }, [qrs]);

  const inventoryQrs = useMemo(() => {
    return showAllInventory ? qrGallery : recentQrs;
  }, [showAllInventory, qrGallery, recentQrs]);

  // Group QRs by Campaign first, then by price within each campaign
  const qrsGroupedByCampaign = useMemo(() => {
    const campaignMap = {};

    qrs.forEach((qr) => {
      const campaignId = qr.Campaign?.id || "unassigned";
      const campaignTitle = qr.Campaign?.title || "Unassigned";
      const price = getGeneratedPrice(qr);
      const priceKey = price.toFixed(2);

      if (!campaignMap[campaignId]) {
        campaignMap[campaignId] = {
          id: campaignId,
          title: campaignTitle,
          endDate: qr.Campaign?.endDate,
          status: qr.Campaign?.status,
          priceGroups: {},
          stats: { total: 0, active: 0, redeemed: 0 },
        };
      }

      if (!campaignMap[campaignId].priceGroups[priceKey]) {
        campaignMap[campaignId].priceGroups[priceKey] = {
          price,
          priceKey,
          qrs: [],
          activeCount: 0,
          redeemedCount: 0,
        };
      }

      const group = campaignMap[campaignId].priceGroups[priceKey];
      group.qrs.push(qr);
      campaignMap[campaignId].stats.total++;

      if (isRedeemedQrStatus(qr.status)) {
        group.redeemedCount++;
        campaignMap[campaignId].stats.redeemed++;
      } else if (!isInactiveQrStatus(qr.status)) {
        group.activeCount++;
        campaignMap[campaignId].stats.active++;
      }
    });

    return Object.values(campaignMap)
      .map((campaign) => ({
        ...campaign,
        priceGroups: Object.values(campaign.priceGroups).sort(
          (a, b) => b.price - a.price,
        ),
      }))
      .sort((a, b) => {
        if (a.id === "unassigned") return 1;
        if (b.id === "unassigned") return -1;
        return a.title.localeCompare(b.title);
      });
  }, [qrs]);
  const campaignQrMap = useMemo(() => {
    const map = new Map();
    qrsGroupedByCampaign.forEach((campaign) => {
      if (campaign.id !== "unassigned") {
        map.set(campaign.id, campaign);
      }
    });
    return map;
  }, [qrsGroupedByCampaign]);
  useEffect(() => {
    if (!selectedActiveCampaign?.id || !token) return;
    if (campaignQrBreakdownMap[selectedActiveCampaign.id]) return;
    loadCampaignQrBreakdown(selectedActiveCampaign, token);
  }, [selectedActiveCampaign, token, campaignQrBreakdownMap, campaignStatsMap]);
  const activeCampaignDetails = useMemo(() => {
    if (!selectedActiveCampaign) return null;
    const campaign = selectedActiveCampaign;
    const allocationGroups = buildAllocationGroups(campaign.allocations);
    const totalQty = allocationGroups.reduce(
      (sum, group) => sum + group.quantity,
      0,
    );
    const fallbackBudget = allocationGroups.reduce(
      (sum, group) => sum + group.totalBudget,
      0,
    );
    const totalBudget = (() => {
      const val =
        parseNumericValue(campaign.subtotal, 0) ||
        parseNumericValue(campaign.totalBudget, 0);
      if (val > 0) return val;
      if (campaign.planType === "postpaid" && Array.isArray(campaign.sheets)) {
        return campaign.sheets.reduce(
          (sum, s) =>
            sum +
            parseNumericValue(s.amount, 0) * parseNumericValue(s.count, 0),
          0,
        );
      }
      return fallbackBudget;
    })();
    const printCost = totalQty * qrPricePerUnit;
    const stats = campaignQrMap.get(campaign.id);
    const campaignStats =
      campaignStatsMap[campaign.id] ||
      campaignStatsMap[`title:${campaign.title}`] ||
      null;
    const statsTotal = Number(campaignStats?.totalQRsOrdered);
    const statsRedeemed = Number(campaignStats?.totalUsersJoined);
    const fundedPostpaidQty = Array.isArray(campaign.allocations)
      ? campaign.allocations.reduce((sum, allocation) => {
          const quantity = Number.parseInt(allocation?.quantity, 10) || 0;
          const cashbackAmount = parseNumericValue(
            allocation?.cashbackAmount,
            0,
          );
          return cashbackAmount > 0 ? sum + quantity : sum;
        }, 0)
      : 0;
    const fallbackTotal = Number(stats?.stats?.total);
    const fallbackRedeemed = Number(stats?.stats?.redeemed);
    const totalCount = Number.isFinite(statsTotal)
      ? Math.max(statsTotal, totalQty)
      : Number.isFinite(fallbackTotal)
        ? Math.max(fallbackTotal, totalQty)
        : totalQty;
    const redeemedCount = Number.isFinite(statsRedeemed)
      ? statsRedeemed
      : Number.isFinite(fallbackRedeemed)
        ? fallbackRedeemed
        : 0;
    const activeBase =
      campaign.planType === "postpaid" ? fundedPostpaidQty : totalCount;
    const activeCount = Math.max(0, activeBase - redeemedCount);
    const campaignQrBreakdown = campaignQrBreakdownMap[campaign.id];
    const fetchedPriceGroups = campaignQrBreakdown?.priceGroups || [];
    const priceGroups = fetchedPriceGroups.length
      ? fetchedPriceGroups
      : stats?.priceGroups || [];
    const qrBreakdownTotal = priceGroups.reduce((sum, group) => {
      const groupQty =
        Number(group?.quantity) || Number(group?.qrs?.length) || 0;
      return sum + groupQty;
    }, 0);
    const hasCompleteQrBreakdown =
      campaignQrBreakdown?.complete ||
      (qrBreakdownTotal > 0 && qrBreakdownTotal >= totalCount);
    const productId =
      campaign.productId ||
      (Array.isArray(campaign.allocations)
        ? campaign.allocations.find((alloc) => alloc.productId)?.productId
        : null);
    const product = productId
      ? products.find((item) => item.id === productId)
      : null;
    const priceGroupByKey = new Map(
      priceGroups.map((group) => [group.priceKey, group]),
    );
    const breakdownType =
      priceGroups.length && (hasCompleteQrBreakdown || !allocationGroups.length)
        ? "qr"
        : "allocation";
    const breakdownRows =
      breakdownType === "allocation"
        ? allocationGroups
            .map((group) => {
              const key = group.price.toFixed(2);
              const qrGroup = priceGroupByKey.get(key);
              const redeemed = Math.max(
                0,
                Math.min(group.quantity, Number(qrGroup?.redeemedCount) || 0),
              );
              return {
                cashback: group.price,
                quantity: group.quantity,
                // Treat "active" as not-yet-redeemed campaign quantity for full visibility.
                active: Math.max(0, group.quantity - redeemed),
                redeemed,
              };
            })
            .sort((a, b) => b.cashback - a.cashback)
        : priceGroups.map((group) => ({
            cashback: group.price,
            quantity: Number(group.quantity) || group.qrs?.length || 0,
            active: group.activeCount,
            redeemed: group.redeemedCount,
          }));

    return {
      campaign,
      allocationGroups,
      totalQty,
      totalBudget,
      printCost,
      stats,
      totalCount,
      redeemedCount,
      activeCount,
      breakdownType,
      product,
      breakdownRows,
    };
  }, [
    selectedActiveCampaign,
    campaignQrMap,
    campaignQrBreakdownMap,
    campaignStatsMap,
    products,
    qrPricePerUnit,
  ]);
  const activeCampaign = activeCampaignDetails?.campaign;
  const pendingCampaignPayment = useMemo(
    () => getCampaignPaymentSummary(selectedPendingCampaign, qrPricePerUnit),
    [selectedPendingCampaign, qrPricePerUnit],
  );
  const pendingWalletBalance = parseNumericValue(
    wallet?.availableBalance,
    parseNumericValue(wallet?.balance, 0) -
      parseNumericValue(wallet?.lockedBalance, 0),
  );
  const pendingCampaignShortfall = Math.max(
    pendingCampaignPayment.totalCost - pendingWalletBalance,
    0,
  );
  const canPaySelectedPendingCampaign =
    Boolean(selectedPendingCampaign) && pendingCampaignShortfall <= 0;

  const primaryQrRow = qrRows[0];
  const primaryQrCashback = parseNumericValue(primaryQrRow?.cashbackAmount, 0);
  const primaryQrQuantity = Math.max(
    0,
    Math.floor(Number(primaryQrRow?.quantity) || 0),
  );
  const primaryQrCost = primaryQrCashback * primaryQrQuantity;
  const canGenerateQrs =
    Boolean(selectedQrCampaign) &&
    primaryQrCashback > 0 &&
    primaryQrQuantity > 0;

  const walletBalance = parseNumericValue(
    wallet?.availableBalance,
    parseNumericValue(wallet?.balance, 0) -
      parseNumericValue(wallet?.lockedBalance, 0),
  );
  const lockedBalance = parseNumericValue(wallet?.lockedBalance, 0);
  const isPostpaid = brandProfile?.defaultPlanType === "postpaid";
  const displayedTransactions = showAllTransactions
    ? transactions
    : transactions.slice(0, 5);
  const overviewLocationPoints = useMemo(
    () =>
      locationsData.filter(
        (point) =>
          Number.isFinite(Number(point?.lat)) &&
          Number.isFinite(Number(point?.lng)) &&
          getClusterCustomerCount(point) > 0,
      ),
    [locationsData],
  );
  const overviewLocationClusters = useMemo(() => {
    const grouped = new Map();
    overviewLocationPoints.forEach((point) => {
      const city = String(point?.city || "").trim();
      const state = String(point?.state || "").trim();
      const key =
        city || state
          ? `${city.toLowerCase()}|||${state.toLowerCase()}`
          : `coord_${Number(point.lat).toFixed(2)}_${Number(point.lng).toFixed(2)}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          city: city || String(point?.displayName || "").trim(),
          state,
          totalScans: 0,
          customerIds: new Set(),
          lat: Number(point.lat),
          lng: Number(point.lng),
          displayName: String(point?.displayName || "").trim(),
        });
      }
      const cluster = grouped.get(key);
      cluster.totalScans += Number(point?.count || 0);
      const pointCustomerIds = Array.isArray(point?.customerIds)
        ? point.customerIds
        : point?.customerIds instanceof Set
          ? Array.from(point.customerIds)
          : [];
      pointCustomerIds.forEach((id) => {
        if (id) cluster.customerIds.add(id);
      });
    });
    return Array.from(grouped.values())
      .map((cluster) => ({
        ...cluster,
        totalCustomers: getClusterCustomerCount(cluster),
      }))
      .filter((cluster) => cluster.totalCustomers > 0)
      .sort((a, b) => b.totalCustomers - a.totalCustomers || b.totalScans - a.totalScans);
  }, [overviewLocationPoints]);
  const overviewLocationSummary = useMemo(
    () => ({
      regions: overviewLocationClusters.length,
      scans: overviewLocationClusters.reduce(
        (sum, cluster) => sum + Number(cluster.totalCustomers || 0),
        0,
      ),
    }),
    [overviewLocationClusters],
  );
  const locationMapCenter = useMemo(() => {
    if (!locationsData.length) return [20.5937, 78.9629];
    const firstPoint = locationsData.find(
      (point) =>
        Number.isFinite(Number(point?.lat)) &&
        Number.isFinite(Number(point?.lng)) &&
        getClusterCustomerCount(point) > 0,
    );
    if (!firstPoint) return [20.5937, 78.9629];
    return [Number(firstPoint.lat), Number(firstPoint.lng)];
  }, [locationsData]);

  const handleApplyExtraFilters = () => {
    if (!token) return;
    // A changed search must not retain a previous map-cluster ID filter.
    if (
      activeClusterFilterRef.current &&
      String(dashboardFilters.location || "").trim() !==
        String(clusterCityFilter || "").trim()
    ) {
      activeClusterFilterRef.current = null;
      setClusterCityFilter(null);
      setClusterLocationFilter(null);
    }
    loadExtraTabData(token);
  };

  return (
    <>
      {/* Download Progress Modal - Portal Overlay */}
      {downloadProgress.show && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-safe-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-2xl border border-gray-100 dark:border-zinc-800 w-full max-w-md">
            <div className="text-center space-y-6">
              {/* Icon */}
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                {downloadProgress.progress === 100 ? (
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                ) : (
                  <Download className="w-8 h-8 text-primary animate-bounce" />
                )}
              </div>

              {/* Progress Text */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {downloadProgress.progress === 100
                    ? "Complete!"
                    : "Downloading..."}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {downloadProgress.message}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full h-2 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary-strong rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${downloadProgress.progress}%` }}
                  />
                </div>
                <p className="text-xs font-semibold text-primary">
                  {downloadProgress.progress}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={`flex flex-col min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 ${token ? "p-6" : "p-0"} text-gray-900 dark:text-gray-100`}
      >
        <>
          {!isAuthenticated && (
            <div className="flex flex-col min-h-screen w-full relative bg-gray-50 dark:bg-zinc-950">
              <VendorNavbar />

              <div className="flex-1 flex items-start justify-center p-4 pt-12 relative z-10">
                <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-2xl overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-strong"></div>

                  <div className="p-8 space-y-8">
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/5 dark:bg-primary-strong/20 text-primary dark:text-primary mb-4 ring-1 ring-primary/10 dark:ring-primary-strong/40">
                        <Store size={24} />
                      </div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Vendor Portal
                      </h1>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Sign in to manage your store & campaigns
                      </p>
                    </div>

                    <div className="space-y-5">
                      {!showOtpReset ? (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">
                              Email or Username
                            </label>
                            <div className="relative group">
                              <div className="absolute left-3 top-3 text-gray-400 group-focus-within:text-primary transition-colors">
                                <User size={18} />
                              </div>
                              <input
                                type="text"
                                name="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email/username"
                                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSignIn();
                                }}
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                Password
                              </label>
                            </div>
                            <div className="relative group">
                              <div className="absolute left-3 top-3 text-gray-400 group-focus-within:text-primary transition-colors">
                                <Lock size={18} />
                              </div>
                              <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-12 py-3 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSignIn();
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              >
                                {showPassword ? (
                                  <EyeOff size={18} />
                                ) : (
                                  <Eye size={18} />
                                )}
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={handleSignIn}
                            disabled={isSigningIn}
                            className="w-full bg-primary hover:bg-primary-strong text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-primary/20 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 group"
                          >
                            {isSigningIn ? (
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                              <>
                                <span>Sign In to Dashboard</span>
                                <ChevronRight
                                  size={18}
                                  className="group-hover:translate-x-0.5 transition-transform"
                                />
                              </>
                            )}
                          </button>

                          <div className="text-center mt-2">
                            <button
                              type="button"
                              onClick={() => setShowOtpReset(true)}
                              className="text-[11px] font-bold text-primary hover:text-primary-strong transition-colors"
                            >
                              Forgot Password?
                            </button>
                          </div>

                          {authError && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold animate-shake">
                              <BadgeCheck size={14} className="rotate-180" />
                              {authError}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 bg-gray-50/50 dark:bg-zinc-900/30 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
                          <div className="flex items-center justify-between mb-1 pb-1 border-b border-gray-200 dark:border-zinc-800">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                              Reset Password
                            </h3>
                            <button
                              type="button"
                              onClick={() => setShowOtpReset(false)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">
                                Registered Email
                              </label>
                              <input
                                type="email"
                                value={otpReset.email}
                                onChange={handleOtpFieldChange("email")}
                                placeholder="you@company.com"
                                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">
                                OTP
                              </label>
                              <input
                                type="text"
                                value={otpReset.otp}
                                onChange={handleOtpFieldChange("otp")}
                                placeholder="6-digit OTP"
                                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all tracking-widest"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">
                                New password
                              </label>
                              <div className="relative">
                                <input
                                  type={
                                    otpReset.showNewPassword
                                      ? "text"
                                      : "password"
                                  }
                                  value={otpReset.newPassword}
                                  onChange={handleOtpFieldChange("newPassword")}
                                  placeholder="New password"
                                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 pr-10 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOtpReset((p) => ({
                                      ...p,
                                      showNewPassword: !p.showNewPassword,
                                    }))
                                  }
                                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                >
                                  {otpReset.showNewPassword ? (
                                    <EyeOff size={18} />
                                  ) : (
                                    <Eye size={18} />
                                  )}
                                </button>
                              </div>
                              {otpReset.newPassword &&
                                (() => {
                                  const pass = otpReset.newPassword;
                                  let score = 0;
                                  if (pass.length >= 6) score += 1;
                                  if (pass.length >= 8) score += 1;
                                  if (/[A-Z]/.test(pass)) score += 1;
                                  if (/[0-9]/.test(pass)) score += 1;
                                  if (/[^A-Za-z0-9]/.test(pass)) score += 1;
                                  const isStrong = score >= 5;
                                  const isMedium = score === 3 || score === 4;
                                  const label = isStrong
                                    ? "Strong"
                                    : isMedium
                                      ? "Medium"
                                      : "Weak";
                                  const colorClass = isStrong
                                    ? "bg-emerald-500"
                                    : isMedium
                                      ? "bg-amber-500"
                                      : "bg-red-500";
                                  const textClass = isStrong
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : isMedium
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-red-600 dark:text-red-400";
                                  return (
                                    <div className="mt-1 space-y-1 animate-in fade-in">
                                      <div className="flex gap-1 h-1 w-full">
                                        <div
                                          className={`flex-1 rounded-full ${score >= 1 ? colorClass : "bg-gray-200 dark:bg-zinc-700"}`}
                                        ></div>
                                        <div
                                          className={`flex-1 rounded-full ${score >= 3 ? colorClass : "bg-gray-200 dark:bg-zinc-700"}`}
                                        ></div>
                                        <div
                                          className={`flex-1 rounded-full ${score >= 5 ? colorClass : "bg-gray-200 dark:bg-zinc-700"}`}
                                        ></div>
                                      </div>
                                      <div className="flex justify-between items-center text-[10px]">
                                        <span
                                          className={`font-bold tracking-wide ${textClass}`}
                                        >
                                          {label}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">
                                Confirm password
                              </label>
                              <div className="relative">
                                <input
                                  type={
                                    otpReset.showConfirmPassword
                                      ? "text"
                                      : "password"
                                  }
                                  value={otpReset.confirmPassword}
                                  onChange={handleOtpFieldChange(
                                    "confirmPassword",
                                  )}
                                  placeholder="Confirm password"
                                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 pr-10 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOtpReset((p) => ({
                                      ...p,
                                      showConfirmPassword:
                                        !p.showConfirmPassword,
                                    }))
                                  }
                                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                >
                                  {otpReset.showConfirmPassword ? (
                                    <EyeOff size={18} />
                                  ) : (
                                    <Eye size={18} />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <button
                              type="button"
                              onClick={handleSendOtp}
                              disabled={isSendingOtp}
                              className="w-full rounded-lg border border-primary/40 bg-white dark:bg-transparent text-primary dark:text-primary text-sm font-semibold py-2.5 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors disabled:opacity-60"
                            >
                              {isSendingOtp ? "Sending..." : "Send OTP"}
                            </button>
                            <button
                              type="button"
                              onClick={handleOtpResetPassword}
                              disabled={isResettingOtp}
                              className="w-full rounded-lg bg-primary hover:bg-primary text-white text-sm font-semibold py-2.5 transition-colors disabled:opacity-60"
                            >
                              {isResettingOtp ? "Resetting..." : "Reset"}
                            </button>
                          </div>
                          {(otpStatus || otpError) && (
                            <div
                              className={`text-xs text-center font-medium ${otpError ? "text-red-500" : "text-primary"} mt-1`}
                            >
                              {otpStatus || otpError}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-100 dark:border-zinc-800"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-zinc-900 px-2 text-gray-400 font-medium tracking-wider">
                          New to Platform?
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate("/brand-registration")}
                      className="w-full rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/30 text-gray-600 dark:text-gray-400 font-semibold py-3 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:border-primary hover:text-primary text-sm transition-all flex items-center justify-center gap-2 group"
                    >
                      <Store
                        size={16}
                        className="group-hover:scale-110 transition-transform text-gray-400 group-hover:text-primary"
                      />
                      Apply for Partnership
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onboarding / Registration Modal */}
          {showOnboarding && !isAuthenticated && (
            <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-safe-4 bg-black/60 backdrop-blur-md">
              <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-2xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900 sticky top-0 z-10">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BadgeCheck className="text-primary" size={24} />
                    Partner Application
                  </h2>
                  <button
                    onClick={() => {
                      setShowOnboarding(false);
                      setRegistrationSubmitted(false);
                      setRegistrationForm((prev) => ({
                        ...prev,
                        logo: null,
                        logoPreview: null,
                      }));
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                <div className="overflow-y-auto">
                  {registrationSubmitted ? (
                    <div className="p-8 text-center space-y-4">
                      <div className="w-16 h-16 bg-primary/10 dark:bg-primary-strong/30 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Application Received!
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">
                        Thank you for registering{" "}
                        <strong>{registrationForm.businessName}</strong>.
                      </p>
                      {generatedCredentials && (
                        <div className="w-full max-w-sm bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-2xl p-5 space-y-4 text-left mx-auto my-4">
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">
                            Your Login Credentials
                          </div>

                          <div className="space-y-3">
                            <div
                              className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-gray-100 dark:border-zinc-800 flex justify-between items-center group relative cursor-pointer"
                              title="Copy ID"
                            >
                              <div>
                                <div className="text-[10px] text-gray-400 font-medium">
                                  Vendor ID
                                </div>
                                <div className="font-mono font-bold text-gray-800 dark:text-gray-200 tracking-wide text-lg">
                                  {generatedCredentials.vendorId}
                                </div>
                              </div>
                              <ClipboardCheck
                                size={16}
                                className="text-gray-400 group-hover:text-primary transition-colors"
                              />
                            </div>

                            <div
                              className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-gray-100 dark:border-zinc-800 flex justify-between items-center group cursor-pointer"
                              title="Copy Password"
                            >
                              <div>
                                <div className="text-[10px] text-gray-400 font-medium">
                                  Temporary Password
                                </div>
                                <div className="font-mono font-bold text-gray-800 dark:text-gray-200 tracking-wide text-lg">
                                  {generatedCredentials.password}
                                </div>
                              </div>
                              <ClipboardCheck
                                size={16}
                                className="text-gray-400 group-hover:text-primary transition-colors"
                              />
                            </div>
                          </div>

                          <div className="flex items-start gap-2 text-[10px] text-orange-600 bg-orange-50 dark:bg-orange-900/10 p-2 rounded-lg">
                            <div className="mt-0.5">??</div>
                            Please save these credentials safely.
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setShowOnboarding(false);
                          setRegistrationSubmitted(false);
                          setGeneratedCredentials(null);
                          setRegistrationForm({
                            businessName: "",
                            contactName: "",
                            email: "",
                            phone: "",
                            website: "",
                            category: "",
                            description: "",
                            logo: null,
                            logoPreview: null,
                          });
                        }}
                        className="w-full max-w-sm bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-gray-500/20 active:scale-[0.98] transition-all"
                      >
                        Got it, Return to Login
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleRegistrationSubmit}
                      className="p-6 space-y-6"
                    >
                      {/* Logo Upload Section */}
                      <div className="flex justify-center mb-2">
                        <div className="relative group">
                          <input
                            type="file"
                            id="logo-upload"
                            className="hidden"
                            accept="image/*"
                            onChange={handleLogoChange}
                          />
                          <label
                            htmlFor="logo-upload"
                            className={`w-28 h-28 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
                              registrationForm.logoPreview
                                ? "border-primary bg-white"
                                : "border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800"
                            }`}
                          >
                            {registrationForm.logoPreview ? (
                              <img
                                alt="Logo"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <>
                                <Upload
                                  size={24}
                                  className="text-gray-400 mb-2 group-hover:text-primary transition-colors"
                                />
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                  Upload Logo
                                </span>
                              </>
                            )}
                          </label>
                          {registrationForm.logoPreview && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setRegistrationForm((prev) => ({
                                  ...prev,
                                  logo: null,
                                  logoPreview: null,
                                }));
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Business Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-1">
                              Business Name
                            </label>
                            <div className="relative">
                              <div className="absolute left-3 top-2.5 text-gray-400">
                                <Store size={16} />
                              </div>
                              <input
                                required
                                type="text"
                                value={registrationForm.businessName}
                                onChange={handleRegistrationChange(
                                  "businessName",
                                )}
                                placeholder="Brand / Company"
                                className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:font-normal"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-1">
                              Website
                            </label>
                            <div className="relative">
                              <div className="absolute left-3 top-2.5 text-gray-400">
                                <Globe size={16} />
                              </div>
                              <input
                                type="url"
                                value={registrationForm.website}
                                onChange={handleRegistrationChange("website")}
                                placeholder="https://brand.com"
                                className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:font-normal"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-1">
                            Contact Person
                          </label>
                          <div className="relative">
                            <div className="absolute left-3 top-2.5 text-gray-400">
                              <User size={16} />
                            </div>
                            <input
                              required
                              type="text"
                              value={registrationForm.contactName}
                              onChange={handleRegistrationChange("contactName")}
                              placeholder="Full Name of representative"
                              className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:font-normal"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-1">
                              Work Email
                            </label>
                            <div className="relative">
                              <div className="absolute left-3 top-2.5 text-gray-400">
                                <Mail size={16} />
                              </div>
                              <input
                                required
                                type="email"
                                value={registrationForm.email}
                                onChange={handleRegistrationChange("email")}
                                placeholder="name@work.com"
                                className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:font-normal"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-1">
                              Mobile
                            </label>
                            <div className="relative">
                              <div className="absolute left-3 top-2.5 text-gray-400">
                                <Phone size={16} />
                              </div>
                              <input
                                required
                                type="tel"
                                value={registrationForm.phone}
                                onChange={handleRegistrationChange("phone")}
                                placeholder="+91..."
                                className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:font-normal"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-1">
                            Category
                          </label>
                          <div className="relative">
                            <div className="absolute left-3 top-2.5 text-gray-400">
                              <Package size={16} />
                            </div>
                            <select
                              required
                              value={registrationForm.category}
                              onChange={handleRegistrationChange("category")}
                              className="w-full appearance-none rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-8 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                            >
                              <option value="">Select industry category</option>
                              <option value="fmcg">
                                FMCG / Packaged Goods
                              </option>
                              <option value="electronics">
                                Electronics & Appliances
                              </option>
                              <option value="fashion">Fashion & Apparel</option>
                              <option value="home">Home & Kitchen</option>
                              <option value="construction">
                                Construction Materials
                              </option>
                              <option value="automotive">Automotive</option>
                              <option value="other">Other</option>
                            </select>
                            <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
                              <ChevronRight size={14} className="rotate-90" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-1">
                            Description (Optional)
                          </label>
                          <textarea
                            rows="2"
                            value={registrationForm.description}
                            onChange={handleRegistrationChange("description")}
                            placeholder="Briefly describe your products..."
                            className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none placeholder:font-normal"
                          />
                        </div>
                      </div>

                      <div className="pt-4 pb-2">
                        <button
                          type="submit"
                          className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-strong hover:from-primary hover:to-primary-strong text-white font-bold py-3 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          Submit Application
                          <ArrowRight size={18} />
                        </button>
                        <p className="text-[10px] text-center text-gray-400 mt-4 max-w-xs mx-auto leading-relaxed">
                          By clicking submit, you verify that you are an
                          authorized representative of the brand and agree to
                          our{" "}
                          <a href="#" className="underline">
                            Terms of Service
                          </a>
                          .
                        </p>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {isAuthenticated && (
            <>
              {/* Main Dashboard Layout */}
              <div className="mx-auto w-full max-w-[1920px] px-0 py-4 sm:px-4 sm:py-6">
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  {/* Sidebar Navigation */}
                  {/* Mobile Sidebar Backdrop */}
                  {isSidebarOpen && (
                    <div
                      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden animate-in fade-in duration-300"
                      onClick={() => setIsSidebarOpen(false)}
                    />
                  )}

                  {/* Sidebar Navigation */}
                  <aside
                    className={`fixed lg:sticky top-0 lg:top-6 left-0 z-[100] h-full lg:h-fit w-72 lg:w-64 bg-white dark:bg-[#1a1a1a] border-r lg:border border-gray-100 dark:border-gray-800 p-4 shadow-2xl lg:shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:rounded-xl overflow-y-auto no-scrollbar ${
                      isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                  >
                    <div className="space-y-6">
                      {/* Mobile Close Button */}
                      <div className="flex lg:hidden justify-end mb-2">
                        <button
                          onClick={() => setIsSidebarOpen(false)}
                          className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      {/* Profile Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                          <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                            {(vendorInfo?.name || "V")[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {vendorInfo?.name || "Vendor"}
                            </div>
                            <div className="text-xs text-gray-400 truncate">
                              {vendorInfo?.email || ""}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stats Quick View */}
                      {/* Stats Quick View */}
                      <div className="grid grid-cols-2 gap-2">
                        <StarBorder
                          as="div"
                          className="w-full cursor-pointer"
                          color="var(--primary)"
                          speed="5s"
                          innerClassName="bg-white dark:bg-[#000] shadow-sm dark:shadow-none"
                          onClick={() => navigate("/vendor/wallet")}
                        >
                          <div className="flex flex-col items-center justify-center w-full">
                            <div className="text-[10px] text-gray-500 mb-0.5">
                              Wallet Amount
                            </div>
                            <div
                              className="text-sm font-bold text-primary truncate max-w-full"
                              title={`\u20B9${formatAmount(walletBalance)}`}
                            >
                              {"\u20B9"}
                              {formatAmount(walletBalance)}
                            </div>
                          </div>
                        </StarBorder>
                        <StarBorder
                          as="div"
                          className="w-full cursor-pointer"
                          color="var(--primary)"
                          speed="5s"
                          innerClassName="bg-white dark:bg-[#000] shadow-sm dark:shadow-none"
                          onClick={() => navigate("/vendor/campaigns")}
                        >
                          <div className="flex flex-col items-center justify-center w-full">
                            <div className="text-[10px] text-gray-500 mb-0.5">
                              Active QRs
                            </div>
                            <div className="text-sm font-bold text-primary">
                              {qrStats.active}
                            </div>
                          </div>
                        </StarBorder>
                      </div>

                      {/* Navigation */}
                      {/* Navigation */}
                      <nav className="space-y-2">
                        {[
                          { id: "overview", label: "Overview", icon: Store },
                          {
                            id: "products",
                            label: "Products",
                            icon: Package,
                          },
                          {
                            id: "campaigns",
                            label: "Campaigns & QR",
                            icon: BadgeCheck,
                          },
                          {
                            id: "customers",
                            label: "Customers",
                            icon: Users,
                          },
                          {
                            id: "locations",
                            label: "Locations",
                            icon: Globe,
                          },

                          { id: "wallet", label: "Wallet", icon: Wallet },
                          {
                            id: "billing",
                            label: "Billing",
                            icon: FileText,
                          },
                          {
                            id: "brand",
                            label: "Settings",
                            icon: ShieldCheck,
                          },
                          {
                            id: "support",
                            label: "Support",
                            icon: HelpCircle,
                          },
                        ].map((item) => {
                          const isActive = activeTab === item.id;
                          if (isActive) {
                            return (
                              <StarBorder
                                key={item.id}
                                as="button"
                                onClick={() => {
                                  navigate(`/vendor/${item.id}`);
                                  setIsSidebarOpen(false);
                                }}
                                color="var(--primary)"
                                speed="4s"
                                className="w-full cursor-pointer"
                                innerClassName="bg-white dark:bg-[#000] pointer-events-none text-gray-900 dark:text-white"
                              >
                                <item.icon size={18} className="text-primary" />
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {item.label}
                                </span>
                              </StarBorder>
                            );
                          }
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                navigate(`/vendor/${item.id}`);
                                setIsSidebarOpen(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#252525] dark:hover:text-gray-200 transition-all font-medium"
                            >
                              <item.icon size={18} />
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </nav>

                      {/* Sign Out */}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-red-900/20 text-red-400 text-sm font-medium border border-red-900/30"
                      >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </aside>

                  {/* Main Content */}
                  <main className="flex-1 min-w-0 flex flex-col space-y-3 sm:space-y-4 overflow-x-hidden min-h-[calc(100vh-3rem)] bg-gray-100 dark:bg-zinc-950 sm:bg-transparent sm:dark:bg-transparent">
                    {/* Redesigned Premium Header Section */}
                    <div className="flex flex-col gap-4 sm:gap-8 mb-0 sm:mb-8 px-0 bg-white dark:bg-[#111] sm:bg-transparent sm:dark:bg-transparent pb-3 sm:pb-0">
                      <div className="flex items-center justify-between gap-4 px-4 sm:px-0">
                        <div className="flex items-center gap-4">
                          {/* Premium Hamburger Menu Button */}
                          <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden shrink-0 flex items-center justify-center h-12 w-12 rounded-2xl bg-white/80 backdrop-blur-md dark:bg-zinc-900/80 border border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-gray-400 shadow-sm hover:shadow-md active:scale-95 transition-all"
                          >
                            <Menu size={24} />
                          </button>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                                Welcome Back
                              </span>
                              <span className="h-px w-4 bg-emerald-500/30" />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight tracking-tight truncate">
                              {timeOfDayGreeting},{" "}
                              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300">
                                {vendorInfo?.name || "Partner"}
                              </span>
                            </h1>
                            <p className="text-xs sm:text-sm font-bold text-gray-400 dark:text-zinc-500">
                              Here's what's happening today
                            </p>
                          </div>
                        </div>

                        {/* Top Actions */}
                        <div className="flex items-center gap-3 pr-1 shrink-0">
                          <div className="relative">
                            <button
                              ref={notificationsTriggerRef}
                              type="button"
                              onClick={() =>
                                setIsNotificationsOpen((prev) => !prev)
                              }
                              className={`h-12 w-12 rounded-2xl border transition-all duration-300 flex items-center justify-center active:scale-95 shadow-sm ${
                                isNotificationsOpen
                                  ? "bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20"
                                  : "bg-white/80 backdrop-blur-md dark:bg-zinc-900/80 border-gray-100 dark:border-zinc-800 text-gray-500 dark:text-gray-400 hover:border-emerald-200 dark:hover:border-emerald-500/30"
                              }`}
                              aria-label="Notifications"
                            >
                              <Bell size={22} />
                              {notificationUnreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 h-6 min-w-[24px] rounded-full bg-emerald-500 text-white text-[11px] font-black flex items-center justify-center px-1.5 ring-4 ring-white dark:ring-zinc-950 shadow-lg shadow-emerald-500/20">
                                  {notificationUnreadCount > 9
                                    ? "9+"
                                    : notificationUnreadCount}
                                </span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Overview Tab Controls - Pulled into header for better accessibility */}
                      {displayTab === "overview" && (
                        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-3 px-4 shadow-sm">
                          <div className="flex items-center gap-2">
                            <Filter size={16} className="text-emerald-500" />
                            <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">
                              Filter by Campaign
                            </span>
                          </div>
                          <div className="relative">
                            <select
                              value={overviewCampaignId}
                              onChange={(event) =>
                                setOverviewCampaignId(event.target.value)
                              }
                              className="appearance-none w-[160px] sm:w-[200px] rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 pl-3 pr-8 py-1.5 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                            >
                              {overviewCampaignOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-2.5 top-2 text-gray-400 pointer-events-none">
                              <ChevronDown size={14} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {displayTab === "overview" && (
                      <div className="space-y-4 sm:space-y-6">
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-0">
                          {/* Wallet Balance Card */}
                          <div
                            onClick={() => navigate("/vendor/wallet")}
                            className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 overflow-hidden shadow-sm dark:shadow-none cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                          >
                            <div className="flex justify-between items-start mb-1.5 sm:mb-2">
                              <div className="overflow-hidden">
                                <div
                                  className="text-xl sm:text-2xl xl:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1 truncate"
                                  title={`\u20B9${formatAmount(walletBalance)}`}
                                >
                                  {"\u20B9"}
                                  {formatAmount(walletBalance)}
                                </div>
                                <div className="text-[10px] sm:text-xs text-gray-500 font-medium">
                                  Wallet Balance
                                </div>
                              </div>
                              <div className="h-9 w-9 sm:h-10 sm:w-10 xl:h-12 xl:w-12 rounded-lg bg-cyan-600/10 flex items-center justify-center flex-shrink-0 ml-2">
                                <Wallet className="h-4 w-4 sm:h-5 w-5 xl:h-6 xl:w-6 text-cyan-400" />
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                              <span className="text-primary font-bold">
                                +5.9%
                              </span>
                              <span className="text-gray-500">
                                vs last month
                              </span>
                            </div>
                          </div>

                          <div
                            onClick={() => navigate("/vendor/campaigns")}
                            className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 overflow-hidden shadow-sm dark:shadow-none cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                          >
                            <div className="flex justify-between items-start mb-1.5 sm:mb-2">
                              <div className="overflow-hidden">
                                <div className="text-xl sm:text-2xl xl:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1 truncate">
                                  {overviewSelectedCampaignCount}
                                </div>
                                <div className="text-[10px] sm:text-xs text-gray-500 font-medium">
                                  Total Campaigns
                                </div>
                              </div>
                              <div className="h-9 w-9 sm:h-10 sm:w-10 xl:h-12 xl:w-12 rounded-lg bg-purple-600/10 flex items-center justify-center flex-shrink-0 ml-2">
                                <BadgeCheck className="h-4 w-4 sm:h-5 w-5 xl:h-6 xl:w-6 text-purple-400" />
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500">
                              <span className="font-medium">
                                Selected: {overviewSelectedCampaignCount}
                              </span>
                              <span className="text-gray-400">|</span>
                              <span>All: {campaigns.length}</span>
                            </div>
                          </div>

                          <div
                            onClick={() =>
                              navigate("/vendor/campaigns", {
                                state: { campaignTab: "active" },
                              })
                            }
                            className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 overflow-hidden shadow-sm dark:shadow-none cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                          >
                            <div className="flex justify-between items-start mb-1.5 sm:mb-2">
                              <div className="overflow-hidden">
                                <div className="text-xl sm:text-2xl xl:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1 truncate">
                                  {isOverviewAll
                                    ? qrStats.active
                                    : Math.max(0, qrStats.active)}
                                </div>
                                <div className="text-[10px] sm:text-xs text-gray-500 font-medium">
                                  Active QRs
                                </div>
                              </div>
                              <div className="h-9 w-9 sm:h-10 sm:w-10 xl:h-12 xl:w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 ml-2">
                                <QrCode className="h-4 w-4 sm:h-5 w-5 xl:h-6 xl:w-6 text-primary" />
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500">
                              <span className="font-medium">
                                Selected: {qrStats.recharged}
                              </span>
                              <span className="text-gray-400">|</span>
                              <span>
                                Managed:{" "}
                                {isOverviewAll
                                  ? qrStats.campaignManagedTotal
                                  : overviewSelectedQrTotal}
                              </span>
                            </div>
                          </div>

                          <div
                            onClick={() => navigate("/vendor/customers")}
                            className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 overflow-hidden shadow-sm dark:shadow-none cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                          >
                            <div className="flex justify-between items-start mb-1.5 sm:mb-2">
                              <div className="overflow-hidden">
                                <div className="text-xl sm:text-2xl xl:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1 truncate">
                                  {overviewSelectedQrRedeemed}
                                </div>
                                <div className="text-[10px] sm:text-xs text-gray-500 font-medium">
                                  QRs Redeemed
                                </div>
                              </div>
                              <div className="h-9 w-9 sm:h-10 sm:w-10 xl:h-12 xl:w-12 rounded-lg bg-pink-600/10 flex items-center justify-center flex-shrink-0 ml-2">
                                <Store className="h-4 w-4 sm:h-5 w-5 xl:h-6 xl:w-6 text-pink-400" />
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500">
                              <span className="font-medium">
                                Selected: {overviewSelectedQrRedeemed}
                              </span>
                              <span className="text-gray-400">|</span>
                              <span>All: {qrStats.redeemed}</span>
                            </div>
                          </div>
                        </div>

                        <VendorAnalytics
                          redemptionSeries={overviewRedemptionSeries}
                          locationSeries={overviewLocationClusters.map((cluster) => ({
                            name: [cluster.city, cluster.state]
                              .filter(Boolean)
                              .join(", ") || "Unknown location",
                            totalCustomers: cluster.totalCustomers,
                          }))}
                          selectionLabel={overviewCampaignLabel}
                          dateFilter={dateFilter}
                          onDateFilterChange={setDateFilter}
                        />

                        <div className="grid grid-cols-1 xl:grid-cols-[1.75fr_1fr] gap-4">
                          <div className="bg-white dark:bg-[#1a1a1a] rounded-none sm:rounded-xl border-y sm:border border-gray-100 dark:border-gray-800 p-4 sm:p-5 shadow-sm dark:shadow-none">
                            <div className="flex items-center justify-between gap-3 mb-4">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-emerald-600/15 flex items-center justify-center">
                                  <MapPin
                                    size={16}
                                    className="text-emerald-600 dark:text-emerald-400"
                                  />
                                </div>
                                <div>
                                  <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                                    Location Analytics
                                  </h3>
                                  <p className="text-xs text-gray-500">
                                    Live map preview from redemption scans
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => navigate("/vendor/locations")}
                                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 inline-flex items-center gap-1"
                              >
                                Open full map
                                <ChevronRight size={14} />
                              </button>
                            </div>

                            {overviewLocationsError &&
                              overviewLocationPoints.length === 0 && (
                                <div className="mb-3 rounded-lg border border-rose-200 dark:border-rose-400/20 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">
                                  {overviewLocationsError}
                                </div>
                              )}

                            {isLoadingOverviewLocations &&
                            overviewLocationPoints.length === 0 ? (
                              <div className="h-[320px] rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-zinc-900 flex items-center justify-center text-sm text-gray-500">
                                Loading map preview...
                              </div>
                            ) : overviewLocationPoints.length === 0 ? (
                              <div className="h-[320px] rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-zinc-900 flex flex-col items-center justify-center gap-2 text-sm text-gray-500">
                                <MapPin size={18} className="text-gray-400" />
                                No location points yet. Customer activity will appear here when people scan.
                              </div>
                            ) : (
                              <div className="h-[320px] rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 relative z-0">
                                <MapContainer
                                  center={locationMapCenter}
                                  style={{ zIndex: 0 }}
                                  zoom={5}
                                  minZoom={3}
                                  maxBounds={[
                                    [-85, -180],
                                    [85, 180],
                                  ]}
                                  maxBoundsViscosity={1.0}
                                  worldCopyJump={true}
                                  scrollWheelZoom={false}
                                  attributionControl={false}
                                  className="h-full w-full"
                                >
                                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                                  <TileLayer url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
                                  {overviewLocationPoints
                                    .slice(0, 120)
                                    .map((point, index) => (
                                      <Marker
                                        key={`overview-loc-${point.lat}-${point.lng}-${index}`}
                                        position={[
                                          Number(point.lat),
                                          Number(point.lng),
                                        ]}
                                      >
                                        <Popup>
                                          <div className="text-xs min-w-[140px]">
                                            <div className="font-semibold text-gray-900">
                                              {point.city || point.state
                                                ? `${point.city || ""}${point.city && point.state ? ", " : ""}${point.state || ""}${point.pincode ? ` - ${point.pincode}` : ""}`
                                                : "Unknown area"}
                                            </div>
                                            <div className="text-gray-600 mt-0.5">
                                              {getClusterCustomerCount(point)} {getClusterCustomerCount(point) === 1 ? "customer" : "customers"}
                                            </div>
                                          </div>
                                        </Popup>
                                      </Marker>
                                    ))}
                                </MapContainer>
                              </div>
                            )}
                          </div>

                          <div className="bg-white dark:bg-[#1a1a1a] rounded-none sm:rounded-xl border-y sm:border border-gray-100 dark:border-gray-800 p-4 sm:p-5 shadow-sm dark:shadow-none">
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-zinc-900 p-3">
                                <div className="text-[11px] text-gray-500">
                                  Regions
                                </div>
                                <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                                  {overviewLocationSummary.regions}
                                </div>
                              </div>
                              <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-zinc-900 p-3">
                                <div className="text-[11px] text-gray-500">
                                  Total Customers
                                </div>
                                <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                                  {overviewLocationSummary.scans} customers
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                Top Regions
                              </h4>
                              <span className="text-xs text-gray-500">
                                {overviewLocationClusters.length} tracked
                              </span>
                            </div>
                            <div className="space-y-2 max-h-[244px] overflow-y-auto pr-1">
                              {overviewLocationClusters.length === 0 ? (
                                <div className="text-xs text-gray-500 py-8 text-center rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                  No regional data available.
                                </div>
                              ) : (
                                overviewLocationClusters
                                  .slice(0, 8)
                                  .map((cluster, index) => (
                                    <button
                                      type="button"
                                      key={`overview-cluster-${cluster.city}-${cluster.state}-${index}`}
                                      onClick={() =>
                                        navigate("/vendor/locations")
                                      }
                                      className="w-full rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-zinc-900 p-3 flex items-center justify-between cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all group text-left"
                                    >
                                      <div className="min-w-0">
                                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                                          {formatLocationLabel(cluster)}
                                                  </div>
                                        <div className="text-[11px] text-gray-500 mt-0.5">
                                          {cluster.totalCustomers} {cluster.totalCustomers === 1 ? "customer" : "customers"}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-gray-400">
                                          #{index + 1}
                                        </span>
                                        <ChevronRight
                                          size={14}
                                          className="text-gray-300 group-hover:text-emerald-500 transition-colors"
                                        />
                                      </div>
                                    </button>
                                  ))
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          id="overview"
                          className="bg-white dark:bg-[#1a1a1a] rounded-none sm:rounded-xl border-y sm:border border-gray-100 dark:border-gray-800 p-4 sm:p-5 shadow-sm dark:shadow-none"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                                <Store size={16} className="text-blue-400" />
                              </div>
                              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                Recent Redemptions
                              </h3>
                            </div>
                            <button
                              onClick={() => navigate("/vendor/scan")}
                              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                            >
                              Scan New
                            </button>
                          </div>

                          {isLoadingRecentRedemptions ? (
                            <div className="text-center py-8 text-gray-500 text-sm">
                              Loading recent redemptions...
                            </div>
                          ) : recentRedemptionsError ? (
                            <div className="text-center py-8 text-red-500 text-sm">
                              {recentRedemptionsError}
                            </div>
                          ) : displayedRecentRedemptions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-sm">
                              No redemptions yet. Share your QR codes to get
                              started!
                            </div>
                          ) : (
                            <div className="w-full">
                              {/* Desktop Table View */}
                              <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left text-sm text-gray-400">
                                  <thead className="text-xs uppercase bg-gray-100 dark:bg-[#252525] text-gray-500 dark:text-gray-300">
                                    <tr>
                                      <th className="px-4 py-3 rounded-l-lg">
                                        Time
                                      </th>
                                      <th className="px-4 py-3">Campaign</th>
                                      <th className="px-4 py-3">Amount</th>
                                      <th className="px-4 py-3 rounded-r-lg text-right">
                                        Hash
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
                                    {displayedRecentRedemptions.map(
                                      (redemption) => (
                                        <tr
                                          key={redemption.id}
                                          className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                        >
                                          <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                              {redemption?.createdAt
                                                ? format(
                                                    new Date(
                                                      redemption.createdAt,
                                                    ),
                                                    "dd MMM yyyy",
                                                  )
                                                : "-"}
                                            </div>
                                            <div className="text-[10px] text-gray-500">
                                              {redemption?.createdAt
                                                ? format(
                                                    new Date(
                                                      redemption.createdAt,
                                                    ),
                                                    "h:mm a",
                                                  )
                                                : "-"}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3">
                                            <div className="truncate max-w-[150px] text-gray-900 dark:text-white">
                                              {redemption?.campaign?.title ||
                                                "Unknown Campaign"}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 font-bold text-primary">
                                            {"\u20B9"}
                                            {formatAmount(
                                              redemption?.amount || 0,
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">
                                            {redemption?.qr?.hash
                                              ? `${redemption.qr.hash.slice(0, 8)}...`
                                              : "-"}
                                          </td>
                                        </tr>
                                      ),
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              {/* Mobile Card View */}
                              <div className="sm:hidden divide-y divide-gray-100 dark:divide-zinc-800/80">
                                {displayedRecentRedemptions.map(
                                  (redemption) => (
                                    <div
                                      key={redemption.id}
                                      className="p-4 space-y-3 hover:bg-emerald-50/10 transition-colors"
                                    >
                                      <div className="flex justify-between items-center gap-2">
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-0.5">
                                            Campaign
                                          </span>
                                          <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                                            {redemption?.campaign?.title ||
                                              "Unknown Campaign"}
                                          </span>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-0.5">
                                            Amount
                                          </div>
                                          <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                            ₹
                                            {formatAmount(
                                              redemption?.amount || 0,
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-end gap-2 bg-gray-50 dark:bg-zinc-800/30 p-2.5 rounded-lg border border-gray-100 dark:border-zinc-800/50">
                                        <div className="flex flex-col">
                                          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-0.5">
                                            Scanned At
                                          </span>
                                          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">
                                            {redemption?.createdAt
                                              ? format(
                                                  new Date(
                                                    redemption.createdAt,
                                                  ),
                                                  "dd MMM, h:mm a",
                                                )
                                              : "-"}
                                          </span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-0.5">
                                            QR Hash
                                          </span>
                                          <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                                            {redemption?.qr?.hash
                                              ? redemption.qr.hash.slice(0, 12)
                                              : "-"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {displayTab === "brand" && (
                      <div className="space-y-6 pb-20">
                        <div
                          className="bg-white dark:bg-[#1a1a1a] rounded-none sm:rounded-xl border-y sm:border border-gray-100 dark:border-gray-800 p-4 sm:p-5 shadow-sm dark:shadow-none"
                          id="brand"
                        >
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                              <Store size={22} className="text-primary" />
                              Profile & Brand Settings
                            </div>
                          </div>

                          <div className="text-sm text-gray-500 mb-8 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10 flex items-start gap-3">
                            <Info
                              size={18}
                              className="text-primary mt-0.5 shrink-0"
                            />
                            <div>
                              <span className="font-semibold text-gray-900 dark:text-gray-100 block mb-1">
                                Profile Management
                              </span>
                              Your company details, brand information, and
                              contact preferences can be updated here. These
                              details will be visible on your public profile.
                            </div>
                          </div>

                          <div className="space-y-6">
                            {/* Business Identity */}
                            <div className="pt-2 border-b border-gray-100 dark:border-white/5 pb-2">
                              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Building2 size={16} />
                                Business Identity
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                    Company name
                                  </label>
                                  <input
                                    type="text"
                                    value={companyProfile.businessName}
                                    onChange={handleCompanyChange(
                                      "businessName",
                                    )}
                                    placeholder="Legal company name"
                                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                    Brand name
                                  </label>
                                  <input
                                    type="text"
                                    value={brandProfile.name}
                                    onChange={(event) =>
                                      setBrandProfile((prev) => ({
                                        ...prev,
                                        name: event.target.value,
                                      }))
                                    }
                                    placeholder="Brand display name"
                                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                    Designation
                                  </label>
                                  <input
                                    type="text"
                                    value={companyProfile.designation}
                                    onChange={handleCompanyChange(
                                      "designation",
                                    )}
                                    placeholder="e.g. CEO, Manager"
                                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                    GSTIN
                                  </label>
                                  <input
                                    type="text"
                                    value={companyProfile.gstin}
                                    onChange={handleCompanyChange("gstin")}
                                    placeholder="GST Number"
                                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Contact Information */}
                            <div className="pt-2 border-b border-gray-100 dark:border-white/5 pb-2">
                              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Phone size={16} />
                                Contact Details
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                    Contact phone
                                  </label>
                                  <div className="relative">
                                    <Phone
                                      size={18}
                                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                    />
                                    <input
                                      type="tel"
                                      value={companyProfile.contactPhone}
                                      onChange={handleCompanyChange(
                                        "contactPhone",
                                      )}
                                      placeholder="Primary contact"
                                      className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-11 pr-4 py-3 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                    Alternate Mobile
                                  </label>
                                  <div className="relative">
                                    <Phone
                                      size={18}
                                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                    />
                                    <input
                                      type="tel"
                                      value={companyProfile.alternatePhone}
                                      onChange={handleCompanyChange(
                                        "alternatePhone",
                                      )}
                                      placeholder="Alternate contact"
                                      className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-11 pr-4 py-3 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                    Contact email
                                  </label>
                                  <div className="relative">
                                    <Mail
                                      size={18}
                                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                    />
                                    <input
                                      type="email"
                                      value={companyProfile.contactEmail}
                                      onChange={handleCompanyChange(
                                        "contactEmail",
                                      )}
                                      placeholder="contact@brand.com"
                                      className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-11 pr-4 py-3 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                    Website
                                  </label>
                                  <div className="relative">
                                    <Globe
                                      size={18}
                                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                    />
                                    <input
                                      type="text"
                                      value={brandProfile.website}
                                      onChange={(event) =>
                                        setBrandProfile((prev) => ({
                                          ...prev,
                                          website: event.target.value,
                                        }))
                                      }
                                      placeholder="https://brand.com"
                                      className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-11 pr-4 py-3 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Brand Assets */}
                            <div className="pt-2 border-b border-gray-100 dark:border-white/5 pb-6">
                              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <ImageIcon size={16} />
                                Brand Assets
                              </h4>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                  Brand Logo
                                </label>
                                <div className="flex items-center gap-6 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
                                  <div className="relative group shrink-0">
                                    <input
                                      type="file"
                                      id="brand-logo-upload"
                                      className="hidden"
                                      accept="image/*"
                                      onChange={handleBrandLogoUpload}
                                      disabled={isUploadingBrandLogo}
                                    />
                                    <label
                                      htmlFor="brand-logo-upload"
                                      className={`relative block h-32 w-32 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary dark:hover:border-primary cursor-pointer transition-all bg-white dark:bg-black ${isUploadingBrandLogo ? "opacity-50 cursor-not-allowed" : ""}`}
                                    >
                                      {brandLogoPreviewSrc &&
                                      !imageLoadError ? (
                                        <img
                                          src={brandLogoPreviewSrc}
                                          alt="Brand logo"
                                          className="h-full w-full object-contain p-1"
                                          onError={() =>
                                            setImageLoadError(true)
                                          }
                                        />
                                      ) : (
                                        <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 gap-2">
                                          <ImageIcon size={32} />
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Upload
                                          size={24}
                                          className="text-white"
                                        />
                                      </div>
                                    </label>
                                    {isUploadingBrandLogo && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 rounded-2xl">
                                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 space-y-3">
                                    <div>
                                      <label
                                        htmlFor="brand-logo-upload"
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer transition-colors shadow-sm"
                                      >
                                        <Upload
                                          size={18}
                                          className="text-primary"
                                        />
                                        {brandProfile.logoUrl
                                          ? "Change Logo"
                                          : "Upload Logo"}
                                      </label>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      Recommended: Square image (e.g.,
                                      512x512px). Supports JPG, PNG.
                                    </p>
                                    {brandLogoError && (
                                      <p className="text-sm text-red-500 font-medium">
                                        {brandLogoError}
                                      </p>
                                    )}
                                    {brandLogoStatus && (
                                      <p className="text-sm text-primary font-medium">
                                        {brandLogoStatus}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Registered Address */}
                            <div className="pt-2">
                              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <MapPin size={16} />
                                Registered Address
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 md:col-span-2">
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                    Street Address
                                  </label>
                                  <input
                                    type="text"
                                    value={companyProfile.address}
                                    onChange={handleCompanyChange("address")}
                                    placeholder="Block, Street, Area"
                                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                    City
                                  </label>
                                  <input
                                    type="text"
                                    value={companyProfile.city}
                                    onChange={handleCompanyChange("city")}
                                    placeholder="City"
                                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                        State
                                      </label>
                                      <input
                                        type="text"
                                        value={companyProfile.state}
                                        onChange={handleCompanyChange("state")}
                                        placeholder="State"
                                        className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                        Pincode
                                      </label>
                                      <input
                                        type="text"
                                        value={companyProfile.pincode}
                                        onChange={handleCompanyChange(
                                          "pincode",
                                        )}
                                        placeholder="Pincode"
                                        className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="pt-6 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-zinc-800 mt-8">
                            {(registrationStatus || registrationError) && (
                              <div
                                className={`text-sm font-medium ${registrationError ? "text-red-500" : "text-primary"}`}
                              >
                                {registrationStatus || registrationError}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={handleRegistrationSave}
                              disabled={isSavingRegistration}
                              className="bg-primary hover:bg-primary-strong text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 disabled:opacity-70 transition-all active:scale-[0.98] flex items-center gap-2"
                            >
                              {isSavingRegistration ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save size={18} />
                                  Save Company Profile
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div
                            id="login-profile"
                            className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] p-5 shadow-sm space-y-6"
                          >
                            <div className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                              <User size={20} className="text-primary" />
                              Login Profile
                            </div>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                  Name
                                </label>
                                <input
                                  type="text"
                                  value={accountProfile.name}
                                  onChange={handleAccountChange("name")}
                                  placeholder="Your name"
                                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                  Login email
                                </label>
                                <input
                                  type="email"
                                  value={accountProfile.email}
                                  onChange={handleAccountChange("email")}
                                  placeholder="you@company.com"
                                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                  Username
                                </label>
                                <input
                                  type="text"
                                  value={accountProfile.username}
                                  onChange={handleAccountChange("username")}
                                  placeholder="Unique username"
                                  disabled={true}
                                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-base text-gray-500 dark:text-gray-400 outline-none transition-all cursor-not-allowed opacity-80"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                  Phone
                                </label>
                                <input
                                  type="tel"
                                  value={accountProfile.phoneNumber}
                                  onChange={handleAccountChange("phoneNumber")}
                                  placeholder="Contact number"
                                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                />
                              </div>
                            </div>
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={handleAccountSave}
                                disabled={isSavingAccount}
                                className="w-full rounded-xl bg-primary hover:bg-primary text-white text-sm font-bold py-3 transition-all shadow-lg shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-2"
                              >
                                {isSavingAccount ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  "Send OTP to Save"
                                )}
                              </button>

                              {showProfileOtp && (
                                <div className="mt-4 p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4 animate-in fade-in slide-in-from-top-2">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                      Enter OTP sent to email
                                    </label>
                                    <input
                                      type="text"
                                      value={profileOtp}
                                      onChange={(e) =>
                                        setProfileOtp(e.target.value)
                                      }
                                      placeholder="6-digit OTP"
                                      className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-gray-900 dark:text-white focus:border-primary outline-none transition-all"
                                      maxLength={6}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={handleVerifyAndSaveProfile}
                                      disabled={
                                        isSavingAccount ||
                                        !profileOtp ||
                                        profileOtp.length < 6
                                      }
                                      className="flex-1 rounded-xl bg-primary hover:bg-primary-strong text-white text-sm font-bold py-3 transition-all disabled:opacity-60"
                                    >
                                      {isSavingAccount
                                        ? "Verifying..."
                                        : "Verify & Save"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowProfileOtp(false);
                                        setProfileOtp("");
                                        setAccountError("");
                                        setAccountStatus("");
                                      }}
                                      className="px-4 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400 text-sm font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                              {(accountStatus || accountError) && (
                                <div
                                  className={`text-sm text-center mt-3 font-medium ${accountError ? "text-red-500" : "text-primary"}`}
                                >
                                  {accountStatus || accountError}
                                </div>
                              )}
                            </div>
                          </div>

                          <div
                            id="login-security"
                            className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] p-5 shadow-sm space-y-6"
                          >
                            <div className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                              <ShieldCheck size={20} className="text-primary" />
                              Password & Recovery
                            </div>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                  Old password
                                </label>
                                <input
                                  type="password"
                                  value={passwordForm.oldPassword}
                                  onChange={handlePasswordFieldChange(
                                    "oldPassword",
                                  )}
                                  placeholder="Enter old password"
                                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                  New password
                                </label>
                                <input
                                  type="password"
                                  value={passwordForm.newPassword}
                                  onChange={handlePasswordFieldChange(
                                    "newPassword",
                                  )}
                                  placeholder="Create new password"
                                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                  Confirm new password
                                </label>
                                <input
                                  type="password"
                                  value={passwordForm.confirmPassword}
                                  onChange={handlePasswordFieldChange(
                                    "confirmPassword",
                                  )}
                                  placeholder="Re-enter new password"
                                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-400"
                                />
                              </div>
                            </div>
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={handlePasswordSubmit}
                                disabled={isChangingPassword}
                                className="w-full rounded-xl bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white text-sm font-bold py-3 transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
                              >
                                {isChangingPassword ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Updating...
                                  </>
                                ) : (
                                  "Update Password"
                                )}
                              </button>
                              {(passwordStatus || passwordError) && (
                                <div
                                  className={`text-sm text-center mt-3 font-medium ${passwordError ? "text-red-500" : "text-primary"}`}
                                >
                                  {passwordStatus || passwordError}
                                </div>
                              )}
                            </div>

                            <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
                              <button
                                type="button"
                                onClick={() => setShowOtpReset((prev) => !prev)}
                                className="text-sm font-semibold text-primary hover:text-primary-strong dark:text-primary dark:hover:text-primary-strong transition-colors flex items-center gap-1"
                              >
                                Forgot old password? Use OTP
                              </button>

                              {showOtpReset && (
                                <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                                  <div className="space-y-3">
                                    <div className="space-y-1">
                                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                        Email
                                      </label>
                                      <input
                                        type="email"
                                        value={otpReset.email}
                                        onChange={handleOtpFieldChange("email")}
                                        placeholder="you@company.com"
                                        className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                        OTP
                                      </label>
                                      <input
                                        type="text"
                                        value={otpReset.otp}
                                        onChange={handleOtpFieldChange("otp")}
                                        placeholder="Enter OTP"
                                        className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                        New password
                                      </label>
                                      <div className="relative">
                                        <input
                                          type={
                                            otpReset.showNewPassword
                                              ? "text"
                                              : "password"
                                          }
                                          value={otpReset.newPassword}
                                          onChange={handleOtpFieldChange(
                                            "newPassword",
                                          )}
                                          placeholder="New pass"
                                          className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 pr-9 py-2 text-sm text-gray-900 dark:text-gray-100"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setOtpReset((p) => ({
                                              ...p,
                                              showNewPassword:
                                                !p.showNewPassword,
                                            }))
                                          }
                                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                        >
                                          {otpReset.showNewPassword ? (
                                            <EyeOff size={16} />
                                          ) : (
                                            <Eye size={16} />
                                          )}
                                        </button>
                                      </div>
                                      {otpReset.newPassword &&
                                        (() => {
                                          const pass = otpReset.newPassword;
                                          let score = 0;
                                          if (pass.length >= 6) score += 1;
                                          if (pass.length >= 8) score += 1;
                                          if (/[A-Z]/.test(pass)) score += 1;
                                          if (/[0-9]/.test(pass)) score += 1;
                                          if (/[^A-Za-z0-9]/.test(pass))
                                            score += 1;
                                          const isStrong = score >= 5;
                                          const isMedium =
                                            score === 3 || score === 4;
                                          const label = isStrong
                                            ? "Strong"
                                            : isMedium
                                              ? "Medium"
                                              : "Weak";
                                          const colorClass = isStrong
                                            ? "bg-emerald-500"
                                            : isMedium
                                              ? "bg-amber-500"
                                              : "bg-red-500";
                                          const textClass = isStrong
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : isMedium
                                              ? "text-amber-600 dark:text-amber-400"
                                              : "text-red-600 dark:text-red-400";
                                          return (
                                            <div className="mt-1.5 space-y-1.5 animate-in fade-in">
                                              <div className="flex gap-1 h-1 w-full">
                                                <div
                                                  className={`flex-1 rounded-full ${score >= 1 ? colorClass : "bg-gray-200 dark:bg-zinc-700"}`}
                                                ></div>
                                                <div
                                                  className={`flex-1 rounded-full ${score >= 3 ? colorClass : "bg-gray-200 dark:bg-zinc-700"}`}
                                                ></div>
                                                <div
                                                  className={`flex-1 rounded-full ${score >= 5 ? colorClass : "bg-gray-200 dark:bg-zinc-700"}`}
                                                ></div>
                                              </div>
                                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-[10px] gap-1">
                                                <span
                                                  className={`font-bold tracking-wide ${textClass}`}
                                                >
                                                  {label}
                                                </span>
                                                <span className="text-gray-500 dark:text-gray-400 font-medium">
                                                  Use 8+ chars, 1 uppercase, 1
                                                  symbol
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                        Confirm
                                      </label>
                                      <div className="relative">
                                        <input
                                          type={
                                            otpReset.showConfirmPassword
                                              ? "text"
                                              : "password"
                                          }
                                          value={otpReset.confirmPassword}
                                          onChange={handleOtpFieldChange(
                                            "confirmPassword",
                                          )}
                                          placeholder="Confirm pass"
                                          className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 pr-9 py-2 text-sm text-gray-900 dark:text-gray-100"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setOtpReset((p) => ({
                                              ...p,
                                              showConfirmPassword:
                                                !p.showConfirmPassword,
                                            }))
                                          }
                                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                        >
                                          {otpReset.showConfirmPassword ? (
                                            <EyeOff size={16} />
                                          ) : (
                                            <Eye size={16} />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 pt-1">
                                    <button
                                      type="button"
                                      onClick={handleSendOtp}
                                      disabled={isSendingOtp}
                                      className="w-full rounded-lg border border-primary/40 bg-white dark:bg-transparent text-primary dark:text-primary text-sm font-semibold py-2 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors disabled:opacity-60"
                                    >
                                      {isSendingOtp ? "Sending..." : "Send OTP"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleOtpResetPassword}
                                      disabled={isResettingOtp}
                                      className="w-full rounded-lg bg-primary hover:bg-primary text-white text-sm font-semibold py-2 transition-colors disabled:opacity-60"
                                    >
                                      {isResettingOtp
                                        ? "Resetting..."
                                        : "Reset"}
                                    </button>
                                  </div>
                                  {(otpStatus || otpError) && (
                                    <div
                                      className={`text-xs text-center font-medium ${otpError ? "text-red-500" : "text-primary"}`}
                                    >
                                      {otpStatus || otpError}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {displayTab === "campaigns" && (
                      <div
                        className="bg-white dark:bg-zinc-900 rounded-none sm:rounded-2xl border-y sm:border border-gray-100 dark:border-zinc-800 p-4 shadow-sm space-y-4"
                        id="campaigns"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                            <BadgeCheck
                              size={16}
                              className="text-primary-strong"
                            />
                            Campaigns
                          </div>
                          <button
                            type="button"
                            onClick={() => loadCampaigns()}
                            className={ICON_BUTTON}
                          >
                            <RefreshCw size={16} />
                          </button>
                        </div>

                        {/* Campaign Sub-tabs */}
                        <div className="flex border-b border-gray-200 dark:border-zinc-800 overflow-x-auto scrollbar-hide whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
                          <button
                            onClick={() => setCampaignTab("create")}
                            className={combineClasses(
                              getTabButtonClass(campaignTab === "create"),
                              "flex-1 min-w-fit text-center",
                            )}
                          >
                            <span className="sm:hidden">Create</span>
                            <span className="hidden sm:inline">
                              Create Campaign
                            </span>
                          </button>
                          <button
                            onClick={() => setCampaignTab("pending")}
                            className={combineClasses(
                              getTabButtonClass(campaignTab === "pending"),
                              "flex-1 min-w-fit text-center",
                            )}
                          >
                            <span className="sm:hidden">
                              Pending ({pendingCampaigns.length})
                            </span>
                            <span className="hidden sm:inline">
                              Pending Campaigns ({pendingCampaigns.length})
                            </span>
                          </button>
                          <button
                            onClick={() => setCampaignTab("active")}
                            className={combineClasses(
                              getTabButtonClass(campaignTab === "active"),
                              "flex-1 min-w-fit text-center",
                            )}
                          >
                            <span className="sm:hidden">
                              Active ({activeCampaignDisplayCampaigns.length})
                            </span>
                            <span className="hidden sm:inline">
                              Active Campaigns ({activeCampaignDisplayCampaigns.length})
                            </span>
                          </button>
                        </div>
                        {/* Create Campaign Tab */}
                        {campaignTab === "create" && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Campaign title
                              </label>
                              <input
                                type="text"
                                value={campaignForm.title}
                                onChange={handleCampaignChange("title")}
                                placeholder="e.g. Diwali Cashback"
                                className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                  Product
                                </label>
                              </div>
                              <select
                                value={campaignForm.productId}
                                onChange={handleCampaignChange("productId")}
                                required
                                className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                              >
                                <option value="">Select Product...</option>
                                <option
                                  value="ADD_NEW_PRODUCT"
                                  className="text-primary font-bold"
                                >
                                  + Add New Product
                                </option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <textarea
                                rows="2"
                                value={campaignForm.description}
                                onChange={handleCampaignChange("description")}
                                placeholder="Short campaign summary (Optional)"
                                className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                              />
                            </div>

                            <div className="space-y-3">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Allocations
                              </label>
                              {campaignRows.map((row, index) => (
                                <div
                                  key={row.id}
                                  className="grid grid-cols-12 gap-2 items-end"
                                >
                                  {campaignForm.planType !== "postpaid" && (
                                    <div className="col-span-3 space-y-1">
                                      <label className="text-[10px] uppercase tracking-wide text-gray-400">
                                        Cashback
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={row.cashbackAmount}
                                        onChange={(e) =>
                                          handleCampaignRowChange(
                                            row.id,
                                            "cashbackAmount",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Amt"
                                        className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                                      />
                                    </div>
                                  )}
                                  <div
                                    className={`${
                                      campaignForm.planType === "postpaid"
                                        ? "col-span-6"
                                        : "col-span-4"
                                    } space-y-1`}
                                  >
                                    <label className="text-[10px] uppercase tracking-wide text-gray-400">
                                      Number of QRs Required
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={row.quantity}
                                      onChange={(e) =>
                                        handleCampaignRowChange(
                                          row.id,
                                          "quantity",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Qty"
                                      className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                                    />
                                  </div>

                                  {campaignForm.planType === "postpaid" && (
                                    <div className="col-span-6 space-y-1">
                                      <label className="text-[10px] uppercase tracking-wide text-gray-400">
                                        Total QRs
                                      </label>
                                      <div className="w-full rounded-lg border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/40 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 font-medium">
                                        {row.quantity || 0} QRs
                                      </div>
                                    </div>
                                  )}

                                  {campaignForm.planType !== "postpaid" && (
                                    <>
                                      <div className="col-span-4 space-y-1">
                                        <label className="text-[10px] uppercase tracking-wide text-gray-400">
                                          Total ({"\u20B9"})
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={formatAllocationTotal(row)}
                                          readOnly
                                          placeholder="Total"
                                          className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                                        />
                                      </div>
                                      <div className="col-span-1 pb-1.5 flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveCampaignRow(row.id)
                                          }
                                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                          aria-label="Remove row"
                                        >
                                          <Ban size={16} />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>

                            {campaignForm.planType !== "postpaid" && (
                              <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-900/40 px-3 py-2 text-xs">
                                <span className="text-gray-500 dark:text-gray-400">
                                  Subtotal ({campaignAllocationSummary.quantity}{" "}
                                  QRs)
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                  {"\u20B9"}
                                  {formatAmount(
                                    campaignAllocationSummary.subtotal,
                                  )}
                                </span>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                  Start Date
                                </label>
                                <input
                                  type="date"
                                  required
                                  value={campaignForm.startDate}
                                  onChange={(e) =>
                                    setCampaignForm((prev) => ({
                                      ...prev,
                                      startDate: e.target.value,
                                    }))
                                  }
                                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                  End Date
                                </label>
                                <input
                                  type="date"
                                  required
                                  value={campaignForm.endDate}
                                  min={campaignForm.startDate}
                                  onChange={(e) =>
                                    setCampaignForm((prev) => ({
                                      ...prev,
                                      endDate: e.target.value,
                                    }))
                                  }
                                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={handleCreateCampaign}
                                disabled={isSavingCampaign}
                                className={`w-full sm:w-auto sm:px-10 ${PRIMARY_BUTTON}`}
                              >
                                {isSavingCampaign
                                  ? "Creating..."
                                  : "Create Campaign"}
                              </button>
                            </div>
                            {campaignStatus && (
                              <div className="text-xs text-primary font-semibold">
                                {campaignStatus}
                              </div>
                            )}
                            {campaignError && (
                              <div className="text-xs text-red-600 font-semibold">
                                {campaignError}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Active Campaigns Tab */}
                        {campaignTab === "active" && (
                          <div className="space-y-4">
                            {showQrGenerator && (
                              <div className="rounded-xl border border-gray-100 dark:border-zinc-800 p-4 space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                                    <QrCode
                                      size={16}
                                      className="text-primary-strong"
                                    />
                                    Campaign QR Funding
                                  </div>
                                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                    Prebuilt QRs {"->"} Create recharge batches
                                    {" ->"} Fund selected quantity
                                  </div>
                                </div>

                                <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3">
                                  <div className="text-xs font-semibold text-primary">
                                    How to use this section
                                  </div>
                                  <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4 text-[11px]">
                                    <div className="rounded-lg bg-white/70 dark:bg-zinc-900/70 px-2.5 py-2">
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        Step 1:
                                      </span>{" "}
                                      Create campaign
                                    </div>
                                    <div className="rounded-lg bg-white/70 dark:bg-zinc-900/70 px-2.5 py-2">
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        Step 2:
                                      </span>{" "}
                                      Pay and activate campaign
                                    </div>
                                    <div className="rounded-lg bg-white/70 dark:bg-zinc-900/70 px-2.5 py-2">
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        Step 3:
                                      </span>{" "}
                                      Create recharge batches
                                    </div>
                                    <div className="rounded-lg bg-white/70 dark:bg-zinc-900/70 px-2.5 py-2">
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        Step 4:
                                      </span>{" "}
                                      Apply the batch recharge to make them
                                      redeemable
                                    </div>
                                  </div>
                                </div>

                                {fundableCampaigns.length === 0 && (
                                  <div className="rounded-xl border border-amber-300/50 bg-amber-50/70 dark:bg-amber-900/10 px-3 py-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-xs text-amber-800 dark:text-amber-200">
                                      No campaign yet. Create campaign first,
                                      then fund from your selected series.
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setCampaignTab("pending")}
                                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-400/60 text-amber-700 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/20"
                                    >
                                      Open Pending Campaigns
                                    </button>
                                  </div>
                                )}

                                <div className="grid gap-3 md:grid-cols-3">
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                      Campaign
                                    </label>
                                    <select
                                      value={selectedQrCampaign}
                                      onChange={(event) =>
                                        setSelectedQrCampaign(
                                          event.target.value,
                                        )
                                      }
                                      disabled={!fundableCampaigns.length}
                                      className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                                    >
                                      <option value="">Select campaign</option>
                                      {fundableCampaigns.map((campaign) => (
                                        <option
                                          key={campaign.id}
                                          value={campaign.id}
                                        >
                                          {campaign.title} (
                                          {String(
                                            campaign.status || "",
                                          ).toLowerCase() === "pending"
                                            ? "Pending"
                                            : "Active"}
                                          )
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                        Product
                                      </label>
                                    </div>
                                    <select
                                      value={selectedQrProduct}
                                      onChange={(event) => {
                                        const value = event.target.value;
                                        if (value === "ADD_NEW_PRODUCT") {
                                          setProductModalContext("qr");
                                          setEditingProduct(null);
                                          setShowProductModal(true);
                                        } else {
                                          setSelectedQrProduct(value);
                                        }
                                      }}
                                      disabled={!fundableCampaigns.length}
                                      className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                                    >
                                      <option value="">Select product</option>
                                      <option
                                        value="ADD_NEW_PRODUCT"
                                        className="text-primary font-bold"
                                      >
                                        + Add New Product
                                      </option>
                                      {products.map((product) => (
                                        <option
                                          key={product.id}
                                          value={product.id}
                                        >
                                          {product.name}
                                          {product.variant
                                            ? ` - ${product.variant}`
                                            : ""}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                        QR Series
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => loadQrInventorySeries()}
                                        className="text-[10px] text-primary hover:underline"
                                      >
                                        Refresh
                                      </button>
                                    </div>
                                    <select
                                      value={selectedQrSeries}
                                      onChange={(event) =>
                                        setSelectedQrSeries(event.target.value)
                                      }
                                      className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                                    >
                                      <option value="">
                                        Any available series
                                      </option>
                                      {qrInventorySeries.map((series) => (
                                        <option
                                          key={`${series.seriesCode}-${series.sourceBatch || "na"}`}
                                          value={series.seriesCode}
                                        >
                                          {series.seriesCode} (
                                          {series.availableCount})
                                        </option>
                                      ))}
                                    </select>
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                      {qrInventorySeries.length
                                        ? "Series values come from your pre-provisioned inventory."
                                        : "No explicit series found. Recharge will use any available inventory."}
                                    </div>
                                  </div>
                                </div>

                                <div className="grid gap-2 md:grid-cols-2 text-[11px]">
                                  <div className="rounded-lg border border-gray-200/80 dark:border-zinc-800 px-2.5 py-2 text-gray-600 dark:text-gray-300">
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                      Download prebuilt:
                                    </span>{" "}
                                    gets printable inventory QRs. No wallet
                                    deduction.
                                  </div>
                                  <div className="rounded-lg border border-gray-200/80 dark:border-zinc-800 px-2.5 py-2 text-gray-600 dark:text-gray-300">
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                      Generate QRs:
                                    </span>{" "}
                                    allocates inventory to campaign and locks
                                    cashback in wallet.
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={handleDownloadInventoryPdf}
                                    disabled={
                                      isDownloadingPdf ===
                                      `inventory:${selectedQrSeries || "all"}`
                                    }
                                    className={SECONDARY_BUTTON}
                                  >
                                    {isDownloadingPdf ===
                                    `inventory:${selectedQrSeries || "all"}`
                                      ? "Downloading..."
                                      : selectedQrSeries
                                        ? `Download Prebuilt (${selectedQrSeries})`
                                        : "Download Prebuilt QRs"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      selectedInventoryBulkExportJob?.isReady
                                        ? handleDownloadBulkExportJob(
                                            selectedInventoryBulkExportJob,
                                          )
                                        : handleStartInventoryBulkExport()
                                    }
                                    disabled={
                                      startingBulkExportKey ===
                                        `inventory:${selectedQrSeries || "all"}` ||
                                      downloadingBulkExportJobId ===
                                        selectedInventoryBulkExportJob?.id
                                    }
                                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-700 dark:text-cyan-200 hover:bg-cyan-500/15 disabled:opacity-60 transition-colors"
                                  >
                                    {startingBulkExportKey ===
                                    `inventory:${selectedQrSeries || "all"}`
                                      ? "Starting..."
                                      : downloadingBulkExportJobId ===
                                          selectedInventoryBulkExportJob?.id
                                        ? "Downloading..."
                                        : selectedInventoryBulkExportJob?.isReady
                                          ? "Download Ready Export"
                                          : "Start Background Export"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleOrderQrs}
                                    disabled={
                                      !fundableCampaigns.length ||
                                      !selectedQrCampaign ||
                                      (selectedCampaignRequiresProduct &&
                                        !selectedQrProduct) ||
                                      isOrdering
                                    }
                                    className={SUCCESS_BUTTON}
                                  >
                                    {isOrdering
                                      ? selectedCampaignIsPending
                                        ? "Activating..."
                                        : "Generating..."
                                      : selectedCampaignIsPending
                                        ? "Activate & Fund"
                                        : "Generate QRs"}
                                  </button>
                                </div>
                                {selectedInventoryBulkExportJob && (
                                  <div className="rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-gray-50/80 dark:bg-zinc-900/60 px-3 py-2 text-[11px] text-gray-600 dark:text-gray-300">
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                      Inventory export:
                                    </span>{" "}
                                    {selectedInventoryBulkExportJob.status ===
                                    "completed"
                                      ? "Ready to download"
                                      : selectedInventoryBulkExportJob.status ===
                                          "failed"
                                        ? "Failed"
                                        : `${selectedInventoryBulkExportJob.progressPercent || 0}% complete`}
                                    {" | "}
                                    {selectedInventoryBulkExportJob.totalQrs?.toLocaleString?.() ||
                                      selectedInventoryBulkExportJob.totalQrs ||
                                      0}{" "}
                                    QRs
                                  </div>
                                )}
                                {qrOrderStatus && (
                                  <div className="text-xs text-primary font-semibold">
                                    {qrOrderStatus}
                                  </div>
                                )}
                                {qrOrderError && (
                                  <div className="text-xs text-red-600 font-semibold">
                                    {qrOrderError}
                                  </div>
                                )}
                                {lastBatchSummary && (
                                  <div className="rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary-strong/20 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="text-sm font-bold text-primary">
                                        Order Invoice
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        {format(
                                          new Date(lastBatchSummary.timestamp),
                                          "PPP p",
                                        )}
                                      </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div>
                                        <div className="text-[10px] uppercase tracking-wide text-gray-500">
                                          Campaign
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                          {lastBatchSummary.campaignTitle}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] uppercase tracking-wide text-gray-500">
                                          Quantity
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                          {lastBatchSummary.totalQrs || 0} QRs
                                        </div>
                                      </div>
                                    </div>
                                    <div className="border-t border-primary/30 pt-3 flex items-center justify-between gap-3">
                                      <div className="text-xs text-gray-400">
                                        Payment recorded. Admin will ship the QR
                                        codes after processing.
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const invoiceData = {
                                              id: lastBatchSummary.id,
                                              date: lastBatchSummary.timestamp,
                                              campaign:
                                                lastBatchSummary.campaignTitle,
                                              quantity:
                                                lastBatchSummary.totalQrs,
                                            };
                                            const invoiceText = `
INVOICE #${invoiceData.id}
Date: ${format(new Date(invoiceData.date), "PPP p")}
----------------------------------------
Campaign: ${invoiceData.campaign}
Quantity: ${invoiceData.quantity} QRs
----------------------------------------
                                      `.trim();
                                            const blob = new Blob(
                                              [invoiceText],
                                              { type: "text/plain" },
                                            );
                                            const url =
                                              URL.createObjectURL(blob);
                                            const a =
                                              document.createElement("a");
                                            a.href = url;
                                            a.download = `invoice-${invoiceData.id}.txt`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                          }}
                                          className="text-xs font-semibold text-primary hover:text-primary-strong px-3 py-1.5 rounded-lg border border-primary/30 hover:bg-primary/10"
                                        >
                                          Download Invoice
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="space-y-4">
                              {activeCampaignDisplayCampaigns.length === 0 ? (
                                <div className="text-xs text-center text-gray-500 py-4 space-y-2">
                                  <div>No active or paused campaign found.</div>
                                  <div>
                                    Create or activate a campaign from Pending
                                    Campaigns to see details here.
                                  </div>
                                </div>
                              ) : (
                                (() => {
                                  const grouped = activeCampaignDisplayCampaigns.reduce(
                                    (acc, c) => {
                                      const p =
                                        c.Product?.name || "Other Campaigns";
                                      if (!acc[p]) acc[p] = [];
                                      acc[p].push(c);
                                      return acc;
                                    },
                                    {},
                                  );
                                  return Object.entries(grouped).map(
                                    ([productName, campaigns]) => {
                                      const isCollapsed =
                                        collapsedCampaignGroups[
                                          `active-${productName}`
                                        ];
                                      return (
                                        <div
                                          key={productName}
                                          className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm"
                                        >
                                          <div
                                            className={`flex items-center justify-between cursor-pointer select-none ${isCollapsed ? "" : "mb-6"}`}
                                            onClick={() =>
                                              toggleCampaignGroup(
                                                `active-${productName}`,
                                              )
                                            }
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="h-4 w-4 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                              </div>
                                              <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight flex items-center gap-2">
                                                <span className="text-gray-400 dark:text-zinc-500 text-[11px] tracking-widest">
                                                  PRODUCT:
                                                </span>
                                                {productName}
                                              </h3>
                                              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-gray-200 dark:border-zinc-700">
                                                {campaigns.length} Campaigns
                                              </span>
                                            </div>
                                            <div className="text-gray-400">
                                              <ChevronRight
                                                size={18}
                                                className={`transform transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                                              />
                                            </div>
                                          </div>
                                          <div
                                            className={`space-y-4 ${isCollapsed ? "hidden" : "block"}`}
                                          >
                                            {campaigns.map((campaign) => (
                                              <CampaignCard
                                                key={campaign.id}
                                                campaign={campaign}
                                                campaignStats={
                                                  campaignStatsMap[
                                                    campaign.id
                                                  ] ||
                                                  campaignStatsMap[
                                                    `title:${campaign.title}`
                                                  ] ||
                                                  {}
                                                }
                                                token={token}
                                                onDownloadQr={
                                                  handleDownloadCampaignPdf
                                                }
                                                onStartBulkExport={
                                                  handleStartCampaignBulkExport
                                                }
                                                campaignExportJob={campaignBulkExportJobsMap.get(
                                                  campaign.id,
                                                )}
                                                isStartingBulkExportId={
                                                  startingBulkExportKey ===
                                                  `campaign:${campaign.id}`
                                                    ? campaign.id
                                                    : ""
                                                }
                                                onDownloadReadyExport={
                                                  handleDownloadBulkExportJob
                                                }
                                                onViewDetails={
                                                  setSelectedActiveCampaign
                                                }
                                                onDelete={handleDeleteCampaign}
                                                deletingCampaignId={
                                                  deletingCampaignId
                                                }
                                                isDownloadingPdf={
                                                  isDownloadingPdf
                                                }
                                                loadCampaigns={(t) =>
                                                  refreshCampaignPaymentState(
                                                    t || token,
                                                  )
                                                }
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    },
                                  );
                                })()
                              )}
                            </div>
                          </div>
                        )}

                        {campaignTab === "active" &&
                          pausedCampaignDisplayCampaigns.length > 0 && (
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-rose-200/70 bg-rose-50/40 dark:border-rose-500/20 dark:bg-rose-950/10 p-4 shadow-sm">
                              <div className="flex items-center gap-2 mb-4 text-rose-600 dark:text-rose-300 font-bold text-sm uppercase tracking-widest">
                                <Ban size={16} /> On Hold
                                <span className="text-[10px] font-bold text-rose-500 bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                                  {pausedCampaignDisplayCampaigns.length} Campaigns
                                </span>
                              </div>
                              <div className="space-y-4">
                                {pausedCampaignDisplayCampaigns.map((campaign) => (
                                  <CampaignCard
                                    key={campaign.id}
                                    campaign={campaign}
                                    campaignStats={
                                      campaignStatsMap[campaign.id] ||
                                      campaignStatsMap[
                                        `title:${campaign.title}`
                                      ] ||
                                      {}
                                    }
                                    token={token}
                                    onDownloadQr={handleDownloadCampaignPdf}
                                    onStartBulkExport={
                                      handleStartCampaignBulkExport
                                    }
                                    campaignExportJob={campaignBulkExportJobsMap.get(
                                      campaign.id,
                                    )}
                                    isStartingBulkExportId={
                                      startingBulkExportKey ===
                                      `campaign:${campaign.id}`
                                        ? campaign.id
                                        : ""
                                    }
                                    onDownloadReadyExport={
                                      handleDownloadBulkExportJob
                                    }
                                    onViewDetails={setSelectedActiveCampaign}
                                    onDelete={handleDeleteCampaign}
                                    deletingCampaignId={deletingCampaignId}
                                    isDownloadingPdf={isDownloadingPdf}
                                    loadCampaigns={(t) =>
                                      refreshCampaignPaymentState(t || token)
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Pending Campaigns Tab */}
                        {campaignTab === "pending" && (
                          <div className="space-y-4">
                            {pendingCampaigns.length === 0 ? (
                              <div className="text-xs text-center text-gray-500 py-4">
                                No pending campaigns found.
                              </div>
                            ) : (
                              (() => {
                                const grouped = pendingCampaigns.reduce(
                                  (acc, c) => {
                                    const p =
                                      c.Product?.name || "Other Campaigns";
                                    if (!acc[p]) acc[p] = [];
                                    acc[p].push(c);
                                    return acc;
                                  },
                                  {},
                                );
                                return Object.entries(grouped).map(
                                  ([productName, campaigns]) => {
                                    const isCollapsed =
                                      collapsedCampaignGroups[
                                        `pending-${productName}`
                                      ];
                                    return (
                                      <div
                                        key={productName}
                                        className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm"
                                      >
                                        {/* Product Group Header */}
                                        <div
                                          className={`flex items-center justify-between cursor-pointer select-none ${isCollapsed ? "" : "mb-6"}`}
                                          onClick={() =>
                                            toggleCampaignGroup(
                                              `pending-${productName}`,
                                            )
                                          }
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="h-4 w-4 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                            </div>
                                            <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight flex items-center gap-2">
                                              <span className="text-gray-400 dark:text-zinc-500 text-[11px] tracking-widest">
                                                PRODUCT:
                                              </span>
                                              {productName}
                                            </h3>
                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-gray-200 dark:border-zinc-700">
                                              {campaigns.length} Campaigns
                                            </span>
                                          </div>
                                          <div className="text-gray-400">
                                            <ChevronRight
                                              size={18}
                                              className={`transform transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                                            />
                                          </div>
                                        </div>

                                        <div
                                          className={`space-y-4 ${isCollapsed ? "hidden" : "block"}`}
                                        >
                                          {campaigns.map((campaign) => {
                                            const allocationGroups =
                                              buildAllocationGroups(
                                                campaign.allocations,
                                              );
                                            const totalQty =
                                              allocationGroups.reduce(
                                                (sum, group) =>
                                                  sum + group.quantity,
                                                0,
                                              );
                                            const fallbackBudget =
                                              allocationGroups.reduce(
                                                (sum, group) =>
                                                  sum + group.totalBudget,
                                                0,
                                              );
                                            const totalBudget =
                                              parseNumericValue(
                                                campaign.subtotal,
                                                parseNumericValue(
                                                  campaign.totalBudget,
                                                  fallbackBudget,
                                                ),
                                              );
                                            const firstCashback =
                                              allocationGroups[0]?.price ?? 0;

                                            return (
                                              <div
                                                key={campaign.id}
                                                className="rounded-2xl border border-amber-200/40 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/60 px-4 py-4 shadow-sm transition-all hover:border-amber-400/50 hover:shadow-md"
                                              >
                                                {/* Card Header */}
                                                <div className="flex items-start justify-between gap-3 mb-4">
                                                  <div className="space-y-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                      <div className="text-base font-bold text-gray-900 dark:text-white truncate">
                                                        {campaign.title}
                                                      </div>
                                                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20 shrink-0">
                                                        Pending
                                                      </span>
                                                    </div>
                                                    {campaign.Product?.name && (
                                                      <div className="text-[11px] font-bold text-primary/80 uppercase tracking-tight">
                                                        {campaign.Product.name}
                                                      </div>
                                                    )}
                                                    <div className="text-[10px] text-gray-500 font-medium">
                                                      ID:{" "}
                                                      {campaign.id.slice(0, 10)}
                                                      ...
                                                    </div>
                                                  </div>
                                                  {/* Desktop Actions */}
                                                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        handleDeleteCampaign(
                                                          campaign,
                                                        )
                                                      }
                                                      disabled={
                                                        deletingCampaignId ===
                                                        campaign.id
                                                      }
                                                      className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-60"
                                                    >
                                                      <Ban size={14} />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        handlePayCampaign(
                                                          campaign,
                                                        )
                                                      }
                                                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary text-white font-semibold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs"
                                                    >
                                                      Pay & Activate
                                                      <ArrowRight size={13} />
                                                    </button>
                                                  </div>
                                                </div>

                                                {/* Stats Grid */}
                                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                  <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/80 dark:bg-zinc-900/60 px-3 py-3">
                                                    <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                                                      Budget
                                                    </div>
                                                    <div className="text-sm font-black text-gray-900 dark:text-white">
                                                      {!(
                                                        campaign.planType ===
                                                          "postpaid" &&
                                                        totalBudget === 0
                                                      ) ? (
                                                        `INR ${formatAmount(totalBudget)}`
                                                      ) : (
                                                        <span className="text-amber-500 text-[10px]">
                                                          TBD
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/80 dark:bg-zinc-900/60 px-3 py-3">
                                                    <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                                                      Total QRs
                                                    </div>
                                                    <div className="text-sm font-black text-gray-900 dark:text-white">
                                                      {totalQty || 0}
                                                    </div>
                                                  </div>
                                                  <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/80 dark:bg-zinc-900/60 px-3 py-3">
                                                    <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                                                      Cashback
                                                    </div>
                                                    <div className="text-sm font-black text-primary">
                                                      {firstCashback > 0 ? (
                                                        `₹${formatAmount(firstCashback)}`
                                                      ) : (
                                                        <span className="text-amber-500 text-[10px]">
                                                          TBD
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/80 dark:bg-zinc-900/60 px-3 py-3">
                                                    <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                                                      Plan
                                                    </div>
                                                    <div className="text-sm font-black text-gray-900 dark:text-white capitalize">
                                                      {campaign.planType ||
                                                        "prepaid"}
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Dates */}
                                                <div className="flex flex-wrap items-center gap-3 mt-3 px-1">
                                                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                                      Start:
                                                    </span>
                                                    <span>
                                                      {campaign.startDate
                                                        ? formatShortDate(
                                                            campaign.startDate,
                                                          )
                                                        : "—"}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                                      End:
                                                    </span>
                                                    <span>
                                                      {campaign.endDate
                                                        ? formatShortDate(
                                                            campaign.endDate,
                                                          )
                                                        : "—"}
                                                    </span>
                                                  </div>
                                                </div>

                                                {/* Mobile Actions - icon buttons row */}
                                                <div className="flex flex-wrap items-center justify-center gap-3 pt-5 sm:hidden border-t border-gray-100 dark:border-zinc-800/50 mt-4">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleDeleteCampaign(
                                                        campaign,
                                                      )
                                                    }
                                                    disabled={
                                                      deletingCampaignId ===
                                                      campaign.id
                                                    }
                                                    className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-60 shadow-sm active:scale-95"
                                                    title="Put Campaign on Hold"
                                                  >
                                                    <Ban size={16} />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handlePayCampaign(
                                                        campaign,
                                                      )
                                                    }
                                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 active:scale-[0.98] transition-all text-sm"
                                                  >
                                                    Pay & Activate
                                                    <ArrowRight size={14} />
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  },
                                );
                              })()
                            )}
                          </div>
                        )}

                        {/* Pending Campaign Details Modal */}
                        {selectedPendingCampaign && (
                          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-safe-4 bg-black/50 backdrop-blur-sm">
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto ios-scroll shadow-2xl border border-gray-100 dark:border-zinc-800">
                              <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                      {selectedPendingCampaign.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {format(
                                        new Date(
                                          selectedPendingCampaign.startDate,
                                        ),
                                        "MMM dd",
                                      )}{" "}
                                      -{" "}
                                      {format(
                                        new Date(
                                          selectedPendingCampaign.endDate,
                                        ),
                                        "MMM dd, yyyy",
                                      )}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() =>
                                      setSelectedPendingCampaign(null)
                                    }
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                                  >
                                    <X size={20} className="text-gray-500" />
                                  </button>
                                </div>

                                {selectedPendingCampaign.description && (
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 ml-1">
                                      Description
                                    </p>
                                    <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-gray-100 dark:border-zinc-800">
                                      {selectedPendingCampaign.description}
                                    </div>
                                  </div>
                                )}

                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <Package
                                      size={16}
                                      className="text-primary"
                                    />
                                    Allocations Breakdown
                                  </h4>
                                  <div className="border border-gray-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                      <thead className="bg-gray-50 dark:bg-zinc-800/50 text-xs uppercase text-gray-500 font-medium">
                                        <tr>
                                          <th className="px-4 py-3">
                                            Cashback
                                          </th>
                                          <th className="px-4 py-3 text-center">
                                            Qty
                                          </th>
                                          <th className="px-4 py-3 text-right">
                                            Budget
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {(
                                          selectedPendingCampaign.allocations ||
                                          []
                                        )
                                          .filter(
                                            (alloc) =>
                                              selectedPendingCampaign?.planType !==
                                                "postpaid" ||
                                              alloc.cashbackAmount > 0,
                                          )
                                          .map((alloc, idx) => (
                                            <tr
                                              key={idx}
                                              className="bg-white dark:bg-zinc-900"
                                            >
                                              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                INR{" "}
                                                {formatAmount(
                                                  alloc.cashbackAmount,
                                                )}
                                              </td>
                                              <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                                                {alloc.quantity}
                                              </td>
                                              <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                                                INR{" "}
                                                {formatAmount(
                                                  alloc.totalBudget,
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                      </tbody>
                                      <tfoot className="bg-gray-50 dark:bg-zinc-800/30 text-gray-900 dark:text-white">
                                        {/* Subtotal row */}
                                        {selectedPendingCampaign?.planType !==
                                          "postpaid" && (
                                          <tr className="font-semibold border-b border-dashed border-gray-200 dark:border-zinc-700">
                                            <td className="px-4 py-3">
                                              Cashback Subtotal
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                              {pendingCampaignPayment.totalQty}{" "}
                                              QRs
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                              INR{" "}
                                              {formatAmount(
                                                pendingCampaignPayment.baseBudget,
                                              )}
                                            </td>
                                          </tr>
                                        )}
                                        {/* Fee breakdown */}
                                        {(() => {
                                          const qrBaseRate = parseNumericValue(
                                            qrPricePerUnit,
                                            1,
                                          );
                                          const totalQrBaseCost =
                                            pendingCampaignPayment.totalQty *
                                            qrBaseRate;
                                          const voucherFeePerQr =
                                            pendingCampaignPayment.voucherFeePerQr ||
                                            0;
                                          const totalVoucherBaseCost =
                                            pendingCampaignPayment.totalQty *
                                            voucherFeePerQr;
                                          const totalFeesBase =
                                            totalQrBaseCost +
                                            totalVoucherBaseCost;
                                          const totalGst =
                                            totalFeesBase *
                                            CAMPAIGN_FEE_GST_RATE;
                                          return (
                                            <>
                                              <tr
                                                className={
                                                  selectedPendingCampaign?.planType ===
                                                  "postpaid"
                                                    ? "text-sm text-gray-800 dark:text-gray-200"
                                                    : "text-xs text-gray-500 font-normal"
                                                }
                                              >
                                                <td
                                                  className="px-4 pt-3 pb-1"
                                                  colSpan="2"
                                                >
                                                  QR Generation Fees (Excl. GST)
                                                  <div
                                                    className={
                                                      selectedPendingCampaign?.planType ===
                                                      "postpaid"
                                                        ? "text-xs text-gray-600 dark:text-gray-400"
                                                        : "text-[10px] text-gray-400"
                                                    }
                                                  >
                                                    INR{" "}
                                                    {formatAmount(qrBaseRate)}
                                                    /QR ×{" "}
                                                    {
                                                      pendingCampaignPayment.totalQty
                                                    }
                                                  </div>
                                                </td>
                                                <td className="px-4 pt-3 pb-1 text-right">
                                                  + INR{" "}
                                                  {formatAmount(
                                                    totalQrBaseCost,
                                                  )}
                                                </td>
                                              </tr>
                                              {voucherFeePerQr > 0 && (
                                                <tr
                                                  className={
                                                    selectedPendingCampaign?.planType ===
                                                    "postpaid"
                                                      ? "text-sm text-gray-800 dark:text-gray-200"
                                                      : "text-xs text-gray-500 font-normal"
                                                  }
                                                >
                                                  <td
                                                    className="px-4 py-1"
                                                    colSpan="2"
                                                  >
                                                    Voucher Fees (Excl. GST)
                                                    <div
                                                      className={
                                                        selectedPendingCampaign?.planType ===
                                                        "postpaid"
                                                          ? "text-xs text-gray-600 dark:text-gray-400"
                                                          : "text-[10px] text-gray-400"
                                                      }
                                                    >
                                                      INR{" "}
                                                      {formatAmount(
                                                        voucherFeePerQr,
                                                      )}
                                                      /QR ×{" "}
                                                      {
                                                        pendingCampaignPayment.totalQty
                                                      }
                                                    </div>
                                                  </td>
                                                  <td className="px-4 py-1 text-right">
                                                    + INR{" "}
                                                    {formatAmount(
                                                      totalVoucherBaseCost,
                                                    )}
                                                  </td>
                                                </tr>
                                              )}
                                              <tr
                                                className={
                                                  selectedPendingCampaign?.planType ===
                                                  "postpaid"
                                                    ? "text-sm text-gray-800 dark:text-gray-200 border-b border-dashed border-gray-200 dark:border-zinc-700 font-semibold"
                                                    : "text-xs text-gray-500 font-normal border-b border-dashed border-gray-200 dark:border-zinc-700"
                                                }
                                              >
                                                <td
                                                  className="px-4 pt-1 pb-3"
                                                  colSpan="2"
                                                >
                                                  GST (18%)
                                                </td>
                                                <td className="px-4 pt-1 pb-3 text-right">
                                                  + INR {formatAmount(totalGst)}
                                                </td>
                                              </tr>
                                            </>
                                          );
                                        })()}
                                      </tfoot>
                                    </table>
                                  </div>
                                </div>

                                <div className="bg-primary/5 dark:bg-primary-strong/10 border border-primary/10 dark:border-primary-strong/30 rounded-xl p-4 space-y-3">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">
                                      Wallet Balance
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                      INR {formatAmount(pendingWalletBalance)}
                                    </span>
                                  </div>
                                  <div className="h-px bg-primary/20 dark:bg-primary-strong/30"></div>
                                  <div className="flex items-center justify-between text-base font-bold text-primary-strong dark:text-primary">
                                    <span>Total Payable</span>
                                    <span>
                                      INR{" "}
                                      {pendingCampaignPayment.totalCost.toFixed(
                                        2,
                                      )}
                                    </span>
                                  </div>
                                  {pendingCampaignShortfall > 0 && (
                                    <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                                      Add INR{" "}
                                      {pendingCampaignShortfall.toFixed(2)} to
                                      wallet to enable payment.
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                  <button
                                    onClick={() =>
                                      setSelectedPendingCampaign(null)
                                    }
                                    className={SECONDARY_BUTTON}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() =>
                                      handlePayCampaign(selectedPendingCampaign)
                                    }
                                    disabled={
                                      isPayingCampaign ||
                                      !canPaySelectedPendingCampaign
                                    }
                                    className={`flex-1 ${PRIMARY_BUTTON} flex items-center justify-center gap-2 ${
                                      !canPaySelectedPendingCampaign &&
                                      !isPayingCampaign
                                        ? "opacity-60 cursor-not-allowed"
                                        : ""
                                    }`}
                                  >
                                    {isPayingCampaign ? (
                                      <>Processing...</>
                                    ) : !canPaySelectedPendingCampaign ? (
                                      <>Insufficient Balance</>
                                    ) : (
                                      <>
                                        <Wallet size={18} />
                                        Pay & Activate
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Active Campaign Details Modal */}
                        {activeCampaignDetails && activeCampaign && (
                          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-safe-4 bg-black/50 backdrop-blur-sm">
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-3xl max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto ios-scroll shadow-2xl border border-gray-100 dark:border-zinc-800">
                              <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                      {activeCampaign.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {formatShortDate(
                                        activeCampaign.startDate,
                                      )}{" "}
                                      -{" "}
                                      {formatShortDate(activeCampaign.endDate)}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() =>
                                      setSelectedActiveCampaign(null)
                                    }
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                                  >
                                    <X size={20} className="text-gray-500" />
                                  </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                                  <span className="px-3 py-1 rounded-full bg-primary/15 text-primary font-semibold">
                                    Active
                                  </span>
                                  <span>ID: {activeCampaign.id}</span>
                                  {activeCampaignDetails.product && (
                                    <span>
                                      Product:{" "}
                                      {activeCampaignDetails.product.name}
                                      {activeCampaignDetails.product.variant
                                        ? ` - ${activeCampaignDetails.product.variant}`
                                        : ""}
                                    </span>
                                  )}
                                </div>

                                {activeCampaign.description && (
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 ml-1">
                                      Description
                                    </p>
                                    <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-gray-100 dark:border-zinc-800">
                                      {activeCampaign.description}
                                    </div>
                                  </div>
                                )}

                                <div className="grid gap-3 sm:grid-cols-4">
                                  <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/40 p-3">
                                    <div className="text-[10px] uppercase tracking-wide text-gray-500">
                                      Budget
                                    </div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                      {"\u20B9"}
                                      {formatAmount(
                                        activeCampaignDetails.totalBudget,
                                      )}
                                    </div>
                                  </div>
                                  <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/40 p-3">
                                    <div className="text-[10px] uppercase tracking-wide text-gray-500">
                                      Total QRs
                                    </div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                      {activeCampaignDetails.totalCount}
                                    </div>
                                  </div>
                                  <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/40 p-3">
                                    <div className="text-[10px] uppercase tracking-wide text-gray-500">
                                      Active
                                    </div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                      {activeCampaignDetails.activeCount}
                                    </div>
                                  </div>
                                  <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/40 p-3">
                                    <div className="text-[10px] uppercase tracking-wide text-gray-500">
                                      Redeemed
                                    </div>
                                    <div className="text-lg font-bold text-primary">
                                      {activeCampaignDetails.redeemedCount}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Active QRs:{" "}
                                  {activeCampaignDetails.activeCount} -
                                  Redeemed:{" "}
                                  {activeCampaignDetails.redeemedCount}
                                </div>

                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-2">
                                      <Package
                                        size={16}
                                        className="text-primary"
                                      />
                                      {activeCampaignDetails.breakdownType ===
                                      "allocation"
                                        ? "Allocation Breakdown"
                                        : "QR Breakdown"}
                                    </span>
                                    {loadingCampaignBreakdownId ===
                                      activeCampaign?.id && (
                                      <span className="text-[11px] font-medium text-gray-400">
                                        Loading full data...
                                      </span>
                                    )}
                                  </h4>
                                  <div className="border border-gray-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                      <thead className="bg-gray-50 dark:bg-zinc-800/50 text-xs uppercase text-gray-500 font-medium">
                                        <tr>
                                          <th className="px-4 py-3">
                                            Cashback
                                          </th>
                                          <th className="px-4 py-3 text-center">
                                            Qty
                                          </th>
                                          <th className="px-4 py-3 text-center">
                                            Active
                                          </th>
                                          <th className="px-4 py-3 text-center">
                                            Redeemed
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {activeCampaignDetails.breakdownRows.map(
                                          (row, idx) => (
                                            <tr
                                              key={`${activeCampaign.id}-${idx}`}
                                              className="bg-white dark:bg-zinc-900"
                                            >
                                              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                INR {formatAmount(row.cashback)}
                                              </td>
                                              <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                                                {row.quantity}
                                              </td>
                                              <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                                                {row.active || 0}
                                              </td>
                                              <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                                                {row.redeemed || 0}
                                              </td>
                                            </tr>
                                          ),
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                  <button
                                    onClick={() =>
                                      setSelectedActiveCampaign(null)
                                    }
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                  >
                                    Close
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteCampaign(activeCampaign)
                                    }
                                    disabled={
                                      deletingCampaignId === activeCampaign?.id
                                    }
                                    className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-60 cursor-pointer ${String(activeCampaign?.status || "").toLowerCase() === "paused" ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"}`}
                                  >
                                    {deletingCampaignId === activeCampaign?.id
                                      ? String(activeCampaign?.status || "").toLowerCase() === "paused"
                                        ? "Resuming..."
                                        : "Holding..."
                                      : String(activeCampaign?.status || "").toLowerCase() === "paused"
                                        ? "Resume Campaign"
                                        : "Put on Hold"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {showQrOrdersSection && (
                          <div
                            className="bg-white dark:bg-[#1a1a1a] rounded-none sm:rounded-xl border-y sm:border border-gray-100 dark:border-gray-800 p-4 sm:p-5 shadow-sm dark:shadow-none space-y-4"
                            id="qr-inventory"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
                                <ClipboardCheck
                                  size={18}
                                  className="text-primary"
                                />
                                QR Orders
                              </div>
                              <div className="flex items-center gap-2">
                                {qrHasMore && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      loadQrs(token, {
                                        page: qrPage + 1,
                                        append: true,
                                      })
                                    }
                                    disabled={isLoadingQrs}
                                    className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white cursor-pointer"
                                  >
                                    <Download size={12} />
                                    Load more
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    loadQrs(token, { page: 1, append: false })
                                  }
                                  disabled={isLoadingQrs}
                                  className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white cursor-pointer"
                                >
                                  <RefreshCw size={12} />
                                  Refresh
                                </button>
                              </div>
                            </div>
                            {isLoadingQrs && (
                              <div className="text-xs text-gray-400">
                                Loading orders...
                              </div>
                            )}
                            {qrError && (
                              <div className="text-xs text-red-500 font-semibold">
                                {qrError}
                              </div>
                            )}
                            {!isLoadingQrs && qrs.length === 0 && (
                              <div className="text-xs text-gray-500">
                                No QR orders yet. Generate QRs above.
                              </div>
                            )}
                            {showOrderTracking && (
                              <>
                                {isLoadingOrders && (
                                  <div className="text-xs text-gray-400">
                                    Loading order status...
                                  </div>
                                )}
                                {ordersError && (
                                  <div className="text-xs text-red-500 font-semibold">
                                    {ordersError}
                                  </div>
                                )}
                                {!isLoadingOrders &&
                                  ordersTotal === 0 &&
                                  orders.length === 0 && (
                                    <div className="text-xs text-gray-500">
                                      No print orders logged yet.
                                    </div>
                                  )}
                                {orders.length > 0 && (
                                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                    <table className="w-full text-xs">
                                      <thead className="bg-gray-100 dark:bg-zinc-800/60 text-gray-500 uppercase text-[10px]">
                                        <tr>
                                          <th className="px-3 py-2 text-left">
                                            Order
                                          </th>
                                          <th className="px-3 py-2 text-left">
                                            Campaign
                                          </th>
                                          <th className="px-3 py-2 text-right">
                                            Qty
                                          </th>
                                          <th className="px-3 py-2 text-left">
                                            Status
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                        {orders.map((order) => (
                                          <tr key={order.id}>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-200 font-medium">
                                              {order.id.slice(0, 8)}...
                                            </td>
                                            <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                                              {order.campaignTitle ||
                                                "Campaign"}
                                            </td>
                                            <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200">
                                              {order.quantity}
                                            </td>
                                            <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                                              <span
                                                className={getStatusClasses(
                                                  order.status,
                                                )}
                                              >
                                                {order.status}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                                {ordersHasMore && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      loadOrders(token, {
                                        page: ordersPage + 1,
                                        append: true,
                                      })
                                    }
                                    disabled={isLoadingOrders}
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                                  >
                                    Load more orders
                                  </button>
                                )}
                              </>
                            )}

                            {/* Order Summary by Campaign */}
                            {qrsGroupedByCampaign.length > 0 && (
                              <div className="space-y-3">
                                {qrsGroupedByCampaign.map((campaign) => (
                                  <div
                                    key={campaign.id}
                                    className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                                  >
                                    {/* Campaign Header */}
                                    <div className="bg-gradient-to-r from-primary/30 to-primary/10 px-4 py-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <Megaphone
                                            size={18}
                                            className="text-primary"
                                          />
                                          <div>
                                            <span className="text-base font-bold text-gray-900 dark:text-white">
                                              {campaign.title}
                                            </span>
                                            {campaign.endDate && (
                                              <span className="ml-2 text-xs text-gray-400">
                                                Expires:{" "}
                                                {format(
                                                  new Date(campaign.endDate),
                                                  "MMM dd, yyyy",
                                                )}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs">
                                          <span className="px-2 py-1 rounded-full bg-primary/20 text-primary font-semibold">
                                            {campaign.stats.active} Active
                                          </span>
                                          <span className="px-2 py-1 rounded-full bg-gray-600/20 text-gray-400 font-semibold">
                                            {campaign.stats.redeemed} Redeemed
                                          </span>
                                          <span className="text-gray-500">
                                            Total: {campaign.stats.total}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Order Summary (No QR Images) */}
                                    <div className="bg-gray-50 dark:bg-[#0f0f0f] divide-y divide-gray-200 dark:divide-gray-800">
                                      {campaign.priceGroups.map(
                                        (priceGroup) => {
                                          const groupKey = `${campaign.id}-${priceGroup.priceKey ?? priceGroup.price}`;
                                          return (
                                            <div key={groupKey} className="p-4">
                                              <div className="flex items-center">
                                                <div className="flex items-center gap-4">
                                                  <div>
                                                    <div className="text-xs text-gray-500">
                                                      Cashback Amount
                                                    </div>
                                                    <div className="text-lg font-bold text-primary">
                                                      {"\u20B9"}
                                                      {formatAmount(
                                                        priceGroup.price,
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div>
                                                    <div className="text-xs text-gray-500">
                                                      Quantity
                                                    </div>
                                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                                      {priceGroup.qrs.length}{" "}
                                                      QRs
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        },
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="text-[10px] text-gray-500 flex items-center justify-between">
                              <span>
                                Total: {qrTotalLabel} QR
                                {qrTotalLabel !== 1 ? "s" : ""} across{" "}
                                {qrsGroupedByCampaign.length} campaign
                                {qrsGroupedByCampaign.length !== 1 ? "s" : ""}
                                {qrCoverageLabel ? ` - ${qrCoverageLabel}` : ""}
                              </span>
                              <span>
                                {qrStats.redeemed} redeemed -{" "}
                                {qrStats.fundedActive} funded
                              </span>
                            </div>
                            {qrActionStatus && (
                              <div className="text-xs text-primary font-semibold">
                                {qrActionStatus}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Products Section */}
                    {displayTab === "products" && (
                      <div
                        className="bg-white dark:bg-[#1a1a1a] rounded-none sm:rounded-xl border-y sm:border border-gray-100 dark:border-gray-800 p-4 sm:p-5 shadow-sm dark:shadow-none space-y-4"
                        id="products"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
                            <Package size={18} className="text-primary" />
                            Products
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => loadProducts()}
                              disabled={isLoadingProducts}
                              className={ICON_BUTTON}
                            >
                              <RefreshCw size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct(null);
                                setShowProductModal(true);
                              }}
                              className={`${PRIMARY_BUTTON} inline-flex items-center gap-2`}
                            >
                              <Plus size={14} className="flex-shrink-0" />
                              Add Product
                            </button>
                          </div>
                        </div>

                        {/* Products List */}
                        {isLoadingProducts ? (
                          <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-r-transparent"></div>
                            <div className="text-sm text-gray-400 mt-3">
                              Loading products...
                            </div>
                          </div>
                        ) : products.length === 0 ? (
                          <div className="text-center py-12">
                            <Package
                              size={48}
                              className="mx-auto text-gray-400 mb-3"
                            />
                            <div className="text-sm text-gray-500">
                              No products yet.
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Click "Add Product" to create your first product
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Mobile Product Cards */}
                            <div className="grid grid-cols-1 gap-4 lg:hidden">
                              {products.map((product) => {
                                const imageSrc = resolveAssetUrl(
                                  product.imageUrl,
                                );
                                const hasImageError = failedProductImages.has(
                                  product.id,
                                );
                                return (
                                  <div
                                    key={`mob-prod-${product.id}`}
                                    className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 space-y-4"
                                  >
                                    <div className="flex gap-4">
                                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-gray-50 dark:bg-zinc-800 flex-shrink-0 border border-gray-100 dark:border-zinc-800">
                                        {imageSrc && !hasImageError ? (
                                          <img
                                            src={imageSrc}
                                            alt={product.name}
                                            className="h-full w-full object-cover"
                                            onError={() => {
                                              setFailedProductImages((prev) => {
                                                const next = new Set(prev);
                                                next.add(product.id);
                                                return next;
                                              });
                                            }}
                                          />
                                        ) : (
                                          <div className="h-full w-full flex items-center justify-center">
                                            <Package
                                              size={24}
                                              className="text-gray-300"
                                            />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                              {product.name}
                                            </h4>
                                            <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                                              SKU: {product.sku || "N/A"}
                                            </p>
                                          </div>
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                              product.status === "active"
                                                ? "bg-emerald-500/10 text-emerald-500"
                                                : "bg-gray-100 text-gray-500"
                                            }`}
                                          >
                                            {product.status || "active"}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                                          {product.description ||
                                            "No description provided."}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-zinc-800/50">
                                      <div>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                                          Price
                                        </p>
                                        <p className="text-sm font-black text-gray-900 dark:text-white">
                                          INR{" "}
                                          {Number(product.mrp || 0).toFixed(2)}
                                        </p>
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => {
                                            setEditingProduct(product);
                                            setShowProductModal(true);
                                          }}
                                          className="p-2 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-zinc-700"
                                        >
                                          <Edit2 size={16} />
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleDeleteProduct(product.id)
                                          }
                                          className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 border border-rose-100 dark:border-rose-900/30"
                                          aria-label="Delete product"
                                          title="Delete product"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Desktop Product Table */}
                            <div className="hidden lg:block overflow-hidden rounded-2xl border border-gray-100 dark:border-zinc-800">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-zinc-900/50 text-gray-500 text-[11px] font-black uppercase tracking-widest">
                                  <tr>
                                    <th className="px-6 py-4 text-left">
                                      Product
                                    </th>
                                    <th className="px-6 py-4 text-left">SKU</th>
                                    <th className="px-6 py-4 text-left">
                                      Category
                                    </th>
                                    <th className="px-6 py-4 text-left">MRP</th>
                                    <th className="px-6 py-4 text-left">
                                      Status
                                    </th>
                                    <th className="px-6 py-4 text-right">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                                  {products.map((product) => {
                                    const imageSrc = resolveAssetUrl(
                                      product.imageUrl,
                                    );
                                    const hasImageError =
                                      failedProductImages.has(product.id);
                                    return (
                                      <tr
                                        key={`tab-prod-${product.id}`}
                                        className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                                      >
                                        <td className="px-6 py-4">
                                          <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-xl overflow-hidden bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-800">
                                              {imageSrc && !hasImageError ? (
                                                <img
                                                  src={imageSrc}
                                                  alt={product.name}
                                                  className="h-full w-full object-cover"
                                                />
                                              ) : (
                                                <div className="h-full w-full flex items-center justify-center">
                                                  <Package
                                                    size={20}
                                                    className="text-gray-300"
                                                  />
                                                </div>
                                              )}
                                            </div>
                                            <div className="min-w-0">
                                              <p className="font-bold text-gray-900 dark:text-white truncate">
                                                {product.name}
                                              </p>
                                              <p className="text-xs text-gray-500 truncate">
                                                {product.variant || "Standard"}
                                              </p>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-medium">
                                          {product.sku || "-"}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-medium">
                                          {product.category || "-"}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                          INR{" "}
                                          {Number(product.mrp || 0).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                          <span
                                            className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                              product.status === "active"
                                                ? "bg-emerald-500/10 text-emerald-500"
                                                : "bg-gray-100 text-gray-500"
                                            }`}
                                          >
                                            {product.status || "active"}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                          <div className="flex justify-end gap-2">
                                            <button
                                              onClick={() => {
                                                setEditingProduct(product);
                                                setShowProductModal(true);
                                              }}
                                              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 transition-colors"
                                            >
                                              <Edit2 size={16} />
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleDeleteProduct(product.id)
                                              }
                                              className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 transition-colors"
                                          aria-label="Delete product"
                                          title="Delete product"
                                        >
                                          <Trash2 size={16} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                            <span className="bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-gray-500">
                              Total: {products.length}
                            </span>
                            <span>
                              Product{products.length !== 1 ? "s" : ""}
                            </span>
                          </div>

                          {(productStatus || productError) && (
                            <div
                              className={`text-xs font-bold ${productError ? "text-rose-500" : "text-primary"}`}
                            >
                              {productError || productStatus}
                            </div>
                          )}
                        </div>

                        {/* Navigate to Campaigns */}
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => navigate("/vendor/campaigns")}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold transition-all active:scale-[0.98]"
                          >
                            <Megaphone size={12} />
                            Go to Campaigns
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Wallet Section */}
                    {displayTab === "wallet" && (
                      <div
                        className="bg-white dark:bg-[#09090b] rounded-none sm:rounded-2xl p-4 sm:p-8 space-y-10 min-h-[80vh]"
                        id="wallet"
                      >
                        {/* Wallet Controls Header */}
                        <div className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-200">
                          <Wallet size={20} className="text-primary" />
                          Wallet controls
                        </div>

                        {/* Balance Cards */}
                        <div
                          className={`grid grid-cols-1 ${!isPostpaid ? "md:grid-cols-2" : ""} gap-6`}
                        >
                          {/* Available Balance */}
                          <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#111] p-6 shadow-sm dark:shadow-none">
                            <div className="text-xs font-medium text-gray-500 mb-2">
                              Available balance
                            </div>
                            <div
                              className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight"
                              title={`INR ${formatAmount(walletBalance)}`}
                            >
                              INR {formatAmount(walletBalance)}
                            </div>
                          </div>

                          {/* Locked Balance - only for prepaid */}
                          {!isPostpaid && (
                            <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#111] p-6 shadow-sm dark:shadow-none">
                              <div className="text-xs font-medium text-gray-500 mb-2">
                                Locked balance
                              </div>
                              <div
                                className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight"
                                title={`INR ${formatAmount(lockedBalance)}`}
                              >
                                INR {formatCompactAmount(lockedBalance)}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Recharge Section */}
                        <div className="space-y-3">
                          <label className="text-xs font-medium text-gray-500 block">
                            Recharge amount
                          </label>
                          <div className="flex gap-3">
                            <input
                              type="number"
                              min="1"
                              value={rechargeAmount}
                              onChange={(event) =>
                                setRechargeAmount(event.target.value)
                              }
                              placeholder="Enter amount in INR"
                              className="flex-1 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#111111] px-4 py-3 text-sm text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                            />
                            <button
                              type="button"
                              onClick={handleRecharge}
                              disabled={isRecharging}
                              className="rounded-xl bg-primary hover:bg-primary text-white text-sm font-semibold px-6 shadow-lg shadow-primary-strong/20 disabled:opacity-60 transition-all active:scale-[0.99] whitespace-nowrap"
                            >
                              {isRecharging
                                ? "Recharging..."
                                : "Recharge wallet"}
                            </button>
                          </div>
                        </div>

                        {/* Status Messages */}
                        {(walletStatus || walletError) && (
                          <div
                            className={`text-xs font-semibold px-1 ${walletError ? "text-red-500" : "text-primary"}`}
                          >
                            {walletStatus || walletError}
                          </div>
                        )}

                        {/* Transaction History Section */}
                        <div className="space-y-4 pt-4">
                          <div className="flex items-center justify-between">
                            <div className="text-base font-semibold text-gray-900 dark:text-gray-200">
                              Transaction history
                            </div>
                            <button
                              type="button"
                              onClick={() => loadTransactions()}
                              disabled={isLoadingTransactions}
                              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <RefreshCw size={12} />
                              Refresh
                            </button>
                          </div>

                          {isLoadingTransactions && (
                            <div className="text-xs text-gray-500 animate-pulse">
                              Loading transactions...
                            </div>
                          )}

                          {!isLoadingTransactions &&
                            transactions.length === 0 &&
                            !transactionsError && (
                              <div className="text-xs text-gray-500 py-8 text-center border border-gray-100 dark:border-zinc-900 rounded-xl bg-white dark:bg-[#111]">
                                No transactions found.
                              </div>
                            )}

                          {transactions.length > 0 && (
                            <div className="w-full">
                              {/* Desktop Table View */}
                              <div className="hidden sm:block overflow-hidden rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#111]">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-gray-50 dark:bg-[#1a1a1a] text-gray-500 font-medium border-b border-gray-100 dark:border-zinc-800">
                                    <tr>
                                      <th className="px-5 py-3.5 w-40">Date</th>
                                      <th className="px-5 py-3.5">Category</th>
                                      <th className="px-5 py-3.5 w-24">Type</th>
                                      <th className="px-5 py-3.5 w-40 text-right">
                                        Amount
                                      </th>
                                      <th className="px-5 py-3.5 w-24">
                                        Status
                                      </th>
                                      <th className="px-5 py-3.5 w-28 text-right">
                                        Invoice
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/50">
                                    {displayedTransactions.map((tx, idx) => {
                                      const typeLabel = String(
                                        tx.type || "",
                                      ).toLowerCase();
                                      const isCredit = typeLabel === "credit";

                                      return (
                                        <tr
                                          key={tx.id || idx}
                                          className="hover:bg-gray-50 dark:hover:bg-[#161616] transition-colors"
                                        >
                                          <td className="px-5 py-4 text-gray-600 dark:text-gray-400 font-medium">
                                            {formatTransactionDate(
                                              tx.createdAt,
                                            )}
                                          </td>
                                          <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                                            <div className="font-medium capitalize">
                                              {String(
                                                tx.category || "n/a",
                                              ).replace(/_/g, " ")}
                                            </div>
                                            {tx.description && (
                                              <div
                                                className="text-xs text-gray-400 mt-1 line-clamp-1"
                                                title={tx.description}
                                              >
                                                {tx.description}
                                              </div>
                                            )}
                                          </td>
                                          <td className="px-5 py-4 capitalize text-gray-500 dark:text-gray-400">
                                            {typeLabel}
                                          </td>
                                          <td className="px-5 py-4 text-right font-medium">
                                            <span
                                              className={
                                                isCredit
                                                  ? "text-primary"
                                                  : "text-rose-500"
                                              }
                                            >
                                              {isCredit ? "+" : "-"}INR{" "}
                                              {formatAmount(tx.amount)}
                                            </span>
                                          </td>
                                          <td className="px-5 py-4">
                                            <span className="text-gray-400">
                                              success
                                            </span>
                                          </td>
                                          <td className="px-5 py-4 text-right">
                                            {tx.invoiceId ? (
                                              <button
                                                type="button"
                                                onClick={() => handleWalletInvoiceDownload(tx.invoiceId)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                                              >
                                                <Download size={13} />
                                                Invoice
                                              </button>
                                            ) : (
                                              <span className="text-gray-300 dark:text-gray-600">-</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              {/* Mobile Card View */}
                              <div className="sm:hidden space-y-3">
                                {displayedTransactions.map((tx, idx) => {
                                  const typeLabel = String(
                                    tx.type || "",
                                  ).toLowerCase();
                                  const isCredit = typeLabel === "credit";

                                  return (
                                    <div
                                      key={tx.id || idx}
                                      className="p-5 space-y-4 rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#111] transition-colors"
                                    >
                                      <div className="flex justify-between items-start gap-3">
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1">
                                            Category
                                          </span>
                                          <span className="text-xs font-black text-gray-900 dark:text-white capitalize truncate">
                                            {String(
                                              tx.category || "n/a",
                                            ).replace(/_/g, " ")}
                                          </span>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1 block">
                                            Amount
                                          </span>
                                          <div
                                            className={`text-sm font-black ${
                                              isCredit
                                                ? "text-emerald-600 dark:text-emerald-400"
                                                : "text-rose-600 dark:text-rose-400"
                                            }`}
                                          >
                                            {isCredit ? "+" : "-"}INR{" "}
                                            {formatAmount(tx.amount)}
                                          </div>
                                        </div>
                                      </div>

                                      {tx.description && (
                                        <div className="bg-gray-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-gray-100/50 dark:border-zinc-800/30 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed italic">
                                          {tx.description}
                                        </div>
                                      )}

                                      {tx.invoiceId && (
                                        <button
                                          type="button"
                                          onClick={() => handleWalletInvoiceDownload(tx.invoiceId)}
                                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
                                        >
                                          <Download size={14} />
                                          Download invoice
                                        </button>
                                      )}

                                      <div className="flex justify-between items-end pt-2 border-t border-gray-50 dark:border-zinc-800/50">
                                        <div className="flex flex-col">
                                          <span className="text-[9px] text-gray-400 uppercase tracking-[0.15em] font-black mb-1">
                                            Timestamp
                                          </span>
                                          <span className="text-[11px] text-gray-600 dark:text-gray-300 font-bold">
                                            {formatTransactionDate(
                                              tx.createdAt,
                                            )}
                                          </span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                          <span className="text-[9px] text-gray-400 uppercase tracking-[0.15em] font-black mb-1">
                                            Status
                                          </span>
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100/50 dark:border-emerald-500/20 shadow-sm shadow-emerald-500/5">
                                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                                            Verified
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {transactions.length > 5 && (
                            <button
                              type="button"
                              onClick={() =>
                                setShowAllTransactions((prev) => !prev)
                              }
                              className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              {showAllTransactions
                                ? "View less"
                                : `View all (${transactions.length})`}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Customers Tab */}
                    {displayTab === "customers" && (
                      <div className="space-y-4">
                        <div className="space-y-4">
                          {/* Location filter breadcrumb */}
                          {clusterCityFilter && (
                            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl px-4 py-3">
                              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
                                Showing customers from:{" "}
                                <strong>{clusterCityFilter}</strong>
                              </span>
                              <button
                                type="button"
                                onClick={handleClearClusterFilter}
                                className="ml-auto text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 transition-colors"
                                title="Clear location filter"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  activeClusterFilterRef.current = null;
                                  setClusterCityFilter(null);
                                  setClusterLocationFilter(null);
                                  setDashboardFilters((prev) => ({
                                    ...prev,
                                    location: "",
                                  }));
                                  navigate("/vendor/locations");
                                }}
                                className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 font-medium transition-colors whitespace-nowrap"
                              >
                                ← Back to Map
                              </button>
                            </div>
                          )}
                          <div className="bg-white dark:bg-[#1a1a1a] sm:rounded-2xl border-y sm:border border-gray-100 dark:border-zinc-800 shadow-sm dark:shadow-none overflow-hidden">
                            <AdvancedFilters
                              filters={dashboardFilters}
                              setFilters={setDashboardFilters}
                              onApply={handleApplyExtraFilters}
                              campaigns={campaigns}
                              products={products}
                              showExport={true}
                              onExport={() =>
                                exportVendorCustomers(
                                  token,
                                  buildExtraFilterParams(),
                                )
                              }
                              variant="customers"
                              noCard={true}
                            />
                            {extraTabError && (
                              <p className="mx-4 mb-4 text-sm font-medium text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-lg border border-rose-200 dark:border-rose-500/20">
                                {extraTabError}
                              </p>
                            )}

                            <div className="w-full border-t border-gray-100 dark:border-zinc-800">
                              {/* Desktop Table View */}
                              <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full min-w-[900px] text-sm text-left">
                                  <thead className="bg-gray-50/80 dark:bg-[#171717]/80 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-zinc-800">
                                    <tr>
                                      <th className="px-5 py-4 font-semibold tracking-wide">
                                        Customer
                                      </th>
                                      <th className="px-5 py-4 font-semibold tracking-wide">
                                        Mobile
                                      </th>
                                      <th className="px-5 py-4 font-semibold tracking-wide">
                                        Codes
                                      </th>
                                      <th className="px-5 py-4 font-semibold tracking-wide">
                                        Rewards
                                      </th>
                                      <th className="px-5 py-4 font-semibold tracking-wide">
                                        Location
                                      </th>
                                      <th className="px-5 py-4 font-semibold tracking-wide">
                                        Joined
                                      </th>
                                      <th className="px-5 py-4 font-semibold tracking-wide">
                                        Last Scanned
                                      </th>
                                      <th className="px-5 py-4 font-semibold tracking-wide text-right">
                                        Action
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
                                    {isLoadingExtraTab ? (
                                      <tr>
                                        <td
                                          colSpan={8}
                                          className="px-6 py-12 text-center"
                                        >
                                          <div className="flex flex-col items-center justify-center gap-3">
                                            <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
                                            <span className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                                              Loading customers...
                                            </span>
                                          </div>
                                        </td>
                                      </tr>
                                    ) : customersData.length === 0 ? (
                                      <tr>
                                        <td
                                          colSpan={8}
                                          className="px-6 py-16 text-center"
                                        >
                                          <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-center mb-2">
                                              <Users className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                                            </div>
                                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                              No customers found
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                              Try adjusting your filters to see
                                              more results
                                            </p>
                                          </div>
                                        </td>
                                      </tr>
                                    ) : (
                                      customersData.map((customer) => (
                                        <tr
                                          key={
                                            customer.userId || customer.mobile
                                          }
                                          className="hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors group"
                                        >
                                          <td className="px-5 py-4 align-top">
                                            <div className="flex items-start gap-3">
                                              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                                {customer.name?.[0]?.toUpperCase() ||
                                                  "C"}
                                              </div>
                                              <span className="font-medium text-gray-900 dark:text-white break-words max-w-[150px]">
                                                {customer.name || "-"}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-5 py-4 text-gray-600 dark:text-gray-300 align-top">
                                            {customer.mobile || "-"}
                                          </td>
                                          <td className="px-5 py-4 align-top">
                                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 text-xs font-medium">
                                              {customer.codeCount || 0}
                                            </span>
                                          </td>
                                          <td className="px-5 py-4 font-semibold text-emerald-600 dark:text-emerald-400 align-top">
                                            ₹
                                            {formatAmount(
                                              customer.rewardsEarned,
                                            )}
                                          </td>
                                          <td className="px-5 py-4 text-gray-600 dark:text-gray-300 break-words max-w-[150px] align-top">
                                            {customer.firstScanLocation || "-"}
                                          </td>
                                          <td className="px-5 py-4 text-gray-500 dark:text-gray-400 break-words max-w-[120px] align-top">
                                            {formatDate(customer.memberSince)}
                                          </td>
                                          <td className="px-5 py-4 text-gray-500 dark:text-gray-400 break-words max-w-[120px] align-top">
                                            {formatDate(customer.lastScanned)}
                                          </td>
                                          <td className="px-5 py-4 text-right align-top">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedCustomerModal(
                                                  customer,
                                                );
                                                setIsCustomerModalOpen(true);
                                              }}
                                              className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-lg text-xs font-semibold transition-colors border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1 ml-auto whitespace-nowrap"
                                            >
                                              <Eye className="w-3.5 h-3.5" />
                                              View History
                                            </button>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              {/* Mobile Card View */}
                              <div className="sm:hidden divide-y divide-gray-100 dark:divide-zinc-800/80">
                                {isLoadingExtraTab ? (
                                  <div className="p-12 text-center">
                                    <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mx-auto mb-3" />
                                    <p className="text-gray-500 dark:text-gray-400 font-bold text-sm">
                                      Loading customers...
                                    </p>
                                  </div>
                                ) : customersData.length === 0 ? (
                                  <div className="p-16 text-center">
                                    <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-base font-black text-gray-900 dark:text-white">
                                      No customers found
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      Try adjusting your filters
                                    </p>
                                  </div>
                                ) : (
                                  customersData.map((customer) => (
                                    <div
                                      key={customer.userId || customer.mobile}
                                      className="p-5 space-y-4 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5 transition-colors"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-sm shrink-0 shadow-inner">
                                            {customer.name?.[0]?.toUpperCase() ||
                                              "C"}
                                          </div>
                                          <div className="flex flex-col min-w-0">
                                            <span className="font-black text-gray-900 dark:text-white truncate">
                                              {customer.name || "Customer"}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                                              {customer.mobile || "-"}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-0.5">
                                            Rewards
                                          </div>
                                          <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                            ₹
                                            {formatAmount(
                                              customer.rewardsEarned,
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-gray-100 dark:border-zinc-800/50">
                                        <div>
                                          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1">
                                            Codes
                                          </div>
                                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 text-xs font-black shadow-sm border border-gray-100 dark:border-zinc-700">
                                            {customer.codeCount || 0}
                                          </span>
                                        </div>
                                        <div>
                                          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1">
                                            Last Activity
                                          </div>
                                          <span className="text-xs font-black text-gray-700 dark:text-gray-300">
                                            {formatDate(customer.lastScanned)}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between pt-1 gap-4">
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-0.5">
                                            Location
                                          </span>
                                          <span className="text-xs text-gray-600 dark:text-gray-400 truncate font-bold">
                                            {customer.firstScanLocation ||
                                              "Unknown"}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => {
                                            setSelectedCustomerModal(customer);
                                            setIsCustomerModalOpen(true);
                                          }}
                                          className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all whitespace-nowrap"
                                        >
                                          View History
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {displayTab === "locations" && (
                      <div className="bg-white dark:bg-[#1a1a1a] sm:rounded-2xl border-y sm:border border-gray-100 dark:border-zinc-800 shadow-sm dark:shadow-none overflow-hidden">
                        <AdvancedFilters
                          filters={dashboardFilters}
                          setFilters={setDashboardFilters}
                          onApply={handleApplyExtraFilters}
                          campaigns={campaigns}
                          products={products}
                          variant="locations"
                          noCard={true}
                        />
                        {extraTabError && (
                          <p className="mx-4 mb-4 text-xs text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg border border-rose-200 dark:border-rose-500/20">
                            {extraTabError}
                          </p>
                        )}
                        {isLoadingExtraTab ? (
                          <div className="p-6 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500">
                            Loading locations...
                          </div>
                        ) : (
                          <div className="grid gap-0 lg:grid-cols-[2fr_1fr] border-t border-gray-100 dark:border-gray-800">
                            <div className="overflow-hidden">
                              <div className="h-[280px] sm:h-[350px] lg:h-[520px] relative z-0">
                                <MapContainer
                                  center={locationMapCenter}
                                  style={{ zIndex: 0 }}
                                  zoom={5}
                                  minZoom={3}
                                  maxBounds={[
                                    [-85, -180],
                                    [85, 180],
                                  ]}
                                  maxBoundsViscosity={1.0}
                                  worldCopyJump={true}
                                  attributionControl={false}
                                  className="h-full w-full"
                                >
                                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                                  <TileLayer url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
                                  {overviewLocationClusters.map((pt, i) => (
                                      <Marker
                                        key={`loc-${pt.lat}-${pt.lng}-${i}`}
                                        position={[
                                          Number(pt.lat),
                                          Number(pt.lng),
                                        ]}
                                      >
                                        <Popup>
                                          <div className="text-xs min-w-[140px]">
                                            <div className="font-semibold text-gray-900">
                                              {formatLocationLabel(pt)}
                                            </div>
                                            <div className="text-gray-600 mt-0.5">
                                              {getClusterCustomerCount(pt)} {getClusterCustomerCount(pt) === 1 ? "customer" : "customers"}
                                            </div>
                                            {pt.city && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleClusterClick(pt)
                                                }
                                                className="mt-2 w-full text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors flex items-center justify-center gap-1"
                                              >
                                                <Users size={12} />
                                                View Customers
                                              </button>
                                            )}
                                          </div>
                                        </Popup>
                                      </Marker>
                                    ))}
                                </MapContainer>
                              </div>
                            </div>
                            {(() => {
                              const grouped = {};
                              locationsData
                                .filter((pt) => getClusterCustomerCount(pt) > 0)
                                .forEach((pt) => {
                                  const city = pt.city || "";
                                  const state = pt.state || "";
                                  // If no city/state, use rounded coords as the grouping key
                                const key =
                                  city || state
                                    ? city + "|||" + state
                                    : `coord_${Number(pt.lat).toFixed(2)}_${Number(pt.lng).toFixed(2)}`;
                                if (!grouped[key]) {
                                  grouped[key] = {
                                    city: city || String(pt?.displayName || "").trim(),
                                    state,
                                    totalScans: 0,
                                    customerIds: new Set(),
                                    pincodes: new Set(),
                                    lat: pt.lat,
                                    lng: pt.lng,
                                    displayName: String(pt?.displayName || "").trim(),
                                  };
                                }
                                grouped[key].totalScans += pt.count || 0;
                                const customerIds = Array.isArray(pt.customerIds)
                                  ? pt.customerIds
                                  : pt.customerIds instanceof Set
                                    ? Array.from(pt.customerIds)
                                    : [];
                                customerIds.forEach((id) => {
                                  if (id) grouped[key].customerIds.add(id);
                                });
                                if (pt.customerId) grouped[key].customerIds.add(pt.customerId);
                                if (pt.pincode)
                                  grouped[key].pincodes.add(pt.pincode);
                              });
                              const clusters = Object.values(grouped)
                                .map((cluster) => ({
                                  ...cluster,
                                  totalCustomers: getClusterCustomerCount(cluster),
                                }))
                                .filter((cluster) => cluster.totalCustomers > 0)
                                .sort(
                                  (a, b) =>
                                    b.totalCustomers - a.totalCustomers ||
                                    b.totalScans - a.totalScans,
                                );
                              return (
                                <div className="space-y-4">
                                  <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        Clusters
                                      </div>
                                      <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {clusters.length} regions
                                      </span>
                                    </div>
                                    <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                                      {clusters.length === 0 ? (
                                        <div className="text-xs text-gray-500 py-8 text-center">
                                          No customers found.
                                        </div>
                                      ) : (
                                        clusters.map((cluster, i) => (
                                          <button
                                            type="button"
                                            key={
                                              "cluster-" +
                                              cluster.city +
                                              "-" +
                                              cluster.state +
                                              "-" +
                                              i
                                            }
                                            onClick={() =>
                                              handleClusterClick(cluster)
                                            }
                                            className="w-full text-left rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 p-3 hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all group cursor-pointer"
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                                                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                                <div className="min-w-0">
                                                  <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                                                    {formatLocationLabel(cluster)}
                                                  </div>
                                                  <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                                      {cluster.totalCustomers}{" "}
                                                      {cluster.totalCustomers === 1
                                                        ? "customer"
                                                        : "customers"}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                                                  #{i + 1}
                                                </span>
                                                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors" />
                                              </div>
                                            </div>
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {displayTab === "billing" && (
                      <div className="space-y-4">
                        <div className="rounded-none sm:rounded-xl border-y sm:border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] p-4 shadow-sm dark:shadow-none">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                            <MonthDatePicker
                              label="From date"
                              value={dashboardFilters.dateFrom}
                              max={format(new Date(), "yyyy-MM-dd")}
                              onChange={(value) =>
                                setDashboardFilters((prev) => ({
                                  ...prev,
                                  dateFrom: value,
                                }))
                              }
                            />
                            <MonthDatePicker
                              label="To date"
                              value={dashboardFilters.dateTo}
                              min={dashboardFilters.dateFrom}
                              max={format(new Date(), "yyyy-MM-dd")}
                              onChange={(value) =>
                                setDashboardFilters((prev) => ({
                                  ...prev,
                                  dateTo: value,
                                }))
                              }
                            />
                            <label className="min-w-0">
                              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                                Invoice number
                              </span>
                              <input
                                type="text"
                                placeholder="e.g. AR/26-27/000083"
                                value={dashboardFilters.invoiceNo}
                                onChange={(event) =>
                                  setDashboardFilters((prev) => ({
                                    ...prev,
                                    invoiceNo: event.target.value,
                                  }))
                                }
                                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-all placeholder:text-slate-400 hover:border-emerald-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 dark:border-zinc-700 dark:bg-[#0f0f0f] dark:placeholder:text-zinc-500"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={handleApplyExtraFilters}
                              className={`${PRIMARY_BUTTON} self-end rounded-lg`}
                            >
                              Apply
                            </button>
                            <button
                              type="button"
                              onClick={() => loadInvoicesData(token)}
                              className={`${SECONDARY_BUTTON} self-end rounded-lg`}
                            >
                              Refresh
                            </button>
                          </div>
                          {invoiceShareStatus && (
                            <p className="mt-3 text-xs text-primary">
                              {invoiceShareStatus}
                            </p>
                          )}
                          {extraTabError && (
                            <p className="mt-3 text-xs text-rose-500">
                              {extraTabError}
                            </p>
                          )}
                        </div>

                        <div className="w-full">
                          {/* Desktop Table View */}
                          <div className="hidden sm:block rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-[#1a1a1a]">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-gray-50 dark:bg-[#171717] text-gray-500 border-b border-gray-100 dark:border-zinc-800">
                                <tr>
                                  <th className="px-4 py-3">Invoice No.</th>
                                  <th className="px-4 py-3">Type</th>
                                  <th className="px-4 py-3">Issued</th>
                                  <th className="px-4 py-3">Subtotal</th>
                                  <th className="px-4 py-3">Tax</th>
                                  <th className="px-4 py-3">Total</th>
                                  <th className="px-4 py-3">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {isLoadingExtraTab ? (
                                  <tr>
                                    <td
                                      colSpan={7}
                                      className="px-4 py-6 text-center text-gray-500"
                                    >
                                      Loading invoices...
                                    </td>
                                  </tr>
                                ) : invoicesData.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={7}
                                      className="px-4 py-6 text-center text-gray-500"
                                    >
                                      No invoices found.
                                    </td>
                                  </tr>
                                ) : (
                                  invoicesData.map((invoice) => (
                                    <tr key={invoice.id}>
                                      <td className="px-4 py-3 font-mono text-[11px]">
                                        {invoice.number || invoice.id}
                                      </td>
                                      <td className="px-4 py-3">
                                        {invoice.type}
                                      </td>
                                      <td className="px-4 py-3">
                                        {formatDate(invoice.issuedAt)}
                                      </td>
                                      <td className="px-4 py-3">
                                        INR {formatAmount(invoice.subtotal)}
                                      </td>
                                      <td className="px-4 py-3">
                                        INR {formatAmount(invoice.tax)}
                                      </td>
                                      <td className="px-4 py-3">
                                        INR {formatAmount(invoice.total)}
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              downloadVendorInvoicePdf(
                                                token,
                                                invoice.id,
                                              )
                                            }
                                            className={`${SECONDARY_BUTTON} text-[11px] px-2 py-1`}
                                          >
                                            Download
                                          </button>
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              try {
                                                setInvoiceShareStatus(
                                                  "Preparing file...",
                                                );
                                                const blob =
                                                  await fetchVendorInvoicePdfBlob(
                                                    token,
                                                    invoice.id,
                                                  );
                                                if (!blob)
                                                  throw new Error(
                                                    "Could not fetch PDF",
                                                  );
                                                const file = new File(
                                                  [blob],
                                                  `Invoice_${invoice.number || invoice.id}.pdf`,
                                                  { type: "application/pdf" },
                                                );

                                                if (
                                                  navigator.canShare &&
                                                  navigator.canShare({
                                                    files: [file],
                                                  })
                                                ) {
                                                  await navigator.share({
                                                    files: [file],
                                                    title: `Invoice ${invoice.number || invoice.id}`,
                                                  });
                                                  setInvoiceShareStatus("");
                                                } else {
                                                  // Fallback if sharing files is not supported
                                                  const response =
                                                    await shareVendorInvoice(
                                                      token,
                                                      invoice.id,
                                                    );
                                                  const shareUrl =
                                                    response?.shareUrl ||
                                                    response?.url ||
                                                    "";
                                                  if (shareUrl) {
                                                    const whatsappUrl = `https://api.whatsapp.com/send/?text=${encodeURIComponent(shareUrl)}&lang=en`;
                                                    window.open(
                                                      whatsappUrl,
                                                      "_blank",
                                                    );
                                                    setInvoiceShareStatus(
                                                      "Opening WhatsApp...",
                                                    );
                                                  } else {
                                                    setInvoiceShareStatus(
                                                      "Share link generated.",
                                                    );
                                                  }
                                                }
                                              } catch (error) {
                                                setInvoiceShareStatus(
                                                  error.message ||
                                                    "Unable to generate share link.",
                                                );
                                              }
                                            }}
                                            className={`${SECONDARY_BUTTON} text-[11px] px-2 py-1`}
                                          >
                                            Share
                                          </button>
                                          {invoice.shareToken && (
                                            <a
                                              href={`${API_BASE_URL}/api/public/invoices/shared/${invoice.shareToken}`}
                                              target="_blank"
                                              rel="noreferrer"
                                              className={`${SECONDARY_BUTTON} text-[11px] px-2 py-1 inline-flex items-center`}
                                            >
                                              Open
                                            </a>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Card View */}
                          {!isLoadingExtraTab && invoicesData.length > 0 && (
                            <div className="sm:hidden space-y-4">
                              {invoicesData.map((invoice) => (
                                <div
                                  key={invoice.id}
                                  className="p-5 space-y-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#111] shadow-sm"
                                >
                                  <div className="flex justify-between items-start gap-3">
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1">
                                        Invoice No.
                                      </span>
                                      <span className="text-xs font-mono font-black text-gray-900 dark:text-white truncate">
                                        {invoice.number || invoice.id}
                                      </span>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1 block">
                                        Total Amount
                                      </span>
                                      <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                        INR {formatAmount(invoice.total)}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-50 dark:border-zinc-800/50">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] text-gray-400 uppercase tracking-[0.1em] font-black mb-1">
                                        Type
                                      </span>
                                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 capitalize">
                                        {invoice.type?.replace(/_/g, " ")}
                                      </span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                      <span className="text-[9px] text-gray-400 uppercase tracking-[0.1em] font-black mb-1">
                                        Issued At
                                      </span>
                                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                        {formatDate(invoice.issuedAt)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        downloadVendorInvoicePdf(
                                          token,
                                          invoice.id,
                                        )
                                      }
                                      className="w-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center gap-2"
                                    >
                                      <Download size={14} />
                                      Download PDF
                                    </button>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            setInvoiceShareStatus(
                                              "Preparing file...",
                                            );
                                            const blob =
                                              await fetchVendorInvoicePdfBlob(
                                                token,
                                                invoice.id,
                                              );
                                            if (!blob)
                                              throw new Error(
                                                "Could not fetch PDF",
                                              );
                                            const file = new File(
                                              [blob],
                                              `Invoice_${invoice.number || invoice.id}.pdf`,
                                              { type: "application/pdf" },
                                            );

                                            if (
                                              navigator.canShare &&
                                              navigator.canShare({
                                                files: [file],
                                              })
                                            ) {
                                              await navigator.share({
                                                files: [file],
                                                title: `Invoice ${invoice.number || invoice.id}`,
                                              });
                                              setInvoiceShareStatus("");
                                            } else {
                                              const response =
                                                await shareVendorInvoice(
                                                  token,
                                                  invoice.id,
                                                );
                                              const shareUrl =
                                                response?.shareUrl ||
                                                response?.url ||
                                                "";
                                              if (shareUrl) {
                                                const whatsappUrl = `https://api.whatsapp.com/send/?text=${encodeURIComponent(shareUrl)}&lang=en`;
                                                window.open(
                                                  whatsappUrl,
                                                  "_blank",
                                                );
                                                setInvoiceShareStatus(
                                                  "Opening WhatsApp...",
                                                );
                                              }
                                            }
                                          } catch (error) {
                                            setInvoiceShareStatus(
                                              "Error generating link",
                                            );
                                          }
                                        }}
                                        className="flex-1 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-gray-100 dark:border-zinc-800 flex items-center justify-center gap-2"
                                      >
                                        <Share2 size={12} />
                                        Share
                                      </button>
                                      {invoice.shareToken && (
                                        <a
                                          href={`${API_BASE_URL}/api/public/invoices/shared/${invoice.shareToken}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-primary/20 flex items-center justify-center gap-2"
                                        >
                                          <ExternalLink size={12} />
                                          Open
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Mobile Loading/Empty States */}
                          {isLoadingExtraTab && (
                            <div className="sm:hidden py-12 text-center text-gray-500 text-xs animate-pulse">
                              Loading invoices...
                            </div>
                          )}
                          {!isLoadingExtraTab && invoicesData.length === 0 && (
                            <div className="sm:hidden py-12 text-center text-gray-500 text-xs border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl">
                              No invoices found.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Support Tab - Create and view support tickets */}
                    {displayTab === "notifications" && (
                      <div className="space-y-4 sm:space-y-6 px-4 sm:px-0">
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-white dark:bg-[#1a1a1a] p-4 shadow-sm">
                          <div>
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">
                              Notifications
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Showing all recent notifications for your account.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => loadNotifications(token)}
                              className="rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                              Refresh
                            </button>
                            <button
                              type="button"
                              onClick={handleMarkAllNotificationsRead}
                              disabled={
                                isMarkingNotificationsRead ||
                                isLoadingNotifications ||
                                notificationUnreadCount === 0
                              }
                              className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              {isMarkingNotificationsRead
                                ? "Marking..."
                                : "Mark all read"}
                            </button>
                          </div>
                        </div>

                        {notificationsError && (
                          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
                            {notificationsError}
                          </div>
                        )}

                        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] shadow-sm overflow-hidden">
                          <div className="max-h-[70vh] overflow-y-auto">
                            {isLoadingNotifications && notifications.length === 0 ? (
                              <div className="py-12 text-center text-xs text-gray-400">
                                Loading notifications...
                              </div>
                            ) : notifications.length === 0 ? (
                              <div className="py-12 text-center text-xs text-gray-500 dark:text-gray-400">
                                No notifications yet.
                              </div>
                            ) : (
                              <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {notifications.map((item) => (
                                  <NotificationItem
                                    key={item.id}
                                    item={item}
                                    onClick={handleNotificationClick}
                                    getMeta={getNotificationMeta}
                                    formatDate={formatDate}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {displayTab === "support" && <VendorSupport token={token} />}

                    {/* Footer */}
                    <div className="mt-auto border-t border-gray-100 dark:border-gray-800 pt-6 pb-2">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
                        <p className="text-gray-500 dark:text-gray-400">
                          &copy; {new Date().getFullYear()} Assured Rewards. All
                          rights reserved.
                        </p>
                        <div className="flex items-center gap-4 font-medium text-gray-500 dark:text-gray-400">
                          <button
                            onClick={() =>
                              window.open("/vendor/terms", "_blank")
                            }
                            className="hover:text-gray-900 dark:hover:text-white transition-colors"
                          >
                            Terms & Conditions
                          </button>
                          <span>•</span>
                          <button
                            onClick={() =>
                              window.open("/vendor/privacy", "_blank")
                            }
                            className="hover:text-gray-900 dark:hover:text-white transition-colors"
                          >
                            Privacy Policy
                          </button>
                        </div>
                      </div>
                    </div>
                  </main>
                </div>
              </div>

              {/* Persistent Notification Panel for instant-open performance */}
              <div
                className={`fixed inset-0 z-[9999] transition-all duration-300 ease-in-out ${
                  isNotificationsOpen
                    ? "opacity-100 pointer-events-auto"
                    : "opacity-0 pointer-events-none"
                }`}
              >
                <button
                  type="button"
                  aria-label="Close notifications"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="absolute inset-0 z-40 bg-black/10 dark:bg-black/40 backdrop-blur-[1px]"
                />
                <div
                  ref={notificationsDropdownRef}
                  className={`absolute z-[200] right-6 top-20 w-[420px] max-w-[calc(100vw-2rem)] h-[min(80vh,640px)] rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white/95 dark:bg-[#0f0f0f]/95 shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-300 ease-out flex flex-col ${
                    isNotificationsOpen
                      ? "translate-y-0 scale-100"
                      : "translate-y-4 scale-95"
                  }`}
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800/60 bg-white/60 dark:bg-[#0f0f0f]/40 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-emerald-500" />
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        Notifications
                      </span>
                      {notificationUnreadCount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">
                          {notificationUnreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => loadNotifications(token)}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
                        title="Refresh notifications"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            isLoadingNotifications ? "animate-spin" : ""
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={handleMarkAllNotificationsRead}
                        disabled={
                          isMarkingNotificationsRead ||
                          isLoadingNotifications ||
                          notificationUnreadCount === 0
                        }
                        className="h-8 px-3.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Check size={12} />
                        {isMarkingNotificationsRead
                          ? "Marking..."
                          : "Mark all read"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
                        title="Close notifications"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  {notificationsError && (
                    <div className="px-4 py-2.5 text-xs text-primary dark:text-primary bg-primary/5 dark:bg-primary/10 border-b border-primary/20 dark:border-primary/30">
                      {notificationsError}
                    </div>
                  )}
                  <div
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar touch-pan-y"
                    style={{ WebkitOverflowScrolling: "touch" }}
                    onWheel={(event) => event.stopPropagation()}
                    onTouchMove={(event) => event.stopPropagation()}
                  >
                    {isLoadingNotifications && notifications.length === 0 ? (
                      <div className="text-xs text-gray-400 text-center py-6">
                        Loading notifications...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">
                        No notifications yet.
                      </div>
                    ) : (
                      <>
                        {notifications.slice(0, 30).map((item) => (
                          <NotificationItem
                            key={item.id}
                            item={item}
                            onClick={handleNotificationClick}
                            getMeta={getNotificationMeta}
                            formatDate={formatDate}
                          />
                        ))}
                        {notifications.length > 30 && (
                          <button
                            onClick={() => {
                              if (activeTab !== "notifications") {
                                navigate("/vendor/notifications");
                              }
                              setIsNotificationsOpen(false);
                            }}
                            className="w-full py-2.5 text-xs font-medium text-primary hover:text-primary-focus hover:bg-primary/5 rounded-xl transition-colors border border-dashed border-primary/20 mt-2"
                          >
                            View All Notifications ({notifications.length})
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <ConfirmModal
                isOpen={!!bulkExportPrompt}
                onClose={handleCloseBulkExportPrompt}
                onConfirm={handleConfirmBulkExportPrompt}
                title={bulkExportPrompt?.title || "Start background export?"}
                message={
                  bulkExportPrompt?.message ||
                  "This export will continue in the background while you keep using the dashboard."
                }
                confirmText={bulkExportPrompt?.confirmText || "Start Export"}
                cancelText="Not now"
                type="info"
                loading={isConfirmingBulkExport}
              />

              {/* QR Preview Modal Start */}
              <ConfirmModal
                isOpen={successModal.isOpen}
                onClose={closeSuccessModal}
                onConfirm={closeSuccessModal}
                title={successModal.title || "Success"}
                message={
                  successModal.message || "Action completed successfully."
                }
                confirmText="OK"
                type="success"
                showCancel={false}
              />
              <ConfirmModal
                isOpen={!!campaignToDelete}
                onClose={() => {
                  if (deletingCampaignId) return;
                  setCampaignToDelete(null);
                  setCampaignActionType(null);
                }}
                onConfirm={confirmDeleteCampaign}
                title={
                  campaignActionType === "active"
                    ? "Resume campaign?"
                    : "Stop campaign?"
                }
                message={
                  campaignToDelete
                    ? campaignActionType === "active"
                      ? `Resume "${campaignToDelete.title}"? The campaign will become active again and move back into the active list.`
                      : `Stop "${campaignToDelete.title}"? This will pause the campaign and move it to the bottom of the list.`
                    : ""
                }
                confirmText={
                  campaignActionType === "active" ? "Resume Campaign" : "Put on Hold"
                }
                cancelText="Keep Campaign"
                type={campaignActionType === "active" ? "info" : "danger"}
                loading={
                  !!campaignToDelete &&
                  deletingCampaignId === campaignToDelete.id
                }
                showCancel={true}
              />

              {/* Payment Modal */}
              {showPaymentModal && paymentForm.campaign && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                  <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1a1a1a] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 px-5 py-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {paymentForm.campaign.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(paymentForm.campaign.startDate)} -{" "}
                          {paymentForm.campaign.endDate
                            ? formatDate(paymentForm.campaign.endDate)
                            : "Ongoing"}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowPaymentModal(false)}
                        className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                      {/* Campaign Description */}
                      {paymentForm.campaign.description && (
                        <div className="w-full rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 px-4 py-3 text-sm text-gray-500">
                          {paymentForm.campaign.description}
                        </div>
                      )}

                      {/* Allocations & Summary */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Package size={16} className="text-primary" />
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Allocations Breakdown
                          </h4>
                        </div>

                        <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-zinc-800/50 text-[10px] uppercase text-gray-500 font-semibold tracking-wider">
                              <tr>
                                <th className="px-5 py-3">Cashback</th>
                                <th className="px-5 py-3 text-center">Qty</th>
                                <th className="px-5 py-3 text-right">Budget</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                              {paymentForm.rows
                                .filter(
                                  (row) =>
                                    paymentForm.campaign?.planType !==
                                      "postpaid" ||
                                    parseNumericValue(row.cashbackAmount) > 0,
                                )
                                .map((row) => (
                                  <tr key={row.id}>
                                    <td className="px-5 py-3 font-medium text-gray-700 dark:text-gray-300">
                                      INR{" "}
                                      {formatAmount(
                                        parseNumericValue(row.cashbackAmount),
                                      )}
                                    </td>
                                    <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-400">
                                      {row.quantity}
                                    </td>
                                    <td className="px-5 py-3 text-right font-medium text-gray-900 dark:text-white">
                                      INR{" "}
                                      {formatAmount(
                                        parseNumericValue(row.cashbackAmount) *
                                          parseNumericValue(row.quantity),
                                      )}
                                    </td>
                                  </tr>
                                ))}

                              {/* Padding row for separation */}
                              <tr>
                                <td colSpan="3" className="py-2"></td>
                              </tr>

                              {/* Summary Rows Integrated */}
                              {(() => {
                                const voucherCostPerUnit =
                                  VOUCHER_COST_MAP[paymentForm.voucherType] ||
                                  0;
                                const voucherCostWithGst =
                                  voucherCostPerUnit *
                                  (1 + CAMPAIGN_FEE_GST_RATE);

                                let totalBudget = 0;
                                let totalQuantity = 0;

                                paymentForm.rows.forEach((r) => {
                                  const cb = parseNumericValue(
                                    r.cashbackAmount,
                                  );
                                  const qty = parseNumericValue(r.quantity);
                                  if (qty > 0) {
                                    totalBudget += cb * qty;
                                    totalQuantity += qty;
                                  }
                                });

                                const qrBaseRate = resolveLiveTechFeePerQr(brandProfile?.qrPricePerUnit);
                                const voucherBaseRate =
                                  VOUCHER_COST_MAP[paymentForm.voucherType] ||
                                  0;

                                const totalQrBaseCost =
                                  totalQuantity * qrBaseRate;
                                const totalVoucherBaseCost =
                                  totalQuantity * voucherBaseRate;

                                const totalFeesBase =
                                  totalQrBaseCost + totalVoucherBaseCost;
                                const totalGst =
                                  totalFeesBase * CAMPAIGN_FEE_GST_RATE;

                                return (
                                  <>
                                    {/* Cashback Subtotal */}
                                    {paymentForm.campaign?.planType !==
                                      "postpaid" && (
                                      <tr className="border-b border-dashed border-gray-200 dark:border-zinc-700">
                                        <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                                          Cashback Subtotal
                                        </td>
                                        <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-400">
                                          {totalQuantity} QRs
                                        </td>
                                        <td className="px-5 py-3 text-right font-medium text-gray-900 dark:text-white">
                                          INR {formatAmount(totalBudget)}
                                        </td>
                                      </tr>
                                    )}

                                    {/* Fees Section */}
                                    <tr
                                      className={
                                        paymentForm.campaign?.planType ===
                                        "postpaid"
                                          ? "text-sm text-gray-800 dark:text-gray-200"
                                          : "text-xs text-gray-500"
                                      }
                                    >
                                      <td
                                        className="px-5 pt-3 pb-1"
                                        colSpan="2"
                                      >
                                        QR Generation Fees (Excl. GST)
                                        <div
                                          className={
                                            paymentForm.campaign?.planType ===
                                            "postpaid"
                                              ? "text-xs text-gray-600 dark:text-gray-400"
                                              : "text-[10px] text-gray-400"
                                          }
                                        >
                                          INR {formatAmount(qrBaseRate)}/QR ×{" "}
                                          {totalQuantity}
                                        </div>
                                      </td>
                                      <td className="px-5 pt-3 pb-1 text-right">
                                        + INR {formatAmount(totalQrBaseCost)}
                                      </td>
                                    </tr>
                                    {voucherBaseRate > 0 && (
                                      <tr
                                        className={
                                          paymentForm.campaign?.planType ===
                                          "postpaid"
                                            ? "text-sm text-gray-800 dark:text-gray-200"
                                            : "text-xs text-gray-500"
                                        }
                                      >
                                        <td className="px-5 py-1" colSpan="2">
                                          Voucher Fees (Excl. GST)
                                          <div
                                            className={
                                              paymentForm.campaign?.planType ===
                                              "postpaid"
                                                ? "text-xs text-gray-600 dark:text-gray-400"
                                                : "text-[10px] text-gray-400"
                                            }
                                          >
                                            INR {formatAmount(voucherBaseRate)}
                                            /QR × {totalQuantity}
                                          </div>
                                        </td>
                                        <td className="px-5 py-1 text-right">
                                          + INR{" "}
                                          {formatAmount(totalVoucherBaseCost)}
                                        </td>
                                      </tr>
                                    )}
                                    <tr
                                      className={
                                        paymentForm.campaign?.planType ===
                                        "postpaid"
                                          ? "text-sm text-gray-800 dark:text-gray-200 border-b border-dashed border-gray-200 dark:border-zinc-700"
                                          : "text-xs text-gray-500 border-b border-dashed border-gray-200 dark:border-zinc-700"
                                      }
                                    >
                                      <td
                                        className="px-5 pt-1 pb-3"
                                        colSpan="2"
                                      >
                                        GST (18%)
                                      </td>
                                      <td className="px-5 pt-1 pb-3 text-right">
                                        + INR {formatAmount(totalGst)}
                                      </td>
                                    </tr>
                                  </>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Voucher Type Selector (Cards) */}
                      <div className="space-y-3 pt-2">
                        <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          Select Voucher Type
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Digital Voucher */}
                          <div className="relative group">
                            <button
                              onClick={() =>
                                setPaymentForm((prev) => ({
                                  ...prev,
                                  voucherType: "digital_voucher",
                                }))
                              }
                              className={`w-full flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left ${
                                paymentForm.voucherType === "digital_voucher"
                                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10"
                                  : "border-gray-100 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-900/50 bg-white dark:bg-zinc-900"
                              }`}
                            >
                              <div
                                className={`p-2 rounded-lg mb-3 ${
                                  paymentForm.voucherType === "digital_voucher"
                                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                    : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-500"
                                }`}
                              >
                                <Smartphone size={20} />
                              </div>
                              <span className="text-sm font-bold text-gray-900 dark:text-white block mb-1">
                                Digital Voucher
                              </span>
                              <span className="text-[10px] text-gray-500 leading-tight">
                                INR{" "}
                                {(
                                  VOUCHER_COST_MAP.digital_voucher || 0
                                ).toFixed(2)}{" "}
                                / QR
                              </span>
                              {paymentForm.voucherType ===
                                "digital_voucher" && (
                                <div className="absolute top-3 right-3 text-emerald-500">
                                  <Check size={16} strokeWidth={3} />
                                </div>
                              )}
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[110%] p-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs text-center rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[200] shadow-xl pointer-events-none">
                              Digital Voucher card design is custom made to
                              match your brand style.
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-white"></div>
                            </div>
                          </div>

                          {/* Printed QR */}
                          <div className="relative group">
                            <button
                              onClick={() =>
                                setPaymentForm((prev) => ({
                                  ...prev,
                                  voucherType: "printed_qr",
                                }))
                              }
                              className={`w-full flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left ${
                                paymentForm.voucherType === "printed_qr"
                                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10"
                                  : "border-gray-100 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-900/50 bg-white dark:bg-zinc-900"
                              }`}
                            >
                              <div
                                className={`p-2 rounded-lg mb-3 ${
                                  paymentForm.voucherType === "printed_qr"
                                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                    : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-500"
                                }`}
                              >
                                <Printer size={20} />
                              </div>
                              <span className="text-sm font-bold text-gray-900 dark:text-white block mb-1">
                                Printed QR
                              </span>
                              <span className="text-[10px] text-gray-500 leading-tight">
                                INR{" "}
                                {(VOUCHER_COST_MAP.printed_qr || 0).toFixed(2)}{" "}
                                / QR
                              </span>
                              {paymentForm.voucherType === "printed_qr" && (
                                <div className="absolute top-3 right-3 text-emerald-500">
                                  <Check size={16} strokeWidth={3} />
                                </div>
                              )}
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[110%] p-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs text-center rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[200] shadow-xl pointer-events-none">
                              Assured Rewards assists you with high-quality
                              physical prints of your vouchers.
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-white"></div>
                            </div>
                          </div>

                          {/* No Voucher */}
                          <div className="relative group">
                            <button
                              onClick={() =>
                                setPaymentForm((prev) => ({
                                  ...prev,
                                  voucherType: "none",
                                }))
                              }
                              className={`w-full flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left ${
                                paymentForm.voucherType === "none"
                                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10"
                                  : "border-gray-100 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-900/50 bg-white dark:bg-zinc-900"
                              }`}
                            >
                              <div
                                className={`p-2 rounded-lg mb-3 ${
                                  paymentForm.voucherType === "none"
                                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                    : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-500"
                                }`}
                              >
                                <Ban size={20} />
                              </div>
                              <span className="text-sm font-bold text-gray-900 dark:text-white block mb-1">
                                No Voucher
                              </span>
                              <span className="text-[10px] text-gray-500 leading-tight">
                                Just QRs
                              </span>
                              {paymentForm.voucherType === "none" && (
                                <div className="absolute top-3 right-3 text-emerald-500">
                                  <Check size={16} strokeWidth={3} />
                                </div>
                              )}
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[110%] p-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs text-center rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[200] shadow-xl pointer-events-none">
                              Only provides a raw PDF sheet containing your QR
                              codes without any voucher designs.
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-white"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Digital Voucher Design Selector */}
                      {paymentForm.voucherType === "digital_voucher" && (
                        <div className="space-y-4 pt-5 pb-2 border-t border-gray-100 dark:border-zinc-800 animate-in fade-in slide-in-from-top-4 duration-500">
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                            Digital voucher styling uses the campaign defaults.
                          </p>
                        </div>
                      )}

                      {/* Verification & Final Total (Green Box) */}
                      {(() => {
                        const voucherCostPerUnit =
                          VOUCHER_COST_MAP[paymentForm.voucherType] || 0;
                        const voucherCostWithGst =
                          voucherCostPerUnit * (1 + CAMPAIGN_FEE_GST_RATE);
                        let totalBudget = 0;
                        let totalQuantity = 0;
                        paymentForm.rows.forEach((r) => {
                          const cb = parseNumericValue(r.cashbackAmount);
                          const qty = parseNumericValue(r.quantity);
                          const isPostpaid =
                            paymentForm.campaign.planType === "postpaid";
                          if (qty > 0) {
                            totalBudget += isPostpaid ? 0 : cb * qty;
                            totalQuantity += qty;
                          }
                        });
                        const qrBaseRate = resolveLiveTechFeePerQr(brandProfile?.qrPricePerUnit);
                        const qrGenCost =
                          totalQuantity *
                          qrBaseRate *
                          (1 + CAMPAIGN_FEE_GST_RATE);
                        const totalVoucherCost =
                          totalQuantity * voucherCostWithGst;
                        const totalPayable =
                          totalBudget + totalVoucherCost + qrGenCost;

                        return (
                          <div className="rounded-xl bg-linear-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-5 border border-emerald-100 dark:border-emerald-800/50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="flex justify-between items-center mb-3 relative z-10">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Wallet Balance
                              </span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                INR{" "}
                                {formatAmount(
                                  parseNumericValue(
                                    wallet?.availableBalance,
                                    parseNumericValue(wallet?.balance, 0) -
                                      parseNumericValue(
                                        wallet?.lockedBalance,
                                        0,
                                      ),
                                  ),
                                )}
                              </span>
                            </div>

                            {/* Dashed Line separator */}
                            <div className="h-px w-full border-t border-dashed border-emerald-200 dark:border-emerald-800/50 my-3"></div>

                            <div className="flex justify-between items-end relative z-10">
                              <span className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                                Total Payable
                              </span>
                              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                                INR {formatAmount(totalPayable)}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {campaignError && (
                        <div className="p-3 rounded-lg bg-rose-50 text-rose-600 text-xs border border-rose-100">
                          {campaignError}
                        </div>
                      )}
                    </div>

                    <div className="p-5 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-zinc-900/30">
                      <button
                        onClick={() => setShowPaymentModal(false)}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmPayment}
                        disabled={
                          isPayingCampaign || paymentForm.voucherType === null
                        }
                        className={`${PRIMARY_BUTTON} px-6 py-2 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2`}
                      >
                        <Wallet size={16} />
                        {isPayingCampaign ? "Processing..." : "Pay & Activate"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Product Edit Modal */}
              {showProductModal && (
                <ProductEditModal
                  product={editingProduct}
                  onClose={() => {
                    setShowProductModal(false);
                    setEditingProduct(null);
                  }}
                  onSave={handleSaveProduct}
                  isLoading={isSavingProduct}
                />
              )}

              {/* Global Toast Notification */}
              {qrActionStatus && (
                <div className="fixed bottom-4 right-4 z-[10001] animate-bounce-in">
                  <div className="rounded-lg bg-gray-900/90 text-white px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-sm border border-white/10 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    {qrActionStatus}
                  </div>
                </div>
              )}
            </>
          )}
        </>

        <CustomerDetailsModal
          isOpen={isCustomerModalOpen}
          onClose={() => {
            setIsCustomerModalOpen(false);
            setTimeout(() => setSelectedCustomerModal(null), 300); // clear after animation
          }}
          customer={selectedCustomerModal}
          token={token}
        />

        <WelcomeModal
          isOpen={showWelcomeModal}
          onClose={() => {
            setShowWelcomeModal(false);
            if (vendorInfo?.id) {
              localStorage.setItem(`hasSeenWelcome_${vendorInfo.id}`, "true");
            }
          }}
          onCreateCampaign={() => {
            setShowWelcomeModal(false);
            if (vendorInfo?.id) {
              localStorage.setItem(`hasSeenWelcome_${vendorInfo.id}`, "true");
            }
            navigate("/vendor/campaigns", {
              state: { campaignTab: "create" },
            });
          }}
          brandName={
            brandProfile?.name ||
            accountProfile?.name ||
            vendorInfo?.businessName ||
            ""
          }
        />
      </div>
    </>
  );
};

export default VendorDashboard;










































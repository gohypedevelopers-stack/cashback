import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  Store,
  Wallet,
  Megaphone,
  ShoppingBag,
  Activity,
  Download,
  Eye,
  RotateCw,
  Save,
  ShieldCheck,
  Power,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Briefcase,
  Plus,
  Trash2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { jsPDF } from "jspdf";
import { QRCodeCanvas } from "qrcode.react";
import {
  getAdminVendorOverview,
  updateAdminVendorDetails,
  updateAdminVendorStatus,
  getAdminBrandOverview,
  updateAdminBrandDetails,
  updateAdminBrandStatus,
  getAdminTransactionsFiltered,
  getAdminOrders,
  updateAdminOrderStatus,
  getAdminQrBatch,
  uploadImage,
  updateAdminVendorCredentials,
  getAdminVendorCredentialRequests,
  approveAdminCredentialRequest,
  rejectAdminCredentialRequest,
  getAdminCampaignAnalytics,
  updateAdminCampaignStatus,
} from "../../lib/api";

const COLORS = ["#059669", "#f43f5e", "#3b82f6", "#f59e0b", "#8b5cf6"];
const QR_BASE_URL =
  process.env.NEXT_PUBLIC_QR_BASE_URL ||
  "https://shakti-gold-rewards.vercel.app/q";
const MAX_QR_PRICE = 10000;

const InputGroup = ({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
  step,
}) => (
  <div className="space-y-2">
    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
      {label}
    </label>
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#059669]/50 to-[#047857]/50 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        className="relative w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/50 transition-all shadow-sm"
      />
    </div>
  </div>
);

const MetricItem = ({ label, value, subtext }) => (
  <div className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl flex flex-col justify-center min-h-[100px] backdrop-blur-md">
    <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
      {value}
    </div>
    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
      {label}
    </div>
    {subtext && (
      <div className="text-[10px] text-slate-400 mt-1">{subtext}</div>
    )}
  </div>
);

const NavButton = ({ active, onClick, icon: Icon, label, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 group ${
      active
        ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm font-semibold border-l-[3px] border-l-[#059669]"
        : "text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-200 border-l-[3px] border-l-transparent"
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon
        size={17}
        className={`transition-colors flex-shrink-0 ${active ? "text-[#059669]" : "group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}
      />
      <span className="text-sm">{label}</span>
    </div>
    {badge && (
      <span className="bg-[#059669] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm shadow-emerald-500/30">
        {badge}
      </span>
    )}
  </button>
);

const VendorAccountManager = ({
  vendorId,
  brandId,
  onClose,
  token,
  onUpdate,
  initialTab = "overview",
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Data States
  const [vendorData, setVendorData] = useState(null);
  const [brandData, setBrandData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderActionError, setOrderActionError] = useState("");
  const [campaignStats, setCampaignStats] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  // PDF Generation State
  const [isPreparingBatchPdf, setIsPreparingBatchPdf] = useState(false);
  const [qrBatchStatus, setQrBatchStatus] = useState("");
  const [qrBatchError, setQrBatchError] = useState("");
  const [batchQrs, setBatchQrs] = useState([]);

  const getQrValue = (hash) => {
    if (!QR_BASE_URL) return hash;
    return `${QR_BASE_URL}/redeem/${hash}`;
  };
  const getBatchCanvasId = (hash) => `pdf-qr-${hash}`;

  // Edit Forms
  const [vendorForm, setVendorForm] = useState({
    businessName: "",
    contactPhone: "",
    contactEmail: "",
    gstin: "",
    address: "",
    techFeePerQr: "",
  });
  const [brandForm, setBrandForm] = useState({
    name: "",
    website: "",
    logoUrl: "",
    qrPricePerUnit: "",
    about: "",
    faqs: [],
  });
  const [isUploadingBrandLogo, setIsUploadingBrandLogo] = useState(false);
  const [brandLogoUploadStatus, setBrandLogoUploadStatus] = useState("");
  const [brandLogoUploadError, setBrandLogoUploadError] = useState("");
  const [brandStatusForm, setBrandStatusForm] = useState({
    status: "",
    reason: "",
  });
  const [vendorStatusForm, setVendorStatusForm] = useState({
    status: "",
    reason: "",
  });
  const [credentialForm, setCredentialForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [credentialRequests, setCredentialRequests] = useState([]);
  const [isLoadingCredentialRequests, setIsLoadingCredentialRequests] =
    useState(false);
  const [credentialRequestError, setCredentialRequestError] = useState("");
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);
  const [credentialActionStatus, setCredentialActionStatus] = useState("");
  const [credentialActionError, setCredentialActionError] = useState("");

  // Action States
  const [isSaving, setIsSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: "", text: "" });
  const [processingOrderId, setProcessingOrderId] = useState(null);

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusClasses = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "active" || s === "paid" || s === "completed" || s === "shipped")
      return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
    if (s === "pending" || s === "processing")
      return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
    if (s === "paused" || s === "inactive")
      return "bg-secondary text-secondary-foreground border border-secondary/50";
    if (s === "rejected" || s === "failed" || s === "expired")
      return "bg-rose-500/10 text-rose-500 border border-rose-500/20";
    return "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400";
  };

  const handleRequestError = (err, setErrorState, defaultMessage) => {
    const message =
      err.response?.data?.message || err.message || defaultMessage;
    setErrorState(message);
    setActionMessage({ type: "error", text: message });
  };

  const loadCredentialRequests = async () => {
    if (!token || !vendorId) return;
    setIsLoadingCredentialRequests(true);
    setCredentialRequestError("");
    try {
      const data = await getAdminVendorCredentialRequests(token, vendorId, {
        status: "pending",
      });
      setCredentialRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setCredentialRequestError(
        err.message || "Failed to load credential requests.",
      );
    } finally {
      setIsLoadingCredentialRequests(false);
    }
  };

  const pendingCredentialRequest = credentialRequests.find(
    (request) => String(request?.status || "").toLowerCase() === "pending",
  );

  // Fetch Data
  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token, vendorId, brandId]);

  // Fetch Analytics when campaign is selected
  useEffect(() => {
    if (selectedCampaign) {
      loadCampaignAnalytics(selectedCampaign.id);
    } else {
      setAnalyticsData(null);
    }
  }, [selectedCampaign]);

  useEffect(() => {
    const fallbackUsername =
      pendingCredentialRequest?.requestedUsername ||
      vendorData?.vendor?.User?.username ||
      vendorData?.vendor?.User?.email ||
      "";

    if (!fallbackUsername) return;

    setCredentialForm((prev) => {
      if (prev.username) return prev;
      return { ...prev, username: fallbackUsername };
    });
  }, [
    pendingCredentialRequest?.requestedUsername,
    vendorData?.vendor?.User?.username,
    vendorData?.vendor?.User?.email,
  ]);

  const loadCampaignAnalytics = async (campaignId) => {
    try {
      const data = await getAdminCampaignAnalytics(token, campaignId);
      setAnalyticsData(data);
    } catch (err) {
      console.error("Failed to load campaign analytics", err);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    console.log("Loading Vendor Data:", { vendorId, brandId });

    try {
      // 1. Load Vendor Overview if ID exists
      if (vendorId) {
        const vData = await getAdminVendorOverview(token, vendorId);
        setVendorData(vData);
        setVendorForm({
          businessName: vData.vendor?.businessName || "",
          contactPhone: vData.vendor?.contactPhone || "",
          contactEmail: vData.vendor?.contactEmail || "",
          gstin: vData.vendor?.gstin || "",
          address: vData.vendor?.address || "",
          techFeePerQr: vData.vendor?.techFeePerQr || "",
        });
        setVendorStatusForm({
          status: vData.vendor?.status || "active",
          reason: vData.vendor?.rejectionReason || "",
        });
      }

      // 2. Load Brand Overview if ID exists
      if (brandId) {
        const bData = await getAdminBrandOverview(token, brandId);
        setBrandData(bData);
        setBrandForm({
          name: bData.brand?.name || "",
          website: bData.brand?.website || "",
          logoUrl: bData.brand?.logoUrl || "",
          qrPricePerUnit:
            bData.brand?.qrPricePerUnit !== undefined &&
            bData.brand?.qrPricePerUnit !== null
              ? String(bData.brand.qrPricePerUnit)
              : "",
          about: bData.brand?.about || "",
          faqs: Array.isArray(bData.brand?.faqs) ? bData.brand.faqs : [],
        });
        setBrandStatusForm({
          status: bData.brand?.status || "active",
          reason: "",
        });
      }

      // 3. Fetch Shared Data (Transactions & Orders)
      if (vendorId || brandId) {
        const params = {};
        if (vendorId) params.vendorId = vendorId;
        if (brandId) params.brandId = brandId;

        // Fetch transactions
        try {
          const txData = await getAdminTransactionsFiltered(token, params);
          setTransactions(
            txData?.transactions || (Array.isArray(txData) ? txData : []),
          );
        } catch (txErr) {
          console.warn("Failed to load transactions", txErr);
        }

        // Fetch orders
        try {
          const orderParams = {};
          if (vendorId) orderParams.vendorId = vendorId;
          const ordersData = await getAdminOrders(token, orderParams);
          setOrders(
            ordersData?.items || (Array.isArray(ordersData) ? ordersData : []),
          );
        } catch (orderErr) {
          console.warn("Failed to load orders", orderErr);
          setOrders([]);
        }
      }

      if (vendorId) {
        await loadCredentialRequests();
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load account details.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveVendor = async () => {
    if (!vendorId) return;
    setIsSaving(true);
    setActionMessage({ type: "", text: "" });
    try {
      await updateAdminVendorDetails(token, vendorId, vendorForm);
      setActionMessage({
        type: "success",
        text: "Vendor profile updated successfully.",
      });
      if (onUpdate) onUpdate();
      loadData();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err.message || "Failed to update vendor.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateVendorStatus = async (override = {}) => {
    if (!vendorId) return;
    setIsSaving(true);
    setActionMessage({ type: "", text: "" });
    try {
      const payload = { ...vendorStatusForm, ...override };
      await updateAdminVendorStatus(token, vendorId, payload);

      if (vendorData?.vendor) {
        setVendorData({
          ...vendorData,
          vendor: { ...vendorData.vendor, status: payload.status },
        });
      }
      setVendorStatusForm((prev) => ({ ...prev, ...payload }));
      setActionMessage({
        type: "success",
        text: `Vendor status updated to ${payload.status}.`,
      });
      if (onUpdate) onUpdate();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err.message || "Failed to update vendor status.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBrand = async () => {
    if (!brandId) return;
    const priceValue =
      brandForm.qrPricePerUnit === "" ? null : Number(brandForm.qrPricePerUnit);
    if (
      priceValue !== null &&
      (!Number.isFinite(priceValue) ||
        priceValue < 0 ||
        priceValue > MAX_QR_PRICE)
    ) {
      setActionMessage({
        type: "error",
        text: `QR price per unit must be between 0.01 and ${MAX_QR_PRICE}.`,
      });
      return;
    }
    setIsSaving(true);
    setActionMessage({ type: "", text: "" });
    try {
      await updateAdminBrandDetails(token, brandId, brandForm);
      if (brandStatusForm.status !== brandData?.brand?.status) {
        await updateAdminBrandStatus(token, brandId, brandStatusForm);
      }
      setActionMessage({
        type: "success",
        text: "Brand details updated successfully.",
      });
      if (onUpdate) onUpdate();
      loadData();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err.message || "Failed to update brand.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFaq = () => {
    setBrandForm((prev) => ({
      ...prev,
      faqs: [
        ...prev.faqs,
        { id: Date.now().toString(), question: "", answer: "" },
      ],
    }));
  };

  const handleRemoveFaq = (idx) => {
    setBrandForm((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== idx),
    }));
  };

  const handleFaqChange = (idx, field, val) => {
    setBrandForm((prev) => {
      const next = [...prev.faqs];
      next[idx] = { ...next[idx], [field]: val };
      return { ...prev, faqs: next };
    });
  };

  const handleBrandLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!token) {
      setBrandLogoUploadError("Sign in to upload.");
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

  const handleCredentialUpdate = async ({ useRequestDefaults } = {}) => {
    if (!vendorId) return;
    setCredentialActionStatus("");
    setCredentialActionError("");

    const trimmedUsername = credentialForm.username.trim();
    const hasUsername = Boolean(trimmedUsername);
    const hasPassword = Boolean(credentialForm.password);

    if (
      hasPassword &&
      credentialForm.password !== credentialForm.confirmPassword
    ) {
      setCredentialActionError("Passwords do not match.");
      return;
    }

    const payload = {};
    if (!useRequestDefaults && hasUsername) payload.username = trimmedUsername;
    if (!useRequestDefaults && hasPassword)
      payload.password = credentialForm.password;

    if (!pendingCredentialRequest && !Object.keys(payload).length) {
      setCredentialActionError("Provide a username or password to update.");
      return;
    }

    if (
      pendingCredentialRequest &&
      useRequestDefaults &&
      !pendingCredentialRequest.requestedUsername &&
      !pendingCredentialRequest.requestedPassword
    ) {
      setCredentialActionError("No requested credentials available.");
      return;
    }

    setIsUpdatingCredentials(true);
    try {
      if (pendingCredentialRequest) {
        await approveAdminCredentialRequest(
          token,
          pendingCredentialRequest.id,
          payload,
        );
        setCredentialActionStatus("Credential request approved.");
      } else {
        await updateAdminVendorCredentials(token, vendorId, payload);
        setCredentialActionStatus("Credentials updated.");
      }

      setCredentialForm((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
      }));
      await loadCredentialRequests();
      await loadData();
    } catch (err) {
      setCredentialActionError(err.message || "Failed to update credentials.");
    } finally {
      setIsUpdatingCredentials(false);
    }
  };

  const handleRejectCredentialRequest = async () => {
    if (!pendingCredentialRequest) return;
    setCredentialActionStatus("");
    setCredentialActionError("");
    setIsUpdatingCredentials(true);
    try {
      await rejectAdminCredentialRequest(
        token,
        pendingCredentialRequest.id,
        {},
      );
      setCredentialActionStatus("Credential request rejected.");
      await loadCredentialRequests();
    } catch (err) {
      setCredentialActionError(err.message || "Failed to reject request.");
    } finally {
      setIsUpdatingCredentials(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setProcessingOrderId(orderId);
    setActionMessage({ type: "", text: "" });
    try {
      await updateAdminOrderStatus(token, orderId, newStatus);
      setActionMessage({
        type: "success",
        text: `Order ${newStatus} successfully.`,
      });
      loadData();
    } catch (err) {
      console.error(err);
      handleRequestError(
        err,
        setOrderActionError,
        "Unable to update order status.",
      );
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleDownloadOrderPdf = async (order) => {
    if (isPreparingBatchPdf) return;
    if (!order?.id) return;

    setQrBatchError("");
    setQrBatchStatus("");
    setIsPreparingBatchPdf(true);

    try {
      const data = await getAdminQrBatch(token, {
        orderId: order.id,
        limit: 5000,
      });
      const items = Array.isArray(data) ? data : data?.items || [];

      if (!items.length) {
        setQrBatchError("No QRs found for this order.");
        setIsPreparingBatchPdf(false);
        return;
      }

      setBatchQrs(items);
      await new Promise((resolve) => setTimeout(resolve, 2000));

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
      const campaignTitle = order.campaignTitle || "Campaign";
      const priceLabel = formatAmount(order.cashbackAmount);
      const perQrPrice = order.quantity
        ? Number(order.printCost || 0) / order.quantity
        : 0;
      const perQrLabel =
        Number.isFinite(perQrPrice) && perQrPrice > 0
          ? formatAmount(perQrPrice)
          : "0.00";
      const printCostLabel = formatAmount(order.printCost || 0);

      const drawHeader = () => {
        doc.setFontSize(16);
        doc.text(
          `QR Order #${order.id.slice(0, 8)} - INR ${priceLabel}`,
          margin,
          18,
        );
        doc.setFontSize(10);
        doc.text(`Campaign: ${campaignTitle}`, margin, 26);
        doc.text(`Quantity: ${order.quantity}`, margin, 32);
        doc.text(`Date: ${formatDate(order.createdAt)}`, margin, 38);
        doc.text(
          `QR price: INR ${perQrLabel}/QR | Print cost: INR ${printCostLabel}`,
          margin,
          44,
        );
      };

      drawHeader();
      let skipped = 0;
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
        const yPos = 54 + row * rowSpacing;

        const canvas = document.getElementById(getBatchCanvasId(qr.uniqueHash));
        if (!canvas) {
          skipped += 1;
          return;
        }
        try {
          const imgData = canvas.toDataURL("image/png");
          doc.addImage(imgData, "PNG", xPos, yPos, qrSize, qrSize);
          doc.setFontSize(8);
          doc.text(qr.uniqueHash.slice(0, 8), xPos, yPos + qrSize + 6);
          doc.text(
            `INR ${formatAmount(qr.cashbackAmount)}`,
            xPos,
            yPos + qrSize + 12,
          );
        } catch (e) {
          console.error("Canvas export error", e);
          skipped++;
        }
      });

      if (skipped > 0) {
        setQrBatchStatus(`Downloaded PDF. ${skipped} QRs skipped.`);
      } else {
        setQrBatchStatus("Order PDF downloaded successfully.");
      }
      const timestamp = new Date()
        .toISOString()
        .slice(0, 16)
        .replace(/[:T]/g, "-");
      doc.save(`order-${order.id.slice(0, 8)}-${timestamp}.pdf`);
    } catch (err) {
      console.error("PDF Download Error:", err);
      setQrBatchError(err.message || "Failed to generate PDF.");
    } finally {
      setIsPreparingBatchPdf(false);
      setBatchQrs([]);
    }
  };

  const handleDownloadCampaignPdf = async (campaign) => {
    if (isPreparingBatchPdf || !campaign?.id) return;
    setQrBatchError("");
    setQrBatchStatus("Fetching QR data...");
    setIsPreparingBatchPdf(true);

    try {
      const data = await getAdminQrBatch(token, {
        campaignId: campaign.id,
        cashbackAmount: campaign.cashbackAmount,
        limit: 2000,
      });
      const items = Array.isArray(data) ? data : data?.items || [];

      if (!items.length) {
        setQrBatchError("No QRs found for this campaign.");
        setIsPreparingBatchPdf(false);
        return;
      }

      setBatchQrs(items);
      setQrBatchStatus(`Rendering ${items.length} QRs...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));

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
      const campaignTitle = campaign.title || "Campaign";
      const priceLabel = formatAmount(campaign.cashbackAmount);
      const brandName = brandData?.brand?.name || "Brand";

      const drawHeader = () => {
        doc.setFontSize(16);
        doc.text(`Campaign QRs - INR ${priceLabel}`, margin, 18);
        doc.setFontSize(10);
        doc.text(`Campaign: ${campaignTitle}`, margin, 26);
        doc.text(`Brand: ${brandName}`, margin, 32);
        doc.text(`Generated: ${formatDate(new Date())}`, margin, 38);
      };

      drawHeader();
      let skipped = 0;
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

        const canvas = document.getElementById(getBatchCanvasId(qr.uniqueHash));
        if (!canvas) {
          skipped += 1;
          return;
        }
        try {
          const imgData = canvas.toDataURL("image/png");
          doc.addImage(imgData, "PNG", xPos, yPos, qrSize, qrSize);
          doc.setFontSize(8);
          doc.text(qr.uniqueHash.slice(0, 8), xPos, yPos + qrSize + 6);
          doc.text(
            `INR ${formatAmount(qr.cashbackAmount)}`,
            xPos,
            yPos + qrSize + 12,
          );
        } catch (e) {
          console.error("Canvas export error", e);
          skipped++;
        }
      });

      if (skipped > 0) {
        setQrBatchStatus(`Downloaded PDF. ${skipped} QRs skipped.`);
      } else {
        setQrBatchStatus("");
      }
      const timestamp = new Date()
        .toISOString()
        .slice(0, 16)
        .replace(/[:T]/g, "-");
      doc.save(`campaign-${campaign.id.slice(0, 8)}-${timestamp}.pdf`);
    } catch (err) {
      console.error("Campaign PDF Error:", err);
      setQrBatchError(err.message || "Failed to generate PDF.");
    } finally {
      setIsPreparingBatchPdf(false);
      setBatchQrs([]);
    }
  };

  const handleUpdateCampaignStatus = async (campaignId, newStatus) => {
    setIsSaving(true);
    setActionMessage({ type: "", text: "" });
    try {
      await updateAdminCampaignStatus(token, campaignId, newStatus);
      setActionMessage({
        type: "success",
        text: `Campaign marked as ${newStatus}.`,
      });
      if (selectedCampaign && selectedCampaign.id === campaignId) {
        setSelectedCampaign({ ...selectedCampaign, status: newStatus });
        if (brandData) {
          const updatedCampaigns = brandData.campaigns.map((c) =>
            c.id === campaignId ? { ...c, status: newStatus } : c,
          );
          setBrandData({ ...brandData, campaigns: updatedCampaigns });
        }
      }
      loadData();
    } catch (err) {
      console.error(err);
      setActionMessage({
        type: "error",
        text: err.message || "Failed to update campaign.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getPieData = () => {
    if (!analyticsData?.statusCounts) return [];
    return Object.entries(analyticsData.statusCounts).map(([name, value]) => ({
      name,
      value,
    }));
  };

  // Determine what name to show in header
  const headerName =
    brandData?.brand?.name ||
    vendorData?.vendor?.businessName ||
    "Account Details";
  const headerSub =
    vendorData?.vendor?.contactEmail ||
    brandData?.vendor?.contactEmail ||
    "Manage Vendor & Brand";
  const pendingOrdersCount = orders.filter(
    (o) => o.status === "pending",
  ).length;

  if (!vendorId && !brandId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 pb-safe-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-5xl h-[92dvh] sm:h-[85vh] rounded-2xl shadow-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-gradient-to-br dark:from-[#2a2a2c] dark:via-[#1e1e20] dark:to-[#1f1f21] flex flex-col overflow-hidden transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#059669] to-[#047857] flex items-center justify-center text-white shadow-[0_0_15px_rgba(5,150,105,0.3)]">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                {headerName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {headerSub}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-60 border-r border-slate-200/50 dark:border-white/5 bg-slate-50/30 dark:bg-black/20 p-4 flex flex-col gap-1 overflow-y-auto">
            <div className="px-3 pb-2 mb-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                Navigation
              </span>
            </div>
            <NavButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              icon={Activity}
              label="Overview"
            />
            {vendorId && (
              <NavButton
                active={activeTab === "profile"}
                onClick={() => setActiveTab("profile")}
                icon={Store}
                label="Vendor Profile"
              />
            )}
            {brandId && (
              <NavButton
                active={activeTab === "brand"}
                onClick={() => setActiveTab("brand")}
                icon={Building2}
                label="Brand Settings"
              />
            )}
            {vendorId && (
              <NavButton
                active={activeTab === "financials"}
                onClick={() => setActiveTab("financials")}
                icon={Wallet}
                label="Financials"
              />
            )}
            {(brandId || vendorId) && (
              <NavButton
                active={activeTab === "campaigns"}
                onClick={() => setActiveTab("campaigns")}
                icon={Megaphone}
                label="Campaigns"
              />
            )}
            {vendorId && (
              <NavButton
                active={activeTab === "orders"}
                onClick={() => setActiveTab("orders")}
                icon={ShoppingBag}
                label="Orders"
                badge={pendingOrdersCount > 0 ? pendingOrdersCount : null}
              />
            )}
          </div>

          {/* Main Panel */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-transparent scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm animate-pulse">
                Loading account details...
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-rose-500 gap-2">
                <AlertCircle size={32} />
                <p>{error}</p>
                <button
                  onClick={loadData}
                  className="text-xs underline text-slate-500"
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                {/* Status Message */}
                {actionMessage.text && (
                  <div
                    className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm ${
                      actionMessage.type === "error"
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-600"
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                    }`}
                  >
                    {actionMessage.type === "error" ? (
                      <AlertCircle size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    {actionMessage.text}
                  </div>
                )}

                {/* OVERVIEW TAB */}
                {activeTab === "overview" && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Tab Header */}
                    <div className="flex items-center justify-between pb-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Account Overview
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Summary of vendor status, metrics, and recent activity
                        </p>
                      </div>
                      <button
                        onClick={loadData}
                        className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-400 dark:text-slate-500 transition-colors"
                        title="Refresh"
                      >
                        <RotateCw size={15} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Status Cards */}
                      <div className="bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                          <Store
                            size={20}
                            className="text-slate-400 dark:text-slate-500"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wide font-bold mb-1">
                            Vendor Status
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusClasses(vendorData?.vendor?.status || "unknown")}`}
                          >
                            {vendorData?.vendor?.status || "N/A"}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                          <Building2
                            size={20}
                            className="text-slate-400 dark:text-slate-500"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wide font-bold mb-1">
                            Brand Status
                          </div>
                          <span
                            className={`w-fit px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusClasses(vendorData?.brand?.status || brandData?.brand?.status)}`}
                          >
                            {vendorData?.brand?.status ||
                              brandData?.brand?.status ||
                              "N/A"}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Updated:{" "}
                            {formatDate(
                              vendorData?.brand?.updatedAt ||
                                brandData?.brand?.updatedAt,
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center">
                          <Wallet size={20} className="text-emerald-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wide font-bold mb-1">
                            Wallet Balance
                          </div>
                          <span className="text-xl font-bold text-slate-900 dark:text-white">
                            INR {formatAmount(vendorData?.wallet?.balance || 0)}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Locked: INR{" "}
                            {formatAmount(
                              vendorData?.wallet?.lockedBalance || 0,
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <MetricItem
                        label="Total QRs"
                        value={vendorData?.metrics?.totalQrs || 0}
                      />
                      <MetricItem
                        label="Redeemed"
                        value={vendorData?.metrics?.redeemedQrs || 0}
                      />
                      <MetricItem
                        label="Transactions"
                        value={vendorData?.metrics?.totalTransactions || 0}
                      />
                      <MetricItem
                        label="Campaigns"
                        value={vendorData?.metrics?.campaigns || 0}
                      />
                    </div>

                    {/* CHARTS SECTION */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Transaction Volume Chart */}
                      <div className="bg-white/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 shadow-sm backdrop-blur-md min-h-[300px] flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <BarChartIcon
                                size={16}
                                className="text-[#059669]"
                              />{" "}
                              Transaction Volume
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Recent financial activity
                            </p>
                          </div>
                        </div>
                        <div className="flex-1 w-full min-h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={transactions.slice(0, 7).reverse()}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="rgba(255,255,255,0.1)"
                              />
                              <XAxis
                                dataKey="createdAt"
                                tickFormatter={(value) =>
                                  new Date(value).toLocaleDateString("en-US", {
                                    day: "numeric",
                                    month: "short",
                                  })
                                }
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#94a3b8", fontSize: 10 }}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#94a3b8", fontSize: 10 }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#1e293b",
                                  borderColor: "#334155",
                                  color: "#fff",
                                }}
                                itemStyle={{ color: "#fff" }}
                                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                              />
                              <Bar
                                dataKey="amount"
                                fill="#059669"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* QR Performance Pie Chart */}
                      <div className="bg-white/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 shadow-sm backdrop-blur-md min-h-[300px] flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <PieChartIcon
                                size={16}
                                className="text-[#059669]"
                              />{" "}
                              QR Performance
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Distribution of QR statuses
                            </p>
                          </div>
                        </div>
                        <div className="flex-1 w-full min-h-[200px] relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  {
                                    name: "Redeemed",
                                    value:
                                      vendorData?.metrics?.redeemedQrs || 0,
                                  },
                                  {
                                    name: "Active",
                                    value:
                                      (vendorData?.metrics?.totalQrs || 0) -
                                      (vendorData?.metrics?.redeemedQrs || 0),
                                  },
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {[
                                  {
                                    name: "Redeemed",
                                    value:
                                      vendorData?.metrics?.redeemedQrs || 0,
                                  },
                                  {
                                    name: "Active",
                                    value:
                                      (vendorData?.metrics?.totalQrs || 0) -
                                      (vendorData?.metrics?.redeemedQrs || 0),
                                  },
                                ].map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#1e293b",
                                  borderColor: "#334155",
                                  color: "#fff",
                                }}
                                itemStyle={{ color: "#fff" }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                {vendorData?.metrics?.totalQrs || 0}
                              </div>
                              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                                Total QRs
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-center gap-4 mt-4">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <div className="w-2 h-2 rounded-full bg-[#059669]" />{" "}
                            Redeemed
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <div className="w-2 h-2 rounded-full bg-[#f43f5e]" />{" "}
                            Active
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* VENDOR PROFILE TAB */}
                {activeTab === "profile" && vendorId && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Tab Header */}
                    <div className="pb-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Store size={18} className="text-[#059669]" /> Vendor
                        Profile
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Edit business details and account status
                      </p>
                    </div>
                    <div className="bg-white/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 shadow-sm backdrop-blur-md">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Briefcase size={18} className="text-[#059669]" />{" "}
                        Business Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup
                          label="Business Name"
                          value={vendorForm.businessName}
                          onChange={(v) =>
                            setVendorForm({ ...vendorForm, businessName: v })
                          }
                        />
                        <InputGroup
                          label="GSTIN"
                          value={vendorForm.gstin}
                          onChange={(v) =>
                            setVendorForm({ ...vendorForm, gstin: v })
                          }
                        />
                        <InputGroup
                          label="Tech Fee per QR (INR)"
                          value={vendorForm.techFeePerQr}
                          onChange={(v) =>
                            setVendorForm({ ...vendorForm, techFeePerQr: v })
                          }
                          type="number"
                          min="0"
                          step="0.01"
                        />
                        <InputGroup
                          label="Contact Phone"
                          value={vendorForm.contactPhone}
                          onChange={(v) =>
                            setVendorForm({ ...vendorForm, contactPhone: v })
                          }
                        />
                        <InputGroup
                          label="Contact Email"
                          value={vendorForm.contactEmail}
                          onChange={(v) =>
                            setVendorForm({ ...vendorForm, contactEmail: v })
                          }
                          type="email"
                        />
                        <div className="col-span-1 md:col-span-2 space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Address
                          </label>
                          <textarea
                            value={vendorForm.address}
                            onChange={(e) =>
                              setVendorForm({
                                ...vendorForm,
                                address: e.target.value,
                              })
                            }
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:border-[#059669] transition-colors resize-none"
                          />
                        </div>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-end">
                        <button
                          onClick={handleSaveVendor}
                          disabled={isSaving}
                          className="px-6 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {isSaving ? (
                            <RotateCw className="animate-spin" size={16} />
                          ) : (
                            <Save size={16} />
                          )}
                          Save Changes
                        </button>
                      </div>

                      <div className="my-6 border-t border-slate-100 dark:border-white/5" />

                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Power size={18} className="text-[#059669]" /> Vendor
                        Account Status
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Status
                          </label>
                          <select
                            value={vendorStatusForm.status}
                            onChange={(e) =>
                              setVendorStatusForm({
                                ...vendorStatusForm,
                                status: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:border-[#059669] transition-colors"
                          >
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="pending">Pending</option>
                            <option value="rejected">Rejected / Blocked</option>
                          </select>
                        </div>
                        <InputGroup
                          label="Reason (Optional)"
                          value={vendorStatusForm.reason}
                          onChange={(v) =>
                            setVendorStatusForm({
                              ...vendorStatusForm,
                              reason: v,
                            })
                          }
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => handleUpdateVendorStatus()}
                          disabled={
                            isSaving ||
                            vendorStatusForm.status ===
                              vendorData?.vendor?.status
                          }
                          className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-900 dark:text-white text-xs font-semibold transition-all disabled:opacity-50"
                        >
                          Update Status
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateVendorStatus({
                              status: "paused",
                              reason:
                                vendorStatusForm.reason ||
                                "Flagged for suspicious activity",
                            })
                          }
                          disabled={isSaving}
                          className="px-4 py-2 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-semibold transition-all disabled:opacity-50"
                        >
                          Flag Suspicious
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* BRAND SETTINGS TAB */}
                {activeTab === "brand" && brandId && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Tab Header */}
                    <div className="pb-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 size={18} className="text-[#059669]" /> Brand
                        Settings
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Configure brand identity, credentials, and account
                        status
                      </p>
                    </div>
                    <div className="bg-white/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 shadow-sm backdrop-blur-md">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Building2 size={18} className="text-[#059669]" /> Brand
                        Identity
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup
                          label="Brand Name"
                          value={brandForm.name}
                          onChange={(v) =>
                            setBrandForm({ ...brandForm, name: v })
                          }
                        />
                        <InputGroup
                          label="Website"
                          value={brandForm.website}
                          onChange={(v) =>
                            setBrandForm({ ...brandForm, website: v })
                          }
                        />
                        <div className="col-span-1 md:col-span-2 space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Brand Logo
                          </label>
                          <div className="flex items-center gap-4 flex-wrap">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleBrandLogoUpload}
                              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:border-[#059669] transition-colors"
                            />
                            {brandForm.logoUrl && (
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-shrink-0">
                                <img
                                  src={brandForm.logoUrl}
                                  alt="Brand logo preview"
                                  className="h-10 w-10 rounded-lg object-cover border border-slate-200/70 dark:border-white/10"
                                />
                                <span className="text-emerald-600 font-medium">
                                  Logo uploaded
                                </span>
                              </div>
                            )}
                          </div>
                          {brandLogoUploadStatus && (
                            <div className="text-[11px] text-emerald-600">
                              {brandLogoUploadStatus}
                            </div>
                          )}
                          {brandLogoUploadError && (
                            <div className="text-[11px] text-rose-600">
                              {brandLogoUploadError}
                            </div>
                          )}
                          {isUploadingBrandLogo && (
                            <div className="text-[11px] text-slate-400">
                              Uploading...
                            </div>
                          )}
                        </div>
                        <InputGroup
                          label="QR price per unit (INR)"
                          type="number"
                          value={brandForm.qrPricePerUnit}
                          onChange={(v) =>
                            setBrandForm({ ...brandForm, qrPricePerUnit: v })
                          }
                          min="0.01"
                          max={MAX_QR_PRICE}
                          step="0.01"
                        />
                        <div className="col-span-1 md:col-span-2 space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            About Brand
                          </label>
                          <textarea
                            value={brandForm.about}
                            onChange={(e) =>
                              setBrandForm({
                                ...brandForm,
                                about: e.target.value,
                              })
                            }
                            placeholder="Brief description of the brand..."
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/50 transition-all shadow-sm resize-none"
                          />
                        </div>
                      </div>

                      <div className="my-6 border-t border-slate-100 dark:border-white/5" />

                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Activity size={18} className="text-[#059669]" />{" "}
                          Brand FAQs
                        </h3>
                        <button
                          type="button"
                          onClick={handleAddFaq}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
                        >
                          <Plus size={14} /> Add FAQ
                        </button>
                      </div>

                      <div className="space-y-4">
                        {!brandForm.faqs || brandForm.faqs.length === 0 ? (
                          <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                            <p className="text-xs text-slate-400">
                              No custom FAQs defined. Default FAQs will be shown
                              on the brand page.
                            </p>
                          </div>
                        ) : (
                          brandForm.faqs.map((faq, idx) => (
                            <div
                              key={faq.id || idx}
                              className="p-4 rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 space-y-3 relative group"
                            >
                              <button
                                type="button"
                                onClick={() => handleRemoveFaq(idx)}
                                className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <X size={14} />
                              </button>
                              <div className="space-y-1.5 pr-8">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-1">
                                  Question
                                </label>
                                <input
                                  type="text"
                                  value={faq.question}
                                  onChange={(e) =>
                                    handleFaqChange(
                                      idx,
                                      "question",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-sm focus:border-emerald-500 outline-none transition-all"
                                  placeholder="Enter question..."
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-1">
                                  Answer
                                </label>
                                <textarea
                                  value={faq.answer}
                                  onChange={(e) =>
                                    handleFaqChange(
                                      idx,
                                      "answer",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-sm focus:border-emerald-500 outline-none transition-all resize-none"
                                  rows={2}
                                  placeholder="Enter answer..."
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="my-6 border-t border-slate-100 dark:border-white/5" />

                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Power size={18} className="text-[#059669]" /> Account
                        Status
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Status
                          </label>
                          <select
                            value={brandStatusForm.status}
                            onChange={(e) =>
                              setBrandStatusForm({
                                ...brandStatusForm,
                                status: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:border-[#059669] transition-colors"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive / Paused</option>
                            <option value="pending">Pending</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                        <InputGroup
                          label="Reason (Optional)"
                          value={brandStatusForm.reason}
                          onChange={(v) =>
                            setBrandStatusForm({
                              ...brandStatusForm,
                              reason: v,
                            })
                          }
                        />
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-end">
                        <button
                          onClick={handleSaveBrand}
                          disabled={isSaving}
                          className="px-6 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {isSaving ? (
                            <RotateCw className="animate-spin" size={16} />
                          ) : (
                            <Save size={16} />
                          )}
                          Update Brand
                        </button>
                      </div>
                      <div className="my-6 border-t border-slate-100 dark:border-white/5" />

                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <ShieldCheck size={18} className="text-[#059669]" />{" "}
                        Login Credentials
                      </h3>
                      <div className="space-y-4">
                        {pendingCredentialRequest ? (
                          <div className="rounded-lg border border-amber-200/60 bg-amber-50/80 text-amber-700 px-4 py-3 text-xs">
                            <div className="font-semibold">
                              Pending credential request
                            </div>
                            <div className="mt-1">
                              Requested:{" "}
                              {pendingCredentialRequest.requestedUsername ||
                                "Password update"}
                            </div>
                            <div className="text-[10px] opacity-80">
                              {formatDate(pendingCredentialRequest.createdAt)}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-slate-200/60 bg-slate-50 text-slate-500 px-4 py-3 text-xs">
                            No pending credential request from vendor.
                          </div>
                        )}
                        {isLoadingCredentialRequests && (
                          <div className="text-xs text-slate-500">
                            Loading credential requests...
                          </div>
                        )}

                        <InputGroup
                          label="Username"
                          value={credentialForm.username}
                          onChange={(v) =>
                            setCredentialForm({
                              ...credentialForm,
                              username: v,
                            })
                          }
                        />
                        <InputGroup
                          label="New Password"
                          type="password"
                          value={credentialForm.password}
                          onChange={(v) =>
                            setCredentialForm({
                              ...credentialForm,
                              password: v,
                            })
                          }
                        />
                        <InputGroup
                          label="Confirm Password"
                          type="password"
                          value={credentialForm.confirmPassword}
                          onChange={(v) =>
                            setCredentialForm({
                              ...credentialForm,
                              confirmPassword: v,
                            })
                          }
                        />
                        <div className="text-[11px] text-slate-400">
                          Leave password blank if you only want to change the
                          username.
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {pendingCredentialRequest && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCredentialUpdate({
                                  useRequestDefaults: true,
                                })
                              }
                              disabled={isUpdatingCredentials}
                              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                            >
                              Approve Request
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleCredentialUpdate({
                                useRequestDefaults: false,
                              })
                            }
                            disabled={isUpdatingCredentials}
                            className="px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                          >
                            {pendingCredentialRequest
                              ? "Approve with Overrides"
                              : "Save Credentials"}
                          </button>
                          {pendingCredentialRequest && (
                            <button
                              type="button"
                              onClick={handleRejectCredentialRequest}
                              disabled={isUpdatingCredentials}
                              className="px-4 py-2 rounded-lg border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50 transition-colors disabled:opacity-50"
                            >
                              Reject Request
                            </button>
                          )}
                        </div>

                        {credentialRequestError && (
                          <div className="text-xs text-rose-500">
                            {credentialRequestError}
                          </div>
                        )}
                        {credentialActionError && (
                          <div className="text-xs text-rose-500">
                            {credentialActionError}
                          </div>
                        )}
                        {credentialActionStatus && (
                          <div className="text-xs text-emerald-500">
                            {credentialActionStatus}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* FINANCIALS TAB */}
                {activeTab === "financials" && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Tab Header */}
                    <div className="flex items-center justify-between pb-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Wallet size={18} className="text-[#059669]" />{" "}
                          Financials
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Wallet balance and recent transaction history
                        </p>
                      </div>
                    </div>
                    {/* Wallet Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl p-4 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Available Balance
                        </div>
                        <div className="text-2xl font-bold text-emerald-500">
                          INR {formatAmount(vendorData?.wallet?.balance || 0)}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl p-4 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Locked Balance
                        </div>
                        <div className="text-2xl font-bold text-amber-500">
                          INR{" "}
                          {formatAmount(vendorData?.wallet?.lockedBalance || 0)}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl p-4 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Transactions
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                          {transactions.length}
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm backdrop-blur-md">
                      <div className="px-6 py-4 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Recent Transactions
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 dark:bg-white/5 text-xs text-slate-500 uppercase">
                            <tr>
                              <th className="px-6 py-3 font-medium">Date</th>
                              <th className="px-6 py-3 font-medium">Type</th>
                              <th className="px-6 py-3 font-medium">
                                Description
                              </th>
                              <th className="px-6 py-3 font-medium text-right">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {transactions.length > 0 ? (
                              transactions.slice(0, 10).map((tx) => (
                                <tr
                                  key={tx.id}
                                  className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                                >
                                  <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                                    {formatDate(tx.createdAt)}
                                  </td>
                                  <td className="px-6 py-3">
                                    <span
                                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${tx.type === "credit" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30" : "bg-rose-100 text-rose-600 dark:bg-rose-900/30"}`}
                                    >
                                      {tx.type}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3 text-slate-900 dark:text-white font-medium">
                                    {tx.category || tx.description}
                                  </td>
                                  <td
                                    className={`px-6 py-3 text-right font-bold ${tx.type === "credit" ? "text-emerald-500" : "text-slate-900 dark:text-white"}`}
                                  >
                                    {tx.type === "credit" ? "+" : "-"} INR{" "}
                                    {formatAmount(tx.amount)}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-6 py-8 text-center text-slate-400 text-xs"
                                >
                                  No transactions found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ORDERS TAB */}
                {activeTab === "orders" && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Tab Header */}
                    <div className="flex items-center justify-between pb-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <ShoppingBag size={18} className="text-[#059669]" />{" "}
                          QR Orders
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Review and manage QR batch orders for this vendor
                        </p>
                      </div>
                      {pendingOrdersCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-sm font-semibold text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                          {pendingOrdersCount} Pending
                        </span>
                      )}
                    </div>
                    {qrBatchError && (
                      <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm flex items-center gap-2">
                        <AlertCircle size={16} /> {qrBatchError}
                      </div>
                    )}
                    {qrBatchStatus && (
                      <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm flex items-center gap-2">
                        <CheckCircle2 size={16} /> {qrBatchStatus}
                      </div>
                    )}
                    {orderActionError && (
                      <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm flex items-center gap-2">
                        <AlertCircle size={16} /> {orderActionError}
                      </div>
                    )}
                    <div className="bg-white/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm backdrop-blur-md">
                      <div className="px-6 py-4 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          QR Orders
                        </h3>
                        {pendingOrdersCount > 0 && (
                          <span className="bg-amber-500/10 text-amber-500 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                            {pendingOrdersCount} Pending
                          </span>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 dark:bg-white/5 text-xs text-slate-500 uppercase">
                            <tr>
                              <th className="px-6 py-3 font-medium">Date</th>
                              <th className="px-6 py-3 font-medium">
                                Campaign
                              </th>
                              <th className="px-6 py-3 font-medium">Qty</th>
                              <th className="px-6 py-3 font-medium">Details</th>
                              <th className="px-6 py-3 font-medium">Cost</th>
                              <th className="px-6 py-3 font-medium">Status</th>
                              <th className="px-6 py-3 font-medium text-right">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {orders.length > 0 ? (
                              orders.map((order) => (
                                <tr
                                  key={order.id}
                                  className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                                >
                                  <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                                    {formatDate(order.createdAt)}
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                      #{order.id.substring(0, 8)}
                                    </div>
                                  </td>
                                  <td className="px-6 py-3">
                                    <div className="font-medium text-slate-900 dark:text-white">
                                      {order.campaignTitle ||
                                        "Unknown Campaign"}
                                    </div>
                                  </td>
                                  <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                                    {order.quantity} QRs
                                  </td>
                                  <td className="px-6 py-3">
                                    <div className="text-xs text-slate-500">
                                      C.B: INR {order.cashbackAmount}
                                    </div>
                                  </td>
                                  <td className="px-6 py-3 font-bold text-slate-900 dark:text-white">
                                    INR {formatAmount(order.totalAmount || 0)}
                                  </td>
                                  <td className="px-6 py-3">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusClasses(order.status)}`}
                                    >
                                      {order.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    {order.status === "pending" && (
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={() =>
                                            handleUpdateOrderStatus(
                                              order.id,
                                              "approved",
                                            )
                                          }
                                          disabled={
                                            processingOrderId === order.id
                                          }
                                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                          title="Approve"
                                        >
                                          <CheckCircle2 size={16} />
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleUpdateOrderStatus(
                                              order.id,
                                              "rejected",
                                            )
                                          }
                                          disabled={
                                            processingOrderId === order.id
                                          }
                                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                                          title="Reject"
                                        >
                                          <AlertCircle size={16} />
                                        </button>
                                      </div>
                                    )}
                                    {order.status !== "pending" && (
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={() =>
                                            handleDownloadOrderPdf(order)
                                          }
                                          disabled={isPreparingBatchPdf}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
                                          title="Download QR PDF"
                                        >
                                          <Download size={14} />
                                          {isPreparingBatchPdf ? "..." : "PDF"}
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="px-6 py-8 text-center text-slate-400 text-xs"
                                >
                                  No orders found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* CAMPAIGNS TAB */}
                {activeTab === "campaigns" && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Tab Header - only show on list view */}
                    {!selectedCampaign && (
                      <div className="pb-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Megaphone size={18} className="text-[#059669]" />{" "}
                          Campaigns
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          View and manage campaigns associated with this vendor
                        </p>
                      </div>
                    )}
                    {!selectedCampaign ? (
                      <>
                        {/* CAMPAIGN LIST VIEW */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {(
                            brandData?.campaigns ||
                            vendorData?.campaigns ||
                            []
                          ).map((campaign) => (
                            <div
                              key={campaign.id}
                              className="bg-white/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl p-4 shadow-sm flex flex-col gap-3 hover:border-[#059669]/50 dark:hover:border-[#059669]/50 transition-all backdrop-blur-md group"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">
                                    {campaign.title}
                                  </div>
                                  <div className="text-xs text-slate-500 line-clamp-1">
                                    {campaign.description}
                                  </div>
                                </div>
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusClasses(campaign.status)}`}
                                >
                                  {campaign.status}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                <div>
                                  <div className="text-[10px] text-slate-400 uppercase">
                                    Budget
                                  </div>
                                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    INR {formatAmount(campaign.totalBudget)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-400 uppercase">
                                    Cashback
                                  </div>
                                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    INR {campaign.cashbackAmount}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] text-slate-400 uppercase">
                                    Ends
                                  </div>
                                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    {formatDate(campaign.endDate)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-end pt-2">
                                <button
                                  onClick={() => setSelectedCampaign(campaign)}
                                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-[#059669] hover:text-white transition-all text-xs font-bold flex items-center gap-2"
                                >
                                  <Eye size={14} /> View Activity
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {(brandData?.campaigns || vendorData?.campaigns || [])
                          .length === 0 && (
                          <div className="text-center py-10 text-slate-400">
                            <p>No campaigns found</p>
                          </div>
                        )}
                      </>
                    ) : (
                      /* CAMPAIGN DETAIL VIEW */
                      <div className="space-y-6">
                        {/* Detail Header */}
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setSelectedCampaign(null)}
                            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <div className="p-1 rounded-full bg-slate-200 dark:bg-white/10">
                              <X size={14} />
                            </div>{" "}
                            Back to List
                          </button>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusClasses(selectedCampaign.status)}`}
                          >
                            {selectedCampaign.status}
                          </span>
                        </div>

                        {/* Main Details Card */}
                        <div className="bg-white/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 shadow-sm backdrop-blur-md">
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                            {selectedCampaign.title}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            {selectedCampaign.description}
                          </p>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-6 border-b border-slate-100 dark:border-white/5">
                            <div className="p-3 bg-slate-50 dark:bg-black/20 rounded-lg">
                              <div className="text-[10px] text-slate-400 uppercase font-bold">
                                Total Budget
                              </div>
                              <div className="text-lg font-bold text-slate-900 dark:text-white">
                                INR {formatAmount(selectedCampaign.totalBudget)}
                              </div>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-black/20 rounded-lg">
                              <div className="text-[10px] text-slate-400 uppercase font-bold">
                                Cashback / QR
                              </div>
                              <div className="text-lg font-bold text-[#059669]">
                                INR {selectedCampaign.cashbackAmount}
                              </div>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-black/20 rounded-lg">
                              <div className="text-[10px] text-slate-400 uppercase font-bold">
                                Start Date
                              </div>
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">
                                {formatDate(selectedCampaign.startDate)}
                              </div>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-black/20 rounded-lg">
                              <div className="text-[10px] text-slate-400 uppercase font-bold">
                                End Date
                              </div>
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">
                                {formatDate(selectedCampaign.endDate)}
                              </div>
                            </div>
                          </div>

                          {/* Actions Section */}
                          <div className="pt-6">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                              Campaign Actions
                            </h4>
                            <div className="flex flex-wrap gap-3">
                              {selectedCampaign.status === "pending" && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleUpdateCampaignStatus(
                                        selectedCampaign.id,
                                        "active",
                                      )
                                    }
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                                  >
                                    <CheckCircle2 size={16} /> Approve Campaign
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleUpdateCampaignStatus(
                                        selectedCampaign.id,
                                        "rejected",
                                      )
                                    }
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2"
                                  >
                                    <AlertCircle size={16} /> Reject
                                  </button>
                                </>
                              )}
                              {selectedCampaign.status === "active" && (
                                <button
                                  onClick={() =>
                                    handleUpdateCampaignStatus(
                                      selectedCampaign.id,
                                      "paused",
                                    )
                                  }
                                  disabled={isSaving}
                                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
                                >
                                  <Power size={16} /> Pause Campaign
                                </button>
                              )}
                              {selectedCampaign.status === "paused" && (
                                <button
                                  onClick={() =>
                                    handleUpdateCampaignStatus(
                                      selectedCampaign.id,
                                      "active",
                                    )
                                  }
                                  disabled={isSaving}
                                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                                >
                                  <CheckCircle2 size={16} /> Resume Campaign
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  handleDownloadCampaignPdf(selectedCampaign)
                                }
                                disabled={isPreparingBatchPdf}
                                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-lg transition-all flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50"
                              >
                                {isPreparingBatchPdf ? (
                                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
                                ) : (
                                  <Download size={16} />
                                )}
                                {isPreparingBatchPdf
                                  ? "Generating..."
                                  : "Download QRs"}
                              </button>
                            </div>
                          </div>

                          {/* ANALYTICS SECTION */}
                          {analyticsData && (
                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <BarChartIcon
                                  size={16}
                                  className="text-[#059669]"
                                />{" "}
                                Performance Analytics
                              </h4>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Status Chart */}
                                <div className="bg-slate-50 dark:bg-black/20 rounded-xl p-4 flex flex-col items-center justify-center min-h-[200px]">
                                  <div className="w-full h-[180px]">
                                    <ResponsiveContainer
                                      width="100%"
                                      height="100%"
                                    >
                                      <PieChart>
                                        <Pie
                                          data={getPieData()}
                                          cx="50%"
                                          cy="50%"
                                          innerRadius={50}
                                          outerRadius={70}
                                          paddingAngle={5}
                                          dataKey="value"
                                        >
                                          {getPieData().map((entry, index) => (
                                            <Cell
                                              key={`cell-${index}`}
                                              fill={
                                                COLORS[index % COLORS.length]
                                              }
                                            />
                                          ))}
                                        </Pie>
                                        <Tooltip
                                          contentStyle={{
                                            backgroundColor: "#1e293b",
                                            borderColor: "#334155",
                                            color: "#fff",
                                            fontSize: "12px",
                                          }}
                                          itemStyle={{ color: "#fff" }}
                                        />
                                      </PieChart>
                                    </ResponsiveContainer>
                                  </div>
                                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                                    {getPieData().map((entry, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase"
                                      >
                                        <div
                                          className="w-2 h-2 rounded-full"
                                          style={{
                                            backgroundColor:
                                              COLORS[index % COLORS.length],
                                          }}
                                        />
                                        {entry.name}: {entry.value}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Key Metrics */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col justify-center">
                                    <div className="text-2xl font-bold text-emerald-500">
                                      {analyticsData.metrics?.redemptionRate}%
                                    </div>
                                    <div className="text-xs text-emerald-600/70 font-medium">
                                      Redemption Rate
                                    </div>
                                  </div>
                                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex flex-col justify-center">
                                    <div className="text-2xl font-bold text-blue-500">
                                      {analyticsData.metrics?.uniqueRedeemers ||
                                        0}
                                    </div>
                                    <div className="text-xs text-blue-600/70 font-medium">
                                      Unique Users
                                    </div>
                                  </div>
                                  <div className="p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl flex flex-col justify-center">
                                    <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                                      {analyticsData.metrics?.redeemedQrs || 0}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium">
                                      Redeemed QRs
                                    </div>
                                  </div>
                                  <div className="p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl flex flex-col justify-center">
                                    <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                                      {analyticsData.metrics?.totalQrs || 0}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium">
                                      Total QRs Generated
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Recent Activity */}
                              {analyticsData.recentRedemptions?.length > 0 && (
                                <div className="mt-6">
                                  <div className="text-xs font-bold text-slate-500 uppercase mb-3">
                                    Recent Redemptions
                                  </div>
                                  <div className="space-y-2">
                                    {analyticsData.recentRedemptions.map(
                                      (redemption, i) => (
                                        <div
                                          key={i}
                                          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-slate-500">
                                              U
                                            </div>
                                            <div>
                                              <div className="text-xs font-bold text-slate-900 dark:text-white">
                                                User #
                                                {redemption.redeemedByUserId?.substring(
                                                  0,
                                                  6,
                                                ) || "Unknown"}
                                              </div>
                                              <div className="text-[10px] text-slate-400">
                                                {formatDate(
                                                  redemption.redeemedAt,
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-xs font-bold text-[#059669]">
                                            + INR {redemption.cashbackAmount}
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}

                              {(analyticsData.budget ||
                                analyticsData.topRedeemers?.length) && (
                                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                    <div className="text-xs font-bold text-slate-500 uppercase mb-2">
                                      Budget Check
                                    </div>
                                    <div className="text-sm text-slate-900 dark:text-white">
                                      Total:{" "}
                                      {analyticsData.budget?.total !== null &&
                                      analyticsData.budget?.total !== undefined
                                        ? `INR ${formatAmount(analyticsData.budget.total)}`
                                        : "Not set"}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                      Used: INR{" "}
                                      {formatAmount(
                                        analyticsData.budget?.used || 0,
                                      )}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      Remaining:{" "}
                                      {analyticsData.budget?.remaining !==
                                        null &&
                                      analyticsData.budget?.remaining !==
                                        undefined
                                        ? `INR ${formatAmount(analyticsData.budget.remaining)}`
                                        : "-"}
                                    </div>
                                    <div className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                      Usage:{" "}
                                      {analyticsData.budget?.usagePercent ?? 0}%
                                    </div>
                                  </div>
                                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                    <div className="text-xs font-bold text-slate-500 uppercase mb-2">
                                      Top Redeemers
                                    </div>
                                    {analyticsData.topRedeemers?.length ? (
                                      <div className="space-y-2 text-xs text-slate-500">
                                        {analyticsData.topRedeemers
                                          .slice(0, 3)
                                          .map((redeemer, idx) => (
                                            <div
                                              key={idx}
                                              className="flex items-center justify-between"
                                            >
                                              <span>
                                                User{" "}
                                                {redeemer.redeemedByUserId?.slice(
                                                  0,
                                                  6,
                                                ) || "Unknown"}
                                              </span>
                                              <span>
                                                {redeemer._count?._all || 0}{" "}
                                                scans
                                              </span>
                                            </div>
                                          ))}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-slate-500">
                                        No redeemer data yet.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Hidden Canvas Container for PDF Generation */}
        {batchQrs.length > 0 && (
          <div
            style={{ position: "absolute", left: "-9999px", top: "-9999px" }}
            aria-hidden="true"
          >
            {batchQrs.map((qr) => (
              <QRCodeCanvas
                key={qr.uniqueHash}
                id={getBatchCanvasId(qr.uniqueHash)}
                value={getQrValue(qr.uniqueHash)}
                size={120}
                level="M"
                includeMargin
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorAccountManager;

"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ShoppingBag,
  ChevronRight,
  CheckCircle2,
  Package,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "@/lib/router";
import { motion, AnimatePresence } from "framer-motion";
import { getPublicStoreData, getTransactionHistory } from "../lib/api";
import { resolvePublicAssetUrl } from "../lib/apiClient";
import { useAuth } from "../lib/auth";

const formatAmount = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : "0.00";
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getOrderProductName = (order) =>
  String(order?.description || "").replace(/Store redeem:\s*/i, "").trim();

const normalizeName = (value) => String(value || "").trim().toLowerCase();

const ProductThumb = ({ product, statusClassName = "text-emerald-600" }) => {
  const imageSrc = product?.image || product?.imageUrl || product?.bannerUrl;

  if (imageSrc) {
    return (
      <img
        src={resolvePublicAssetUrl(imageSrc)}
        alt={product?.name || "Product"}
        className="w-full h-full object-cover"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return <ShoppingBag size={22} className={statusClassName} />;
};

const OrderDetailModal = ({ order, status = "SUCCESS", onClose }) => {
  if (!order) return null;

  const getStepDate = (stepKey, hoursOffset) => {
    if (order.metadata?.statusTimestamps && order.metadata.statusTimestamps[stepKey]) {
      return new Date(order.metadata.statusTimestamps[stepKey]);
    }
    try {
      const saved = JSON.parse(localStorage.getItem("redeem_order_timestamps") || "{}");
      const orderTimes = saved[order.id];
      if (orderTimes && orderTimes[stepKey]) {
        return new Date(orderTimes[stepKey]);
      }
    } catch (e) {}
    if (stepKey === "SUCCESS") return new Date(order.createdAt);
    const date = new Date(order.createdAt);
    return new Date(date.getTime() + hoursOffset * 60 * 60 * 1000);
  };

  const timeline = [
    { status: "Order Placed", date: getStepDate("SUCCESS", 0), done: true, icon: Clock },
    {
      status: "Processing",
      date: getStepDate("PROCESSING", 2),
      done: status === "PROCESSING" || status === "SHIPPED" || status === "DELIVERED",
      icon: Package,
    },
    {
      status: "Shipped",
      date: getStepDate("SHIPPED", 24),
      done: status === "SHIPPED" || status === "DELIVERED",
      icon: ShieldCheck,
    },
    {
      status: "Delivered",
      date: getStepDate("DELIVERED", 48),
      done: status === "DELIVERED",
      icon: CheckCircle2,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100) onClose();
        }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-zinc-800" />
        </div>

        <div className="p-6 sm:p-8 space-y-6 sm:space-y-8 pb-24 sm:pb-12">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                Order Successful
              </h3>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
                Reference: #{order.id.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Product Info */}
          <div className="p-4 rounded-3xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm shrink-0">
                <ProductThumb
                  product={order.product}
                  statusClassName="text-emerald-600"
                />
              </div>
              <div className="font-extrabold text-sm text-gray-900 dark:text-white truncate">
                {getOrderProductName(order)}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-black text-emerald-600">
                -{formatAmount(order.amount)}
              </div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">
                Points
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-6 px-2">
            {timeline.map((step, i) => (
              <div key={i} className="flex gap-4 relative">
                {i !== timeline.length - 1 && (
                  <div className="absolute left-3 top-7 bottom-0 w-[2px] bg-emerald-100 dark:bg-emerald-900/30" />
                )}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm z-10 ${step.done ? "bg-emerald-600 text-white" : "bg-gray-100 dark:bg-zinc-800 text-gray-400"}`}
                >
                  <step.icon size={12} />
                </div>
                <div className="flex-1 pb-4">
                  <p
                    className={`text-sm font-black leading-none ${step.done ? "text-gray-900 dark:text-white" : "text-gray-400"}`}
                  >
                    {step.status}
                  </p>
                  {step.done && (
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1">
                      {formatDate(step.date)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Orders = () => {
  const navigate = useNavigate();
  const { authToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderStatuses, setOrderStatuses] = useState({});
  const [storeProductMap, setStoreProductMap] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("redeem_order_statuses");
      if (saved) {
        setOrderStatuses(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const txData = await getTransactionHistory(
        { page: 1, limit: 100 },
        authToken,
      );
      const allTx = Array.isArray(txData?.transactions)
        ? txData.transactions
        : [];
      const storeOrders = allTx.filter((tx) =>
        tx.description?.toLowerCase().includes("store redeem"),
      );
      setOrders(storeOrders);
    } catch (err) {
      setError(err?.message || "Failed to load orders.");
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    let isMounted = true;

    const loadStoreProducts = async () => {
      try {
        const data = await getPublicStoreData();
        const products = Array.isArray(data?.products) ? data.products : [];
        const nextMap = {};
        products.forEach((product) => {
          const key = normalizeName(product.name);
          if (key) nextMap[key] = product;
        });
        if (isMounted) setStoreProductMap(nextMap);
      } catch (err) {
        if (isMounted) setStoreProductMap({});
      }
    };

    loadStoreProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  if (!authToken) {
    return (
      <div className="min-h-dvh bg-gray-50 dark:bg-zinc-950 p-4 transition-colors">
        <div className="max-w-2xl mx-auto mt-20 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-gray-400 dark:text-zinc-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Login to view orders
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 mb-8">
            Your store redemptions are available after login.
          </p>
          <button
            onClick={() => navigate("/signin")}
            className="px-8 py-3 rounded-2xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/20 transition-transform active:scale-95"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-transparent p-4 pb-24 transition-colors duration-300">
      <div className="max-w-md mx-auto space-y-6">
        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-[24px] shadow-lg bg-[#d4f5e4]" style={{ height: '140px' }}>
          <img
            src="/orders-banner.webp"
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110"
          />
          <div className="relative z-10 h-full flex flex-col justify-center p-6">
            <h2 className="text-2xl font-black italic text-emerald-900 drop-shadow-sm">My Orders</h2>
            <p className="text-[10px] font-bold text-emerald-700/60 uppercase tracking-[0.2em] mt-1">
              Store Redemptions
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 text-rose-600 dark:text-rose-400 text-sm font-medium">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-20 border border-gray-100 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-100 dark:border-emerald-900/30 border-t-emerald-600 animate-spin" />
            <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
              Fetching Orders
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-12 shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-[24px] bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-center mb-6">
              <ShoppingBag className="w-12 h-12 text-gray-300 dark:text-zinc-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 leading-none">
              No orders yet
            </h2>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-8 max-w-[200px] uppercase tracking-wider leading-relaxed">
              Start redeeming your rewards to see them listed here.
            </p>
            <button
              onClick={() => navigate("/store")}
              className="px-8 py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-95 transition-transform"
            >
              Go to Store
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {orders.map((tx) => {
              const productName = getOrderProductName(tx);
              const product = storeProductMap[normalizeName(productName)];
              const statusVal = tx.metadata?.orderStatus || orderStatuses[tx.id] || "SUCCESS";
              const statusColor =
                statusVal === "SUCCESS"
                  ? "bg-emerald-500 text-white"
                  : statusVal === "PROCESSING"
                  ? "bg-amber-500 text-white"
                  : statusVal === "SHIPPED"
                  ? "bg-blue-500 text-white"
                  : "bg-indigo-500 text-white";
              const iconBg =
                statusVal === "PROCESSING"
                  ? "bg-amber-50 dark:bg-amber-900/20"
                  : statusVal === "SHIPPED"
                  ? "bg-blue-50 dark:bg-blue-900/20"
                  : statusVal === "DELIVERED"
                  ? "bg-indigo-50 dark:bg-indigo-900/20"
                  : "bg-emerald-50 dark:bg-emerald-900/20";
              const iconColor =
                statusVal === "PROCESSING"
                  ? "text-amber-500"
                  : statusVal === "SHIPPED"
                  ? "text-blue-500 dark:text-blue-400"
                  : statusVal === "DELIVERED"
                  ? "text-indigo-500 dark:text-indigo-400"
                  : "text-emerald-600 dark:text-emerald-400";

              return (
                <motion.div
                  key={tx.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedOrder({ ...tx, product })}
                  className="group px-4 py-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800/40 transition-all cursor-pointer flex items-center gap-3.5"
                >
                  {/* Gift Icon */}
                  <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0 overflow-hidden`}>
                    <ProductThumb product={product} statusClassName={iconColor} />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-extrabold text-gray-900 dark:text-white truncate leading-tight">
                      {productName}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider leading-none ${statusColor}`}>
                        {statusVal}
                      </span>
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                        {formatDate(tx.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0 mr-1">
                    <div className="text-[15px] font-black text-rose-500 leading-none">
                      -{formatAmount(tx.amount)}
                    </div>
                    <div className="text-[8px] font-black text-gray-400 uppercase tracking-[0.15em] mt-1">
                      Points
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight
                    size={16}
                    className="text-gray-300 dark:text-zinc-600 group-hover:text-emerald-500 transition-colors shrink-0"
                  />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            status={selectedOrder.metadata?.orderStatus || orderStatuses[selectedOrder.id] || "SUCCESS"}
            onClose={() => setSelectedOrder(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Orders;

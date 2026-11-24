"use client";

import React, { useEffect, useState } from "react";
import { useNavigate, Navigate } from "@/lib/router";
import { getUserDashboard } from "../lib/api";
import {
  AUTH_TOKEN_KEY,
  clearAuthToken,
  popPostLoginRedirect,
  useAuth,
  storeAuthToken,
} from "../lib/auth";
import WalletAuth from "../components/wallet/WalletAuth";
import RedeemCard from "../components/wallet/RedeemCard";
import WithdrawCard from "../components/wallet/WithdrawCard";
import WalletActionModal from "../components/wallet/WalletActionModal";
import {
  ArrowUpRight,
  ShoppingBag,
  ChevronRight,
  ShieldCheck,
  Clock,
  Lock,
  Gift,
} from "lucide-react";

// Helper to format currency
const formatAmount = (value) => {
  if (value === undefined || value === null) return "0.00";
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return String(value);
};

const formatActivityDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "-";
  
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).toLowerCase();

  if (isToday) {
    return `Today, ${timeStr}`;
  } else if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  } else {
    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "short" });
    return `${day} ${month}, ${timeStr}`;
  }
};

const normalizeTxType = (value) => String(value || "").toUpperCase();

const Wallet = () => {
  const navigate = useNavigate();
  const { authToken: token } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeModal, setActiveModal] = useState(null); // 'withdraw' | 'redeem' | null

  useEffect(() => {
    if (token) {
      loadDashboard(token);
    } else {
      setDashboard(null);
    }
  }, [token]);

  const loadDashboard = async (authToken) => {
    if (!authToken) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await getUserDashboard(authToken);
      setDashboard(data);
    } catch (err) {
      if (err.status === 401) {
        handleSignOut();
      }
      setError(err.message || "Unable to load wallet.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (newToken) => {
    storeAuthToken(newToken);
    const redirectTarget = popPostLoginRedirect();
    if (redirectTarget) {
      navigate(redirectTarget);
    }
  };

  const handleSignOut = () => {
    clearAuthToken();
    setDashboard(null);
  };

  const handleActionSuccess = () => {
    loadDashboard(token);
    setActiveModal(null);
  };

  if (!token) {
    return <Navigate to="/signin" replace />;
  }

  const balance = dashboard?.wallet?.balance || 0;
  const transactions = dashboard?.recentTransactions || [];
  const lastQrCredit = transactions.find(
    (tx) =>
      normalizeTxType(tx.type) === "CREDIT" &&
      String(tx.category || "").toLowerCase() === "cashback_payout",
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 pb-32 transition-colors duration-300 font-admin-body">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            My Wallet
          </h1>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {/* 1. Main Wallet Card */}
        <div className="relative overflow-hidden rounded-[32px] shadow-xl text-white min-h-[150px] flex flex-col justify-between" style={{ background: 'linear-gradient(135deg, #0f9b6e, #0d7a57)' }}>
          <img
            src="/wallet-banner.webp"
            alt=""
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/20 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10 p-5 flex flex-col h-full justify-between flex-1">
            {/* Top Row: Title & Badge */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-white/95">
                <ShieldCheck size={16} className="text-white" />
                <span>Assured Rewards Wallet</span>
              </div>
              <div className="mt-2">
                <span className="text-[33px] font-black tracking-tight leading-none drop-shadow-sm">
                  Rs {formatAmount(balance)}
                </span>
              </div>
            </div>

            {/* Bottom Row: Info Tags */}
            <div className="mt-3 space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/5 text-[10px] font-medium text-white leading-none">
                <Lock size={10} className="text-white/80" />
                <span>Powered by UPI & Net Banking</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-white ml-1">
                <ShieldCheck size={11} className="text-white" />
                <span>Secure transfers, every time</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setActiveModal("withdraw")}
            className="group relative flex items-center justify-between text-left bg-emerald-700 hover:bg-emerald-800 text-white pl-2.5 pr-2 py-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 duration-200 gap-1.5"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <ArrowUpRight size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-[12.5px] font-black tracking-tight leading-tight truncate">Transfer to Bank</div>
                <div className="text-[8.5px] font-semibold text-emerald-100/70 truncate mt-0.5">Send money to your bank</div>
              </div>
            </div>
            <ChevronRight size={13} className="text-white/50 group-hover:text-white shrink-0" />
          </button>

          <button
            onClick={() => navigate("/gift-cards")}
            className="group relative flex items-center justify-between text-left bg-zinc-900 hover:bg-zinc-800 text-white pl-2.5 pr-2 py-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 duration-200 gap-1.5"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                <ShoppingBag size={18} className="text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-[12.5px] font-black tracking-tight leading-tight truncate">Redeem in Store</div>
                <div className="text-[8.5px] font-semibold text-zinc-400 truncate mt-0.5">Use points for rewards</div>
              </div>
            </div>
            <ChevronRight size={13} className="text-white/40 group-hover:text-white shrink-0" />
          </button>
        </div>

        {/* 3. Recent Activity */}
        <div className="bg-white dark:bg-zinc-900 rounded-[32px] px-6 py-5.5 shadow-sm border border-gray-100 dark:border-zinc-800/80 min-h-[300px]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-gray-400 dark:text-zinc-500" />
              <h2 className="text-[16px] font-black text-gray-900 dark:text-white">
                Recent Activity
              </h2>
            </div>
            <button 
              onClick={() => navigate("/wallet/transactions")}
              className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 hover:underline"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>

          {isLoading && !transactions.length ? (
            <div className="p-4 text-center text-xs text-gray-400">
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
              <span className="text-xs">No transactions yet</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-zinc-800/50">
              {transactions.map((tx) => {
                const isCredit = normalizeTxType(tx.type) === "CREDIT";
                const isStoreRedeem = tx.description?.toLowerCase().includes("store redeem");
                
                const iconBg = isStoreRedeem 
                  ? "bg-emerald-50 dark:bg-emerald-950/20" 
                  : "bg-emerald-50 dark:bg-emerald-950/20";
                const iconColor = isStoreRedeem
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-emerald-600 dark:text-emerald-400";
                  
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-3.5 gap-3"
                  >
                    {/* Left side: Icon + Title/Sub */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-11 h-11 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
                        {isStoreRedeem ? (
                          <ShoppingBag size={20} className={iconColor} />
                        ) : (
                          <Gift size={20} className={iconColor} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-black text-gray-900 dark:text-white truncate leading-tight">
                          {tx.description || (isCredit ? "Cashback Received" : "Withdrawal")}
                        </div>
                        <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-1">
                          {formatActivityDate(tx.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Right side: Amount */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[14.5px] font-black whitespace-nowrap ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}>
                        {isCredit ? "+" : "-"} Rs {Math.floor(Number(tx.amount || 0))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modals */}
        <WalletActionModal
          isOpen={activeModal === "withdraw"}
          onClose={() => setActiveModal(null)}
          title="Withdraw Funds"
        >
          <WithdrawCard
            token={token}
            balance={balance}
            onWithdrawSuccess={handleActionSuccess}
          />
        </WalletActionModal>

        <WalletActionModal
          isOpen={activeModal === "redeem"}
          onClose={() => setActiveModal(null)}
          title="Redeem Gift Card"
        >
          <RedeemCard token={token} onRedeemSuccess={handleActionSuccess} />
        </WalletActionModal>
      </div>
    </div>
  );
};

export default Wallet;

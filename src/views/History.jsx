"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  QrCode,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { useNavigate } from "@/lib/router";
import { getTransactionHistory, getUserRedemptionHistory } from "../lib/api";
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

const History = () => {
  const navigate = useNavigate();
  const { authToken } = useAuth();
  const [redemptions, setRedemptions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    if (!authToken) {
      setRedemptions([]);
      setTransactions([]);
      setError("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const [redeemData, txData] = await Promise.all([
        getUserRedemptionHistory(authToken),
        getTransactionHistory({ page: 1, limit: 30 }, authToken),
      ]);

      setRedemptions(Array.isArray(redeemData) ? redeemData : []);
      setTransactions(
        Array.isArray(txData?.transactions) ? txData.transactions : [],
      );
    } catch (err) {
      setError(err?.message || "Failed to load history.");
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const summary = useMemo(() => {
    const totalRedeemed = redemptions.reduce(
      (sum, item) => sum + Number(item?.cashbackAmount || 0),
      0,
    );
    return {
      scans: redemptions.length,
      totalRedeemed,
      transactions: transactions.length,
    };
  }, [redemptions, transactions]);

  if (!authToken) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 pb-24 md:pb-8 transition-colors duration-300">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-10 shadow-sm border border-gray-100 dark:border-zinc-800 text-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Login to view history
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-5">
              Your scan and wallet history is available after login.
            </p>
            <button
              onClick={() => navigate("/signin")}
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-strong text-white font-semibold"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 pb-24 md:pb-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-gray-100 dark:border-zinc-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Scans
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {summary.scans}
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 overflow-hidden">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Earned
            </div>
            <div className="text-lg font-medium text-emerald-600 mt-1 truncate">
              ₹{formatAmount(summary.totalRedeemed)}
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-gray-100 dark:border-zinc-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Transactions
            </div>
            <div className="text-lg font-medium text-gray-900 dark:text-white mt-1">
              {summary.transactions}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-gray-100 dark:border-zinc-800 text-sm text-gray-500 dark:text-gray-400">
            Loading history...
          </div>
        ) : redemptions.length === 0 && transactions.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-10 shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <Clock className="w-10 h-10 text-gray-400 dark:text-zinc-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              No History Yet
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
              Your scanned products and wallet activities will appear here after
              your first successful scan.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-2">
                <QrCode size={16} className="text-primary" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Scan & Redemption History
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                {redemptions.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                    No scan redemptions found.
                  </div>
                ) : (
                  redemptions.map((item) => (
                    <div key={item.id || item.uniqueHash} className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {item.Campaign?.Brand?.name || "Brand"} -{" "}
                            {item.Campaign?.title || "Campaign"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatDate(item.redeemedAt || item.updatedAt)} |
                            Hash: {String(item.uniqueHash || "").slice(0, 10)}
                          </div>
                        </div>
                        <div className="text-right shrink-0 whitespace-nowrap">
                          <div className="text-sm font-medium text-emerald-600">
                            INR {formatAmount(item.cashbackAmount)}
                          </div>
                          <div className="text-[11px] text-gray-500 capitalize">
                            {item.status || "redeemed"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-2">
                <Wallet size={16} className="text-primary" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Wallet Activity
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                {transactions.filter(
                  (tx) =>
                    !tx.description?.toLowerCase().includes("store redeem"),
                ).length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                    No other transactions found.
                  </div>
                ) : (
                  transactions
                    .filter(
                      (tx) =>
                        !tx.description?.toLowerCase().includes("store redeem"),
                    )
                    .map((tx) => {
                      const isCredit =
                        String(tx.type || "").toLowerCase() === "credit";
                      return (
                        <div
                          key={tx.id}
                          className="p-4 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                                isCredit ? "bg-emerald-100" : "bg-rose-100"
                              }`}
                            >
                              {isCredit ? (
                                <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <ArrowUpCircle className="w-4 h-4 text-rose-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white capitalize truncate">
                                {(tx.category || "transaction").replace(
                                  /_/g,
                                  " ",
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(tx.createdAt)} |{" "}
                                {tx.status || "success"}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-sm font-medium shrink-0 whitespace-nowrap ${isCredit ? "text-emerald-600" : "text-rose-600"}`}
                          >
                            {isCredit ? "+" : "-"}INR {formatAmount(tx.amount)}
                          </span>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default History;

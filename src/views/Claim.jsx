"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/router";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { getClaimPreview, getWalletSummary, redeemClaim } from "../lib/api";
import { getAuthToken } from "../lib/auth";
import WalletAuth from "../components/wallet/WalletAuth";
import { captureClientLocation } from "../lib/location";

const formatAmount = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0.00";
  return numeric.toFixed(2);
};

const Claim = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(
    () => String(searchParams.get("token") || "").trim(),
    [searchParams],
  );

  const [authToken, setAuthToken] = useState(() => getAuthToken());
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [error, setError] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemStatus, setRedeemStatus] = useState(null);
  const [walletSnapshot, setWalletSnapshot] = useState(null);

  useEffect(() => {
    if (!token) {
      setError("Missing claim token.");
      setLoadingPreview(false);
      return;
    }

    const loadPreview = async () => {
      try {
        const data = await getClaimPreview(token);
        setPreview(data);
      } catch (err) {
        setError(err.message || "Unable to load claim preview.");
      } finally {
        setLoadingPreview(false);
      }
    };

    loadPreview();
  }, [token]);

  const handleRedeem = useCallback(async () => {
    if (!authToken || !token) return;
    setRedeeming(true);
    setError("");
    try {
      const locationPayload = await captureClientLocation();
      const result = await redeemClaim(authToken, token, locationPayload);
      setRedeemStatus({
        success: true,
        message:
          result.status === "claimed"
            ? "Already claimed. Wallet updated."
            : "Reward credited to wallet.",
      });
      setWalletSnapshot(result);

      const walletData = await getWalletSummary(authToken);
      setWalletSnapshot((prev) => ({
        ...prev,
        walletSummary: walletData,
      }));
    } catch (err) {
      setRedeemStatus({
        success: false,
        message: err.message || "Claim failed.",
      });
    } finally {
      setRedeeming(false);
    }
  }, [authToken, token]);

  useEffect(() => {
    if (!authToken || !preview || redeeming || redeemStatus) return;
    if (preview.status === "expired") return;
    handleRedeem();
  }, [authToken, preview, redeeming, redeemStatus, handleRedeem]);

  if (loadingPreview) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-700">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 p-6">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Unable to Claim</h1>
        <p className="text-slate-600 text-center">{error}</p>
      </div>
    );
  }

  const previewStatus = preview?.status || "unclaimed";
  const recentTransactions =
    walletSnapshot?.walletSummary?.recentTransactions || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-200/50 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-200/40 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 max-w-[80%] mx-auto leading-tight">
            Claim your reward
          </h1>
          <p className="text-slate-500 text-sm">
            Token status: {previewStatus}
          </p>
        </div>

        <div className="space-y-4 py-6 border-y border-slate-200">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-sm">Claim Amount</span>
            <span className="font-bold text-2xl text-emerald-600">
              Rs {formatAmount(preview?.amount)}
            </span>
          </div>
          {previewStatus === "expired" && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              This claim link has expired. Please request a new QR.
            </div>
          )}
        </div>

        {!authToken && previewStatus !== "expired" && (
          <div className="space-y-4">
            <div className="text-sm text-slate-600 text-center">
              Login to add this reward to your wallet.
            </div>
            <WalletAuth onLoginSuccess={setAuthToken} />
          </div>
        )}

        {authToken && previewStatus !== "expired" && (
          <>
            {redeemStatus && (
              <div
                className={`p-4 rounded-xl text-sm font-medium flex items-start gap-3 ${
                  redeemStatus.success
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {redeemStatus.success ? (
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                )}
                <div>{redeemStatus.message}</div>
              </div>
            )}

            {!redeemStatus?.success && (
              <button
                onClick={handleRedeem}
                disabled={redeeming}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-emerald-900/20"
              >
                {redeeming ? "Processing..." : "Claim Reward Now"}
              </button>
            )}

            {redeemStatus?.success && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Wallet size={16} />
                    Wallet Balance
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    Rs {formatAmount(walletSnapshot?.wallet?.balance)}
                  </div>
                </div>

                {recentTransactions.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                      Recent Wallet Activity
                    </div>
                    <div className="space-y-2">
                      {recentTransactions.slice(0, 5).map((tx) => (
                        <div
                          key={tx.id}
                          className="flex justify-between text-sm text-slate-700"
                        >
                          <span>{tx.description || tx.category}</span>
                          <span
                            className={
                              String(tx.type || "").toUpperCase() === "CREDIT"
                                ? "text-emerald-600 font-semibold"
                                : "text-slate-700 font-semibold"
                            }
                          >
                            {String(tx.type || "").toUpperCase() === "CREDIT"
                              ? "+"
                              : "-"}{" "}
                            Rs {formatAmount(tx.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => navigate("/wallet")}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3.5 rounded-xl transition-all"
                >
                  View Wallet
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Claim;

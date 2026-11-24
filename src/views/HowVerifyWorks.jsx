"use client";

import React, { useEffect } from "react";
import {
  ChevronLeft,
  FileQuestion,
  QrCode,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useNavigate } from "@/lib/router";
import { useSEO } from "../hooks/useSEO";

const HowVerifyWorks = () => {
  useSEO(
    "How Verification Works | Secure Cashback & Reward Points",
    "Learn how our verification process helps you safely earn reward points and get cashback on payments through secure and fast reward processing."
  );

  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const steps = [
    {
      icon: QrCode,
      title: "1. Scan the QR Code",
      desc: "Locate the verification QR code on your product packaging. Use our built-in scanner to scan it instantly.",
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      icon: ShieldCheck,
      title: "2. Anti-Counterfeit Check",
      desc: "Our system instantly matches the product code against our secure database to guarantee its authenticity.",
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      icon: Zap,
      title: "3. Claim Your Rewards",
      desc: "Once verified, you will immediately receive cashback or reward points deposited into your wallet.",
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 pb-24 md:pb-8 transition-colors duration-300 font-admin-body">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            How Assured Rewards Works
          </h1>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-gray-100 dark:border-zinc-800 shadow-sm text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileQuestion size={32} className="text-primary" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Simple, Fast, Secure
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Our Assured Rewards system protects you from counterfeit products while
            instantly rewarding you for your genuine purchases.
          </p>
        </div>

        <div className="space-y-4 pt-4 relative">
          {/* Connecting line */}
          <div className="absolute left-9 top-8 bottom-12 w-0.5 bg-gray-200 dark:bg-zinc-800 z-0 hidden sm:block"></div>

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="flex gap-4 relative z-10">
                <div
                  className={`w-14 h-14 rounded-2xl ${step.bg} flex items-center justify-center shrink-0 shadow-sm`}
                >
                  <Icon size={24} className={step.color} />
                </div>
                <div className="pt-2">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                    {step.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-8">
          <button
            onClick={() => navigate("/scan")}
            className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/25 hover:bg-primary-strong transition-all active:scale-[0.98]"
          >
            Try Verification Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowVerifyWorks;

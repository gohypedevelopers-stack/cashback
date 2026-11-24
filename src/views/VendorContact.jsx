"use client";

import React, { useState } from "react";
import {
  Mail,
  Phone,
  Store,
  Clock,
  Check,
  Copy,
  HelpCircle,
  Headphones,
  ArrowUpRight,
  ChevronRight,
  QrCode,
  Building2,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "@/lib/router";
import VendorNavbar from "../components/VendorNavbar";
import { useSEO } from "../hooks/useSEO";
import { useToast } from "../components/ui/ToastContext";

const VendorContact = () => {
  useSEO(
    "Vendor Support & Contact | Assured Rewards Partner Desk",
    "Contact the Assured Rewards merchant support team. Quick phone, WhatsApp, and email help for store campaigns, payouts, and retail partnerships."
  );

  const navigate = useNavigate();
  const { success } = useToast();
  const [copiedField, setCopiedField] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const APP_NAME = "Assured Rewards";
  const SUPPORT_PHONE = "+91 83689 26325";
  const SUPPORT_EMAIL = "vendor.support@assuredrewards.in";
  const PARTNERSHIP_EMAIL = "partnerships@assuredrewards.in";
  const WHATSAPP_NUMBER = "918368926325";
  const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "Hello Assured Rewards Team, I am reaching out regarding my merchant / vendor inquiry."
  )}`;

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    success("Copied to Clipboard", `${fieldName} copied.`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const contactChannels = [
    {
      id: "phone",
      title: "Phone Support",
      tag: "Direct Line",
      value: SUPPORT_PHONE,
      sub: "Mon – Sat: 9:00 AM – 7:00 PM",
      icon: Phone,
      iconBg: "bg-emerald-50 text-emerald-600",
      actionText: "Call Now",
      actionHref: `tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`,
      copyValue: SUPPORT_PHONE,
    },
    {
      id: "whatsapp",
      title: "WhatsApp Chat",
      tag: "Instant Help",
      value: "+91 83689 26325",
      sub: "Available 7 Days a Week",
      icon: MessageCircle,
      iconBg: "bg-green-50 text-green-600",
      actionText: "Chat",
      actionHref: WHATSAPP_URL,
      copyValue: SUPPORT_PHONE,
      isExternal: true,
    },
    {
      id: "email",
      title: "Merchant Support",
      tag: "Email Queue",
      value: SUPPORT_EMAIL,
      sub: "Response within 2 hours",
      icon: Mail,
      iconBg: "bg-blue-50 text-blue-600",
      actionText: "Email",
      actionHref: `mailto:${SUPPORT_EMAIL}?subject=Vendor%20Support%20Request`,
      copyValue: SUPPORT_EMAIL,
    },
    {
      id: "partnerships",
      title: "Retail Partnerships",
      tag: "Enterprise",
      value: PARTNERSHIP_EMAIL,
      sub: "Multi-store & POS integrations",
      icon: Building2,
      iconBg: "bg-purple-50 text-purple-600",
      actionText: "Partner",
      actionHref: `mailto:${PARTNERSHIP_EMAIL}?subject=Retail%20Partnership%20Inquiry`,
      copyValue: PARTNERSHIP_EMAIL,
    },
  ];

  const vendorGuides = [
    {
      question: "How do I launch my first cashback campaign?",
      answer:
        "Log in to your vendor dashboard, click 'Create Campaign,' configure your discount or cashback percentage, set duration, and hit Publish. Your unique store QR code is ready immediately to display at your checkout counter.",
    },
    {
      question: "How do physical QR standees & counter kits work?",
      answer:
        "You can request official acrylic standees and counter stickers by messaging our merchant support desk. We ship branded POS kits directly to your store address.",
    },
    {
      question: "How do cashback settlements and billing work?",
      answer:
        "Every scan is tracked transparently in real time on your dashboard. Settlements and invoice summaries can be downloaded anytime from the financial reports tab.",
    },
    {
      question: "Can I manage multiple outlets with one account?",
      answer:
        "Yes! Multi-branch businesses can manage all stores from a single unified portal with branch-wise QR assignments and aggregated analytics.",
    },
    {
      question: "What if a customer has issues scanning the QR code?",
      answer:
        "Our POS scan hotline is active 7 days a week. You can also regenerate and print a crisp new QR code anytime straight from your campaign settings.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <VendorNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Header */}
        <div className="text-center sm:text-left space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
            <Headphones className="w-3.5 h-3.5 text-emerald-600" />
            <span>Merchant Support Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Contact Partner Support
          </h1>
          <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">
            Need help with your campaign setup, counter standees, wallet payouts,
            or store registration? Reach out directly through any channel below.
          </p>
        </div>

        {/* 4 Contact Cards in One Line on Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {contactChannels.map((channel) => {
            const Icon = channel.icon;
            return (
              <div
                key={channel.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${channel.iconBg} shrink-0`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {channel.tag}
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {channel.title}
                        </h3>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(channel.copyValue, channel.title)}
                      className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                      title="Copy"
                    >
                      {copiedField === channel.title ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div
                    className="text-sm sm:text-[15px] font-bold text-slate-900 truncate mb-1"
                    title={channel.value}
                  >
                    {channel.value}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-1">
                    {channel.sub}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <a
                    href={channel.actionHref}
                    target={channel.isExternal ? "_blank" : undefined}
                    rel={channel.isExternal ? "noreferrer" : undefined}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
                  >
                    <span>{channel.actionText}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Self-Serve Actions Row (Full Width) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Quick Merchant Actions
              </h2>
              <p className="text-xs text-slate-500">
                Direct shortcuts to manage your store or create an account
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <button
              type="button"
              onClick={() => navigate("/brand-registration")}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-emerald-50 hover:border-emerald-200 text-left transition-all group cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Store className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="truncate">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700">
                    Register Store
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Join in 2 minutes
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => navigate("/vendor-dashboard")}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-200 text-left transition-all group cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <QrCode className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="truncate">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-700">
                    Vendor Portal
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Campaigns & scans
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => navigate("/vendor/faqs")}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-purple-50 hover:border-purple-200 text-left transition-all group cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <HelpCircle className="w-5 h-5 text-purple-600 shrink-0" />
                <div className="truncate">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-purple-700">
                    Vendor FAQs
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Guides & answers
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 shrink-0" />
            </button>
          </div>
        </div>

        {/* FAQs Accordion (Full Width) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Frequently Asked Questions
              </h2>
              <p className="text-xs text-slate-500">
                Quick answers to common merchant questions
              </p>
            </div>
            <Link
              to="/vendor/faqs"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
            >
              <span>All FAQs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {vendorGuides.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="border border-slate-100 rounded-xl overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-3.5 text-left bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <span className="font-semibold text-xs sm:text-sm text-slate-800 pr-3">
                      {item.question}
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                        isOpen ? "rotate-90 text-emerald-600" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3.5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal bg-slate-50/50 border-t border-slate-100">
                          {item.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operating Hours Note */}
        <div className="text-center text-xs text-slate-400 space-y-1 pt-2 pb-4">
          <p>
            Merchant Support Operating Hours: <span className="font-semibold text-slate-600">Monday – Saturday, 9:00 AM – 7:00 PM IST</span>
          </p>
          <p>
            Emergency QR Scan & POS support available 7 days a week via WhatsApp.
          </p>
        </div>
      </main>

      {/* Vendor Footer (End-to-End Max-W-7xl) */}
      <footer className="bg-white border-t border-slate-200 py-10 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pb-6 border-b border-slate-100">
            <div className="text-center sm:text-left">
              <div className="text-xl font-extrabold text-slate-900 tracking-tight font-admin-heading">
                Assured<span className="text-emerald-600">Rewards</span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Powering customer loyalty for retail businesses.
              </p>
            </div>

            <div className="flex flex-wrap justify-center sm:justify-end gap-5 text-xs font-semibold text-slate-500">
              {[
                { label: "Login", path: "/vendor-dashboard" },
                { label: "Privacy Policy", path: "/vendor/privacy" },
                { label: "Terms of Service", path: "/vendor/terms" },
                { label: "FAQs", path: "/vendor/faqs" },
                { label: "Contact", path: "/vendor/contact" },
              ].map((link, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => navigate(link.path)}
                  className={`transition-colors cursor-pointer ${
                    link.path === "/vendor/contact"
                      ? "text-emerald-600 font-bold"
                      : "hover:text-emerald-600"
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-400 text-center sm:text-left">
            <div>© 2026 {APP_NAME}. All rights reserved.</div>
            <div className="text-[11px] text-slate-400">
              Secure • Reliable • Seamless
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default VendorContact;

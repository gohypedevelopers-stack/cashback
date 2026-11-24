"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "@/lib/router";
import { useSEO } from "../hooks/useSEO";

const BrandFAQs = () => {
  useSEO(
    "Brand FAQs | Loyalty Promotions & Cashback Offers",
    "Find answers about brand loyalty promotions, bank cashback offers and loyalty membership deals. Maximize your benefits with Assured Rewards."
  );

  const navigate = useNavigate();
  const [openId, setOpenId] = useState("0-0");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const faqSections = [
    {
      title: "General",
      faqs: [
        {
          question: "What is Assured Rewards and how does it work?",
          answer:
            "Assured Rewards is a QR-based loyalty and cashback platform that connects vendors and customers. Vendors create reward campaigns and generate a QR code for their store. Customers scan the code after a purchase to earn instant cashback, which gets credited to their Assured Rewards wallet right away — no app download, no loyalty cards, no complicated steps.",
        },
        {
          question: "How do I sign up as a vendor?",
          answer:
            "Visit our website and click 'Get Started.' Enter your business name, contact number, and basic store details. After a quick OTP verification, your vendor account is live. You can launch your first cashback campaign from the dashboard within minutes — no technical knowledge required.",
        },
      ],
    },
    {
      title: "For Customers",
      faqs: [
        {
          question: "How do I earn cashback as a customer?",
          answer:
            "It's easy: make a purchase at any participating store, scan the QR code displayed at the counter using your phone's camera, and your cashback is instantly added to your Assured Rewards wallet. No app download is needed — just a smartphone and the QR code.",
        },
        {
          question: "When does my cashback get credited?",
          answer:
            "Cashback is credited to your wallet the moment your QR scan is confirmed — no delays, no waiting periods. You'll see your updated balance on the confirmation screen immediately after scanning.",
        },
        {
          question: "How do I redeem or withdraw my cashback?",
          answer:
            "You have two options: use your cashback balance as a discount on your next purchase at any participating Assured Rewards store, or transfer it directly to your UPI-linked bank account. UPI transfers are typically processed within a few hours.",
        },
      ],
    },
    {
      title: "For Vendors",
      faqs: [
        {
          question: "How do I create a cashback campaign?",
          answer:
            "Log in to your vendor dashboard, click 'Create Campaign,' set your preferred cashback amount (percentage or fixed), choose start and end dates, and hit Publish. A unique QR code is generated instantly. Print it and place it at your billing counter — your customers can start earning right away.",
        },
        {
          question: "Can I track how my campaign is performing?",
          answer:
            "Yes. Your dashboard provides real-time analytics including total QR scans, cashback distributed, number of new vs. returning customers, and revenue trends. For vendors with multiple outlets, you can filter data by location, campaign, or date range.",
        },
        {
          question: "Can I run multiple campaigns at the same time?",
          answer:
            "Absolutely. You can run simultaneous campaigns — for example, a year-round loyalty campaign alongside a limited-time festive offer. Each campaign gets its own QR code and tracks independently in your dashboard so results are never mixed.",
        },
      ],
    },
    {
      title: "Troubleshooting",
      faqs: [
        {
          question: "Why didn't I receive my cashback after scanning?",
          answer:
            "Please check: (1) you completed the scan and saw a confirmation screen, (2) your internet connection was active during the scan, and (3) the campaign was still running at the time. If everything looks correct but cashback was not credited, contact our support team with your scan timestamp and store name — we resolve most cases within 24 hours.",
        },
        {
          question: "I'm a vendor and my QR code isn't scanning. What should I do?",
          answer:
            "First, confirm the campaign is still active in your dashboard. If the printed QR code is faded or damaged, you can regenerate and reprint it at any time from your campaign settings — at no extra charge. If the issue continues, reach out to our support team via chat or email. We're available 7 days a week.",
        },
      ],
    },
  ];

  const toggleFaq = (id) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 p-4 pb-24 md:pb-8 transition-colors duration-300 font-admin-body">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Brand FAQs
          </h1>
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>
        </div>

        {/* Help Banner */}
        <div className="bg-primary/10 dark:bg-primary/20 rounded-3xl p-6 flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
            <HelpCircle size={24} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">
              Have questions?
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Find answers about our partnering brands and their rewards.
            </p>
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-6">
          {faqSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-3">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider px-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                {section.title}
              </h4>
              <div className="space-y-3">
                {section.faqs.map((faq, faqIndex) => {
                  const id = `${sectionIndex}-${faqIndex}`;
                  const isOpen = openId === id;
                  return (
                    <div
                      key={faqIndex}
                      onClick={() => toggleFaq(id)}
                      className={`bg-white dark:bg-zinc-900 rounded-2xl border ${isOpen ? "border-primary/50 shadow-md" : "border-gray-100 dark:border-zinc-800 shadow-sm"} p-4 cursor-pointer hover:border-primary/30 transition-all duration-300`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white leading-snug">
                          {faq.question}
                        </h3>
                        {isOpen ? (
                          <ChevronUp size={18} className="text-primary shrink-0" />
                        ) : (
                          <ChevronDown size={18} className="text-gray-400 shrink-0" />
                        )}
                      </div>
                      {isOpen && (
                        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line animate-in fade-in slide-in-from-top-1">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Support Footer */}
        <div className="text-center pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Still have questions? Reach out to our support team — we're here to help 7 days a week.
          </p>
          <button
            onClick={() => navigate("/profile/contact")}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary hover:bg-primary-strong text-white font-semibold shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrandFAQs;

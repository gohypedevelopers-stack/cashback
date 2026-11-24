"use client";

import React, { useState } from "react";
import { Link } from "@/lib/router";
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { useSEO } from "../hooks/useSEO";

const HelpSupport = () => {
  useSEO(
    "Help Center | Guide to Earn Reward Points & Cashback",
    "Have questions about our customer loyalty programs? Visit our Help Center to learn how to earn loyalty points, redeem rewards, and use cashback coupons."
  );

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

  const [openId, setOpenId] = useState("0-0");

  const toggleFaq = (id) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Help & Support
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Find answers or get in touch with us
        </p>
      </div>

      {/* Chat Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-orange-500 to-green-500 p-5 shadow-lg">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-white">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Chat with Support 
              </h3>
              <p className="text-xs text-white/90 font-medium">
                Get instant help 24/7
              </p>
            </div>
          </div>
          <a
            href="https://wa.me/918368926325"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg bg-white/20 px-4 py-2 text-xs font-bold text-white backdrop-blur-md transition-colors hover:bg-white/30"
          >
            Start Chat <ChevronRight size={14} />
          </a>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl"></div>
        <div className="absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-white/10 blur-2xl"></div>
      </div>

      {/* FAQs */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle size={18} className="text-orange-500" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">
            Frequently Asked Questions
          </h3>
        </div>
        <div className="space-y-6">
          {faqSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-3">
              <h4 className="text-xs font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wider px-1 flex items-center gap-1.5 mt-4 first:mt-0">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                {section.title}
              </h4>
              <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                {section.faqs.map((faq, faqIndex) => {
                  const id = `${sectionIndex}-${faqIndex}`;
                  const isOpen = openId === id;
                  return (
                    <div key={faqIndex} className="py-3 first:pt-0 last:pb-0">
                      <button
                        onClick={() => toggleFaq(id)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 pr-4">
                          {faq.question}
                        </span>
                        {isOpen ? (
                          <ChevronUp size={16} className="text-gray-400 min-w-[16px]" />
                        ) : (
                          <ChevronDown
                            size={16}
                            className="text-gray-400 min-w-[16px]"
                          />
                        )}
                      </button>
                      {isOpen && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed pl-0 pr-4 whitespace-pre-line">
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
      </div>

      {/* Contact Support */}
      <div>
        <div className="mb-3">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">
            Still have questions?
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Reach out to our support team — we're here to help 7 days a week.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-4 rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-500">
              <Mail size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Email Support</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                support@assuredrewards.in
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 text-green-500">
              <Phone size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Call Us</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                +91 83689 26325
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-8 text-center border-t border-gray-100 dark:border-zinc-800 mt-4">
        <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">
          <Link to="/terms" className="hover:text-amber-500 transition-colors">
            Terms & Conditions
          </Link>
          <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">
            &bull;
          </span>
          <Link
            to="/privacy-policy"
            className="hover:text-amber-500 transition-colors"
          >
            Privacy Policy
          </Link>
          <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">
            &bull;
          </span>
          {/* <Link
            to="/brand-registration"
            className="hover:text-amber-500 transition-colors"
          >
            For Brands
          </Link> */}
          {/* <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">
            &bull;
          </span> */}
          <Link
            to="/return-refund"
            className="hover:text-amber-500 transition-colors"
          >
            Return &amp; Refund
          </Link>
        </div>
        <p className="text-xs text-gray-400/80 font-medium">
          <span className="text-orange-500 font-bold mr-1" aria-hidden="true">
            &#9675;
          </span>{" "}
          Powered by Assured Rewards{" "}
          <span className="mx-1" aria-hidden="true">
            &bull;
          </span>{" "}
          Secure & Trusted
        </p>
      </div>
    </div>
  );
};

export default HelpSupport;


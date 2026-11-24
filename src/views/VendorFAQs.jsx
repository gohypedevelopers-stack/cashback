"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import VendorNavbar from "../components/VendorNavbar";
import { useNavigate } from "@/lib/router";
import { useSEO } from "../hooks/useSEO";

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

const VendorFAQs = () => {
  useSEO(
    "Vendor FAQs | Loyalty Program for Small Businesses | Assured Rewards",
    "Find answers about setting up a loyalty program for your small business and managing reward points, cashback offers and vendor benefits."
  );

  const [openId, setOpenId] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-900 font-admin-body text-base">
      <VendorNavbar />

      <section className="py-24 bg-slate-50/50 relative border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-[0.3em]">
                Got Questions?
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-admin-heading">
                Vendor Help & <span className="text-emerald-600">FAQs.</span>
              </h2>
              <p className="text-lg text-slate-500 max-w-xl mx-auto font-medium">
                Everything you need to know about running your rewards programs.
              </p>
            </motion.div>
          </div>

          <div className="space-y-8">
            {faqSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-4">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] px-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {section.title}
                </h4>
                <div className="space-y-3">
                  {section.faqs.map((faq, faqIndex) => {
                    const id = `${sectionIndex}-${faqIndex}`;
                    const isOpen = openId === id;
                    return (
                      <motion.div
                        key={faqIndex}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: faqIndex * 0.1 }}
                        className="bg-white rounded-3xl border border-slate-100 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
                      >
                        <button
                          onClick={() => setOpenId(isOpen ? null : id)}
                          className="flex w-full items-center justify-between text-left p-6 md:p-8"
                        >
                          <span className="text-base md:text-lg font-black text-slate-800 tracking-tight pr-4">
                            {faq.question}
                          </span>
                          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                            {isOpen ? (
                              <ChevronUp size={18} className="text-emerald-600" />
                            ) : (
                              <ChevronDown size={18} />
                            )}
                          </div>
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 pb-6 md:px-8 md:pb-8 pt-0 text-slate-500 font-medium leading-relaxed border-t border-slate-50">
                                {faq.answer}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Support Footer */}
      <section className="py-16 bg-white text-center">
        <p className="text-slate-500 font-medium mb-4">
          Still have questions? We're here to help 7 days a week.
        </p>
        <a 
          href="mailto:support@assuredrewards.in?subject=Vendor%20Support%20Request&body=Hello%20Vendor%20Support%20Team%2C%0A%0A" 
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-6 py-3 text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
        >
          Email Vendor Support
        </a>
      </section>
    </div>
  );
};

export default VendorFAQs;

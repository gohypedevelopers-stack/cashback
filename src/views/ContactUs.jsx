"use client";

import React, { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  Clock,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "@/lib/router";
import { useSEO } from "../hooks/useSEO";

const ContactUs = () => {
  useSEO(
    "Contact Assured Rewards | Support for Loyalty Points",
    "Need help with cashback on shopping or bonus reward points? Contact the Assured Rewards support team today. We value and reward loyal customers."
  );

  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    if (!formData.name || !formData.email || !formData.message) {
      setSubmitError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSubmitSuccess(false), 5000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 pb-24 md:pb-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header with Details */}
        <div className="pt-6 text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
            Contact Us
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Reach out to AssuredRewards Support Team
            <br />
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              support@assuredrewards.in {" "} &bull; {" "} +91 83689 26325
            </span>
          </p>
        </div>

        {/* Quick Contact Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-[#059669] to-[#5ab334] p-5 shadow-lg">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-white">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  Need Quick Help?
                </h3>
                <p className="text-xs text-white/90 font-medium">
                  Our team responds within 24 hours
                </p>
              </div>
            </div>
          </div>
          {/* Decorative */}
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-white/10 blur-2xl"></div>
        </div>

        {/* Contact Info Cards */}
        <div className="space-y-3">
          <a
            href="mailto:support@assuredrewards.in"
            className="flex items-center gap-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500">
              <Mail size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Email Us
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                support@assuredrewards.in
              </p>
            </div>
            <ChevronRight
              size={16}
              className="text-gray-300 dark:text-zinc-600 shrink-0"
            />
          </a>

          <a
            href="tel:+918368926325"
            className="flex items-center gap-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/20 text-green-500">
              <Phone size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Call Us
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                +91 83689 26325
              </p>
            </div>
            <ChevronRight
              size={16}
              className="text-gray-300 dark:text-zinc-600 shrink-0"
            />
          </a>

          <div className="flex items-center gap-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500">
              <MapPin size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Visit Us
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                D-6/1, Pocket D, Okhla Phase II, Okhla Industrial Estate, New Delhi, Delhi 110020
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-500">
              <Clock size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Business Hours
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Mon - Fri: 9:00 AM - 6:00 PM IST
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400">
                Online
              </span>
            </div>
          </div>
        </div>

        {/* Send Message Form */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <Send size={18} className="text-primary" />
            <h3 className="font-bold text-gray-900 dark:text-white">
              Send us a Message
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 ml-0.5">
                  Your Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all placeholder:text-gray-400"
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 ml-0.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all placeholder:text-gray-400"
                  placeholder="hello@gmail.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 ml-0.5">
                Subject
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all placeholder:text-gray-400"
                placeholder="How can we help?"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 ml-0.5">
                Message *
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all placeholder:text-gray-400 resize-none"
                placeholder="Write your message here..."
                required
              />
            </div>

            {/* Error / Success Messages */}
            {submitError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                {submitError}
              </div>
            )}

            {submitSuccess && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm font-medium rounded-xl border border-green-100 dark:border-green-900/30 flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                Message sent successfully! We'll get back to you soon.
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-primary hover:bg-primary-strong disabled:opacity-50 text-white font-semibold py-3.5 shadow-lg shadow-primary/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Sending...</span>
              ) : (
                <>
                  <Send size={16} />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="py-4 text-center">
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            <span className="text-primary font-bold">*</span> Powered by
            AssuredRewards | Secure & Trusted
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;


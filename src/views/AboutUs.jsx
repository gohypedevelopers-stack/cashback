"use client";

import React, { useEffect } from "react";
import {
  ArrowLeft,
  Target,
  ShieldCheck,
  Eye,
  Rocket,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "@/lib/router";
import { useSEO } from "../hooks/useSEO";

const AboutUs = () => {
  useSEO(
    "About Assured Rewards | Best Loyalty Rewards Program",
    "Discover how Assured Rewards is building the best loyalty rewards program. We aim to reward loyal customers with top cashback offers and loyalty points."
  );

  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 pb-24 md:pb-8 transition-colors duration-300 font-sans">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          {/* <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-white dark:hover:bg-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
          </button> */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              About Us
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redefining How Rewards Work
            </p>
          </div>
        </div>

        {/* Intro */}
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm mb-4">
            At <strong>Assured Rewards</strong>, we believe rewards should be
            simple, transparent, and truly valuable. In a digital world full of
            complicated terms, hidden conditions, and uncertain cashback
            promises, we built a platform that does one thing clearly, rewards
            you with confidence.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
            Assured Rewards is a web-based platform designed to connect users
            with trusted brands, merchants, and opportunities where everyday
            transactions can generate meaningful cashback and benefits. Our goal
            is to create a seamless experience where earning rewards feels
            effortless and reliable.
          </p>
        </div>

        {/* Why We Built It & Offering */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-500 mb-2">
              <Target size={24} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Why We Built Assured Rewards
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Online shoppers and digital users often encounter unclear reward
              structures, delayed confirmations, and confusing policies. We saw
              the gap, and we decided to close it.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Assured Rewards was created to bring structure, transparency, and
              accountability into the rewards ecosystem. Every eligible
              transaction goes through a validation process to ensure accuracy
              and fairness. Our system is designed to protect both users and
              partner merchants while maintaining clarity in reward tracking and
              wallet management.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
              We focus on building a platform that users can trust, not just
              today, but consistently over time.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-4 flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-500 mb-2">
              <CheckCircle2 size={24} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              What We Offer
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              Through Assured Rewards, users gain access to:
            </p>
            <ul className="space-y-3 mb-6 flex-1">
              {[
                "Cashback opportunities across partnered merchants",
                "Structured reward validation",
                "Secure wallet tracking",
                "Transparent reward timelines",
                "Controlled withdrawal systems",
              ].map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-auto pt-4 border-t border-gray-100 dark:border-zinc-800">
              Our platform is continuously evolving to improve speed, accuracy,
              and user experience. We prioritize technology that ensures
              security, fraud prevention, and smooth performance across devices.
            </p>
          </div>
        </div>

        {/* Values/Commitments */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 text-blue-500">
                <Eye size={20} />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Our Commitment to Transparency
              </h3>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                Trust is the foundation of any reward system. That is why we
                clearly outline our policies, validation timelines, and reward
                conditions. We believe users should understand how rewards are
                earned, when they are confirmed, and how they can be redeemed.
              </p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                No complicated fine print. No unrealistic promises. Just a
                structured system designed to work fairly.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0 text-indigo-500">
                <Activity size={20} />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Built for Long-Term Value
              </h3>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                Assured Rewards is not designed as a short-term promotional
                model. It is built as a scalable rewards ecosystem that grows
                with its users and merchant network.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                We continuously refine our platform, strengthen partnerships,
                and enhance security measures to ensure that our community
                benefits from a reliable and evolving rewards experience.
              </p>
            </div>
          </div>
        </div>

        {/* Vision & Mission Highlight Cards */}
        <div className="space-y-4">
          <div className="bg-linear-to-br from-primary to-primary-strong rounded-3xl p-6 text-white shadow-lg shadow-primary/20 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4">
                <Rocket size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Our Vision</h3>
              <p className="text-white/90 leading-relaxed text-sm">
                To create a transparent and trusted rewards platform where
                digital transactions generate consistent and verifiable value
                for users.
              </p>
            </div>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors duration-500"></div>
          </div>

          <div className="bg-linear-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden group">
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/5">
                <ShieldCheck size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Our Mission</h3>
              <p className="text-gray-300 leading-relaxed text-sm">
                To simplify cashback and reward systems through structured
                validation, secure technology, and clear policies, ensuring
                users feel confident every time they transact.
              </p>
            </div>
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-500"></div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 pb-4 text-center">
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            © 2026 Assured Rewards. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;

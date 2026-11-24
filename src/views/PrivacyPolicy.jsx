"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "@/lib/router";
import { useSEO } from "../hooks/useSEO";

const PrivacyPolicy = () => {
  useSEO(
    "Privacy Policy | Assured Rewards Customer Loyalty Program",
    "Read the Assured Rewards Privacy Policy and learn how we protect your personal information while you earn cashback and use our rewards program."
  );

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 pb-24 md:pb-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Privacy Policy
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Effective Date: 25 Feb 2026
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            This Privacy Policy describes how Assured Rewards ("Company", "we",
            "our", or "us") collects, uses, processes, and protects information
            when you access or use the Assured Rewards web application and
            website (collectively the "Platform" or "Service"). By accessing or
            using our Platform, you acknowledge that you have read and
            understood this Privacy Policy and agree to the collection and use
            of information in accordance with the terms set forth herein.
          </p>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              1. Information We Collect
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              We may collect personal information such as your full name, mobile
              number, email address, date of birth, postal address, and any
              additional details required for account verification or reward
              processing. When necessary for withdrawals, fraud prevention, or
              regulatory compliance, we may also collect identification
              information and payment-related details. This data helps us create
              and manage user accounts, verify identity, process cashback and
              rewards, facilitate withdrawals, communicate service updates,
              resolve disputes, and provide customer support. Limited user
              information may be shared with partnered merchants or brands
              strictly for operational purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              2. Rewards and Wallet Policy
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Cashback, reward credits, or wallet balances are issued based on
              eligible transactions. Rewards are subject to validity periods
              starting from the credit date and must be redeemed or withdrawn
              per the Platform"s Terms &amp; Conditions. Expired rewards may be
              forfeited unless otherwise allowed at our discretion. The Company
              reserves the right to modify reward structures, eligibility
              criteria, or expiration timelines with prior notice on the
              Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              3. Automatically Collected Information
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              We automatically collect technical and usage data such as IP
              address, browser type, device information, operating system,
              access times, referring URLs, GPS, pages viewed, clickstream
              activity, and session duration. This data supports system
              security, fraud prevention, performance analysis, user experience
              improvements, and Platform optimization.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              4. Cookies and Similar Technologies
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Cookies and similar tracking tools enhance functionality, analyze
              usage, remember preferences, and improve browsing experiences. You
              may configure your browser to refuse cookies or receive alerts,
              but disabling cookies may limit features or affect Platform
              performance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              5. Use of Information
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Information is used to operate and maintain the Service, process
              transactions and rewards, prevent fraud, communicate updates,
              respond to inquiries, optimize performance, and comply with legal
              obligations. We do not sell or rent personal information for third
              party marketing purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              6. Disclosure of Information
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              We share data with trusted service providers (payment gateways,
              hosting, analytics, support systems, infrastructure partners)
              under confidentiality agreements. Partnered merchants may receive
              information strictly for verification and reward validation.
              Disclosures also occur to comply with law, regulatory authorities,
              court orders, or to protect legal rights, prevent fraud, or ensure
              safety.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              7. Data Security
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              We implement technical and organizational safeguards designed to
              protect data against unauthorized access, misuse, alteration, or
              disclosure. While we follow commercially acceptable standards, no
              method of transmission or storage is entirely secure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              8. Data Retention
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Personal information is retained as long as necessary to fulfill
              the outlined purposes, maintain accounts, comply with laws,
              resolve disputes, and enforce agreements. Users may request
              deletion via support; we will delete or anonymize data subject to
              legal requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              9. Third-Party Websites
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              The Platform may link to third-party sites or services. We are not
              responsible for their content or privacy practices. Please review
              their policies before interaction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              10. Children"s Privacy
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              The Platform is not intended for individuals under 18. We do not
              knowingly collect data from minors. If we discover such data, we
              will remove it promptly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              11. User Rights
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Subject to applicable laws, users may access, update, correct, or
              request deletion of their personal information via the contact
              details below.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              12. Updates to This Privacy Policy
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              We may revise this Privacy Policy from time to time. Any updates
              will be posted on this page along with an effective date.
              Continued use after updates constitutes acceptance of the revised
              policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              13. Contact Information
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Assured Rewards
              <br />
              Email: <strong>support@assuredrewards.in</strong>
              <br />
              Website: <strong>assuredrewards.in</strong>
              <br />
              Registered Office Address: D-6/1, Okhla Phase 2, New Delhi -
              110020
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "@/lib/router";
import { useSEO } from "../hooks/useSEO";

const TermsConditions = () => {
  useSEO(
    "Terms & Conditions | Assured Rewards Loyalty Program",
    "Review the Assured Rewards terms and conditions. Understand the rules for earning loyalty points, redeeming rewards and using cashback coupons."
  );

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 pb-24 md:pb-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Terms & Conditions
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Effective Date: 25 Feb 2026
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Welcome to Assured Rewards.
            <br />
            <br />
            These Terms of Service ("Terms") govern your access to and use of
            the Assured Rewards web application and website (collectively
            referred to as the "Platform" or "Service").
            <br />
            <br />
            By accessing or using the Platform, you agree to be legally bound by
            these Terms, along with our Privacy Policy. If you do not agree to
            these Terms, you must discontinue use of the Platform immediately.
          </p>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              1. Definitions
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              For the purposes of these Terms, "User," "you," or "your" refers
              to any individual who accesses or uses the Platform. "Company,"
              "we," "our," or "us" refers to Assured Rewards. "Services" refers
              to the cashback, rewards, wallet features, referral programs, and
              related services provided through the Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              2. Eligibility
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              By using Assured Rewards, you represent and warrant that you are
              at least 18 years of age and legally capable of entering into a
              binding agreement under applicable law.
              <br />
              <br />
              We reserve the right to suspend or terminate accounts that do not
              meet eligibility requirements or are found to be in violation of
              these Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              3. Account Registration and Responsibility
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              To access certain features of the Platform, you may be required to
              create an account. You agree to provide accurate, current, and
              complete information during registration and to update such
              information as necessary.
              <br />
              <br />
              You are responsible for maintaining the confidentiality of your
              login credentials and for all activities that occur under your
              account. Any unauthorized use of your account must be reported
              immediately.
              <br />
              <br />
              We reserve the right to suspend or terminate accounts that provide
              false information or engage in suspicious or fraudulent activity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              4. Rewards, Cashback, and Wallet
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Assured Rewards provides users with cashback, reward credits,
              referral bonuses, or promotional incentives based on eligible
              transactions completed through partnered merchants or campaigns
              available on the Platform.
              <br />
              <br />
              All rewards are subject to transaction validation and
              confirmation. Rewards may be delayed, reversed, or withheld in
              cases of cancellations, returns, chargebacks, fraudulent activity,
              duplicate transactions, misuse of promotions, or violation of
              these Terms.
              <br />
              <br />
              Rewards or wallet balances may be subject to a specified validity
              period calculated from the date they are credited. Users are
              responsible for redeeming or withdrawing eligible rewards within
              the applicable timeframe. Expired rewards may be forfeited at our
              discretion.
              <br />
              <br />
              We reserve the right to modify reward structures, promotional
              campaigns, eligibility criteria, withdrawal limits, processing
              timelines, or redemption policies at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              5. Prohibited Conduct
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              You agree not to use the Platform in a manner that:
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-1">
              <li>Violates any applicable laws or regulations</li>
              <li>Engages in fraudulent or deceptive practices</li>
              <li>Manipulates transactions to generate artificial rewards</li>
              <li>Creates multiple accounts to exploit promotions</li>
              <li>
                Interferes with the proper functioning or security of the
                Platform
              </li>
              <li>
                Attempts unauthorized access to systems, data, or other user
                accounts
              </li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-2">
              Violation of these provisions may result in immediate suspension
              or permanent termination of your account and forfeiture of pending
              rewards.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              6. Intellectual Property
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              All content, trademarks, logos, graphics, text, software, and
              other materials available on the Platform are the property of
              Assured Rewards or its licensors and are protected under
              applicable intellectual property laws.
              <br />
              <br />
              You are granted a limited, non-exclusive, non-transferable license
              to access and use the Platform for personal, non-commercial
              purposes only. You may not reproduce, distribute, modify,
              republish, or exploit any content without prior written consent.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              7. User Content
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              If the Platform allows users to submit reviews, comments, or other
              content, you are solely responsible for the content you post. You
              represent that such content does not infringe any third-party
              rights and does not violate any applicable law.
              <br />
              <br />
              We reserve the right to monitor, edit, or remove content that is
              deemed unlawful, offensive, misleading, or in violation of these
              Terms.
              <br />
              <br />
              By submitting content, you grant Assured Rewards a non-exclusive,
              royalty-free, worldwide license to use, reproduce, and display
              such content in connection with the operation and promotion of the
              Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              8. Third-Party Services and Merchants
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              The Platform may contain links to third-party websites or
              merchants. Transactions conducted with third-party merchants are
              solely between you and the respective merchant. We do not control
              and are not responsible for the products, services, return
              policies, delivery timelines, or conduct of third parties.
              <br />
              <br />
              Eligibility for rewards remains subject to merchant confirmation
              and validation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              9. Disclaimer of Warranties
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              The Platform and all services are provided on an "as is" and "as
              available" basis. We do not guarantee uninterrupted access,
              error-free operation, or the accuracy and completeness of
              information available on the Platform.
              <br />
              <br />
              To the fullest extent permitted by law, we disclaim all
              warranties, express or implied, including but not limited to
              merchantability, fitness for a particular purpose, and
              non-infringement.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              10. Limitation of Liability
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              To the maximum extent permitted by applicable law, Assured Rewards
              shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages arising out of or related to
              your use of the Platform.
              <br />
              <br />
              Nothing in these Terms shall exclude or limit liability where such
              exclusion is not permitted under applicable law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              11. Suspension and Termination
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              We reserve the right to suspend, restrict, or terminate access to
              the Platform at our discretion if a user violates these Terms,
              engages in fraudulent behavior, or misuses the reward system.
              <br />
              <br />
              Upon termination, access to the Platform will cease immediately,
              and any unverified or pending rewards may be forfeited.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              12. Governing Law
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              These Terms shall be governed by and construed in accordance with
              the laws of India. Any disputes arising out of or relating to
              these Terms shall be subject to the exclusive jurisdiction of the
              courts located in New Delhi.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              13. Changes to These Terms
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              We may update or modify these Terms at any time. Updated versions
              will be posted on this page with a revised effective date.
              Continued use of the Platform after such updates constitutes
              acceptance of the revised Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              14. Contact Information
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              If you have any questions regarding these Terms of Service, please
              contact:
              <br />
              <br />
              Assured Rewards
              <br />
              Email: <strong>support@assuredrewards.in</strong>
              <br />
              Website: <strong>assuredrewards.in</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsConditions;

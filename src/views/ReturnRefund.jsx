"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "@/lib/router";
import { useSEO } from "../hooks/useSEO";

const ReturnRefund = () => {
  useSEO(
    "Return & Refund Policy | Assured Rewards",
    "Read the Assured Rewards return and refund policy for purchases made with reward points or cashback and understand eligibility and refund timelines."
  );

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 pb-24 md:pb-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4 ml-2 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Return & Refund Policy
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Effective Date: 25 February 2026
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            This Return and Refund Policy outlines the terms under which
            refunds, returns, and related adjustments are handled on the Assured
            Rewards web platform ("Platform").
            <br />
            <br />
            By using the Platform, you agree to the terms set forth in this
            policy.
          </p>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              1. General Policy
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Assured Rewards primarily operates as a cashback and rewards
              facilitation platform. As a general principle, transactions that
              involve reward credits, cashback validation, promotional benefits
              or wallet processing are non-refundable once processed, confirmed,
              or delivered.
              <br />
              <br />
              Refunds are not automatically granted and are subject to review,
              validation, and approval in accordance with the conditions
              outlined below.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              2. Valid Grounds for Refund
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Refund requests may be considered only under limited
              circumstances, including but not limited to:
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-1">
              <li>
                The Platform fails to perform as described due to a verified
                technical malfunction.
              </li>
              <li>
                Critical system errors prevent access to purchased services.
              </li>
              <li>
                Duplicate payment has been successfully processed for the same
                transaction.
              </li>
              <li>
                A billing error is identified and verified by our internal team.
              </li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-2">
              Refunds will not be issued for dissatisfaction arising from
              merchant policies, delays in cashback validation caused by partner
              merchants, or misunderstandings of reward eligibility criteria
              clearly outlined on the Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              3. Non-Refundable Situations
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              The following are strictly non-refundable:
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-1">
              <li>Cashback amounts already processed or credited.</li>
              <li>Digital code generation or activation costs.</li>
              <li>
                Wallet processing fees, platform usage fees, or transaction
                charges.
              </li>
              <li>Monthly or recurring subscription fees once billed.</li>
              <li>Promotional or bonus rewards credited to user accounts.</li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-2">
              All reward-based transactions are subject to merchant validation
              and platform rules, and are not reversible once completed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              4. Refund Request Process
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              To request a refund, users must contact our support team at:
              <br />
              <strong>support@assuredrewards.in</strong>
              <br />
              <br />
              The request must include:
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-1">
              <li>Full name and registered email address</li>
              <li>Transaction reference number</li>
              <li>Date of transaction</li>
              <li>Detailed explanation of the issue</li>
              <li>
                Supporting documentation such as screenshots, error messages, or
                payment confirmation
              </li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-2">
              All refund requests must be submitted within 30 days from the date
              of the original transaction. Requests submitted beyond this period
              will not be considered.
              <br />
              <br />
              Our team will review the request and may require additional
              clarification or documentation. Approval of refunds is solely at
              the discretion of Assured Rewards based on verification of the
              claim.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              5. Refund Processing Timeline
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              If a refund request is approved, the amount will be processed
              using the same payment method used for the original transaction.
              <br />
              <br />
              Approved refunds are typically initiated within 24–48 business
              hours, but the actual credit to your bank account, card, or
              payment method may take additional time depending on the payment
              provider"s processing timelines.
              <br />
              <br />
              Users are advised to allow reasonable time for completion of the
              refund cycle.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              6. Instant and Flow Plan Policy
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Assured Rewards offers two operational models for vendors: Instant
              Plan and Flow Plan. The terms applicable to each plan are outlined
              below.
              <br />
              <br />
              <strong>Instant Plan</strong>
              <br />
              Under the Instant Plan, vendors are required to make advance
              payment before QR-based cashback generation or related services
              are activated. Cashback credits and services are processed only
              against the available prepaid balance.
              <br />
              All instant plan amounts once credited to the vendor wallet are
              non-refundable. Vendors are responsible for ensuring accurate
              usage and monitoring their wallet balance before initiating
              cashback generation. Unused prepaid balances may remain available
              for future eligible transactions but shall not be eligible for
              cash withdrawal unless explicitly approved by Assured Rewards.
              <br />
              <br />
              <strong>Flow Plan</strong>
              <br />
              Under the Flow Plan, vendors are permitted to generate QR-based
              cashback and related services first, and payment must be made
              thereafter based on actual usage.
              <br />
              Vendors enrolled in the Flow Plan are obligated to settle all
              outstanding dues within the specified billing cycle. Failure to
              make timely payments may result in suspension of services,
              restriction of QR generation, or permanent termination of access
              to the Platform.
              <br />
              Amounts payable under the Flow Plan are non-refundable once
              cashback has been generated or services have been utilized.
              <br />
              <br />
              <strong>QR Generation Technology Fee</strong>
              <br />
              A QR generation technology fee shall be applicable under both
              Instant and Flow Plans as per the prevailing commercial norms of
              Assured Rewards.
              <br />
              This fee covers technology infrastructure, system processing,
              validation mechanisms, and platform maintenance associated with QR
              creation and cashback execution. The applicable fee structure may
              be revised from time to time, and vendors shall be notified of any
              changes through the Platform or official communication channels.
              <br />
              The QR generation technology fee is non-refundable once the QR has
              been generated or activated.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              7. Partial Refunds
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              In certain verified cases, Assured Rewards may offer a partial
              refund instead of a full refund, depending on the nature of the
              issue, usage of services, or time elapsed since the transaction.
              <br />
              <br />
              Partial refunds are determined solely at our discretion following
              internal evaluation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              8. Right to Refuse Refund
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Assured Rewards reserves the absolute right to refuse any refund
              request that:
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-1">
              <li>
                Does not meet the eligibility criteria outlined in this policy.
              </li>
              <li>Is based on fraudulent or misleading claims.</li>
              <li>Involves violation of our Terms of Service.</li>
              <li>Falls outside the permitted refund request period.</li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-2">
              The decision of Assured Rewards in refund-related matters shall be
              final and binding.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              9. Changes to This Policy
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              We reserve the right to modify or update this Return and Refund
              Policy at any time. Updated versions will be published on the
              Platform with a revised effective date.
              <br />
              <br />
              Users are encouraged to review this policy periodically. Continued
              use of the Platform after updates constitutes acceptance of the
              revised policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              10. Contact Information
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              For any questions, concerns, or refund-related inquiries, please
              contact:
              <br />
              <br />
              <strong>Assured Rewards</strong>
              <br />
              Email: <strong>support@assuredrewards.in</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReturnRefund;

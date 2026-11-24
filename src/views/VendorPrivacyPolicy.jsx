"use client";

import React from "react";
import {
  ArrowLeft,
  Shield,
  Eye,
  Lock,
  Building2,
  FileText,
  Mail,
} from "lucide-react";
import { useNavigate } from "@/lib/router";
import { useSEO } from "../hooks/useSEO";

const VendorPrivacyPolicy = () => {
  useSEO(
    "Vendor Privacy Policy | Assured Rewards",
    "Read our Vendor Privacy Policy and learn how Assured Rewards protects your business information while managing loyalty and cashback programs."
  );

  const navigate = useNavigate();

  const sections = [
    {
      icon: Building2,
      title: "Business Information We Collect",
      content: [
        "Business name, address, and legal registration details (GST/PAN)",
        "Authorized representative's contact information (name, email, phone)",
        "Bank account details for processing cashback payouts",
        "Brand assets (logos, product images, descriptions)",
        "Store location coordinates for QR verification",
      ],
    },
    {
      icon: Eye,
      title: "How We Use Vendor Data",
      content: [
        "Validate business authenticity and platform eligibility",
        "Manage and display your campaigns to customers",
        "Process financial transactions and wallet settlements",
        "Provide analytics and insights into customer scan behavior",
        "Communicate technical updates and platform changes",
      ],
    },
    {
      icon: Lock,
      title: "Data Security and Protection",
      content: [
        "Secure storage of sensitive financial and registration documents",
        "Encryption of communications between platform and vendor systems",
        "Role-based access controls for vendor dashboard data",
        "Continuous monitoring for suspicious activity on vendor accounts",
      ],
    },
    {
      icon: Shield,
      title: "Partner Roles & Data Sharing",
      content: [
        "Public store info is shared with customers to facilitate scans",
        "Aggregate campaign metrics may be used for platform benchmarking",
        "Payment gateways receive bank details for payout processing",
        "Compliance data shared with regulatory bodies when required",
      ],
    },
    {
      icon: FileText,
      title: "Your Rights & Responsibilities",
      content: [
        "Update business info and brand details via the dashboard",
        "Access history of all campaigns and financial transactions",
        "Request account deactivation (subject to pending settlements)",
        "Duty to maintain accurate store and product information",
      ],
    },
    {
      icon: Mail,
      title: "Legal & Support",
      content: [
        "Vendor support queries: vendor.support@assuredrewards.in",
        "Legal & compliance concerns: legal@assuredrewards.in",
        "Standard response time: 24-48 business hours",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans p-6 md:p-12 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-gray-50 rounded-2xl hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 transition-all border border-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            Vendor Privacy Policy
          </h1>
        </div>

        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-emerald-600 mb-6 uppercase tracking-widest">
            Last updated: February 23, 2026
          </p>

          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 leading-relaxed mb-10 text-lg">
              This policy outlines how Assured Rewards handles data specifically
              for our business partners (Vendors). We are committed to
              protecting your business confidentiality while ensuring a seamless
              experience for your customers.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              {sections.map((section, index) => (
                <div key={index} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <section.icon size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {section.title}
                    </h2>
                  </div>
                  <ul className="space-y-3">
                    {section.content.map((item, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-gray-600 flex items-start gap-3"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 bg-emerald-50 rounded-3xl border border-emerald-100 italic text-emerald-800 text-sm">
              Note: This policy is supplement to our general User Privacy
              Policy. By registering as a vendor on Assured Rewards, you consent
              to the business-specific data practices described here.
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-400">
                © 2026 Assured Rewards. For partners & businesses.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorPrivacyPolicy;

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  Send,
} from "lucide-react";
import { Link, useLocation } from "@/lib/router";
import { createUserSupportTicket, getUserSupportTickets } from "../lib/api";
import { useAuth } from "../lib/auth";

const PRODUCT_REPORT_PREFIX = "Product Report";

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeStatus = (value) =>
  String(value || "")
    .toLowerCase()
    .trim();

const getStatusBadgeClass = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === "resolved" || normalized === "closed") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
  }
  if (normalized === "in_progress" || normalized === "pending") {
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
  }
  return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900";
};

const extractReportContext = (search) => {
  const params = new URLSearchParams(search || "");
  const read = (key) => String(params.get(key) || "").trim();
  return {
    brandId: read("brandId"),
    brandName: read("brandName"),
    productId: read("productId"),
    productName: read("productName"),
    category: read("category"),
  };
};

const buildInitialReportForm = (context) => {
  const lines = [];
  if (context?.brandName) lines.push(`Brand: ${context.brandName}`);
  if (context?.productName) lines.push(`Product: ${context.productName}`);
  if (context?.category) lines.push(`Category: ${context.category}`);
  if (context?.brandId) lines.push(`Brand ID: ${context.brandId}`);
  if (context?.productId) lines.push(`Product ID: ${context.productId}`);

  const subjectSuffix = context?.productName
    ? `Issue with ${context.productName}`
    : "General product issue";
  const contextBlock = lines.length ? `${lines.join("\n")}\n\n` : "";

  return {
    subject: subjectSuffix,
    message: `${contextBlock}Issue details:\n`,
  };
};

const normalizeReportSubject = (subject) => {
  const trimmed = String(subject || "").trim();
  if (!trimmed) return PRODUCT_REPORT_PREFIX;
  if (/^product report(?:\b|:|-)/i.test(trimmed)) return trimmed;
  return `${PRODUCT_REPORT_PREFIX}: ${trimmed}`;
};

const ProductReport = () => {
  const { authToken } = useAuth();
  const location = useLocation();
  const initialContext = useMemo(
    () => extractReportContext(location.search),
    [location.search],
  );

  const [reportContext, setReportContext] = useState(initialContext);
  const [reportForm, setReportForm] = useState(() =>
    buildInitialReportForm(initialContext),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    if (!authToken) {
      setReports([]);
      setError("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const data = await getUserSupportTickets(authToken);
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.tickets)
          ? data.tickets
          : [];
      setReports(
        [...list].sort(
          (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0),
        ),
      );
    } catch (err) {
      setError(err?.message || "Unable to load product reports.");
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    setReportContext(initialContext);
    setReportForm(buildInitialReportForm(initialContext));
    setSubmitError("");
    setSubmitStatus("");
  }, [initialContext]);

  const handleReportChange = (field) => (event) => {
    setReportForm((prev) => ({ ...prev, [field]: event.target.value }));
    setSubmitError("");
    setSubmitStatus("");
  };

  const handleSubmitReport = async () => {
    const subject = String(reportForm.subject || "").trim();
    const message = String(reportForm.message || "").trim();

    if (!subject || !message) {
      setSubmitError("Subject and issue details are required.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setSubmitStatus("");
    try {
      await createUserSupportTicket(
        {
          subject: normalizeReportSubject(subject),
          message,
        },
        authToken,
      );
      setSubmitStatus("Product report submitted. Admin team has been notified.");
      setReportForm(buildInitialReportForm(reportContext));
      await loadReports();
    } catch (err) {
      setSubmitError(err?.message || "Unable to submit product report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const summary = useMemo(() => {
    const total = reports.length;
    const open = reports.filter(
      (item) => normalizeStatus(item?.status) === "open",
    ).length;
    const resolved = reports.filter((item) => {
      const status = normalizeStatus(item?.status);
      return status === "resolved" || status === "closed";
    }).length;

    return { total, open, resolved };
  }, [reports]);

  if (!authToken) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 pb-24 transition-colors duration-300">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-3xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm text-center">
            <FileText className="mx-auto w-10 h-10 text-primary mb-3" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Login to submit product reports
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Your report history is available after login.
            </p>
            <Link
              to="/signin"
              className="inline-flex mt-5 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-strong transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 pb-24 transition-colors duration-300">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Submit Product Report
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Reports are routed directly to admin support.
              </p>
            </div>
          </div>

          {(reportContext.brandName || reportContext.productName) && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              {reportContext.brandName && (
                <div>Brand: {reportContext.brandName}</div>
              )}
              {reportContext.productName && (
                <div>Product: {reportContext.productName}</div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <input
              type="text"
              value={reportForm.subject}
              onChange={handleReportChange("subject")}
              placeholder="Issue summary"
              className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <textarea
              rows={5}
              value={reportForm.message}
              onChange={handleReportChange("message")}
              placeholder="Describe the issue in detail..."
              className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 resize-none"
            />
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleSubmitReport}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-2 text-xs font-semibold hover:bg-primary-strong disabled:opacity-60"
            >
              {isSubmitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>

          {submitError && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {submitError}
            </div>
          )}
          {submitStatus && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
              {submitStatus}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 shadow-sm">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {summary.total}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 shadow-sm">
            <div className="text-xs text-gray-500 dark:text-gray-400">Open</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {summary.open}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 shadow-sm">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Resolved
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {summary.resolved}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={loadReports}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-sm text-gray-500 dark:text-gray-400">
            Loading product reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 shadow-sm text-center">
            <Clock3 className="mx-auto w-10 h-10 text-gray-400 dark:text-zinc-500 mb-3" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No reports yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              You have not submitted any product issue reports.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const status = normalizeStatus(report?.status) || "open";
              const statusLabel = status.replace(/_/g, " ");

              return (
                <div
                  key={report.id}
                  className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {report.subject || "Product report"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Submitted on {formatDateTime(report.createdAt)}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border capitalize ${getStatusBadgeClass(
                        status,
                      )}`}
                    >
                      {status === "resolved" || status === "closed" ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : status === "open" ? (
                        <AlertCircle className="w-3 h-3" />
                      ) : (
                        <Clock3 className="w-3 h-3" />
                      )}
                      {statusLabel}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {report.message || "No details shared."}
                  </p>

                  {report.response && (
                    <div className="mt-3 rounded-xl border border-emerald-100 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/20 p-3">
                      <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                        Support response
                      </div>
                      <p className="text-sm text-emerald-700 dark:text-emerald-200 whitespace-pre-line">
                        {report.response}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductReport;

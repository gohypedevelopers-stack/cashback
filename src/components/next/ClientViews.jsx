"use client";

// Logged-in / device pages (dashboards, wallet, camera scan, etc.). They depend on
// browser APIs and the user's token and are not indexed, so they render only in the
// browser, exactly like the old Vite SPA did.

import dynamic from "next/dynamic";

const Loading = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>
);

export const AdminDashboard = dynamic(() => import("@/views/AdminDashboard"), { ssr: false, loading: Loading });
export const VendorDashboard = dynamic(() => import("@/views/VendorDashboard"), { ssr: false, loading: Loading });
export const RedeemQr = dynamic(() => import("@/views/RedeemQr"), { ssr: false, loading: Loading });
export const Claim = dynamic(() => import("@/views/Claim"), { ssr: false, loading: Loading });
export const BrandRegistration = dynamic(() => import("@/views/BrandRegistration"), { ssr: false, loading: Loading });
export const UXDemo = dynamic(() => import("@/views/UXDemo"), { ssr: false, loading: Loading });
export const BlogPortal = dynamic(() => import("@/views/BlogPortal"), { ssr: false, loading: Loading });
export const CameraScan = dynamic(() => import("@/views/CameraScan"), { ssr: false, loading: Loading });
export const QRScanPage = dynamic(() => import("@/views/QRScanPage"), { ssr: false, loading: Loading });
export const QRResultPage = dynamic(() => import("@/views/QRResultPage"), { ssr: false, loading: Loading });
export const Wallet = dynamic(() => import("@/views/Wallet"), { ssr: false, loading: Loading });
export const TransactionHistory = dynamic(() => import("@/views/TransactionHistory"), { ssr: false, loading: Loading });
export const RedeemPage = dynamic(() => import("@/views/RedeemPage"), { ssr: false, loading: Loading });
export const PayoutStatus = dynamic(() => import("@/views/PayoutStatus"), { ssr: false, loading: Loading });
export const Profile = dynamic(() => import("@/views/Profile"), { ssr: false, loading: Loading });
export const SignUp = dynamic(() => import("@/views/SignUp"), { ssr: false, loading: Loading });
export const SignIn = dynamic(() => import("@/views/SignIn"), { ssr: false, loading: Loading });
export const ManageUPI = dynamic(() => import("@/views/ManageUPI"), { ssr: false, loading: Loading });
export const LiquidGlassDemo = dynamic(() => import("@/views/LiquidGlassDemo"), { ssr: false, loading: Loading });
export const History = dynamic(() => import("@/views/History"), { ssr: false, loading: Loading });
export const Orders = dynamic(() => import("@/views/Orders"), { ssr: false, loading: Loading });

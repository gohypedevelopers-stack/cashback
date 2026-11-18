import React, { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  Navigate,
  useParams,
} from "react-router-dom";
import Layout from "./components/Layout";
import { ThemeProvider } from "./components/ThemeProvider";
import { ToastProvider } from "./components/ui/ToastContext";
import { ToastContainer } from "./components/ui/Toast";
import ScrollToTop from "./components/ScrollToTop";
import RouteCanonical from "./components/RouteCanonical";

import Home from "./pages/Home";
const GiftCards = lazy(() => import("./pages/GiftCards"));
const GiftCardsList = lazy(() => import("./pages/GiftCardsList"));
const GiftCardInfo = lazy(() => import("./pages/GiftCardInfo"));
const BrandDetails = lazy(() => import("./pages/BrandDetails"));
const ProductInfo = lazy(() => import("./pages/ProductInfo"));
const LiquidGlassDemo = lazy(() => import("./pages/LiquidGlassDemo"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Profile = lazy(() => import("./pages/Profile"));
const Store = lazy(() => import("./pages/Store"));
const Brands = lazy(() => import("./pages/Brands"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const LevelRewards = lazy(() => import("./pages/LevelRewards"));
const BrandFAQs = lazy(() => import("./pages/BrandFAQs"));
const HowVerifyWorks = lazy(() => import("./pages/HowVerifyWorks"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const VendorDashboard = lazy(() => import("./pages/VendorDashboard"));
const VendorSignup = lazy(() => import("./pages/VendorSignup"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const VendorLandingPage = lazy(() => import("./pages/VendorLandingPage"));
const SignUp = lazy(() => import("./pages/SignUp"));
const SignIn = lazy(() => import("./pages/SignIn"));
const VendorPrivacyPolicy = lazy(() => import("./pages/VendorPrivacyPolicy"));
const VendorTerms = lazy(() => import("./pages/VendorTerms"));
const VendorFAQs = lazy(() => import("./pages/VendorFAQs"));
const VendorContact = lazy(() => import("./pages/VendorContact"));
const RedeemQr = lazy(() => import("./pages/RedeemQr"));
const Claim = lazy(() => import("./pages/Claim"));
const BrandRegistration = lazy(() => import("./pages/BrandRegistration"));
const UXDemo = lazy(() => import("./pages/UXDemo"));
const CameraScan = lazy(() => import("./pages/CameraScan"));
const QRScanPage = lazy(() => import("./pages/QRScanPage"));
const QRResultPage = lazy(() => import("./pages/QRResultPage"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory"));
const RedeemPage = lazy(() => import("./pages/RedeemPage"));
const PayoutStatus = lazy(() => import("./pages/PayoutStatus"));
const ManageUPI = lazy(() => import("./pages/ManageUPI"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const History = lazy(() => import("./pages/History"));
const ProductReport = lazy(() => import("./pages/ProductReport"));
const ReturnRefund = lazy(() => import("./pages/ReturnRefund"));
const Orders = lazy(() => import("./pages/Orders"));
const NotFound = lazy(() => import("./pages/NotFound"));
const RedeemProductInfo = lazy(() => import("./pages/RedeemProductInfo"));
const BlogPortal = lazy(() => import("./pages/BlogPortal"));
const BlogViewer = lazy(() => import("./pages/BlogViewer"));

function App() {
  const AppLayout = () => (
    <Layout>
      <Outlet />
    </Layout>
  );
  const VendorPanelRedirect = () => {
    const { section } = useParams();
    return <Navigate to={`/vendor/${section || "overview"}`} replace />;
  };

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <ToastProvider>
        <BrowserRouter>
          <ScrollToTop />
          <RouteCanonical />
          <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>}>
            <Routes>
            <Route
              path="/admin"
              element={<Navigate to="/admin/overview" replace />}
            />
            <Route path="/admin/:section" element={<AdminDashboard />} />
            <Route
              path="/admin/:section/:subSection"
              element={<AdminDashboard />}
            />
            <Route path="/vendor-dashboard" element={<VendorDashboard />} />
            <Route path="/vendor" element={<VendorLandingPage />} />
            <Route path="/vendor/:section" element={<VendorDashboard />} />
            <Route
              path="/vendor-panel"
              element={<Navigate to="/vendor/overview" replace />}
            />
            <Route
              path="/vendor-panel/:section"
              element={<VendorPanelRedirect />}
            />
            <Route path="/vendor-signup" element={<VendorSignup />} />
            <Route path="/redeem/:hash" element={<RedeemQr />} />
            <Route path="/claim" element={<Claim />} />
            <Route path="/brand-registration" element={<BrandRegistration />} />
            <Route path="/ux-demo" element={<UXDemo />} />
            <Route path="/vendor-landing" element={<VendorLandingPage />} />
            <Route path="/vendor/privacy" element={<VendorPrivacyPolicy />} />
            <Route path="/vendor/terms" element={<VendorTerms />} />
            <Route path="/vendor/faqs" element={<VendorFAQs />} />
            <Route path="/vendor-faqs" element={<VendorFAQs />} />
            <Route path="/vendor/contact" element={<VendorContact />} />
            <Route path="/vendor-contact" element={<VendorContact />} />
            <Route path="/blog" element={<BlogViewer />} />
            <Route path="/blog/:slug" element={<BlogViewer />} />
            <Route path="/blog-edit" element={<BlogPortal />} />
            <Route path="/blog-edit/:slug" element={<BlogPortal />} />

            {/* QR Scan Flow */}
            <Route path="/scan" element={<CameraScan />} />
            <Route path="/scan/:hash" element={<QRScanPage />} />
            <Route path="/scan/result" element={<QRResultPage />} />

            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsConditions />} />
              <Route path="/return-refund" element={<ReturnRefund />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/gift-cards" element={<GiftCards />} />
              <Route path="/gift-cards-list" element={<GiftCardsList />} />
              <Route
                path="/gift-cards-list/:categoryId"
                element={<GiftCardsList />}
              />
              <Route path="/gift-card-info" element={<GiftCardInfo />} />
              <Route path="/gift-card-info/:id" element={<GiftCardInfo />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route
                path="/wallet/transactions"
                element={<TransactionHistory />}
              />
              <Route path="/wallet/redeem" element={<RedeemPage />} />
              <Route path="/payout/:id" element={<PayoutStatus />} />

              {/* Profile with sub-routes */}
              <Route path="/profile" element={<Profile />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/profile/upi" element={<ManageUPI />} />
              <Route
                path="/profile/privacy-policy"
                element={<PrivacyPolicy />}
              />
              <Route path="/profile/terms" element={<TermsConditions />} />
              <Route path="/profile/contact" element={<ContactUs />} />
              <Route path="/level-rewards" element={<LevelRewards />} />
              <Route path="/brand-faqs" element={<BrandFAQs />} />
              <Route path="/how-verify-works" element={<HowVerifyWorks />} />
              <Route path="/about-us" element={<AboutUs />} />

              <Route path="/store" element={<Store />} />
              <Route path="/store/product/:id" element={<RedeemProductInfo />} />
              <Route path="/brand-details" element={<BrandDetails />} />
              <Route path="/brand-details/:id" element={<BrandDetails />} />
              <Route path="/brandDetails" element={<BrandDetails />} />
              <Route path="/brandDetails/:id" element={<BrandDetails />} />
              <Route path="/product-info" element={<ProductInfo />} />
              <Route path="/product-info/:id" element={<ProductInfo />} />
              <Route path="/productInfo" element={<ProductInfo />} />
              <Route path="/productInfo/:id" element={<ProductInfo />} />
              <Route path="/liquid-glass" element={<LiquidGlassDemo />} />
              <Route path="/help" element={<HelpSupport />} />
              <Route path="/history" element={<History />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/brands" element={<Brands />} />
              <Route path="/product-report" element={<ProductReport />} />
            </Route>

            {/* 404 Catch-All Route */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <ToastContainer />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;

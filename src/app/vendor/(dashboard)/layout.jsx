import { VendorDashboard } from "@/components/next/ClientViews";

// The dashboard lives in a layout (not the page) so it stays mounted while the
// user switches tabs (/vendor/overview -> /vendor/campaigns ...), exactly like the
// old <Route path="/vendor/:section"> did. Forms, modals and in-flight payments
// (Razorpay verification) are not reset by a tab change. Section comes from useParams().
export default function VendorDashboardLayout() {
  return <VendorDashboard />;
}

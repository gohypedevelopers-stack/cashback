import { AdminDashboard } from "@/components/next/ClientViews";

// The dashboard lives in a layout (not the page) so it stays mounted while the
// admin switches sections (/admin/overview -> /admin/payouts -> /admin/users/active),
// exactly like the old react-router routes did. Section comes from useParams().
export default function AdminDashboardLayout() {
  return <AdminDashboard />;
}

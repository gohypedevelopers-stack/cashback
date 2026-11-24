import Layout from "@/components/Layout";

// Shared header + bottom dock for the consumer pages (the old <AppLayout> route).
export default function MainLayout({ children }) {
  return <Layout>{children}</Layout>;
}

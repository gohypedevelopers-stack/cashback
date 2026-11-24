import NotFound from "@/views/NotFound";
import { buildMetadata } from "@/lib/seo";

export const metadata = {
  ...buildMetadata({ title: "Page Not Found | Assured Rewards", noindex: true }),
  alternates: {},
};

export default function NotFoundPage() {
  return <NotFound />;
}

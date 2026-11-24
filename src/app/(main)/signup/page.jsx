import { SignUp as View } from "@/components/next/ClientViews";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/signup", noindex: true });

export default function Page() {
  return <View />;
}

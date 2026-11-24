import View from "@/views/TermsConditions";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/profile/terms" });

export default function Page() {
  return <View />;
}

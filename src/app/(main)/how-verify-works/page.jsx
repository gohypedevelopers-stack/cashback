import View from "@/views/HowVerifyWorks";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/how-verify-works" });

export default function Page() {
  return <View />;
}

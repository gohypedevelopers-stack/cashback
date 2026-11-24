import View from "@/views/ReturnRefund";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/return-refund" });

export default function Page() {
  return <View />;
}

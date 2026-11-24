import View from "@/views/ContactUs";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/contact" });

export default function Page() {
  return <View />;
}

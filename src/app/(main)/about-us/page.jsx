import View from "@/views/AboutUs";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/about-us" });

export default function Page() {
  return <View />;
}

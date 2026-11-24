import View from "@/views/Store";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/store" });

export default function Page() {
  return <View />;
}

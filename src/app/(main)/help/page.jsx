import View from "@/views/HelpSupport";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/help" });

export default function Page() {
  return <View />;
}

import View from "@/views/Home";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/" });

export default function Page() {
  return <View />;
}

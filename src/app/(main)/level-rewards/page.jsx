import View from "@/views/LevelRewards";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/level-rewards" });

export default function Page() {
  return <View />;
}

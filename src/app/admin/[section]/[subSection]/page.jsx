import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { section, subSection } = await params;
  return buildMetadata({ path: `/admin/${section}/${subSection}`, noindex: true });
}

// Rendered by ../../layout.jsx so the dashboard persists across sections.
export default function Page() {
  return null;
}

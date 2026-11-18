import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getCanonicalUrl, setCanonical } from "../lib/seo";

// Keeps <link rel="canonical"> pointing at the current route for every page,
// including ones that don't call useSEO. Pages that do call useSEO run after this.
export default function RouteCanonical() {
  const { pathname } = useLocation();

  useEffect(() => {
    setCanonical(getCanonicalUrl(pathname));
  }, [pathname]);

  return null;
}

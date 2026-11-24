"use client";

import { useEffect } from "react";

// Server-rendered <img> tags start loading before React hydrates. If one fails
// in that window (e.g. a missing brand logo), React never sees the "error" event,
// so the component's onError fallback (letter badge, placeholder, hide) never
// runs. The old client-only Vite app always attached onError first.
// After hydration, re-dispatch "error" on images that already failed so the
// existing onError handlers run exactly as before.
const replayFailedImages = () => {
  document.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (!src || src.startsWith("data:") || /\.svg(\?|$)/i.test(src)) return;
    if (img.dataset.errorReplayed) return;
    if (img.complete && img.naturalWidth === 0 && img.naturalHeight === 0) {
      img.dataset.errorReplayed = "1";
      img.dispatchEvent(new Event("error"));
    }
  });
};

export default function ImageErrorReplay() {
  useEffect(() => {
    replayFailedImages();
    // Parts of the page can finish hydrating a little later.
    const timers = [setTimeout(replayFailedImages, 300), setTimeout(replayFailedImages, 1500)];
    return () => timers.forEach(clearTimeout);
  }, []);
  return null;
}

"use client";

import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ui/ToastContext";
import { ToastContainer } from "@/components/ui/Toast";
import ImageErrorReplay from "@/components/next/ImageErrorReplay";

export default function Providers({ children }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <ToastProvider>
        {children}
        <ToastContainer />
        <ImageErrorReplay />
      </ToastProvider>
    </ThemeProvider>
  );
}

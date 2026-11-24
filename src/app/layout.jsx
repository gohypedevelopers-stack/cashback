import "../index.css";
import Providers from "./providers";
import { SITE_URL, buildMetadata } from "@/lib/seo";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  ...buildMetadata({ path: "/" }),
  icons: {
    icon: [
      { url: "/light theme incentify logo.png", type: "image/png", media: "(prefers-color-scheme: light)" },
      { url: "/dark theme incentify logo.png", type: "image/png", media: "(prefers-color-scheme: dark)" },
    ],
  },
  verification: { google: "PyzmNh8TyEJLlj1y299iijq3Rjl_-LoIxa7Ffdxmb1g" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    // ThemeProvider forces light mode; set it on the server so there is no flash.
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div id="root">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}

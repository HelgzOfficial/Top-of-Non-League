import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Top of Non League — Isthmian Premier",
  description:
    "Pick one Isthmian Premier Division team each game week and climb the Top of Non League table.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Top of Non League",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0f0d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Applies the saved light/dark choice before first paint, so there's
            no flash of the wrong theme. Runs before hydration — see
            ThemeToggle.tsx, which writes this same localStorage key. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            try {
              if (localStorage.getItem('tnl-theme') === 'light') {
                document.documentElement.classList.add('light');
              }
            } catch (e) {}
          `}
        </Script>
      </head>
      <body>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}

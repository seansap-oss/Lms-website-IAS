import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NativeAppProvider } from "@/components/providers/native-app-provider";
import { PwaProvider } from "@/components/providers/pwa-provider";
import { MobileBottomBar, MobileBottomBarSpacer } from "@/components/navigation/mobile-bottom-bar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "Ibemhal IAS — Premier Civil Services Coaching Institute",
    template: "%s | Ibemhal IAS",
  },
  description:
    "Manipur's #1 IAS coaching institute. Join 500+ selected civil servants. Foundation, Mains, Prelims Test Series & Optional courses with AI-powered mentorship.",
  keywords: ["IAS coaching", "UPSC", "MPSC", "civil services", "Manipur", "Imphal", "Ibemhal IAS"],
  applicationName: "Ibemhal IAS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Ibemhal IAS",
    statusBarStyle: "black-translucent",
    startupImage: [
      { url: "/splash/splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px)" },
      { url: "/splash/splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px)" },
      { url: "/splash/splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px)" },
      { url: "/splash/splash-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px)" },
      { url: "/splash/splash-828x1792.png", media: "(device-width: 414px) and (device-height: 896px)" },
      { url: "/splash/splash-750x1334.png", media: "(device-width: 375px) and (device-height: 667px)" },
      { url: "/splash/splash-2048x2732.png", media: "(device-width: 1024px) and (device-height: 1366px)" },
    ],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1e3a8a" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased overscroll-none`}>
        <NativeAppProvider>
          {children}
          <MobileBottomBarSpacer />
          <MobileBottomBar />
        </NativeAppProvider>
        <PwaProvider />
      </body>
    </html>
  );
}

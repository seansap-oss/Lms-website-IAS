import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Ibemhal IAS - Premier Civil Services Coaching Institute",
  description: "Manipur's #1 IAS coaching institute. Join 500+ selected civil servants. Foundation, Mains, Prelims Test Series & Optional courses with expert mentorship.",
  keywords: "IAS coaching, UPSC, MPSC, civil services, Manipur, Imphal, Ibemhal IAS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Nunito, Caveat } from "next/font/google";
import { ClarityScript } from "@/components/ClarityScript";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://seatify.app'),
  title: {
    default: "Free Seating Chart Maker - Wedding & Event Planner | Seatify",
    template: "%s | Seatify",
  },
  description: "Create beautiful seating charts for weddings, corporate events, and parties. Free drag-and-drop seating planner with smart optimization and PDF exports. No signup required.",
  keywords: ["seating chart maker", "free seating chart", "wedding seating chart", "event seating planner", "table arrangement tool", "reception seating"],
  authors: [{ name: "Seatify" }],
  openGraph: {
    title: "Free Seating Chart Maker for Weddings & Events | Seatify",
    description: "Create beautiful seating charts for free. Drag-and-drop editor, smart optimization, and PDF exports. No signup required.",
    url: "https://seatify.app",
    siteName: "Seatify",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Seatify - Seating Chart Tool",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Seating Chart Maker for Weddings & Events",
    description: "Create beautiful seating charts for free. Drag-and-drop editor, smart optimization, and PDF exports.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Disable iOS Safari data detectors to prevent automatic date/phone/address linking */}
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
      </head>
      <body className={`${nunito.variable} ${caveat.variable}`} suppressHydrationWarning>
        <ClarityScript />
        {children}
      </body>
    </html>
  );
}

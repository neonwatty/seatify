import type { Metadata } from "next";
import { Nunito, Caveat } from "next/font/google";
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
  title: {
    default: "Seatify - Smart Seating Arrangements Made Easy",
    template: "%s | Seatify",
  },
  description: "Create beautiful seating charts for weddings, corporate events, and parties. Drag-and-drop interface, smart optimization, and instant exports.",
  keywords: ["seating chart", "wedding seating", "event planning", "table arrangement", "seating planner"],
  authors: [{ name: "Seatify" }],
  openGraph: {
    title: "Seatify - Smart Seating Arrangements Made Easy",
    description: "Create beautiful seating charts for weddings, corporate events, and parties.",
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
    title: "Seatify - Smart Seating Arrangements Made Easy",
    description: "Create beautiful seating charts for weddings, corporate events, and parties.",
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
      <body className={`${nunito.variable} ${caveat.variable}`}>
        {children}
      </body>
    </html>
  );
}

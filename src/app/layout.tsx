import type { Metadata } from "next";
import "./globals.css";
import "./spark-theme-overrides.css";
import { Providers } from "@/components/layout/providers";


export const metadata: Metadata = {
  title: {
    default: "RoyaltyRadar — AI-Powered Music Royalty Recovery",
    template: "%s | RoyaltyRadar",
  },
  description:
    "Scan your music catalog against global rights databases, find missing royalties, and recover lost revenue — automatically. Free plan available.",
  keywords: [
    "music royalties",
    "royalty recovery",
    "catalog audit",
    "ISWC",
    "ISRC",
    "music publishing",
    "mechanical royalties",
    "PRO registration",
  ],
  openGraph: {
    title: "RoyaltyRadar — Every Royalty You're Owed. Found and Recovered.",
    description:
      "AI-powered platform that scans your catalog, identifies missing revenue, and helps you recover it automatically.",
    siteName: "RoyaltyRadar",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "RoyaltyRadar — AI-Powered Music Royalty Recovery",
    description:
      "Scan your catalog against global rights databases and recover missing royalties automatically.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans bg-white text-slate-900 min-h-screen antialiased">
        <a href="#main-content" className="sprk-skip-link">
          Skip to main content
        </a>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import "./spark-theme-overrides.css";
import { Providers } from "@/components/layout/providers";


export const metadata: Metadata = {
  title: "RoyaltyRadar",
  description: "AI-powered music catalog audit & remediation platform",
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

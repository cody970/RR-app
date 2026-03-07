import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} bg-white text-slate-900 min-h-screen`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

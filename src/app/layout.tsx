import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Kitchen Quest | Learn food. Master recipes.",
    template: "%s | Kitchen Quest",
  },
  description: "Learn food. Master recipes. Become a better cook.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}

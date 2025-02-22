import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavigationTabs } from "./components/navigation-tabs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FPL Summarizer",
  description: "Fantasy Premier League mini-league statistics and insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#131928]`}
      >
        <div className="mx-auto max-w-7xl p-6 lg:p-8">
          <div className="space-y-8">
            <NavigationTabs />
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}

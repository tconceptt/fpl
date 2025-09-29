import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react"
import { ThemeProvider } from "@/components/providers/theme-provider";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FPL Companion for the Qitawrari League",
  description: "Fantasy Premier League mini-league statistics and insights",
  icons: {
    icon: "/images/fav.png",
    shortcut: "/images/fav.png",
    apple: "/images/fav.png",
    other: {
      rel: "icon",
      url: "/images/fav.png",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${sora.variable} font-sans antialiased bg-[#131928] text-white`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

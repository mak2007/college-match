import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "CollegeMatch | Discover Your Perfect Private B.Tech College",
  description: "Find private engineering colleges in India matched to your personal preferences, budget, academic profile, and priorities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}

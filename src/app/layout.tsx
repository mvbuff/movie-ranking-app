import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/user-context";
import { ToastProvider } from "@/context/toast-context";
import SessionProvider from "@/components/session-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import AnalyticsProvider from '@/components/analytics-provider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Movie Ranking App",
  description: "Rank and review movies with friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <UserProvider>
            <ToastProvider>
              <AnalyticsProvider>
                {children}
              </AnalyticsProvider>
            </ToastProvider>
          </UserProvider>
        </SessionProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/user-context";
import { ToastProvider } from "@/context/toast-context";
import SessionProvider from "@/components/session-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Movie Ranking",
  description: "Rank movies with your friends!",
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
          <ToastProvider>
            <UserProvider>{children}</UserProvider>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/user-context";

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
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}

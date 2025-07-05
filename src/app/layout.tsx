import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/user-context";
import { ToastProvider } from "@/context/toast-context";
import SessionProvider from "@/components/session-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import AnalyticsProvider from '@/components/analytics-provider';
import Script from 'next/script';

// Initialize Prisma backup scheduler (server-side only)
if (typeof window === 'undefined') {
  import('@/lib/prisma-backup-scheduler').then(({ prismaBackupScheduler }) => {
    // Scheduler will auto-start based on environment variables
    const status = prismaBackupScheduler.getStatus();
    console.log('🔄 Prisma Backup Scheduler initialized:', status.enabled ? 'Enabled' : 'Disabled');
  }).catch(error => {
    console.error('❌ Failed to initialize Prisma Backup Scheduler:', error);
  });
}

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
      <head>
        {/* Debug Console - Loads on any device with ?debug=1 */}
        <Script
          id="debug-console"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const hasDebugParam = window.location.search.includes('debug=1');
                
                if (hasDebugParam) {
                  console.log('🔧 Debug mode detected, loading Eruda console...');
                  
                  const script = document.createElement('script');
                  script.src = 'https://cdn.jsdelivr.net/npm/eruda@3.0.1/eruda.min.js';
                  script.onload = function() {
                    if (window.eruda) {
                      window.eruda.init();
                      console.log('🛠️ Debug console loaded! Look for the floating button on the page.');
                      
                      // Make sure console is visible
                      setTimeout(() => {
                        if (window.eruda) {
                          window.eruda.show();
                        }
                      }, 1000);
                    }
                  };
                  script.onerror = function() {
                    console.error('❌ Failed to load debug console');
                  };
                  document.head.appendChild(script);
                                 } else {
                   console.log('💡 Add ?debug=1 to URL to enable debug console');
                 }
                 
                 // Simple debug overlay as backup
                 if (hasDebugParam) {
                   const debugDiv = document.createElement('div');
                   debugDiv.innerHTML = '🐛 DEBUG MODE ACTIVE';
                   debugDiv.style.cssText = 'position:fixed;top:10px;right:10px;background:red;color:white;padding:5px;z-index:9999;font-size:12px;border-radius:4px;';
                   document.body.appendChild(debugDiv);
                 }
              })();
            `
          }}
        />
      </head>
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

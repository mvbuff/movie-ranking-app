'use client';

import { useAnalytics } from '@/hooks/useAnalytics';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export default function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  // Initialize analytics tracking
  useAnalytics();

  return <>{children}</>;
} 
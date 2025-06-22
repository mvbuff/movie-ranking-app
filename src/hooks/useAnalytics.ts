import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface AnalyticsHook {
  trackLogin: () => Promise<void>;
  trackLogout: () => Promise<void>;
}

export function useAnalytics(): AnalyticsHook {
  const { data: session, status } = useSession();
  const router = useRouter();
  const sessionIdRef = useRef<string | null>(null);
  const pageSessionIdRef = useRef<string | null>(null);
  const pageStartTimeRef = useRef<number>(Date.now());
  const currentPageRef = useRef<string>('');

  // Generate a unique session ID for this browser session
  const getSessionId = () => {
    if (typeof window === 'undefined') return null;
    
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  };

  // Track page session start
  const startPageTracking = async (page: string) => {
    if (typeof window === 'undefined') return;
    
    const sessionId = getSessionId();
    if (!sessionId) return;

    try {
      const response = await fetch('/api/analytics/page-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, page })
      });

      if (response.ok) {
        const data = await response.json();
        pageSessionIdRef.current = data.pageSessionId;
        pageStartTimeRef.current = Date.now();
        currentPageRef.current = page;
      }
    } catch (error) {
      console.warn('Page tracking failed:', error);
    }
  };

  // Track page session end
  const endPageTracking = async () => {
    if (!pageSessionIdRef.current) return;

    const duration = Math.round((Date.now() - pageStartTimeRef.current) / 1000);
    
    try {
      await fetch('/api/analytics/page-session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pageSessionId: pageSessionIdRef.current, 
          duration 
        })
      });
    } catch (error) {
      console.warn('Page end tracking failed:', error);
    }

    pageSessionIdRef.current = null;
  };

  // Track login
  const trackLogin = async () => {
    if (status !== 'authenticated' || !session) return;

    try {
      const response = await fetch('/api/analytics/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        sessionIdRef.current = data.sessionId;
      }
    } catch (error) {
      console.warn('Login tracking failed:', error);
    }
  };

  // Track logout
  const trackLogout = async () => {
    if (!sessionIdRef.current) return;

    const duration = Math.round((Date.now() - pageStartTimeRef.current) / 1000);

    try {
      await fetch('/api/analytics/login', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: sessionIdRef.current, 
          duration 
        })
      });
    } catch (error) {
      console.warn('Logout tracking failed:', error);
    }

    sessionIdRef.current = null;
  };

  // Track page changes and time spent
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentPath = window.location.pathname;
    
    // End previous page tracking
    if (pageSessionIdRef.current && currentPageRef.current !== currentPath) {
      endPageTracking();
    }

    // Start new page tracking
    startPageTracking(currentPath);

    // Cleanup on component unmount or page change
    return () => {
      endPageTracking();
    };
  }, [router]);

  // Track login when session becomes authenticated
  useEffect(() => {
    if (status === 'authenticated' && session && !sessionIdRef.current) {
      trackLogin();
    }
  }, [status, session]);

  // Handle page visibility changes (tab switching, minimizing)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User left the page/tab
        endPageTracking();
      } else if (document.visibilityState === 'visible' && !pageSessionIdRef.current) {
        // User returned to the page/tab
        startPageTracking(window.location.pathname);
      }
    };

    const handleBeforeUnload = () => {
      // User is leaving the page entirely
      endPageTracking();
      trackLogout();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return { trackLogin, trackLogout };
} 
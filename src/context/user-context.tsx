'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import type { User } from '@prisma/client';

interface UserContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isAdmin: boolean;
  sessionStatus: 'loading' | 'authenticated' | 'unauthenticated';
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { data: session, status } = useSession();
  const hasInitializedUser = useRef(false);

  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    if (status === 'authenticated' && session?.user && !hasInitializedUser.current) {
      // Always set the authenticated user as the current user initially
      // This ensures admins act as themselves by default
      setCurrentUser({
        id: session.user.id,
        name: session.user.name || (isAdmin ? 'Admin User' : 'User'),
        email: session.user.email || null,
        image: session.user.image || null,
        role: (session.user.role as 'USER' | 'ADMIN') || 'USER',
        status: 'ACTIVE',
        password: null,
        passwordResetRequired: false,
        createdAt: new Date(),
      });
      hasInitializedUser.current = true;
    } else if (status === 'unauthenticated') {
      // Clear user when logged out
      setCurrentUser(null);
      hasInitializedUser.current = false;
    }
  }, [session, status, isAdmin]);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, isAdmin, sessionStatus: status }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 
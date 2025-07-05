'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
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

  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // For non-admin users, set their context immediately from the session data
      if (!isAdmin) {
        setCurrentUser({
          id: session.user.id,
          name: session.user.name || 'User',
          email: session.user.email || null,
          image: session.user.image || null,
          // These are default values, as they exist on the real User model
          role: 'USER',
          status: 'ACTIVE',
          password: null,
          passwordResetRequired: false,
          createdAt: new Date(),
        });
      } else {
        // For admin users, set their own user data initially
        // The UserSwitcher component will allow them to switch to other users
        setCurrentUser({
          id: session.user.id,
          name: session.user.name || 'Admin User',
          email: session.user.email || null,
          image: session.user.image || null,
          role: 'ADMIN',
          status: 'ACTIVE',
          password: null,
          passwordResetRequired: false,
          createdAt: new Date(),
        });
      }
    } else if (status === 'unauthenticated') {
      // Clear user when logged out
      setCurrentUser(null);
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
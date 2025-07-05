'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import type { User } from '@prisma/client';
import { useUser } from '@/context/user-context';

interface UserSwitcherProps {
  refreshTimestamp: number | null;
  onUserChange?: () => void;
}

export default function UserSwitcher({ refreshTimestamp, onUserChange }: UserSwitcherProps) {
  const [users, setUsers] = useState<User[]>([]);
  const { currentUser, setCurrentUser } = useUser();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  
  // Use refs to prevent unnecessary refreshes
  const lastUserCountRef = useRef(0);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const response = await fetch('/api/users');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data: User[] = await response.json();

        const userCountChanged = data.length !== lastUserCountRef.current;
        lastUserCountRef.current = data.length;
        setUsers(data);
        
        // Only auto-select user in specific scenarios to reduce refreshes
        if (data.length > 0 && !hasInitializedRef.current) {
          let userToSelect = null;
          
          // First try to find the session user (logged-in admin) in the list
          if (session?.user?.id) {
            userToSelect = data.find(user => user.id === session.user.id) || null;
          }
          
          // If session user not found, fall back to the last user in the list
          if (!userToSelect) {
            userToSelect = data[data.length - 1];
          }
          
          // Only set the user if it's different from the current one
          if (userToSelect && userToSelect.id !== currentUser?.id) {
            setCurrentUser(userToSelect);
            hasInitializedRef.current = true;
            
            // Only call onUserChange for manual user changes, not initial setup
            if (onUserChange && userCountChanged && hasInitializedRef.current) {
              onUserChange();
            }
          } else {
            hasInitializedRef.current = true;
          }
        }

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
                        }
      fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTimestamp]); // Simplified dependencies to prevent cascades

  const handleUserChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUserId = event.target.value;
    const user = users.find((u) => u.id === selectedUserId) || null;
    setCurrentUser(user);
    if (onUserChange) {
      onUserChange();
    }
  };

  if (loading) {
    return <div className="p-2 text-sm text-gray-500">Loading users...</div>;
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow-inner mb-6">
      <label htmlFor="user-switcher" className="block text-sm font-medium text-gray-700 mr-2">
        Current User:
      </label>
      <select
        id="user-switcher"
        value={currentUser?.id || ''}
        onChange={handleUserChange}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
      {currentUser && (
        <p className="mt-2 text-xs text-gray-600">
          You are now acting as <span className="font-bold">{currentUser.name}</span>.
        </p>
      )}
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const response = await fetch('/api/users');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data: User[] = await response.json();

        const newUserAdded = data.length > users.length;
        setUsers(data);
        
        // Only auto-select a user if one isn't already selected,
        // OR if a new user was just added to the list.
        if (data.length > 0 && (!currentUser || newUserAdded)) {
          let userToSelect = null;
          
          // First try to find the session user (logged-in admin) in the list
          if (session?.user?.id) {
            userToSelect = data.find(user => user.id === session.user.id) || null;
          }
          
          // If session user not found, fall back to the last user in the list
          if (!userToSelect) {
            userToSelect = data[data.length - 1];
          }
          
          setCurrentUser(userToSelect);
          if (onUserChange) {
            onUserChange();
          }
        }

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [refreshTimestamp, users.length, currentUser, setCurrentUser, session, onUserChange]); // Include session to react to login changes

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
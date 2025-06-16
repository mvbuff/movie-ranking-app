'use client';

import { useState, useEffect } from 'react';
import type { User } from '@prisma/client';
import { useUser } from '@/context/user-context';

interface UserSwitcherProps {
  refreshTimestamp: number | null;
}

export default function UserSwitcher({ refreshTimestamp }: UserSwitcherProps) {
  const [users, setUsers] = useState<User[]>([]);
  const { currentUser, setCurrentUser } = useUser();
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
        setUsers(data);
        
        // If there's no current user or the refresh was triggered, select a user.
        // Prioritize the last user in the list, which will be the newest one.
        if (data.length > 0) {
          if (!currentUser || refreshTimestamp) {
            const newUser = data[data.length - 1];
            setCurrentUser(newUser);
          }
        }

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [setCurrentUser, refreshTimestamp, currentUser]);

  const handleUserChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUserId = event.target.value;
    const user = users.find((u) => u.id === selectedUserId) || null;
    setCurrentUser(user);
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
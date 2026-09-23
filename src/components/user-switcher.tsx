'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleUserChange = (selectedUserId: string) => {
    const user = users.find((u) => u.id === selectedUserId) || null;
    setCurrentUser(user);
    setDropdownOpen(false);
    if (onUserChange) {
      onUserChange();
    }
  };

  if (loading) {
    return <div className="p-2 text-sm text-stone-500">Loading users...</div>;
  }

  return (
    <div ref={dropdownRef} className="relative mb-6">
      <button
        type="button"
        onClick={() => setDropdownOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={dropdownOpen}
        className="w-full flex items-center gap-3 p-3 bg-white border border-stone-200/70 shadow-soft rounded-2xl hover:shadow-lift hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand/40 transition-all text-left"
      >
        <span className="h-10 w-10 shrink-0 rounded-full bg-stone-900 text-white flex items-center justify-center font-semibold">
          {(currentUser?.name || '?').charAt(0).toUpperCase()}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-medium text-stone-500">Current User</span>
          <span className="block text-sm font-semibold text-ink truncate">
            {currentUser?.name || 'Select a user'}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`text-stone-400 shrink-0 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {dropdownOpen && (
        <div
          role="listbox"
          aria-label="Switch user"
          className="absolute z-50 mt-2 w-full max-h-64 overflow-y-auto bg-white rounded-2xl border border-stone-200/70 shadow-lift animate-scale-in divide-y divide-stone-100"
        >
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              role="option"
              aria-selected={user.id === currentUser?.id}
              onClick={() => handleUserChange(user.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 transition-colors text-left"
            >
              <span className="h-8 w-8 shrink-0 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center text-sm font-semibold">
                {(user.name || '?').charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 min-w-0 text-sm font-medium text-ink truncate">
                {user.name}
              </span>
              {user.id === currentUser?.id && <Check size={16} className="text-brand shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {currentUser && (
        <p className="mt-2 text-xs text-stone-500">
          You are now acting as <span className="font-bold text-ink">{currentUser.name}</span>.
        </p>
      )}
    </div>
  );
} 
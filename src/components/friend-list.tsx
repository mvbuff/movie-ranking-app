'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import type { User, WeightPreference } from '@prisma/client';
import { useUser } from '@/context/user-context';
import { useDebounce } from 'use-debounce';
import { CalculateScoresButton } from './score-components';
import { ChevronDown } from 'lucide-react';

interface FriendListProps {
  onCalculationComplete: () => void;
}

interface FriendWithPreference extends User {
  isFriend: boolean;
  weight: number;
}

function FriendList({ onCalculationComplete }: FriendListProps) {
  const { currentUser } = useUser();
  const [friends, setFriends] = useState<FriendWithPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // --- Data Fetching and Handlers (no changes here) ---
  const fetchFriendData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [usersRes, prefsRes] = await Promise.all([
        fetch('/api/users'),
        fetch(`/api/weight-preferences?userId=${currentUser.id}`),
      ]);
      if (!usersRes.ok || !prefsRes.ok) throw new Error('Failed to fetch friend data');

      const allUsers: User[] = await usersRes.json();
      const preferences: WeightPreference[] = await prefsRes.json();
      const prefsMap = new Map(preferences.map(p => [p.friendId, p.weight]));

      const friendData = allUsers
        .filter(u => u.id !== currentUser.id)
        .map(user => ({
          ...user,
          isFriend: prefsMap.has(user.id),
          weight: prefsMap.get(user.id) ?? 1.0,
        }));
      setFriends(friendData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchFriendData();
  }, [fetchFriendData]);
  
  const [weightChange, setWeightChange] = useState<{ friendId: string; weight: number } | null>(null);
  const [debouncedWeightChange] = useDebounce(weightChange, 500);

  const handleToggleFriend = async (friendId: string, isCurrentlyFriend: boolean) => {
    if (!currentUser) return;
    setFriends(friends.map(f => f.id === friendId ? { ...f, isFriend: !isCurrentlyFriend } : f));
    try {
      if (isCurrentlyFriend) {
        await fetch('/api/weight-preferences', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, friendId }),
        });
      } else {
        await fetch('/api/weight-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, friendId, weight: 1.0 }),
        });
      }
    } catch (error) {
      console.error("Failed to update friendship:", error);
      fetchFriendData();
    }
  };

  const handleWeightChange = (friendId: string, newWeight: number) => {
    setFriends(friends.map(f => (f.id === friendId ? { ...f, weight: newWeight } : f)));
    setWeightChange({ friendId, weight: newWeight });
  };
  
  const handleSelectAll = async (select: boolean) => {
    if (!currentUser) return;
    
    // Optimistically update the UI
    const newFriendsState = friends.map(f => ({ ...f, isFriend: select }));
    setFriends(newFriendsState);

    // Call the API for all friends
    try {
      await fetch('/api/weight-preferences/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          friendIds: friends.map(f => f.id),
          isFriend: select,
        }),
      });
    } catch (error) {
      console.error("Bulk update failed:", error);
      // Revert on error
      fetchFriendData();
    }
  };
  
  useEffect(() => {
    if (!debouncedWeightChange || !currentUser) return;
    const updateWeight = async () => {
      try {
        await fetch('/api/weight-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            friendId: debouncedWeightChange.friendId,
            weight: debouncedWeightChange.weight,
          }),
        });
      } catch (error) {
        console.error("Failed to update weight:", error);
        fetchFriendData();
      }
    };
    updateWeight();
  }, [debouncedWeightChange, currentUser, fetchFriendData]);
  
  // --- Render Logic ---
  if (!currentUser) {
    return (
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
        <p className="text-yellow-700">Please select a user to manage friends and weights.</p>
      </div>
    );
  }

  if (loading) return <p className="mt-8 text-center text-gray-500">Loading friends...</p>;

  return (
    <div className="w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <h2 className="text-2xl font-bold text-gray-800">Manage Friend Weights</h2>
        <ChevronDown
          className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          size={24}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isOpen ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          {friends.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No other users found to manage.</p>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <button 
                  onClick={() => handleSelectAll(true)}
                  className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Select All
                </button>
                <button 
                  onClick={() => handleSelectAll(false)}
                  className="px-4 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Unselect All
                </button>
                <CalculateScoresButton onCalculationComplete={onCalculationComplete} compact={true} />
              </div>
            <ul className="divide-y divide-gray-200">
              {friends.map(friend => (
                <li key={friend.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                  <div className="flex items-center mb-2 sm:mb-0">
                    <input
                      type="checkbox"
                      checked={friend.isFriend}
                      onChange={() => handleToggleFriend(friend.id, friend.isFriend)}
                      className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-4"
                    />
                    <span className={`text-lg ${friend.isFriend ? 'text-gray-800' : 'text-gray-400'}`}>{friend.name}</span>
                  </div>
                  {friend.isFriend && (
                    <div className="flex items-center w-full sm:w-1/2">
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={friend.weight}
                        onChange={(e) => handleWeightChange(friend.id, parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="ml-4 w-16 text-right font-medium text-indigo-600">
                        {Math.round(friend.weight * 100)}%
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 

export default memo(FriendList); 
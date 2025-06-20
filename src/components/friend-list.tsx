'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import type { User, WeightPreference } from '@prisma/client';
import { useUser } from '@/context/user-context';
import { useDebounce } from 'use-debounce';
import { CalculateScoresButton } from './score-components';
import { ChevronDown, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface FriendListProps {
  onCalculationComplete: () => void;
}

interface FriendWithPreference extends User {
  isFriend: boolean;
  weight: number;
}

// Helper function to get weight display info
const getWeightInfo = (weight: number) => {
  if (weight < 0.5) return { color: 'text-red-600 bg-red-50 border-red-200', icon: TrendingDown, label: 'Low Impact' };
  if (weight < 1.5) return { color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Minus, label: 'Normal' };
  return { color: 'text-green-600 bg-green-50 border-green-200', icon: TrendingUp, label: 'High Impact' };
};

function FriendList({ onCalculationComplete }: FriendListProps) {
  const { currentUser } = useUser();
  const [friends, setFriends] = useState<FriendWithPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // --- Data Fetching and Handlers (unchanged) ---
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

      console.log('📊 Debug Info:');
      console.log('- Total users fetched:', allUsers.length);
      console.log('- Current user:', currentUser.name);
      console.log('- Users after filtering current user:', allUsers.filter(u => u.id !== currentUser.id).length);

      const friendData = allUsers
        .filter(u => u.id !== currentUser.id)
        .map(user => ({
          ...user,
          isFriend: prefsMap.has(user.id),
          weight: prefsMap.get(user.id) ?? 1.0,
        }));
      
      console.log('- Final friend data length:', friendData.length);
      console.log('- Friend names:', friendData.map(f => f.name));
      
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
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="text-indigo-600" size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Manage Friend Weights</h2>
          </div>
          <ChevronDown
            className={`transform transition-transform duration-300 text-indigo-600 ${isOpen ? 'rotate-180' : ''}`}
            size={24}
          />
        </button>
        <div className="flex-shrink-0">
          <CalculateScoresButton onCalculationComplete={onCalculationComplete} compact={true} />
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isOpen ? 'opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
        style={{ maxHeight: isOpen ? 'none' : '0px' }}
      >
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {friends.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="text-gray-400" size={24} />
              </div>
              <p className="text-gray-500">No other users found to manage.</p>
            </div>
          ) : (
            <>
              {/* Action Buttons Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={() => handleSelectAll(true)}
                    className="px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
                  >
                    Select All
                  </button>
                  <button 
                    onClick={() => handleSelectAll(false)}
                    className="px-4 py-2 text-sm font-medium bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors shadow-sm"
                  >
                    Unselect All
                  </button>
                </div>
              </div>

              {/* Friends List */}
              <div className="divide-y divide-gray-100">
                {friends.map(friend => {
                  const weightInfo = getWeightInfo(friend.weight);
                  const IconComponent = weightInfo.icon;
                  
                  return (
                    <div key={friend.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* Checkbox and Name */}
                        <div className="flex items-center min-w-0 flex-1">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={friend.isFriend}
                              onChange={() => handleToggleFriend(friend.id, friend.isFriend)}
                              className="h-5 w-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2 transition-colors"
                            />
                          </div>
                          <div className="ml-4 min-w-0 flex-1">
                            <h3 className={`text-lg font-medium truncate transition-colors ${
                              friend.isFriend ? 'text-gray-900' : 'text-gray-400'
                            }`}>
                              {friend.name}
                            </h3>
                            {friend.isFriend && (
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border mt-2 ${weightInfo.color}`}>
                                <IconComponent size={12} />
                                {weightInfo.label}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Weight Control */}
                        {friend.isFriend && (
                          <div className="flex-shrink-0 w-full sm:w-64">
                            <div className="space-y-3">
                              {/* Weight Display */}
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Influence</span>
                                <div className={`px-3 py-1 rounded-full text-sm font-bold border ${weightInfo.color}`}>
                                  {Math.round(friend.weight * 100)}%
                                </div>
                              </div>
                              
                              {/* Custom Slider */}
                              <div className="relative">
                                <input
                                  type="range"
                                  min="0"
                                  max="2"
                                  step="0.05"
                                  value={friend.weight}
                                  onChange={(e) => handleWeightChange(friend.id, parseFloat(e.target.value))}
                                  className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer slider-modern focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  style={{
                                    background: `linear-gradient(to right, 
                                      #ef4444 0%, #ef4444 25%, 
                                      #3b82f6 25%, #3b82f6 75%, 
                                      #22c55e 75%, #22c55e 100%)`
                                  }}
                                />
                                {/* Slider Labels */}
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                  <span>Low</span>
                                  <span>Normal</span>
                                  <span>High</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Custom Slider Styles */}
      <style jsx>{`
        .slider-modern::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          border: 3px solid #4f46e5;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          transition: all 0.2s ease;
        }
        .slider-modern::-webkit-slider-thumb:hover {
          border-color: #4338ca;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transform: scale(1.1);
        }
        .slider-modern::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          border: 3px solid #4f46e5;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
} 

export default memo(FriendList); 
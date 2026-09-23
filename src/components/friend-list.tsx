'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import type { User, WeightPreference } from '@prisma/client';
import { useUser } from '@/context/user-context';
import { useDebounce } from 'use-debounce';
import { CalculateScoresButton } from './score-components';
import { ChevronDown, Users } from 'lucide-react';

interface FriendListProps {
  onCalculationComplete: () => void;
}

interface FriendWithPreference extends User {
  isFriend: boolean;
  weight: number;
}

// Helper function to get weight display info
const getWeightInfo = (weight: number) => {
  if (weight < 0.5) return { color: 'text-red-600 bg-red-50 border-red-200' };
  if (weight < 1.5) return { color: 'text-blue-600 bg-blue-50 border-blue-200' };
  return { color: 'text-green-600 bg-green-50 border-green-200' };
};

function FriendList({ onCalculationComplete }: FriendListProps) {
  const { currentUser } = useUser();
  const [friends, setFriends] = useState<FriendWithPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Function to collapse menu after calculation
  const handleCalculationComplete = () => {
    onCalculationComplete();
    // Auto-collapse the menu after calculation
    setIsOpen(false);
  };

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

      const friendData = allUsers
        .filter(u => u.id !== currentUser.id)
        .map(user => ({
          ...user,
          isFriend: prefsMap.has(user.id),
          weight: prefsMap.get(user.id) ?? 1.0,
        }));

      // If user has no weight preferences stored, automatically select all friends with 100% weight
      if (preferences.length === 0 && friendData.length > 0) {
        console.log('🚀 New user detected - auto-selecting all friends with 100% weight');
        
        // Update the local state to show all friends as selected
        const autoSelectedFriends = friendData.map(friend => ({
          ...friend,
          isFriend: true,
          weight: 1.0,
        }));
        
        setFriends(autoSelectedFriends);

        // Save the default preferences to the database
        try {
          await fetch('/api/weight-preferences/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.id,
              friendIds: friendData.map(f => f.id),
              isFriend: true,
            }),
          });
          console.log('✅ Default friend weights saved for:', currentUser.name);
          
          // Trigger auto-calculation of friend scores for the new user
          if (onCalculationComplete) {
            onCalculationComplete();
          }
        } catch (error) {
          console.error('❌ Failed to save default friend weights:', error);
          // If saving fails, revert to original data
          setFriends(friendData);
        }
      } else {
        // User has existing preferences, use them as-is
        setFriends(friendData);
      }
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, onCalculationComplete]);

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
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center">
        <p className="text-amber-700">Please select a user to manage friends and weights.</p>
      </div>
    );
  }

  if (loading) return <p className="mt-8 text-center text-stone-500">Loading friends...</p>;

  return (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center justify-between p-4 bg-white border border-stone-200/70 shadow-soft rounded-3xl hover:shadow-lift hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand/40 transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 rounded-xl">
              <Users className="text-brand" size={20} />
            </div>
            <h2 className="section-title text-xl">Manage Friend Weights</h2>
          </div>
          <ChevronDown
            className={`transform transition-transform duration-300 text-stone-400 ${isOpen ? 'rotate-180' : ''}`}
            size={24}
          />
        </button>
        <div className="flex-shrink-0">
          <CalculateScoresButton onCalculationComplete={handleCalculationComplete} compact={true} />
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isOpen ? 'opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
        style={{ maxHeight: isOpen ? 'none' : '0px' }}
      >
        <div className="bg-white rounded-3xl shadow-soft border border-stone-200/70 overflow-hidden">
          {friends.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                <Users className="text-stone-400" size={24} />
              </div>
              <p className="text-stone-500">No other users found to manage.</p>
            </div>
          ) : (
            <>
              {/* Action Buttons Header */}
              <div className="bg-stone-50 px-6 py-4 border-b border-stone-100">
                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={() => handleSelectAll(true)}
                    className="px-4 py-2 text-sm font-medium bg-stone-900 text-white rounded-full hover:bg-stone-700 transition-all shadow-sm"
                  >
                    Select All
                  </button>
                  <button 
                    onClick={() => handleSelectAll(false)}
                    className="px-4 py-2 text-sm font-medium bg-white text-stone-600 border border-stone-300 rounded-full hover:bg-stone-50 hover:border-stone-400 transition-all shadow-sm"
                  >
                    Unselect All
                  </button>
                  <CalculateScoresButton onCalculationComplete={handleCalculationComplete} compact={true} />
                </div>
              </div>

              {/* Friends List */}
              <div className="divide-y divide-stone-100">
                {friends.map(friend => {
                  const weightInfo = getWeightInfo(friend.weight);
                  
                  return (
                    <div key={friend.id} className="p-4 sm:p-6 hover:bg-stone-50 transition-colors">
                      {/* Mobile Layout - Stacked */}
                      <div className="block sm:hidden space-y-3">
                        {/* Name and Checkbox Row */}
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={friend.isFriend}
                            onChange={() => handleToggleFriend(friend.id, friend.isFriend)}
                            className="h-5 w-5 rounded border-2 border-stone-300 accent-brand focus:ring-brand/40 focus:ring-2 transition-colors shrink-0"
                          />
                          <div className="h-10 w-10 shrink-0 rounded-full bg-stone-900 text-white flex items-center justify-center font-semibold">
                            {friend.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-lg font-semibold truncate transition-colors ${
                              friend.isFriend ? 'text-ink' : 'text-stone-400'
                            }`}>
                              {friend.name}
                            </h3>
                          </div>
                        </div>
                        
                        {/* Weight Control - Compact */}
                        {friend.isFriend && (
                          <div className="flex items-center gap-3 pl-8">
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.05"
                              value={friend.weight}
                              onChange={(e) => handleWeightChange(friend.id, parseFloat(e.target.value))}
                              className="flex-1 h-3 bg-gray-200 rounded-full appearance-none cursor-pointer slider-modern focus:outline-none focus:ring-2 focus:ring-brand/40"
                              style={{
                                background: `linear-gradient(to right, 
                                  #ef4444 0%, #ef4444 25%, 
                                  #3b82f6 25%, #3b82f6 75%, 
                                  #22c55e 75%, #22c55e 100%)`
                              }}
                            />
                            <div className={`px-3 py-1 rounded-full text-sm font-bold border ${weightInfo.color}`}>
                              {Math.round(friend.weight * 100)}%
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Desktop Layout - Side by Side */}
                      <div className="hidden sm:flex items-center gap-4">
                        {/* Checkbox and Name */}
                        <div className="flex items-center min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={friend.isFriend}
                            onChange={() => handleToggleFriend(friend.id, friend.isFriend)}
                            className="h-5 w-5 rounded border-2 border-stone-300 accent-brand focus:ring-brand/40 focus:ring-2 transition-colors shrink-0"
                          />
                          <div className="ml-4 h-10 w-10 shrink-0 rounded-full bg-stone-900 text-white flex items-center justify-center font-semibold">
                            {friend.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4 min-w-0 flex-1">
                            <h3 className={`text-lg font-semibold truncate transition-colors ${
                              friend.isFriend ? 'text-ink' : 'text-stone-400'
                            }`}>
                              {friend.name}
                            </h3>
                          </div>
                        </div>

                        {/* Weight Control - Compact Desktop */}
                        {friend.isFriend && (
                          <div className="flex items-center gap-3 w-64">
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.05"
                              value={friend.weight}
                              onChange={(e) => handleWeightChange(friend.id, parseFloat(e.target.value))}
                              className="flex-1 h-3 bg-gray-200 rounded-full appearance-none cursor-pointer slider-modern focus:outline-none focus:ring-2 focus:ring-brand/40"
                              style={{
                                background: `linear-gradient(to right, 
                                  #ef4444 0%, #ef4444 25%, 
                                  #3b82f6 25%, #3b82f6 75%, 
                                  #22c55e 75%, #22c55e 100%)`
                              }}
                            />
                            <div className={`px-3 py-1 rounded-full text-sm font-bold border ${weightInfo.color}`}>
                              {Math.round(friend.weight * 100)}%
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Calculate Button */}
              <div className="bg-stone-50 px-6 py-4 border-t border-stone-100">
                <div className="flex justify-center">
                  <CalculateScoresButton onCalculationComplete={handleCalculationComplete} compact={false} />
                </div>
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
          border: 3px solid #EA580C;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          transition: all 0.2s ease;
        }
        .slider-modern::-webkit-slider-thumb:hover {
          border-color: #C2410C;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transform: scale(1.1);
        }
        .slider-modern::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          border: 3px solid #EA580C;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
} 

export default memo(FriendList); 
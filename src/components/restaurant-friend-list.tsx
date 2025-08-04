'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/context/user-context';
import { useToast } from '@/context/toast-context';
import { useDebounce } from '@/hooks/useDebounce';
import { Users, ChevronDown, UserCheck, UserX } from 'lucide-react';
import { RestaurantCalculateScoresButton } from './restaurant-score-components';

interface RestaurantFriendListProps {
  onCalculationComplete: () => void;
}

interface RestaurantFriend {
  id: string;
  name: string;
  status: 'PENDING' | 'ACTIVE';
  isFriend: boolean;
  weight: number;
}

interface UserData {
  id: string;
  name: string;
  status: 'PENDING' | 'ACTIVE';
}

interface WeightPreference {
  friendId: string;
  weight: number;
}

function RestaurantFriendList({ onCalculationComplete }: RestaurantFriendListProps) {
  const { currentUser } = useUser();
  const { showToast } = useToast();
  const [friends, setFriends] = useState<RestaurantFriend[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCalculationComplete = () => {
    if (onCalculationComplete) {
      onCalculationComplete();
    }
  };

  // --- Data Fetching and Handlers ---
  const fetchFriendData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);

    try {
      const [usersRes, preferencesRes] = await Promise.all([
        fetch('/api/users'),
        fetch(`/api/restaurant-weight-preferences?userId=${currentUser.id}`)
      ]);

      const allUsers = await usersRes.json();
      const preferences = await preferencesRes.json();

      // Filter out current user and map weight preferences
      const prefsMap = new Map(preferences.map((p: WeightPreference) => [p.friendId, p.weight]));
      const friendData = allUsers
        .filter((user: UserData) => user.id !== currentUser.id)
        .map((user: UserData) => ({
          ...user,
          isFriend: prefsMap.has(user.id),
          weight: prefsMap.get(user.id) ?? 1.0,
        }));

      // If user has no weight preferences stored, automatically select all friends with 100% weight
      if (preferences.length === 0 && friendData.length > 0) {
        console.log('🚀 New user detected - auto-selecting all friends with 100% weight for restaurants');
        
        // Update the local state to show all friends as selected
        const autoSelectedFriends = friendData.map((friend: RestaurantFriend) => ({
          ...friend,
          isFriend: true,
          weight: 1.0,
        }));
        
        setFriends(autoSelectedFriends);

        // Save the default preferences to the database
        try {
          await fetch('/api/restaurant-weight-preferences/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.id,
              friendIds: friendData.map((f: RestaurantFriend) => f.id),
              isFriend: true,
            }),
          });
          console.log('✅ Default restaurant friend weights saved for:', currentUser.name);
          
          // Trigger auto-calculation of friend scores for the new user
          if (onCalculationComplete) {
            onCalculationComplete();
          }
        } catch (error) {
          console.error('❌ Failed to save default restaurant friend weights:', error);
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
    try {
      if (isCurrentlyFriend) {
        // Remove friend
        await fetch('/api/restaurant-weight-preferences', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser?.id, friendId }),
        });
        setFriends(prev => prev.map(f => f.id === friendId ? { ...f, isFriend: false, weight: 1.0 } : f));
        showToast('Friend removed from restaurant scoring', 'success');
      } else {
        // Add friend
        await fetch('/api/restaurant-weight-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser?.id, friendId, weight: 1.0 }),
        });
        setFriends(prev => prev.map(f => f.id === friendId ? { ...f, isFriend: true, weight: 1.0 } : f));
        showToast('Friend added to restaurant scoring', 'success');
      }
    } catch (error) {
      console.error('Failed to toggle friend:', error);
      showToast('Failed to update friend status', 'error');
    }
  };

  const handleWeightChange = (friendId: string, weight: number) => {
    // Update local state immediately for responsiveness
    setFriends(prev => prev.map(f => f.id === friendId ? { ...f, weight } : f));
    // Set up debounced API call
    setWeightChange({ friendId, weight });
  };

  // Handle debounced weight changes
  useEffect(() => {
    if (debouncedWeightChange && currentUser) {
      const { friendId, weight } = debouncedWeightChange;
      fetch('/api/restaurant-weight-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, friendId, weight }),
      }).catch(error => {
        console.error('Failed to update weight:', error);
        showToast('Failed to update weight', 'error');
      });
    }
  }, [debouncedWeightChange, currentUser, showToast]);

  const handleSelectAll = async (selectAll: boolean) => {
    try {
      const friendIds = friends.map(f => f.id);
      await fetch('/api/restaurant-weight-preferences/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          friendIds,
          isFriend: selectAll,
        }),
      });
      
      setFriends(prev => prev.map(f => ({ ...f, isFriend: selectAll, weight: selectAll ? 1.0 : f.weight })));
      showToast(selectAll ? 'All friends selected for restaurant scoring' : 'All friends unselected from restaurant scoring', 'success');
    } catch (error) {
      console.error('Failed to select/unselect all:', error);
      showToast('Failed to update friends', 'error');
    }
  };

  if (loading) return <p className="mt-8 text-center text-gray-500">Loading restaurant friends...</p>;

  return (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="text-green-600" size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Restaurant Friend Weights</h2>
          </div>
          <ChevronDown
            className={`transform transition-transform duration-300 text-green-600 ${isOpen ? 'rotate-180' : ''}`}
            size={24}
          />
        </button>
        <div className="flex-shrink-0">
          <RestaurantCalculateScoresButton onCalculationComplete={handleCalculationComplete} compact={true} />
        </div>
      </div>

      <div
        className={`transition-all duration-300 overflow-hidden ${
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
                    className="px-4 py-2 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                  >
                    Select All
                  </button>
                  <button 
                    onClick={() => handleSelectAll(false)}
                    className="px-4 py-2 text-sm font-medium bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors shadow-sm"
                  >
                    Unselect All
                  </button>
                  <RestaurantCalculateScoresButton onCalculationComplete={handleCalculationComplete} compact={true} />
                </div>
              </div>

              {/* Friends List */}
              <div className="divide-y divide-gray-100">
                {friends.map((friend) => (
                  <div key={friend.id} className="p-6 hover:bg-gray-25 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Friend Toggle Button */}
                        <button
                          onClick={() => handleToggleFriend(friend.id, friend.isFriend)}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            friend.isFriend
                              ? 'bg-green-100 text-green-600 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {friend.isFriend ? <UserCheck size={20} /> : <UserX size={20} />}
                        </button>
                        
                        {/* Friend Info */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{friend.name}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              friend.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {friend.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Weight Slider */}
                      {friend.isFriend && (
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-600 min-w-[60px]">
                            {Math.round(friend.weight * 100)}%
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.05"
                            value={friend.weight}
                            onChange={(e) => handleWeightChange(friend.id, parseFloat(e.target.value))}
                            className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            style={{
                              background: `linear-gradient(to right, 
                                #ef4444 0%, #ef4444 25%, 
                                #3b82f6 25%, #3b82f6 75%, 
                                #22c55e 75%, #22c55e 100%)`
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RestaurantFriendList;
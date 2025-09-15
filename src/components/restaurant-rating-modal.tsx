'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { useToast } from '@/context/toast-context';
import { useClickOutside } from '@/hooks/useClickOutside';
import CustomRatingInput from './custom-rating';
import { getRatingDisplay } from '@/lib/rating-system';
import { Leaf, Utensils, X } from 'lucide-react';

type RatingType = 'VEG' | 'NON_VEG';

interface RestaurantRating {
  id: string;
  score: number | null;
  ratingType: RatingType;
  availability: 'AVAILABLE' | 'NOT_AVAILABLE';
  userId: string;
  restaurantId: string;
}

interface RestaurantRatingModalProps {
  restaurantId: string;
  restaurantName: string;
  onClose: () => void;
  onRatingUpdate?: (
    restaurantId: string, 
    vegScore: number | null, 
    nonVegScore: number | null,
    vegAvailability?: 'AVAILABLE' | 'NOT_AVAILABLE' | null,
    nonVegAvailability?: 'AVAILABLE' | 'NOT_AVAILABLE' | null
  ) => void;
  initialVegRating?: number | null;
  initialNonVegRating?: number | null;
  initialVegAvailability?: 'AVAILABLE' | 'NOT_AVAILABLE' | null;
  initialNonVegAvailability?: 'AVAILABLE' | 'NOT_AVAILABLE' | null;
  hideNonVeg?: boolean;
}

export default function RestaurantRatingModal({ 
  restaurantId, 
  restaurantName,
  onClose,
  onRatingUpdate,
  initialVegRating,
  initialNonVegRating,
  initialVegAvailability,
  initialNonVegAvailability,
  hideNonVeg = false
}: RestaurantRatingModalProps) {
  const { currentUser } = useUser();
  const { showToast } = useToast();
  const [ratings, setRatings] = useState<{
    VEG: RestaurantRating | null;
    NON_VEG: RestaurantRating | null;
  }>({
    VEG: null,
    NON_VEG: null
  });
  const [availability, setAvailability] = useState<{
    VEG: 'AVAILABLE' | 'NOT_AVAILABLE';
    NON_VEG: 'AVAILABLE' | 'NOT_AVAILABLE';
  }>({
    VEG: 'AVAILABLE',
    NON_VEG: 'AVAILABLE'
  });

  // Click outside to close functionality
  const modalContentRef = useClickOutside<HTMLDivElement>({
    onClickOutside: onClose,
    enabled: true
  });

  useEffect(() => {
    // Initialize with existing data
    if (initialVegRating !== undefined && initialVegAvailability) {
      setRatings(prev => ({
        ...prev,
        VEG: initialVegRating ? {
          id: 'temp-veg',
          score: initialVegRating,
          ratingType: 'VEG',
          availability: initialVegAvailability,
          userId: currentUser?.id || '',
          restaurantId
        } : null
      }));
      setAvailability(prev => ({
        ...prev,
        VEG: initialVegAvailability
      }));
    }

    if (initialNonVegRating !== undefined && initialNonVegAvailability) {
      setRatings(prev => ({
        ...prev,
        NON_VEG: initialNonVegRating ? {
          id: 'temp-nonveg',
          score: initialNonVegRating,
          ratingType: 'NON_VEG',
          availability: initialNonVegAvailability,
          userId: currentUser?.id || '',
          restaurantId
        } : null
      }));
      setAvailability(prev => ({
        ...prev,
        NON_VEG: initialNonVegAvailability
      }));
    }
  }, [initialVegRating, initialNonVegRating, initialVegAvailability, initialNonVegAvailability, currentUser?.id, restaurantId]);

  const handleRatingSubmit = async (ratingType: RatingType, score: number) => {
    if (!currentUser) {
      showToast('Please sign in to rate', 'error');
      return;
    }

    try {
      const method = score === 0 ? 'DELETE' : 'POST';
      const body = score === 0 
        ? JSON.stringify({
            userId: currentUser.id,
            restaurantId,
            ratingType
          })
        : JSON.stringify({
            userId: currentUser.id,
            restaurantId,
            score,
            ratingType,
            availability: availability[ratingType]
          });

      const response = await fetch('/api/restaurant-ratings', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit rating');
      }

      // Update local state
      const newRating = score === 0 ? null : {
        id: `temp-${ratingType.toLowerCase()}`,
        score,
        ratingType,
        availability: availability[ratingType],
        userId: currentUser.id,
        restaurantId
      };

      setRatings(prev => ({
        ...prev,
        [ratingType]: newRating
      }));

      // Call the parent update function
      if (onRatingUpdate) {
        const vegScore = ratingType === 'VEG' ? score : ratings.VEG?.score || null;
        const nonVegScore = ratingType === 'NON_VEG' ? score : ratings.NON_VEG?.score || null;
        const vegAvailability = ratingType === 'VEG' ? availability.VEG : (ratings.VEG ? 'AVAILABLE' : null);
        const nonVegAvailability = ratingType === 'NON_VEG' ? availability.NON_VEG : (ratings.NON_VEG ? 'AVAILABLE' : null);
        onRatingUpdate(restaurantId, vegScore, nonVegScore, vegAvailability, nonVegAvailability);
      }

      showToast(score === 0 ? 'Rating removed!' : 'Rating submitted!', 'success');
    } catch (error) {
      console.error('Failed to submit rating:', error);
      showToast('Failed to submit rating', 'error');
    }
  };

  const handleAvailabilityChange = (ratingType: RatingType, newAvailability: 'AVAILABLE' | 'NOT_AVAILABLE') => {
    setAvailability(prev => ({
      ...prev,
      [ratingType]: newAvailability
    }));

    // If setting to NOT_AVAILABLE, remove the rating
    if (newAvailability === 'NOT_AVAILABLE' && ratings[ratingType]) {
      handleRatingSubmit(ratingType, 0);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-backdrop"
      data-modal-backdrop="true"
    >
      <div 
        ref={modalContentRef}
        className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[85vh] animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-lg">
          <h2 className="text-lg font-semibold text-gray-800">Rate Restaurant</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-6 max-h-[calc(85vh-8rem)] overflow-y-auto">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900">{restaurantName}</h3>
            <p className="text-sm text-gray-600 mt-1">Rate the vegetarian and non-vegetarian options</p>
          </div>

          {/* Vegetarian Rating Section */}
          <div className="border rounded-lg p-4 bg-green-50">
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="text-green-600" size={20} />
              <h4 className="font-semibold text-green-800">Vegetarian Options</h4>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="veg-availability"
                    checked={availability.VEG === 'AVAILABLE'}
                    onChange={() => handleAvailabilityChange('VEG', 'AVAILABLE')}
                    className="mr-1"
                  />
                  Available
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="veg-availability"
                    checked={availability.VEG === 'NOT_AVAILABLE'}
                    onChange={() => handleAvailabilityChange('VEG', 'NOT_AVAILABLE')}
                    className="mr-1"
                  />
                  Not Available
                </label>
              </div>

              {availability.VEG === 'AVAILABLE' && (
                <CustomRatingInput
                  initialScore={ratings.VEG?.score || 0}
                  onRatingSubmit={(score) => handleRatingSubmit('VEG', score)}
                  disabled={!currentUser}
                />
              )}

              {availability.VEG === 'NOT_AVAILABLE' && (
                <div className="text-sm text-gray-600 italic">
                  Vegetarian options not available at this restaurant
                </div>
              )}
            </div>
          </div>

          {/* Non-Vegetarian Rating Section */}
          {!hideNonVeg && (
          <div className="border rounded-lg p-4 bg-red-50">
            <div className="flex items-center gap-2 mb-3">
              <Utensils className="text-red-600" size={20} />
              <h4 className="font-semibold text-red-800">Non-Vegetarian Options</h4>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="nonveg-availability"
                    checked={availability.NON_VEG === 'AVAILABLE'}
                    onChange={() => handleAvailabilityChange('NON_VEG', 'AVAILABLE')}
                    className="mr-1"
                  />
                  Available
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="nonveg-availability"
                    checked={availability.NON_VEG === 'NOT_AVAILABLE'}
                    onChange={() => handleAvailabilityChange('NON_VEG', 'NOT_AVAILABLE')}
                    className="mr-1"
                  />
                  Not Available
                </label>
              </div>

              {availability.NON_VEG === 'AVAILABLE' && (
                <CustomRatingInput
                  initialScore={ratings.NON_VEG?.score || 0}
                  onRatingSubmit={(score) => handleRatingSubmit('NON_VEG', score)}
                  disabled={!currentUser}
                />
              )}

              {availability.NON_VEG === 'NOT_AVAILABLE' && (
                <div className="text-sm text-gray-600 italic">
                  Non-vegetarian options not available at this restaurant
                </div>
              )}
            </div>
          </div>
          )}

          {/* Current Ratings Display */}
          {(ratings.VEG || ratings.NON_VEG) && (
            <div className="border-t pt-4">
              <h5 className="font-medium text-gray-700 mb-2">Your Current Ratings:</h5>
              <div className="flex gap-4 text-sm">
                {ratings.VEG && availability.VEG === 'AVAILABLE' && (
                  <div className="flex items-center gap-1">
                    <Leaf className="text-green-600" size={14} />
                    <span>Veg: {getRatingDisplay(ratings.VEG.score!)}</span>
                  </div>
                )}
                {ratings.NON_VEG && availability.NON_VEG === 'AVAILABLE' && (
                  <div className="flex items-center gap-1">
                    <Utensils className="text-red-600" size={14} />
                    <span>Non-Veg: {getRatingDisplay(ratings.NON_VEG.score!)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
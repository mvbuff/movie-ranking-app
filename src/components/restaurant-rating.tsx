'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { useToast } from '@/context/toast-context';
import CustomRatingInput from './custom-rating';
import { getRatingDisplay } from '@/lib/rating-system';
import { Leaf, Utensils } from 'lucide-react';

type RatingType = 'VEG' | 'NON_VEG';

interface RestaurantRating {
  id: string;
  score: number | null;
  ratingType: RatingType;
  availability: 'AVAILABLE' | 'NOT_AVAILABLE';
  userId: string;
  restaurantId: string;
}

interface RestaurantRatingComponentProps {
  restaurantId: string;
  restaurantName: string;
  readOnlyMode?: boolean;
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
}

export default function RestaurantRatingComponent({ 
  restaurantId, 
  restaurantName, 
  readOnlyMode = false,
  onRatingUpdate,
  initialVegRating,
  initialNonVegRating,
  initialVegAvailability,
  initialNonVegAvailability
}: RestaurantRatingComponentProps) {
  const { currentUser } = useUser();
  const { showToast } = useToast();
  const [ratings, setRatings] = useState<{
    VEG: RestaurantRating | null;
    NON_VEG: RestaurantRating | null;
  }>({
    VEG: null,
    NON_VEG: null
  });
  const [isSubmitting, setIsSubmitting] = useState<{
    VEG: boolean;
    NON_VEG: boolean;
  }>({
    VEG: false,
    NON_VEG: false
  });

  // Initialize ratings from props
  useEffect(() => {
    setRatings({
      VEG: initialVegRating !== undefined ? {
        id: `veg-${restaurantId}`,
        score: initialVegRating,
        ratingType: 'VEG' as RatingType,
        availability: initialVegAvailability || 'AVAILABLE',
        userId: currentUser?.id || '',
        restaurantId
      } : null,
      NON_VEG: initialNonVegRating !== undefined ? {
        id: `nonveg-${restaurantId}`,
        score: initialNonVegRating,
        ratingType: 'NON_VEG' as RatingType,
        availability: initialNonVegAvailability || 'AVAILABLE',
        userId: currentUser?.id || '',
        restaurantId
      } : null
    });
  }, [initialVegRating, initialNonVegRating, initialVegAvailability, initialNonVegAvailability, restaurantId, currentUser?.id]);

  const handleRatingSubmit = async (score: number, ratingType: RatingType) => {
    if (!currentUser) {
      showToast('Please sign in to rate restaurants', 'error');
      return;
    }

    if (readOnlyMode) {
      showToast('Rating updates are disabled in read-only mode', 'info');
      return;
    }

    setIsSubmitting(prev => ({ ...prev, [ratingType]: true }));

    try {
      if (score === 0) {
        // Delete rating if score is 0
        const response = await fetch('/api/restaurant-ratings', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: currentUser.id,
            restaurantId,
            ratingType,
          }),
        });

        if (response.ok) {
          // Optimistically update local state
          setRatings(prev => ({ ...prev, [ratingType]: null }));
          const typeLabel = ratingType === 'VEG' ? 'veg' : 'non-veg';
          showToast(`Removed ${typeLabel} rating for "${restaurantName}"`, 'success');
          
          // Update parent component with optimistic update
          const vegScore = ratingType === 'VEG' ? null : ratings.VEG?.score || null;
          const nonVegScore = ratingType === 'NON_VEG' ? null : ratings.NON_VEG?.score || null;
          const vegAvailability = ratingType === 'VEG' ? null : ratings.VEG?.availability || null;
          const nonVegAvailability = ratingType === 'NON_VEG' ? null : ratings.NON_VEG?.availability || null;
          onRatingUpdate?.(restaurantId, vegScore, nonVegScore, vegAvailability, nonVegAvailability);
        } else {
          const errorData = await response.json();
          showToast(errorData.error || 'Failed to remove rating', 'error');
        }
      } else {
        // Create or update rating
        const response = await fetch('/api/restaurant-ratings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: currentUser.id,
            restaurantId,
            score,
            ratingType,
            availability: 'AVAILABLE',
          }),
        });

        if (response.ok) {
          const newRating: RestaurantRating = await response.json();
          // Optimistically update local state
          setRatings(prev => ({ ...prev, [ratingType]: newRating }));
          
          const customRating = getRatingDisplay(score);
          const typeLabel = ratingType === 'VEG' ? 'veg' : 'non-veg';
          showToast(`Rated "${restaurantName}" as ${customRating} for ${typeLabel} food`, 'success');
          
          // Update parent component with optimistic update
          const vegScore = ratingType === 'VEG' ? score : ratings.VEG?.score || null;
          const nonVegScore = ratingType === 'NON_VEG' ? score : ratings.NON_VEG?.score || null;
          const vegAvailability = ratingType === 'VEG' ? 'AVAILABLE' : ratings.VEG?.availability || null;
          const nonVegAvailability = ratingType === 'NON_VEG' ? 'AVAILABLE' : ratings.NON_VEG?.availability || null;
          onRatingUpdate?.(restaurantId, vegScore, nonVegScore, vegAvailability, nonVegAvailability);
        } else {
          const errorData = await response.json();
          showToast(errorData.error || 'Failed to save rating', 'error');
        }
      }
    } catch (error) {
      console.error('Failed to submit restaurant rating:', error);
      showToast('Failed to save rating', 'error');
    } finally {
      setIsSubmitting(prev => ({ ...prev, [ratingType]: false }));
    }
  };

  const handleNotAvailable = async (ratingType: RatingType) => {
    if (!currentUser) {
      showToast('Please sign in to rate restaurants', 'error');
      return;
    }

    if (readOnlyMode) {
      showToast('Rating updates are disabled in read-only mode', 'info');
      return;
    }

    setIsSubmitting(prev => ({ ...prev, [ratingType]: true }));

    try {
      const response = await fetch('/api/restaurant-ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id,
          restaurantId,
          ratingType,
          availability: 'NOT_AVAILABLE',
        }),
      });

      if (response.ok) {
        const newRating: RestaurantRating = await response.json();
        // Optimistically update local state
        setRatings(prev => ({ ...prev, [ratingType]: newRating }));
        
        const typeLabel = ratingType === 'VEG' ? 'veg' : 'non-veg';
        showToast(`Marked ${typeLabel} food as not available at "${restaurantName}"`, 'info');
        
        // Update parent component with optimistic update
        const vegScore = ratingType === 'VEG' ? null : ratings.VEG?.score || null;
        const nonVegScore = ratingType === 'NON_VEG' ? null : ratings.NON_VEG?.score || null;
        const vegAvailability = ratingType === 'VEG' ? 'NOT_AVAILABLE' : ratings.VEG?.availability || null;
        const nonVegAvailability = ratingType === 'NON_VEG' ? 'NOT_AVAILABLE' : ratings.NON_VEG?.availability || null;
        onRatingUpdate?.(restaurantId, vegScore, nonVegScore, vegAvailability, nonVegAvailability);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to save rating', 'error');
      }
    } catch (error) {
      console.error('Failed to submit restaurant rating:', error);
      showToast('Failed to save rating', 'error');
    } finally {
      setIsSubmitting(prev => ({ ...prev, [ratingType]: false }));
    }
  };

  const RatingSection = ({ ratingType, icon, label, color }: {
    ratingType: RatingType;
    icon: React.ReactNode;
    label: string;
    color: string;
  }) => {
    const rating = ratings[ratingType];
    const isDisabled = readOnlyMode || isSubmitting[ratingType] || !currentUser;
    const isNotAvailable = rating?.availability === 'NOT_AVAILABLE';

    return (
      <div className={`border border-gray-200 rounded-lg p-4 ${color}`}>
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h4 className="font-medium text-gray-800">{label}</h4>
          {rating && (
            <span className={`text-sm px-2 py-1 rounded ${
              isNotAvailable 
                ? 'bg-red-100 text-red-800' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {isNotAvailable ? 'N/A' : getRatingDisplay(rating.score!)}
            </span>
          )}
        </div>
        
        {currentUser ? (
          <div className="space-y-2">
            {!isNotAvailable && (
              <CustomRatingInput
                initialScore={rating?.score || 0}
                onRatingSubmit={(score) => handleRatingSubmit(score, ratingType)}
                disabled={isDisabled}
              />
            )}
            
            <div className="flex gap-2">
              {isNotAvailable ? (
                <button
                  onClick={() => handleRatingSubmit(1, ratingType)}
                  disabled={isDisabled}
                  className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  Mark as Available
                </button>
              ) : (
                <button
                  onClick={() => handleNotAvailable(ratingType)}
                  disabled={isDisabled}
                  className="text-sm px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400"
                >
                  Not Available
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm italic">
            Sign in to rate this restaurant
          </div>
        )}
        
        {isSubmitting[ratingType] && (
          <div className="mt-2 text-sm text-blue-600">
            Saving rating...
          </div>
        )}
      </div>
    );
  };

  // Read vegOnly flag from window-injected context on card if present (passed via metadata)
  const vegOnly = (typeof window !== 'undefined') ? (document.querySelector(`[data-restaurant-id="${restaurantId}"]`) as HTMLElement | null)?.dataset.vegOnly === 'true' : false;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Rate this Restaurant</h3>
      
      <div className="space-y-4">
        <RatingSection
          ratingType="VEG"
          icon={<Leaf className="text-green-600" size={20} />}
          label="Vegetarian Food"
          color="bg-green-50"
        />
        
        {!vegOnly && (
          <RatingSection
            ratingType="NON_VEG"
            icon={<Utensils className="text-red-600" size={20} />}
            label="Non-Vegetarian Food"
            color="bg-red-50"
          />
        )}
      </div>

      {/* Summary */}
      {(ratings.VEG || ratings.NON_VEG) && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">Your Ratings Summary:</h4>
          <div className="space-y-2 text-sm">
            {ratings.VEG && (
              <div className="flex items-center gap-2">
                <Leaf className="text-green-600" size={16} />
                <span>
                  Veg: {ratings.VEG.availability === 'NOT_AVAILABLE' ? 'N/A' : getRatingDisplay(ratings.VEG.score!)}
                </span>
              </div>
            )}
            {ratings.NON_VEG && (
              <div className="flex items-center gap-2">
                <Utensils className="text-red-600" size={16} />
                <span>
                  Non-Veg: {ratings.NON_VEG.availability === 'NOT_AVAILABLE' ? 'N/A' : getRatingDisplay(ratings.NON_VEG.score!)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {!currentUser && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            Sign in to rate this restaurant and share your experience with others!
          </p>
        </div>
      )}
    </div>
  );
}
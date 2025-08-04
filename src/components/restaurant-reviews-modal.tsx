'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, MessageSquare, Trash2, ThumbsUp, Leaf, Utensils } from 'lucide-react';
import { getRatingDisplay } from '@/lib/rating-system';
import { useToast } from '@/context/toast-context';
import { useClickOutside } from '@/hooks/useClickOutside';

interface UserRestaurantReviewRating {
  userId: string;
  user: {
    id: string;
    name: string | null;
  };
  review: {
    id: string;
    text: string;
    createdAt: string;
    likes: {
      count: number;
      users: Array<{
        id: string;
        name: string;
      }>;
    };
  } | null;
  vegRating: {
    id: string;
    score: number;
    availability: 'AVAILABLE' | 'NOT_AVAILABLE';
  } | null;
  nonVegRating: {
    id: string;
    score: number;
    availability: 'AVAILABLE' | 'NOT_AVAILABLE';
  } | null;
}

interface RestaurantReviewsModalProps {
  restaurantId: string;
  restaurantName: string;
  currentUserId?: string;
  onClose: () => void;
  onReviewDeleted?: (userId: string) => void;
}

interface RestaurantInfo {
  id: string;
  name: string;
  location: string | null;
  cuisine: string | null;
  addedBy: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

interface ApiResponse {
  restaurant: RestaurantInfo;
  userEntries: UserRestaurantReviewRating[];
}

export default function RestaurantReviewsModal({ 
  restaurantId, 
  restaurantName, 
  currentUserId, 
  onClose, 
  onReviewDeleted 
}: RestaurantReviewsModalProps) {
  const [userEntries, setUserEntries] = useState<UserRestaurantReviewRating[]>([]);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingReview, setDeletingReview] = useState<string | null>(null);
  const [likingReview, setLikingReview] = useState<string | null>(null);
  const { showToast } = useToast();

  // Click outside to close functionality
  const modalContentRef = useClickOutside<HTMLDivElement>({
    onClickOutside: onClose,
    enabled: true
  });

  const fetchReviewsAndRatings = useCallback(async () => {
    try {
      // Add cache-busting parameter to ensure fresh data
      const cacheBuster = `&t=${Date.now()}`;
      const response = await fetch(`/api/restaurants/reviews-and-ratings?restaurantId=${restaurantId}${cacheBuster}`, {
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch restaurant reviews and ratings');
      }
      const data: ApiResponse = await response.json();
      setUserEntries(data.userEntries);
      setRestaurantInfo(data.restaurant);
    } catch (error) {
      console.error(error);
      showToast('Failed to load reviews and ratings', 'error');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, showToast]);

  useEffect(() => {
    fetchReviewsAndRatings();
  }, [fetchReviewsAndRatings]);

  const handleDeleteReview = async (reviewId: string) => {
    if (!currentUserId) return;

    setDeletingReview(reviewId);
    try {
      const response = await fetch('/api/restaurant-reviews', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reviewId, userId: currentUserId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete review');
      }

      // Update local state immediately
      setUserEntries(prevEntries => 
        prevEntries.filter(entry => entry.review?.id !== reviewId)
      );

      // Call parent callback if provided
      if (onReviewDeleted) {
        onReviewDeleted(currentUserId);
      }

      showToast('Review deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting review:', error);
      showToast(error instanceof Error ? error.message : 'Failed to delete review', 'error');
    } finally {
      setDeletingReview(null);
    }
  };

  const handleLikeReview = async (reviewId: string) => {
    if (!currentUserId) return;

    setLikingReview(reviewId);
    try {
      const response = await fetch('/api/restaurant-reviews/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reviewId, userId: currentUserId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to like review');
      }

      const result = await response.json();
      
      // Update local state
      setUserEntries(prevEntries => 
        prevEntries.map(entry => {
          if (entry.review?.id === reviewId) {
            const currentUserLiked = entry.review.likes.users.some(user => user.id === currentUserId);
            
            if (result.action === 'liked' && !currentUserLiked) {
              return {
                ...entry,
                review: {
                  ...entry.review,
                  likes: {
                    count: entry.review.likes.count + 1,
                    users: [...entry.review.likes.users, { id: currentUserId, name: 'You' }]
                  }
                }
              };
            } else if (result.action === 'unliked' && currentUserLiked) {
              return {
                ...entry,
                review: {
                  ...entry.review,
                  likes: {
                    count: entry.review.likes.count - 1,
                    users: entry.review.likes.users.filter(user => user.id !== currentUserId)
                  }
                }
              };
            }
          }
          return entry;
        })
      );

      showToast(result.action === 'liked' ? 'Review liked!' : 'Review unliked', 'success');
    } catch (error) {
      console.error('Error liking review:', error);
      showToast(error instanceof Error ? error.message : 'Failed to like review', 'error');
    } finally {
      setLikingReview(null);
    }
  };

  const renderUserEntry = (entry: UserRestaurantReviewRating, index: number) => {
    const userName = entry.user?.name || 'Anonymous';
    const hasReview = entry.review !== null;
    const hasVegRating = entry.vegRating !== null;
    const hasNonVegRating = entry.nonVegRating !== null;
    const isCurrentUser = currentUserId === entry.userId;

    return (
      <li key={`${entry.userId}-${entry.review?.id || 'rating-only'}-${index}`} className="border p-4 rounded-md bg-gray-50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="font-semibold text-gray-800">{userName}</h4>
            
            {/* Veg Rating */}
            {hasVegRating && (
              <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full">
                <Leaf size={14} className="text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  {entry.vegRating!.availability === 'NOT_AVAILABLE' 
                    ? 'N/A' 
                    : getRatingDisplay(entry.vegRating!.score)
                  }
                </span>
              </div>
            )}
            
            {/* Non-Veg Rating */}
            {hasNonVegRating && (
              <div className="flex items-center gap-1 bg-red-100 px-2 py-1 rounded-full">
                <Utensils size={14} className="text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  {entry.nonVegRating!.availability === 'NOT_AVAILABLE' 
                    ? 'N/A' 
                    : getRatingDisplay(entry.nonVegRating!.score)
                  }
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {hasReview && <MessageSquare size={16} className="text-blue-500" />}
            {hasReview && isCurrentUser && (
              <button
                onClick={() => handleDeleteReview(entry.review!.id)}
                disabled={deletingReview === entry.review!.id}
                className="p-1 text-red-400 hover:text-red-600 disabled:opacity-50"
                title="Delete your review"
              >
                {deletingReview === entry.review!.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                ) : (
                  <Trash2 size={14} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Display review if available */}
        {hasReview && (
          <div className="bg-white p-3 rounded-md border-l-4 border-blue-200">
            <p className="text-gray-700 leading-relaxed">{entry.review!.text}</p>
            
            {/* Review metadata */}
            <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
              <span>
                {new Date(entry.review!.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              
              {/* Like functionality */}
              {currentUserId && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLikeReview(entry.review!.id)}
                    disabled={likingReview === entry.review!.id}
                    className={`flex items-center gap-1 px-2 py-1 rounded transition-colors disabled:opacity-50 ${
                      entry.review!.likes.users.some(user => user.id === currentUserId)
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    title={entry.review!.likes.users.some(user => user.id === currentUserId) ? 'Unlike' : 'Like'}
                  >
                    {likingReview === entry.review!.id ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                    ) : (
                      <ThumbsUp size={12} />
                    )}
                    <span className="text-xs">{entry.review!.likes.count}</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* Show who liked this review */}
            {entry.review!.likes.count > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                Liked by: {entry.review!.likes.users.map(user => 
                  user.id === currentUserId ? 'You' : user.name
                ).join(', ')}
              </div>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      data-modal-backdrop="true"
    >
      <div 
        ref={modalContentRef}
        className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold text-gray-800">User Reviews & Ratings</h2>
            <p className="text-sm text-gray-600">
              {restaurantName}
              {restaurantInfo?.location && ` • ${restaurantInfo.location}`}
              {restaurantInfo?.cuisine && ` • ${restaurantInfo.cuisine}`}
            </p>
            {restaurantInfo?.addedBy && (
              <p className="text-xs text-gray-500 mt-1">
                Added by {restaurantInfo.addedBy.name} on {new Date(restaurantInfo.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-gray-200 transition-colors"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2 text-gray-600">Loading reviews and ratings...</span>
            </div>
          ) : userEntries.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <MessageSquare size={48} className="mx-auto mb-4" />
              </div>
              <p className="text-gray-500">No reviews or ratings yet for this restaurant.</p>
              <p className="text-sm text-gray-400 mt-2">Be the first to rate and review!</p>
            </div>
          ) : (
            <div>
              <div className="mb-4 text-sm text-gray-600 flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1">
                  <MessageSquare size={14} className="text-blue-500" />
                  Review
                </span>
                <span className="flex items-center gap-1">
                  <Leaf size={14} className="text-green-500" />
                  Veg Rating
                </span>
                <span className="flex items-center gap-1">
                  <Utensils size={14} className="text-red-500" />
                  Non-Veg Rating
                </span>
                <span className="ml-auto">
                  {userEntries.length} user{userEntries.length !== 1 ? 's' : ''}
                </span>
              </div>
              <ul className="space-y-4">
                {userEntries.map((entry, index) => renderUserEntry(entry, index))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
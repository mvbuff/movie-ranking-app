'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Star, MessageSquare, Trash2, ThumbsUp } from 'lucide-react';
import { getRatingDisplay } from '@/lib/rating-system';
import { useToast } from '@/context/toast-context';
import { useClickOutside } from '@/hooks/useClickOutside';

interface UserReviewRating {
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
  rating: {
    id: string;
    score: number;
    createdAt?: string | null;
  } | null;
}

interface ReviewsModalProps {
  movieId: string;
  movieTitle: string;
  currentUserId?: string;
  onClose: () => void;
  onReviewDeleted?: (userId: string) => void;
}

interface MovieInfo {
  id: string;
  title: string;
  addedBy: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

interface ApiResponse {
  movie: MovieInfo;
  userEntries: UserReviewRating[];
}

export default function ReviewsModal({ movieId, movieTitle, currentUserId, onClose, onReviewDeleted }: ReviewsModalProps) {
  const [userEntries, setUserEntries] = useState<UserReviewRating[]>([]);
  const [movieInfo, setMovieInfo] = useState<MovieInfo | null>(null);
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
      const response = await fetch(`/api/movies/reviews-and-ratings?movieId=${movieId}${cacheBuster}`, {
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch reviews and ratings');
      }
      const data: ApiResponse = await response.json();
      setUserEntries(data.userEntries);
      setMovieInfo(data.movie);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [movieId]);

  useEffect(() => {
    fetchReviewsAndRatings();
  }, [fetchReviewsAndRatings]);

  const handleDeleteReview = async (reviewId: string) => {
    if (!currentUserId) return;
    
    setDeletingReview(reviewId);
    
    // Optimistically update UI by removing the review immediately
    const previousEntries = [...userEntries];
    setUserEntries(currentEntries => 
      currentEntries.map(entry => 
        entry.review?.id === reviewId 
          ? { ...entry, review: null }
          : entry
      ).filter(entry => entry.review !== null || entry.rating !== null)
    );
    
    try {
      const response = await fetch('/api/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, userId: currentUserId }),
      });

      if (response.ok) {
        // Success - the optimistic update was correct
        onReviewDeleted?.(currentUserId);
        
        // Fetch fresh data to ensure consistency
        await fetchReviewsAndRatings();
      } else {
        // Revert optimistic update on failure
        setUserEntries(previousEntries);
        console.error('Failed to delete review');
      }
    } catch (error) {
      // Revert optimistic update on error
      setUserEntries(previousEntries);
      console.error('Failed to delete review:', error);
    } finally {
      setDeletingReview(null);
    }
  };

  const handleLikeReview = async (reviewId: string) => {
    if (!currentUserId) {
      showToast('Please sign in to like reviews', 'error');
      return;
    }

    setLikingReview(reviewId);
    
    // Check if already liked
    const currentEntry = userEntries.find(entry => 
      entry.review?.id === reviewId
    );
    const isLiked = currentEntry?.review?.likes.users.some(user => user.id === currentUserId);
    
    // Optimistically update UI immediately
    const previousEntries = [...userEntries];
    setUserEntries(currentEntries => 
      currentEntries.map(entry => {
        if (entry.review?.id === reviewId) {
          const currentLikeUsers = entry.review.likes.users;
          const updatedUsers = isLiked
            ? currentLikeUsers.filter(user => user.id !== currentUserId)
            : [...currentLikeUsers, { id: currentUserId, name: 'You' }];
          
          return {
            ...entry,
            review: {
              ...entry.review,
              likes: {
                count: updatedUsers.length,
                users: updatedUsers
              }
            }
          };
        }
        return entry;
      })
    );

    try {
      if (isLiked) {
        // Unlike the review
        const response = await fetch('/api/reviews/likes', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewId, userId: currentUserId }),
        });

        if (response.ok) {
          showToast('Review unliked', 'info');
          // Fetch fresh data to ensure consistency
          await fetchReviewsAndRatings();
        } else {
          // Revert optimistic update on failure
          setUserEntries(previousEntries);
          const error = await response.json();
          showToast(error.error || 'Failed to unlike review', 'error');
        }
      } else {
        // Like the review
        const response = await fetch('/api/reviews/likes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewId, userId: currentUserId }),
        });

        if (response.ok) {
          showToast('Review liked!', 'success');
          // Fetch fresh data to ensure consistency
          await fetchReviewsAndRatings();
        } else {
          // Revert optimistic update on failure
          setUserEntries(previousEntries);
          const error = await response.json();
          showToast(error.error || 'Failed to like review', 'error');
        }
      }
    } catch (error) {
      // Revert optimistic update on error
      setUserEntries(previousEntries);
      console.error('Failed to handle like:', error);
      showToast('Failed to like review', 'error');
    } finally {
      setLikingReview(null);
    }
  };

  const renderUserEntry = (entry: UserReviewRating) => {
    const userName = entry.user?.name || 'Anonymous';
    const hasReview = entry.review !== null;
    const hasRating = entry.rating !== null;
    const isCurrentUser = currentUserId === entry.userId;

    return (
      <li key={entry.userId} className="border p-4 rounded-md bg-gray-50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="font-semibold text-gray-800">{userName}</h4>
            {hasRating && (
              <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-full">
                <Star size={14} className="text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  {getRatingDisplay(entry.rating!.score)}
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
          <div className="bg-white p-3 rounded border-l-4 border-blue-400">
            <div className="flex items-start gap-2 mb-2">
              <MessageSquare size={16} className="text-blue-500 mt-1 flex-shrink-0" />
              <div className="flex-grow">
                <p className="text-gray-800 italic">&quot;{entry.review!.text}&quot;</p>
                <p className="text-xs text-gray-500 mt-1">
                  Reviewed on {new Date(entry.review!.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            {/* Like section */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleLikeReview(entry.review!.id)}
                  disabled={likingReview === entry.review!.id}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors ${
                    currentUserId && entry.review!.likes.users.some(user => user.id === currentUserId)
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } ${!currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={currentUserId ? 'Like this review' : 'Sign in to like reviews'}
                >
                  {likingReview === entry.review!.id ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                  ) : (
                    <ThumbsUp 
                      size={14} 
                      className={currentUserId && entry.review!.likes.users.some(user => user.id === currentUserId) ? 'fill-current' : ''}
                    />
                  )}
                  <span>{entry.review!.likes.count}</span>
                </button>
                
                {/* Show names of users who liked */}
                {entry.review!.likes.count > 0 && (
                  <span className="text-xs text-gray-500">
                    Liked by {entry.review!.likes.users.map(user => user.name).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rating date if available and no review block showed it */}
        {hasRating && (
          <div className="text-xs text-gray-500">
            Rated on {entry.rating?.createdAt ? new Date(entry.rating.createdAt).toLocaleDateString() : '—'}
          </div>
        )}

        {/* Show message if user has neither review nor rating (shouldn't happen with current logic) */}
        {!hasReview && !hasRating && (
          <div className="text-gray-500 text-sm">
            No review or rating available
          </div>
        )}
      </li>
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-backdrop"
      data-modal-backdrop="true"
    >
      <div 
        ref={modalContentRef}
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold text-gray-800">User Reviews & Ratings</h2>
            <p className="text-sm text-gray-600">{movieTitle}</p>
            {movieInfo?.addedBy && (
              <p className="text-xs text-gray-500 mt-1">
                Added by {movieInfo.addedBy.name} on {new Date(movieInfo.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-gray-200 transition-colors"
            title="Close modal"
          >
            <X size={24} />
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
              <p className="text-gray-500">No reviews or ratings yet for this movie.</p>
              <p className="text-sm text-gray-400 mt-2">Be the first to rate and review!</p>
            </div>
          ) : (
            <div>
              <div className="mb-4 text-sm text-gray-600 flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <MessageSquare size={14} className="text-blue-500" />
                  Review
                </span>
                <span className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-500" />
                  Rating
                </span>
                <span className="ml-auto">
                  {userEntries.length} user{userEntries.length !== 1 ? 's' : ''}
                </span>
              </div>
              <ul className="space-y-4">
                {userEntries.map(renderUserEntry)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/context/user-context';
import { useDebounce } from '@/hooks/useDebounce';

import { MapPin, Star, MessageSquare, Leaf, Utensils, Trash2, User, Info, Share2, Image as ImageIcon, Eye } from 'lucide-react';
import Image from 'next/image';
import { getRatingDisplay } from '@/lib/rating-system';
import { useToast } from '@/context/toast-context';
import RestaurantRatingModal from './restaurant-rating-modal';
import AddRestaurantReviewModal from './add-restaurant-review-modal';
import RestaurantReviewsModal from './restaurant-reviews-modal';
import RestaurantImageManager from './restaurant-image-manager';
import { Scorecard } from './score-components';
import { DietaryFilter, RestaurantSortKey } from './restaurant-filter-controls';
import { getDisplayAddress } from '@/lib/address-utils';

interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  googleMapsUrl: string | null;
  cuisine: string | null;
  location: string | null;
  description: string | null;
  imageUrl: string | null;
  metadata: {
    photos?: string[];
    vicinity?: string;
    formatted_address?: string;
    vegOnly?: boolean;
  } | null; // Contains Google Places data including photos
  createdAt: string;
  addedBy: { id: string; name: string } | null;
  ratingsCount: number;
  reviewsCount: number;
}

interface RestaurantRating {
  id: string;
  score: number | null;
  ratingType: 'VEG' | 'NON_VEG';
  availability: 'AVAILABLE' | 'NOT_AVAILABLE';
  restaurantId: string;
  userId: string;
}

interface RestaurantWithRatings extends Restaurant {
  userVegRating: number | null;
  userNonVegRating: number | null;
  userVegAvailability: 'AVAILABLE' | 'NOT_AVAILABLE' | null;
  userNonVegAvailability: 'AVAILABLE' | 'NOT_AVAILABLE' | null;
  avgVegRating: number | null;
  avgNonVegRating: number | null;
  aggregateVegScore: number | null;
  aggregateNonVegScore: number | null;
  globalVegAvailability?: 'AVAILABLE' | 'NOT_AVAILABLE';
  globalNonVegAvailability?: 'AVAILABLE' | 'NOT_AVAILABLE';
  isInEatlist?: boolean;
}

interface RestaurantListProps {
  searchTerm?: string;
  cuisineFilter?: string;
  locationFilter?: string;
  dietaryFilter?: DietaryFilter;
  sortBy?: RestaurantSortKey;
  vegScoreThreshold?: number;
  nonVegScoreThreshold?: number;
  ignoreNonVegForVeg?: boolean;
  ignoreVegForNonVeg?: boolean;
  readOnlyMode?: boolean;
  refreshTimestamp?: number | null;
  calculationTimestamp?: number | null;
}

export default function RestaurantList({ 
  searchTerm = '', 
  cuisineFilter = '',
  locationFilter = '',
  dietaryFilter = 'ALL',
  sortBy = 'addedDate',
  vegScoreThreshold = 3,
  nonVegScoreThreshold = 3,
  ignoreNonVegForVeg = false,
  ignoreVegForNonVeg = false,
  readOnlyMode = false,
  refreshTimestamp,
  calculationTimestamp 
}: RestaurantListProps) {
  const { currentUser, isAdmin } = useUser();
  const { showToast } = useToast();
  const [restaurants, setRestaurants] = useState<RestaurantWithRatings[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingModal, setRatingModal] = useState<{ restaurantId: string; restaurantName: string; } | null>(null);
  const [deletingRestaurant, setDeletingRestaurant] = useState<string | null>(null);
  const [addReviewModal, setAddReviewModal] = useState<{ restaurantId: string; restaurantName: string; } | null>(null);
  const [activeReviews, setActiveReviews] = useState<{ restaurantId: string; restaurantName: string; } | null>(null);
  const [imageManager, setImageManager] = useState<{ restaurantId: string; restaurantName: string; } | null>(null);
  const [togglingEatlist, setTogglingEatlist] = useState<string | null>(null);

  // Debounce filter values to prevent excessive API calls
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [debouncedCuisineFilter] = useDebounce(cuisineFilter, 300);
  const [debouncedLocationFilter] = useDebounce(locationFilter, 300);
  const [debouncedVegScoreThreshold] = useDebounce(vegScoreThreshold, 500);
  const [debouncedNonVegScoreThreshold] = useDebounce(nonVegScoreThreshold, 500);

  // Handle optimistic rating updates without full refresh
  const handleRatingUpdate = useCallback((
    restaurantId: string, 
    vegScore: number | null, 
    nonVegScore: number | null,
    vegAvailability?: 'AVAILABLE' | 'NOT_AVAILABLE' | null,
    nonVegAvailability?: 'AVAILABLE' | 'NOT_AVAILABLE' | null
  ) => {
    setRestaurants(prev => prev.map(restaurant => 
      restaurant.id === restaurantId 
        ? { 
            ...restaurant, 
            userVegRating: vegScore, 
            userNonVegRating: nonVegScore,
            // Only update availability if explicitly provided, otherwise keep existing
            userVegAvailability: vegAvailability !== undefined ? vegAvailability : restaurant.userVegAvailability,
            userNonVegAvailability: nonVegAvailability !== undefined ? nonVegAvailability : restaurant.userNonVegAvailability
          }
        : restaurant
    ));
  }, []);

  const fetchRestaurantData = useCallback(async () => {
    setLoading(true);
    try {
      // Build URL parameters for filtering
      const params = new URLSearchParams();
      const cacheBuster = calculationTimestamp ? calculationTimestamp.toString() : Date.now().toString();
      params.append('t', cacheBuster);
      
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (debouncedCuisineFilter) params.append('cuisine', debouncedCuisineFilter);
      if (debouncedLocationFilter) params.append('location', debouncedLocationFilter);
      if (dietaryFilter && dietaryFilter !== 'ALL') params.append('dietaryFilter', dietaryFilter);
      if (sortBy) params.append('sortBy', sortBy);
      if (debouncedVegScoreThreshold !== 3) params.append('vegScoreThreshold', debouncedVegScoreThreshold.toString());
      if (debouncedNonVegScoreThreshold !== 3) params.append('nonVegScoreThreshold', debouncedNonVegScoreThreshold.toString());
      if (currentUser) params.append('userId', currentUser.id);
      
      if (readOnlyMode || !currentUser) {
        // Read-only mode: fetch restaurants only
        const restaurantsResponse = await fetch(`/api/restaurants?${params.toString()}`, { cache: 'no-store' });
        if (!restaurantsResponse.ok) throw new Error('Failed to fetch restaurants');
        const restaurantsData: Restaurant[] = await restaurantsResponse.json();

        const restaurantsWithRatings = restaurantsData.map(restaurant => ({
          ...restaurant,
          userVegRating: null,
          userNonVegRating: null,
          userVegAvailability: null,
          userNonVegAvailability: null,
          avgVegRating: null,
          avgNonVegRating: null,
          aggregateVegScore: null,
          aggregateNonVegScore: null,
        }));

        setRestaurants(restaurantsWithRatings);
      } else {
        // Authenticated mode: fetch with user-specific data
        const [restaurantsRes, ratingsRes, aggregateScoresRes, eatlistRes] = await Promise.all([
          fetch(`/api/restaurants?${params.toString()}`, { cache: 'no-store' }),
          fetch(`/api/restaurant-ratings?userId=${currentUser.id}&t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`/api/restaurant-aggregate-scores?userId=${currentUser.id}&t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`/api/restaurant-eatlist?userId=${currentUser.id}&t=${Date.now()}`, { cache: 'no-store' }),
        ]);

        if (!restaurantsRes.ok || !ratingsRes.ok || !aggregateScoresRes.ok || !eatlistRes.ok) {
          throw new Error('Failed to fetch restaurant data');
        }

        const restaurantsData: Restaurant[] = await restaurantsRes.json();
        const userRatingsData: RestaurantRating[] = await ratingsRes.json();
        const aggregateScoresData: {
          restaurantId: string;
          vegScore: number | null;
          nonVegScore: number | null;
        }[] = await aggregateScoresRes.json();
        const eatlistItems: { restaurantId: string }[] = await eatlistRes.json();
        const eatlistSet = new Set(eatlistItems.map(e => e.restaurantId));

        // Create maps for quick lookup
        const vegRatingsMap = new Map(
          userRatingsData
            .filter(r => r.ratingType === 'VEG')
            .map(r => [r.restaurantId, r])
        );
        const nonVegRatingsMap = new Map(
          userRatingsData
            .filter(r => r.ratingType === 'NON_VEG')
            .map(r => [r.restaurantId, r])
        );
        const aggregateScoresMap = new Map(
          aggregateScoresData.map(s => [s.restaurantId, s])
        );

        // Combine data
        const restaurantsWithRatings = restaurantsData.map(restaurant => {
          const userVegRating = vegRatingsMap.get(restaurant.id);
          const userNonVegRating = nonVegRatingsMap.get(restaurant.id);
          const aggregateScores = aggregateScoresMap.get(restaurant.id);

          return {
            ...restaurant,
            userVegRating: userVegRating?.score || null,
            userNonVegRating: userNonVegRating?.score || null,
            userVegAvailability: userVegRating?.availability || null,
            userNonVegAvailability: userNonVegRating?.availability || null,
            avgVegRating: null, // TODO: Calculate from all users
            avgNonVegRating: null, // TODO: Calculate from all users
            aggregateVegScore: aggregateScores?.vegScore || null,
            aggregateNonVegScore: aggregateScores?.nonVegScore || null,
            isInEatlist: eatlistSet.has(restaurant.id),
          };
        });

        setRestaurants(restaurantsWithRatings);
      }
    } catch (error) {
      console.error('Failed to fetch restaurant data:', error);
      showToast('Failed to load restaurants', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser, showToast, readOnlyMode, calculationTimestamp, debouncedSearchTerm, debouncedCuisineFilter, debouncedLocationFilter, dietaryFilter, sortBy, debouncedVegScoreThreshold, debouncedNonVegScoreThreshold]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchRestaurantData();
  }, [fetchRestaurantData, refreshTimestamp]);

  const handleDeleteRestaurant = async (restaurantId: string, restaurantName: string) => {
    if (!isAdmin) {
      showToast('Admin access required to delete restaurants', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${restaurantName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingRestaurant(restaurantId);

    try {
      const response = await fetch('/api/restaurants', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ restaurantId }),
      });

      if (response.ok) {
        showToast(`Successfully deleted "${restaurantName}"`, 'success');
        fetchRestaurantData(); // Refresh the list
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to delete restaurant', 'error');
      }
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      showToast('Failed to delete restaurant', 'error');
    } finally {
      setDeletingRestaurant(null);
    }
  };

  const shareRestaurant = async (restaurant: RestaurantWithRatings) => {
    // Create rating display for veg and non-veg
    const getRestaurantRatingDisplay = () => {
      const vegNA = restaurant.globalVegAvailability === 'NOT_AVAILABLE' || restaurant.userVegAvailability === 'NOT_AVAILABLE';
      const nonVegNA = restaurant.globalNonVegAvailability === 'NOT_AVAILABLE' || restaurant.userNonVegAvailability === 'NOT_AVAILABLE';

      const vegRating = vegNA
        ? 'NA'
        : (restaurant.userVegRating ? getRatingDisplay(restaurant.userVegRating) : 'NR');

      const nonVegRating = nonVegNA
        ? 'NA'
        : (restaurant.userNonVegRating ? getRatingDisplay(restaurant.userNonVegRating) : 'NR');

      return `Veg: ${vegRating} || Non-Veg: ${nonVegRating}`;
    };

    const ratingDisplay = getRestaurantRatingDisplay();
    const location = restaurant.location || 'Location not specified';
    
    // Create the complete message
    let message = `RReco: ${restaurant.name} (${location}) \n\n${ratingDisplay}`;
    
    // Fetch user's review if available
    if (!readOnlyMode && currentUser) {
      try {
        const reviewResponse = await fetch(`/api/restaurant-reviews?restaurantId=${restaurant.id}&userId=${currentUser.id}`);
        if (reviewResponse.ok) {
          const reviews = await reviewResponse.json();
          if (reviews.length > 0) {
            // Get the most recent review from this user
            const userReview = reviews[0];
            message += `\n\n${userReview.text.trim()}`;
          }
        }
      } catch (error) {
        console.error('Failed to fetch user review:', error);
        // Continue without review if fetch fails
      }
    }
    
    message += `\n\n--shared via https://peer-movie-rating-app.vercel.app/food`;

    // Helper function to get preview of copied content
    const getPreview = (text: string) => {
      const lines = text.split('\n').filter(line => line.trim() !== '');
      const lastTwoLines = lines.slice(-2).join('\n');
      return lastTwoLines.length > 80 ? lastTwoLines.substring(0, 80) + '...' : lastTwoLines;
    };

    // Helper function to ensure text is properly decoded (fixes iOS URL encoding issues)
    const ensurePlainText = (text: string) => {
      try {
        let decodedText = text;
        
        if (text.includes('%20') || text.includes('%3A') || text.includes('%0A')) {
          decodedText = decodeURIComponent(text);
        }
        
        decodedText = decodedText
          .replace(/%20/g, ' ')
          .replace(/%3A/g, ':')
          .replace(/%0A/g, '\n')
          .replace(/%2F/g, '/')
          .replace(/%2E/g, '.')
          .replace(/%2D/g, '-');
        
        return decodedText;
      } catch (error) {
        console.log('Text decode failed, using original:', error);
        return text;
      }
    };

    const plainMessage = ensurePlainText(message);

    // Copy to clipboard
    try {
      // For iOS: Clear clipboard first, then write clean text
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        await navigator.clipboard.writeText('');
        await new Promise(resolve => setTimeout(resolve, 10));
        await navigator.clipboard.writeText(plainMessage);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      await navigator.clipboard.writeText(plainMessage);
      const preview = getPreview(plainMessage);
      const hasReview = !readOnlyMode && currentUser && plainMessage.includes('....') && plainMessage.split('....').length > 2;
      showToast(`${hasReview ? 'Copied with review!' : 'Copied to clipboard!'}\n\n${preview}`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showToast('Failed to copy to clipboard. Please try again.', 'error');
    }
  };

  // Apply client-side filtering for dietary options that require user ratings
  const filteredRestaurants = restaurants.filter(restaurant => {
    // Dietary filter based on user ratings and availability
    if (dietaryFilter === 'EATLIST') {
      return !!restaurant.isInEatlist;
    }
    if (dietaryFilter === 'VEG_ONLY') {
      // New rule: show restaurants explicitly marked veg-only via metadata
      return restaurant.metadata?.vegOnly === true;
    }
    
    if (dietaryFilter === 'NON_VEG_ONLY') {
      // Show restaurants that either:
      // 1. User has marked non-veg as available and rated it above threshold
      // 2. Has aggregate non-veg score above threshold
      // 3. Has no ratings yet (give benefit of doubt)
      const hasNonVegRating = restaurant.userNonVegAvailability === 'AVAILABLE' && 
                             (restaurant.userNonVegRating === null || restaurant.userNonVegRating >= debouncedNonVegScoreThreshold);
      const hasNonVegAggregateScore = restaurant.aggregateNonVegScore !== null && 
                                     restaurant.aggregateNonVegScore >= debouncedNonVegScoreThreshold;
      const hasNoRatings = restaurant.userVegAvailability === null && 
                          restaurant.userNonVegAvailability === null && 
                          restaurant.aggregateVegScore === null && 
                          restaurant.aggregateNonVegScore === null;
      
      return hasNonVegRating || hasNonVegAggregateScore || hasNoRatings;
    }
    
    return true; // 'ALL' shows everything
  });

  // Sort restaurants based on selected criteria
  const sortedRestaurants = filteredRestaurants.sort((a, b) => {
    switch (sortBy) {
      case 'aggregateScore':
        // Sort by highest aggregate score
        let aMaxScore, bMaxScore;
        
        if (dietaryFilter === 'VEG_ONLY' && ignoreNonVegForVeg) {
          // Only consider veg scores
          aMaxScore = a.aggregateVegScore || 0;
          bMaxScore = b.aggregateVegScore || 0;
        } else if (dietaryFilter === 'NON_VEG_ONLY' && ignoreVegForNonVeg) {
          // Only consider non-veg scores
          aMaxScore = a.aggregateNonVegScore || 0;
          bMaxScore = b.aggregateNonVegScore || 0;
        } else {
          // Consider both veg and non-veg scores
          aMaxScore = Math.max(a.aggregateVegScore || 0, a.aggregateNonVegScore || 0);
          bMaxScore = Math.max(b.aggregateVegScore || 0, b.aggregateNonVegScore || 0);
        }
        return bMaxScore - aMaxScore;
      
      case 'vegRating':
        // Sort by veg rating (user's rating first, then aggregate)
        // If ignoreNonVegForVeg is true, only consider veg ratings
        let aVegScore, bVegScore;
        if (ignoreNonVegForVeg) {
          aVegScore = a.userVegRating || a.aggregateVegScore || 0;
          bVegScore = b.userVegRating || b.aggregateVegScore || 0;
        } else {
          aVegScore = a.userVegRating || a.aggregateVegScore || 0;
          bVegScore = b.userVegRating || b.aggregateVegScore || 0;
        }
        return bVegScore - aVegScore;
      
      case 'nonVegRating':
        // Sort by non-veg rating (user's rating first, then aggregate)
        // If ignoreVegForNonVeg is true, only consider non-veg ratings
        let aNonVegScore, bNonVegScore;
        if (ignoreVegForNonVeg) {
          aNonVegScore = a.userNonVegRating || a.aggregateNonVegScore || 0;
          bNonVegScore = b.userNonVegRating || b.aggregateNonVegScore || 0;
        } else {
          aNonVegScore = a.userNonVegRating || a.aggregateNonVegScore || 0;
          bNonVegScore = b.userNonVegRating || b.aggregateNonVegScore || 0;
        }
        return bNonVegScore - aNonVegScore;
      
      case 'name':
        return a.name.localeCompare(b.name);
      
      case 'addedDate':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2 text-gray-600">Loading restaurants...</span>
      </div>
    );
  }

  if (sortedRestaurants.length === 0) {
    let message = "No restaurants found.";
    
    if (debouncedSearchTerm || debouncedCuisineFilter || debouncedLocationFilter || dietaryFilter !== 'ALL') {
      message = "No restaurants match your current filters.";
    } else if (!debouncedSearchTerm && !debouncedCuisineFilter && !debouncedLocationFilter && dietaryFilter === 'ALL') {
      message = "No restaurants added yet. Be the first to add one!";
    }
    
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">{message}</div>
        {(debouncedSearchTerm || debouncedCuisineFilter || debouncedLocationFilter || dietaryFilter !== 'ALL') && (
          <p className="text-gray-400 text-sm mt-2">
            Try clearing some filters to see more results.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 mb-4">
        Showing {sortedRestaurants.length} restaurant{sortedRestaurants.length !== 1 ? 's' : ''}
        {(debouncedSearchTerm || debouncedCuisineFilter || debouncedLocationFilter || dietaryFilter !== 'ALL') && (
          <span className="text-blue-600"> (filtered)</span>
        )}
        {debouncedSearchTerm && ` matching "${debouncedSearchTerm}"`}
        {debouncedCuisineFilter && ` • ${debouncedCuisineFilter} cuisine`}
        {debouncedLocationFilter && ` • in ${debouncedLocationFilter}`}
        {dietaryFilter === 'VEG_ONLY' && ` • Veg Available`}
        {dietaryFilter === 'NON_VEG_ONLY' && ` • Non-Veg Available`}
      </div>

      {/* Restaurant Grid - Smaller, more compact tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {sortedRestaurants.map((restaurant) => {
          // Extract Google Photos from metadata
          const photos = restaurant.metadata?.photos || [];
          const firstPhoto = photos.length > 0 ? photos[0] : null;
          
          // Add cache-busting timestamp for images to ensure fresh updates
          const imageWithCacheBust = firstPhoto && refreshTimestamp 
            ? `${firstPhoto}${firstPhoto.includes('?') ? '&' : '?'}v=${refreshTimestamp}` 
            : firstPhoto;
          
          return (
            <div 
              key={restaurant.id} 
              className="bg-white border rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              data-restaurant-id={restaurant.id}
              data-veg-only={restaurant.metadata?.vegOnly ? 'true' : 'false'}
            >
              {/* Restaurant Image - Much smaller */}
              <div className="aspect-[3/2] relative bg-gradient-to-br from-green-100 to-orange-100">
                {/* Admin controls - top left corner (delete + veg-only) */}
                <div className="absolute top-2 left-2 flex gap-2 z-10">
                  {isAdmin && !readOnlyMode && (
                    <button
                      onClick={() => handleDeleteRestaurant(restaurant.id, restaurant.name)}
                      disabled={deletingRestaurant === restaurant.id}
                      className="p-2 rounded-full bg-red-600/90 text-white hover:bg-red-700/90 transition-all shadow-lg"
                      title="Delete restaurant (Admin only)"
                    >
                      {deletingRestaurant === restaurant.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  )}
                  {isAdmin && !readOnlyMode && (
                    <button
                      onClick={async () => {
                        const target = !restaurant.metadata?.vegOnly;
                        try {
                          const res = await fetch('/api/restaurants/veg-only', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ restaurantId: restaurant.id, vegOnly: target })
                          });
                          if (res.ok) {
                            setRestaurants(prev => prev.map(r => r.id === restaurant.id ? { ...r, metadata: { ...(r.metadata || {}), vegOnly: target } } : r));
                            showToast(target ? 'Marked as veg-only' : 'Veg-only removed', 'success');
                          } else {
                            const err = await res.json();
                            showToast(err.error || 'Failed to update veg-only', 'error');
                          }
                        } catch (e) {
                          console.error(e);
                          showToast('Failed to update veg-only', 'error');
                        }
                      }}
                      className={`${restaurant.metadata?.vegOnly ? 'bg-green-600/90 hover:bg-green-700/90 text-white' : 'bg-gray-600/70 hover:bg-gray-700/70 text-white'} p-2 rounded-full transition-all shadow-lg`}
                      title={restaurant.metadata?.vegOnly ? 'Veg-only enabled (click to disable)' : 'Mark as veg-only'}
                    >
                      <Leaf size={16} />
                    </button>
                  )}
                  {!readOnlyMode && currentUser && (
                    <button
                      onClick={async () => {
                        setTogglingEatlist(restaurant.id);
                        try {
                          const method = restaurant.isInEatlist ? 'DELETE' : 'POST';
                          const res = await fetch('/api/restaurant-eatlist', {
                            method,
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: currentUser.id, restaurantId: restaurant.id })
                          });
                          if (res.ok) {
                            setRestaurants(prev => prev.map(r => r.id === restaurant.id ? { ...r, isInEatlist: !restaurant.isInEatlist } : r));
                          } else {
                            const err = await res.json();
                            showToast(err.error || 'Failed to toggle eatlist', 'error');
                          }
                        } catch (e) {
                          console.error('Eatlist toggle failed', e);
                          showToast('Failed to toggle eatlist', 'error');
                        } finally {
                          setTogglingEatlist(null);
                        }
                      }}
                      disabled={togglingEatlist === restaurant.id}
                      className={`p-2 rounded-full ${restaurant.isInEatlist ? 'bg-blue-600/90 hover:bg-blue-700/90 text-white' : 'bg-gray-600/70 hover:bg-gray-700/70 text-white'} transition-all shadow-lg`}
                      title={restaurant.isInEatlist ? 'Remove from Eat List' : 'Add to Eat List'}
                    >
                      <Eye size={16} />
                    </button>
                  )}
                </div>
                {imageWithCacheBust ? (
                  <Image
                    src={imageWithCacheBust}
                    alt={restaurant.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                    key={`${restaurant.id}-${refreshTimestamp || 'default'}`} // Force re-render on refresh
                    unoptimized={imageWithCacheBust.includes('v=')} // Disable Next.js optimization for cache-busted images
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-600">
                      <Utensils size={20} className="mx-auto mb-1" />
                      <div className="text-xs font-medium">{restaurant.cuisine || 'Restaurant'}</div>
                    </div>
                  </div>
                )}
              </div>

            {/* Two-Column Layout */}
            <div className="p-2 flex gap-2">
              
              {/* Left Section - Restaurant Details */}
              <div className="flex-1 min-w-0">
                {/* Restaurant Name & Location */}
                <div className="mb-1">
                  {/* Restaurant Name - Clickable if Google Maps URL exists */}
                  {restaurant.googleMapsUrl ? (
                    <a
                      href={restaurant.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-gray-900 hover:text-blue-600 text-sm leading-tight line-clamp-2 cursor-pointer transition-colors block"
                      title={`View ${restaurant.name} on Google Maps`}
                    >
                      {restaurant.name}
                    </a>
                  ) : (
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 break-words">
                      {restaurant.name}
                    </h3>
                  )}
                  
                  {/* Location Display */}
                  {getDisplayAddress(restaurant) && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin size={8} className="text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-500 truncate max-w-full">
                        {getDisplayAddress(restaurant)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Added by */}
                <div className="flex items-center gap-1 mb-2 text-xs text-blue-600 min-w-0">
                  <User size={10} className="flex-shrink-0" />
                  <span className="text-gray-600">by</span>
                  <span className="truncate font-medium bg-blue-50 px-2 py-1 rounded">
                    {restaurant.addedBy ? restaurant.addedBy.name : 'System'}
                  </span>
                </div>

                {/* Cuisine */}
                {restaurant.cuisine && (
                  <div className="text-xs bg-gray-100 px-2 py-1 rounded mb-2 inline-block max-w-full truncate">
                    {restaurant.cuisine}
                  </div>
                )}

                {/* User Ratings - show NA globally if marked */}
                <div className="space-y-1">
                  {(
                    restaurant.globalVegAvailability === 'NOT_AVAILABLE' ||
                    restaurant.userVegRating ||
                    restaurant.userVegAvailability === 'NOT_AVAILABLE'
                  ) && (
                    <div className="flex items-center gap-1 text-xs">
                      <Leaf className="text-green-600" size={10} />
                      <span className="text-green-700 text-xs">
                        Veg: {
                          restaurant.globalVegAvailability === 'NOT_AVAILABLE' || restaurant.userVegAvailability === 'NOT_AVAILABLE'
                            ? 'N/A'
                            : (restaurant.userVegRating ? getRatingDisplay(restaurant.userVegRating) : 'NR')
                        }
                      </span>
                    </div>
                  )}
                  {(
                    restaurant.globalNonVegAvailability === 'NOT_AVAILABLE' ||
                    restaurant.userNonVegRating ||
                    restaurant.userNonVegAvailability === 'NOT_AVAILABLE'
                  ) && (
                    <div className="flex items-center gap-1 text-xs">
                      <Utensils className="text-red-600" size={10} />
                      <span className="text-red-700 text-xs">
                        Non-Veg: {
                          restaurant.globalNonVegAvailability === 'NOT_AVAILABLE' || restaurant.userNonVegAvailability === 'NOT_AVAILABLE'
                            ? 'N/A'
                            : (restaurant.userNonVegRating ? getRatingDisplay(restaurant.userNonVegRating) : 'NR')
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Section - Actions and Stats */}
              <div className="flex flex-col items-end justify-between gap-2 flex-shrink-0 w-20">
                {/* Rating Button - Separate with Text */}
                {!readOnlyMode && currentUser && (
                  <button
                    onClick={() => setRatingModal({ restaurantId: restaurant.id, restaurantName: restaurant.name })}
                    className="px-2 py-1 text-xs bg-green-50 border border-green-200 text-green-700 rounded hover:bg-green-100 transition-colors w-full"
                    title="Rate restaurant"
                  >
                    Rate
                  </button>
                )}

                {/* Action buttons */}
                <div className="flex gap-1 justify-center w-full">
                  {/* Review Button */}
                  {readOnlyMode ? (
                    <div
                      className="p-1 text-gray-400 cursor-not-allowed"
                      title="Sign in to add reviews"
                    >
                      <MessageSquare size={16} />
                    </div>
                  ) : (
                    <button 
                      onClick={() => setAddReviewModal({ restaurantId: restaurant.id, restaurantName: restaurant.name })}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Add review"
                    >
                      <MessageSquare size={16} />
                    </button>
                  )}

                  {/* Info Button - Show Reviews and Ratings */}
                  <button 
                    onClick={() => setActiveReviews({ restaurantId: restaurant.id, restaurantName: restaurant.name })}
                    className="p-1 text-gray-400 hover:text-indigo-600"
                    title="Show user reviews and ratings"
                  >
                    <Info size={16} />
                  </button>

                  {/* Share Button */}
                  <button 
                    onClick={() => shareRestaurant(restaurant)}
                    className="p-1 text-gray-400 hover:text-green-600"
                    title="Copy restaurant details"
                  >
                    <Share2 size={16} />
                  </button>

                  {/* Eatlist toggle removed from action row (moved to top overlay) */}

                  {/* Admin Image Management */}
                  {isAdmin && (
                    <button
                      onClick={() => setImageManager({ restaurantId: restaurant.id, restaurantName: restaurant.name })}
                      className="p-1 text-gray-400 hover:text-purple-600"
                      title="Manage restaurant images (Admin only)"
                    >
                      <ImageIcon size={16} />
                    </button>
                  )}

                  {/* Admin Veg-only toggle */}
                  {isAdmin && (
                    <button
                      onClick={async () => {
                        const target = !restaurant.metadata?.vegOnly;
                        try {
                          const res = await fetch('/api/restaurants/veg-only', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ restaurantId: restaurant.id, vegOnly: target })
                          });
                          if (res.ok) {
                            await res.json();
                            setRestaurants(prev => prev.map(r => r.id === restaurant.id ? { ...r, metadata: { ...(r.metadata || {}), vegOnly: target } } : r));
                            showToast(target ? 'Marked as veg-only' : 'Veg-only removed', 'success');
                          } else {
                            const err = await res.json();
                            showToast(err.error || 'Failed to update veg-only', 'error');
                          }
                        } catch (e) {
                          console.error(e);
                          showToast('Failed to update veg-only', 'error');
                        }
                      }}
                      className={`p-1 ${restaurant.metadata?.vegOnly ? 'text-green-700 hover:text-green-800' : 'text-gray-400 hover:text-green-600'}`}
                      title={restaurant.metadata?.vegOnly ? 'Veg-only enabled (click to disable)' : 'Mark as veg-only'}
                    >
                      <Leaf size={16} />
                    </button>
                  )}

                  {/* Admin Delete duplicated in overlay; keeping action row clean */}
                </div>
                
                {/* Rating and Review counts */}
                <div className="flex items-center gap-2 text-xs text-gray-500 justify-center w-full">
                  <div className="flex items-center gap-1">
                    <Star size={10} className="text-yellow-500" />
                    <span>{restaurant.ratingsCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare size={10} className="text-blue-500" />
                    <span>{restaurant.reviewsCount}</span>
                  </div>
                </div>
              </div>
            </div>



            {/* Friend Scores Section - Compact */}
            <div className="p-2 bg-gray-50 border-t">
              <div className={`grid ${restaurant.metadata?.vegOnly ? 'grid-cols-1' : 'grid-cols-2'} gap-1`}>
                <Scorecard 
                  score={restaurant.globalVegAvailability === 'NOT_AVAILABLE' ? null : restaurant.aggregateVegScore} 
                  label="FRIEND VEG"
                  compact={true}
                />
                {!restaurant.metadata?.vegOnly && (
                  <Scorecard 
                    score={restaurant.globalNonVegAvailability === 'NOT_AVAILABLE' ? null : restaurant.aggregateNonVegScore} 
                    label="FRIEND NON-VEG"
                    compact={true}
                  />
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Add Restaurant Review Modal */}
      {addReviewModal && currentUser && (
        <AddRestaurantReviewModal
          restaurantId={addReviewModal.restaurantId}
          restaurantName={addReviewModal.restaurantName}
          userId={currentUser.id}
          onClose={() => setAddReviewModal(null)}
          onReviewAdded={() => {
            fetchRestaurantData(); // Refresh to show new review count
          }}
        />
      )}

      {/* Restaurant Reviews and Ratings Modal */}
      {activeReviews && (
        <RestaurantReviewsModal
          restaurantId={activeReviews.restaurantId}
          restaurantName={activeReviews.restaurantName}
          currentUserId={readOnlyMode ? undefined : currentUser?.id}
          onClose={() => setActiveReviews(null)}
          onReviewDeleted={() => {
            // Optimistically update the UI immediately
            setRestaurants(restaurants.map(r => 
              r.id === activeReviews.restaurantId 
                ? { 
                    ...r, 
                    reviewsCount: r.reviewsCount - 1 
                  }
                : r
            ));
            
            // Refresh restaurant data after a short delay to ensure DB is updated
            setTimeout(() => {
              fetchRestaurantData();
            }, 500);
          }}
        />
      )}

      {/* Rating Modal */}
      {ratingModal && (
        <RestaurantRatingModal
          restaurantId={ratingModal.restaurantId}
          restaurantName={ratingModal.restaurantName}
          onClose={() => setRatingModal(null)}
          onRatingUpdate={handleRatingUpdate}
          initialVegRating={restaurants.find(r => r.id === ratingModal.restaurantId)?.userVegRating}
          initialNonVegRating={restaurants.find(r => r.id === ratingModal.restaurantId)?.userNonVegRating}
          initialVegAvailability={restaurants.find(r => r.id === ratingModal.restaurantId)?.userVegAvailability}
          initialNonVegAvailability={restaurants.find(r => r.id === ratingModal.restaurantId)?.userNonVegAvailability}
          hideNonVeg={restaurants.find(r => r.id === ratingModal.restaurantId)?.metadata?.vegOnly === true}
        />
      )}

      {/* Image Manager Modal */}
      {imageManager && (
        <RestaurantImageManager
          restaurantId={imageManager.restaurantId}
          restaurantName={imageManager.restaurantName}
          onClose={() => setImageManager(null)}
          onImagesUpdated={() => {
            fetchRestaurantData(); // Refresh to show updated images
          }}
        />
      )}
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useUser } from '@/context/user-context';
import { useToast } from '@/context/toast-context';
import { Search, MapPin, Star, DollarSign, Clock, Plus, ExternalLink, Utensils, X, ChevronDown } from 'lucide-react';
import { trimCountryFromAddress } from '@/lib/address-utils';
import Image from 'next/image';

interface GooglePlacesRestaurant {
  googlePlaceId: string;
  name: string;
  address: string;
  cuisine: string;
  rating?: number;
  priceLevel?: number;
  coordinates: {
    lat: number;
    lng: number;
  };
  isOpen?: boolean;
  website?: string;
  phone?: string;
  description: string;
  photos: string[];
  businessStatus?: string;
  userRatingsTotal?: number;
  googleMapsUrl: string;
}

interface GooglePlacesSearchProps {
  onRestaurantAdded: () => void;
}

export default function GooglePlacesRestaurantSearch({ onRestaurantAdded }: GooglePlacesSearchProps) {
  const { currentUser } = useUser();
  const { showToast } = useToast();
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GooglePlacesRestaurant[]>([]);
  const [addingRestaurant, setAddingRestaurant] = useState<string | null>(null);
  // Per-result veg-only selections
  const [vegOnlySelection, setVegOnlySelection] = useState<Record<string, boolean>>({});
  const [searchParams, setSearchParams] = useState({
    query: '',
    location: '',
    radius: '5000',
    minPrice: '',
    maxPrice: '',
    openNow: false,
    vegOnly: false
  });

  // Extract location (city/area) from full address
  const extractLocationFromAddress = (address: string): string => {
    if (!address) return '';
    
    // Split address by commas and get relevant parts
    const parts = address.split(',').map(part => part.trim());
    
    // For US addresses: "Street, City, State ZIP" -> return "City, State"
    // For other formats: try to get the second-to-last and last meaningful parts
    if (parts.length >= 3) {
      // Remove ZIP codes and country names from the end
      const filteredParts = parts.filter(part => 
        !part.match(/^\d{5}(-\d{4})?$/) && // US ZIP codes
        !part.match(/^[A-Z]{2}$/) && // US state codes
        part.toLowerCase() !== 'usa' &&
        part.toLowerCase() !== 'united states'
      );
      
      if (filteredParts.length >= 2) {
        // Take the last two meaningful parts (usually City, State/Province)
        return filteredParts.slice(-2).join(', ');
      } else if (filteredParts.length === 1) {
        return filteredParts[0];
      }
    }
    
    // Fallback: return the first part if we can't extract properly
    return parts[0] || '';
  };

  // Get user's location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setSearchParams(prev => ({
            ...prev,
            location: `${latitude},${longitude}`
          }));
          showToast('Location updated!', 'success');
        },
        (error) => {
          console.error('Error getting location:', error);
          showToast('Could not get your location. Please enter manually.', 'error');
        }
      );
    } else {
      showToast('Geolocation is not supported by this browser.', 'error');
    }
  };

  // Search restaurants using Google Places API
  const searchRestaurants = async () => {
    if (!searchParams.query && !searchParams.location) {
      showToast('Please enter a search query or location', 'error');
      return;
    }

    setIsSearching(true);
    try {
      const urlParams = new URLSearchParams();
      
      if (searchParams.query) urlParams.append('query', searchParams.query);
      if (searchParams.location) urlParams.append('location', searchParams.location);
      if (searchParams.radius) urlParams.append('radius', searchParams.radius);
      if (searchParams.minPrice) urlParams.append('minprice', searchParams.minPrice);
      if (searchParams.maxPrice) urlParams.append('maxprice', searchParams.maxPrice);
      if (searchParams.openNow) urlParams.append('open_now', 'true');

      const response = await fetch(`/api/restaurants/search-google-places?${urlParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to search restaurants');
      }

      const data = await response.json();
      setSearchResults(data.results || []);
      
      if (data.results.length === 0) {
        showToast('No restaurants found. Try a different search.', 'info');
      } else {
        showToast(`Found ${data.results.length} restaurants!`, 'success');
      }
    } catch (error) {
      console.error('Search error:', error);
      showToast('Failed to search restaurants. Please try again.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // Add restaurant to database
  const addRestaurant = async (restaurant: GooglePlacesRestaurant) => {
    if (!currentUser) {
      showToast('You must be logged in to add restaurants', 'error');
      return;
    }

    setAddingRestaurant(restaurant.googlePlaceId);
    try {
      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: restaurant.name,
          address: restaurant.address,
          location: extractLocationFromAddress(restaurant.address),
          cuisine: restaurant.cuisine,
          description: restaurant.description,
          googleMapsUrl: restaurant.googleMapsUrl,
          googlePlaceId: restaurant.googlePlaceId,
          userId: currentUser.id, // Add user ID for proper attribution
          // Store additional Google Places data in metadata
          metadata: {
            rating: restaurant.rating,
            priceLevel: restaurant.priceLevel,
            coordinates: restaurant.coordinates,
            website: restaurant.website,
            phone: restaurant.phone,
            photos: restaurant.photos.slice(0, 3), // Limit to 3 photos
            businessStatus: restaurant.businessStatus,
            userRatingsTotal: restaurant.userRatingsTotal,
            vicinity: restaurant.address, // Store vicinity for location fallback
            formatted_address: restaurant.address,
            // Prefer per-card selection; fallback to the global checkbox in filters
            vegOnly: vegOnlySelection[restaurant.googlePlaceId] ?? searchParams.vegOnly
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add restaurant');
      }

      showToast('Restaurant added successfully!', 'success');
      onRestaurantAdded();
      
      // Remove from search results
      setSearchResults(prev => prev.filter(r => r.googlePlaceId !== restaurant.googlePlaceId));
      // Clean up any tracked selection
      setVegOnlySelection(prev => {
        const clone = { ...prev };
        delete clone[restaurant.googlePlaceId];
        return clone;
      });
      
    } catch (error) {
      console.error('Add restaurant error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to add restaurant', 'error');
    } finally {
      setAddingRestaurant(null);
    }
  };

  // Get price level display
  const getPriceLevelDisplay = (level?: number) => {
    if (level === undefined || level === null) return 'N/A';
    return '$'.repeat(Math.max(1, level));
  };

  // Get rating stars
  const getRatingStars = (rating?: number) => {
    if (!rating) return 'No rating';
    return (
      <span className="inline-flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={12}
            className={i < Math.floor(rating) ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}
          />
        ))}
        <span className="ml-1">({rating.toFixed(1)})</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-white rounded-3xl border border-stone-200/70 shadow-soft p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-brand" />
          <h2 className="section-title text-xl">Search Restaurants</h2>
          <span className="text-sm text-stone-500">(Google Places)</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Search Query */}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Restaurant or Food Type
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                placeholder="e.g., Pizza, Sushi, Italian restaurant"
                value={searchParams.query}
                onChange={(e) => setSearchParams(prev => ({ ...prev, query: e.target.value }))}
                className="input-modern w-full pl-10 pr-10"
              />
              {searchParams.query && (
                <button
                  type="button"
                  onClick={() => setSearchParams(prev => ({ ...prev, query: '' }))}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Location
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="City, State or Address"
                  value={searchParams.location}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, location: e.target.value }))}
                  className="input-modern w-full pr-10"
                />
                {searchParams.location && (
                  <button
                    type="button"
                    onClick={() => setSearchParams(prev => ({ ...prev, location: '' }))}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={getCurrentLocation}
                className="btn-primary px-4! flex items-center gap-1 shrink-0"
                title="Use current location"
              >
                <MapPin className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          {/* Radius */}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Radius
            </label>
            <div className="relative">
            <select
              value={searchParams.radius}
              onChange={(e) => setSearchParams(prev => ({ ...prev, radius: e.target.value }))}
              className="input-modern w-full appearance-none pr-10"
            >
              <option value="1000">1 km</option>
              <option value="5000">5 km</option>
              <option value="10000">10 km</option>
              <option value="25000">25 km</option>
              <option value="50000">50 km</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>
          </div>

          {/* Min Price */}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Min Price
            </label>
            <div className="relative">
            <select
              value={searchParams.minPrice}
              onChange={(e) => setSearchParams(prev => ({ ...prev, minPrice: e.target.value }))}
              className="input-modern w-full appearance-none pr-10"
            >
              <option value="">Any</option>
              <option value="0">Free</option>
              <option value="1">$ (Inexpensive)</option>
              <option value="2">$$ (Moderate)</option>
              <option value="3">$$$ (Expensive)</option>
              <option value="4">$$$$ (Very Expensive)</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>
          </div>

          {/* Max Price */}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Max Price
            </label>
            <div className="relative">
            <select
              value={searchParams.maxPrice}
              onChange={(e) => setSearchParams(prev => ({ ...prev, maxPrice: e.target.value }))}
              className="input-modern w-full appearance-none pr-10"
            >
              <option value="">Any</option>
              <option value="0">Free</option>
              <option value="1">$ (Inexpensive)</option>
              <option value="2">$$ (Moderate)</option>
              <option value="3">$$$ (Expensive)</option>
              <option value="4">$$$$ (Very Expensive)</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>
          </div>

          {/* Open Now */}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Open Now
            </label>
            <div className="flex items-center h-10">
              <input
                type="checkbox"
                checked={searchParams.openNow}
                onChange={(e) => setSearchParams(prev => ({ ...prev, openNow: e.target.checked }))}
                className="w-4 h-4 accent-brand"
              />
              <label className="ml-2 text-sm text-stone-600">Only open restaurants</label>
            </div>
          </div>

          {/* Veg only flag (applies when adding) */}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Dietary Preference
            </label>
            <div className="flex items-center h-10">
              <input
                type="checkbox"
                checked={searchParams.vegOnly}
                onChange={(e) => setSearchParams(prev => ({ ...prev, vegOnly: e.target.checked }))}
                className="w-4 h-4 accent-brand"
              />
              <label className="ml-2 text-sm text-stone-600">Veg only (hide non-veg ratings)</label>
            </div>
          </div>
        </div>

        {/* Search Button */}
        <button
          onClick={searchRestaurants}
          disabled={isSearching}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {isSearching ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Search Restaurants
            </>
          )}
        </button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-3xl border border-stone-200/70 shadow-soft p-6">
          <h3 className="section-title text-lg mb-4">
            Search Results ({searchResults.length})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((restaurant) => (
              <div key={restaurant.googlePlaceId} className="card p-4">
                {/* Restaurant Photo */}
                {restaurant.photos.length > 0 && (
                  <div className="relative w-full h-32 mb-3 bg-stone-100 rounded-xl overflow-hidden">
                    <Image
                      src={restaurant.photos[0]}
                      alt={restaurant.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}

                {/* Restaurant Info */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-ink text-sm">{restaurant.name}</h4>
                  
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Utensils className="w-3 h-3" />
                    <span>{restaurant.cuisine}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <MapPin className="w-3 h-3" />
                    <span className="line-clamp-1">{trimCountryFromAddress(restaurant.address)}</span>
                  </div>

                  {restaurant.rating && (
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{getRatingStars(restaurant.rating)}</span>
                      {restaurant.userRatingsTotal && (
                        <span>({restaurant.userRatingsTotal} reviews)</span>
                      )}
                    </div>
                  )}

                  {restaurant.priceLevel !== undefined && (
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <DollarSign className="w-3 h-3" />
                      <span>{getPriceLevelDisplay(restaurant.priceLevel)}</span>
                    </div>
                  )}

                  {restaurant.isOpen !== undefined && (
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="w-3 h-3" />
                      <span className={restaurant.isOpen ? 'text-green-600' : 'text-red-600'}>
                        {restaurant.isOpen ? 'Open Now' : 'Closed'}
                      </span>
                    </div>
                  )}

                  {/* Veg-only per result */}
                  <div className="flex items-center gap-2 pt-2">
                    <label className="flex items-center gap-2 text-xs text-stone-600">
                      <input
                        type="checkbox"
                        checked={!!vegOnlySelection[restaurant.googlePlaceId]}
                        onChange={(e) => setVegOnlySelection(prev => ({ ...prev, [restaurant.googlePlaceId]: e.target.checked }))}
                        className="w-4 h-4 accent-brand"
                      />
                      Veg only
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => addRestaurant(restaurant)}
                      disabled={addingRestaurant === restaurant.googlePlaceId}
                      className="flex-1 bg-brand text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-all"
                    >
                      {addingRestaurant === restaurant.googlePlaceId ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          Add
                        </>
                      )}
                    </button>
                    
                    <a
                      href={restaurant.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 border border-stone-300 rounded-full text-xs font-medium text-stone-600 hover:bg-stone-50 flex items-center justify-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Maps
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
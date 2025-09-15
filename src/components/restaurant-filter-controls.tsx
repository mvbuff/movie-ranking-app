'use client';

import { X, Search, MapPin, Utensils, Leaf, Filter, Loader2 } from 'lucide-react';
import { useDebounceArray } from '@/hooks/useDebounce';

export type DietaryFilter = 'ALL' | 'VEG_ONLY' | 'NON_VEG_ONLY' | 'EATLIST';
export type RestaurantSortKey = 'aggregateScore' | 'addedDate' | 'name' | 'vegRating' | 'nonVegRating';

interface RestaurantFilterControlsProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  cuisineFilter: string;
  onCuisineFilterChange: (cuisine: string) => void;
  locationFilter: string;
  onLocationFilterChange: (location: string) => void;
  dietaryFilter: DietaryFilter;
  onDietaryFilterChange: (filter: DietaryFilter) => void;
  sortBy: RestaurantSortKey;
  onSortChange: (key: RestaurantSortKey) => void;
  readOnlyMode?: boolean;
  vegScoreThreshold: number;
  onVegScoreThresholdChange: (threshold: number) => void;
  nonVegScoreThreshold: number;
  onNonVegScoreThresholdChange: (threshold: number) => void;
  ignoreNonVegForVeg: boolean;
  onIgnoreNonVegForVegChange: (ignore: boolean) => void;
  ignoreVegForNonVeg: boolean;
  onIgnoreVegForNonVegChange: (ignore: boolean) => void;
}

// Available cuisine options (matching the restaurant-search component)
const cuisineOptions = [
  'Indian', 'Chinese', 'Italian', 'Mexican', 'Thai', 'Japanese', 'American', 
  'Mediterranean', 'French', 'Korean', 'Vietnamese', 'Lebanese', 'Turkish',
  'Brazilian', 'Greek', 'Spanish', 'Ethiopian', 'Moroccan', 'Other'
];

const dietaryOptions = [
  { id: 'ALL' as const, name: 'All Restaurants', icon: '🍽️' },
  { id: 'VEG_ONLY' as const, name: 'Veg Available Only', icon: '🌱' },
  { id: 'NON_VEG_ONLY' as const, name: 'Non-Veg Available Only', icon: '🍖' },
  { id: 'EATLIST' as const, name: 'Eat List', icon: '📝' },
];

export default function RestaurantFilterControls({
  searchTerm,
  onSearchChange,
  cuisineFilter,
  onCuisineFilterChange,
  locationFilter,
  onLocationFilterChange,
  dietaryFilter,
  onDietaryFilterChange,
  sortBy,
  onSortChange,
  readOnlyMode = false,
  vegScoreThreshold,
  onVegScoreThresholdChange,
  nonVegScoreThreshold,
  onNonVegScoreThresholdChange,
  ignoreNonVegForVeg,
  onIgnoreNonVegForVegChange,
  ignoreVegForNonVeg,
  onIgnoreVegForNonVegChange,
}: RestaurantFilterControlsProps) {
  // Check if any values are currently being debounced
  const [currentSearch, debouncedSearch] = useDebounceArray(searchTerm, 300);
  const [currentLocation, debouncedLocation] = useDebounceArray(locationFilter, 300);
  const [currentVegScore, debouncedVegScore] = useDebounceArray(vegScoreThreshold, 500);
  const [currentNonVegScore, debouncedNonVegScore] = useDebounceArray(nonVegScoreThreshold, 500);
  
  const isSearching = currentSearch !== debouncedSearch || 
                     currentLocation !== debouncedLocation || 
                     currentVegScore !== debouncedVegScore || 
                     currentNonVegScore !== debouncedNonVegScore;
  return (
    <div className="w-full bg-white rounded-lg shadow-sm border p-6">
      {readOnlyMode && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-800 text-sm">
            🔒 You&apos;re viewing in read-only mode. Sign in to add restaurants and rate them.
          </p>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Search Bar */}
        <div>
          <label htmlFor="restaurant-search" className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              {isSearching ? (
                <Loader2 size={16} className="animate-spin text-blue-500" />
              ) : (
                <Search size={16} />
              )}
              Search Restaurants
              {isSearching && <span className="text-xs text-blue-500">(updating...)</span>}
            </div>
          </label>
          <div className="relative">
            <input
              id="restaurant-search"
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name, cuisine, location, address..."
              className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Dietary Filter Pills */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <div className="flex items-center gap-2">
              <Filter size={16} />
              Dietary Preferences
            </div>
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {dietaryOptions.map(({ id, name, icon }) => (
              <button
                key={id}
                onClick={() => onDietaryFilterChange(id)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  dietaryFilter === id
                    ? id === 'VEG_ONLY'
                      ? 'bg-green-600 text-white shadow'
                      : id === 'NON_VEG_ONLY'
                      ? 'bg-red-600 text-white shadow'
                      : 'bg-gray-600 text-white shadow'
                    : id === 'VEG_ONLY'
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : id === 'NON_VEG_ONLY'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {icon} {name}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Cuisine Filter */}
          <div>
            <label htmlFor="cuisine-filter" className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Utensils size={16} />
                Cuisine Type
              </div>
            </label>
            <select
              id="cuisine-filter"
              value={cuisineFilter}
              onChange={(e) => onCuisineFilterChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">All Cuisines</option>
              {cuisineOptions.map(cuisine => (
                <option key={cuisine} value={cuisine}>{cuisine}</option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label htmlFor="location-filter" className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                Location
              </div>
            </label>
            <div className="relative">
              <input
                id="location-filter"
                type="text"
                value={locationFilter}
                onChange={(e) => onLocationFilterChange(e.target.value)}
                placeholder="Filter by location..."
                className="w-full p-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              {locationFilter && (
                <button
                  onClick={() => onLocationFilterChange('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear location filter"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Sort By */}
          <div>
            <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-2">
              📊 Sort By
            </label>
            <select 
              id="sort-by"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as RestaurantSortKey)}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="aggregateScore">{readOnlyMode ? 'Community Score' : 'Friend Score'}</option>
              <option value="vegRating">Veg Rating</option>
              <option value="nonVegRating">Non-Veg Rating</option>
              <option value="name">Name (A-Z)</option>
              <option value="addedDate">Recently Added</option>
            </select>
          </div>

          {/* Clear All Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                onSearchChange('');
                onCuisineFilterChange('');
                onLocationFilterChange('');
                onDietaryFilterChange('ALL');
                onVegScoreThresholdChange(3);
                onNonVegScoreThresholdChange(3);
                onIgnoreNonVegForVegChange(false);
                onIgnoreVegForNonVegChange(false);
              }}
              className="w-full p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Score Thresholds */}
        {!readOnlyMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            {/* Veg Score Threshold */}
            <div>
              <label htmlFor="veg-score-threshold" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Leaf className="text-green-600" size={16} />
                  Min. Veg Score: {vegScoreThreshold}/10
                  {currentVegScore !== debouncedVegScore && (
                    <Loader2 size={12} className="animate-spin text-blue-500" />
                  )}
                </div>
              </label>
              <input
                id="veg-score-threshold"
                type="range"
                min="3"
                max="10"
                step="1"
                value={vegScoreThreshold}
                onChange={(e) => onVegScoreThresholdChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-green-100 rounded-lg appearance-none cursor-pointer slider-green"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>3</span>
                <span>10</span>
              </div>
              
              {/* Ignore Non-Veg Ratings Checkbox */}
              <div className="flex items-center gap-2 mt-2">
                <input
                  id="ignore-nonveg-for-veg"
                  type="checkbox"
                  checked={ignoreNonVegForVeg}
                  onChange={(e) => onIgnoreNonVegForVegChange(e.target.checked)}
                  className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="ignore-nonveg-for-veg" className="text-xs text-gray-600">
                  Ignore non-veg ratings when filtering veg options
                </label>
              </div>
            </div>

            {/* Non-Veg Score Threshold */}
            <div>
              <label htmlFor="nonveg-score-threshold" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Utensils className="text-red-600" size={16} />
                  Min. Non-Veg Score: {nonVegScoreThreshold}/10
                  {currentNonVegScore !== debouncedNonVegScore && (
                    <Loader2 size={12} className="animate-spin text-blue-500" />
                  )}
                </div>
              </label>
              <input
                id="nonveg-score-threshold"
                type="range"
                min="3"
                max="10"
                step="1"
                value={nonVegScoreThreshold}
                onChange={(e) => onNonVegScoreThresholdChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-red-100 rounded-lg appearance-none cursor-pointer slider-red"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>3</span>
                <span>10</span>
              </div>
              
              {/* Ignore Veg Ratings Checkbox */}
              <div className="flex items-center gap-2 mt-2">
                <input
                  id="ignore-veg-for-nonveg"
                  type="checkbox"
                  checked={ignoreVegForNonVeg}
                  onChange={(e) => onIgnoreVegForNonVegChange(e.target.checked)}
                  className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="ignore-veg-for-nonveg" className="text-xs text-gray-600">
                  Ignore veg ratings when filtering non-veg options
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .slider-green::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #059669;
          cursor: pointer;
        }
        .slider-red::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #dc2626;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
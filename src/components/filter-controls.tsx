'use client';
import { SLIDER_RATING_SCALE } from '@/lib/rating-system';
import { X, Activity } from 'lucide-react';

// Manually define the Category type for client-side use
export type Category = 'MOVIE' | 'SERIES' | 'DOCUMENTARY';
type FilterCategory = Category | 'ALL' | 'WATCHLIST' | 'YET_TO_RATE';
export type SortKey = 'aggregateScore' | 'currentUserRating' | 'title' | 'addedDate' | 'addedDateThenScore';

interface FilterControlsProps {
  activeCategory: FilterCategory;
  onCategoryChange: (category: FilterCategory) => void;
  scoreThreshold: number;
  onScoreThresholdChange: (threshold: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  reviewSearchTerm: string;
  onReviewSearchChange: (term: string) => void;
  sortBy: SortKey;
  onSortChange: (key: SortKey) => void;
  readOnlyMode?: boolean;
  setShowActivityPopup?: (show: boolean) => void;
}

const categories: { id: FilterCategory; name: string }[] = [
  { id: 'ALL', name: 'All' },
  { id: 'MOVIE', name: 'Movies' },
  { id: 'SERIES', name: 'Series' },
  { id: 'DOCUMENTARY', name: 'Documentaries' },
  { id: 'WATCHLIST', name: 'Watchlist' },
  { id: 'YET_TO_RATE', name: 'Yet to rate' },
];

export default function FilterControls({
  activeCategory,
  onCategoryChange,
  scoreThreshold,
  onScoreThresholdChange,
  searchTerm,
  onSearchChange,
  reviewSearchTerm,
  onReviewSearchChange,
  sortBy,
  onSortChange,
  readOnlyMode = false,
  setShowActivityPopup,
}: FilterControlsProps) {
  // Filter out watchlist and yet-to-rate for non-authenticated users
  const availableCategories = readOnlyMode 
    ? categories.filter(cat => cat.id !== 'WATCHLIST' && cat.id !== 'YET_TO_RATE')
    : categories;

  return (
    <div className="w-full max-w-7xl mx-auto my-8 p-4 bg-white rounded-lg shadow-sm border">
      {readOnlyMode && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-800 text-sm">
            🔒 You&apos;re viewing in read-only mode. Sign in to add movies, rate, and create your watchlist.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Filters */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Filter by Category
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {availableCategories.map(({ id, name }) => (
              <button
                key={id}
                onClick={() => onCategoryChange(id)}
                className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                  activeCategory === id
                    ? id === 'YET_TO_RATE'
                      ? 'bg-orange-600 text-white shadow'
                      : id === 'WATCHLIST'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-indigo-600 text-white shadow'
                    : id === 'YET_TO_RATE'
                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    : id === 'WATCHLIST'
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {id === 'YET_TO_RATE' ? '⭐ ' : ''}{name}
              </button>
            ))}
          </div>
        </div>

        {/* Score Threshold Filter */}
        <div className="space-y-2">
          <label htmlFor="score-threshold" className="block text-sm font-medium text-gray-700">
            Min. {readOnlyMode ? 'Community' : 'Friend'} Score ({SLIDER_RATING_SCALE.find(s => s.score === scoreThreshold)?.display || 'N/A'})
          </label>
          <input
            id="score-threshold"
            type="range"
            min="3"
            max="10"
            step="1"
            value={scoreThreshold}
            onChange={(e) => onScoreThresholdChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-center gap-4 mt-4 pt-4 border-t">
        {/* Search Movies */}
        <div className="w-full">
          <label htmlFor="search-movies" className="block text-sm font-medium text-gray-700 mb-2">
            🎬 Search Movies
          </label>
          <div className="relative">
            <input
              id="search-movies"
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by movie title..."
              className="w-full p-2 pr-8 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        
        {/* Search Reviews */}
        <div className="w-full">
          <label htmlFor="search-reviews" className="block text-sm font-medium text-gray-700 mb-2">
            💬 Search in Reviews
          </label>
          <div className="relative">
            <input
              id="search-reviews"
              type="text"
              value={reviewSearchTerm}
              onChange={(e) => onReviewSearchChange(e.target.value)}
              placeholder="Search review content..."
              className="w-full p-2 pr-8 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            {reviewSearchTerm && (
              <button
                onClick={() => onReviewSearchChange('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        
        {/* Sort by */}
        <div className="w-full">
          <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-2">
            📊 Sort By
          </label>
          <select 
            id="sort-by"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="w-full p-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="aggregateScore">{readOnlyMode ? 'Community Score' : 'Friend Score'}</option>
            <option value="currentUserRating">Your Rating</option>
            <option value="title">Alphabetical</option>
            <option value="addedDate">Added Date</option>
            <option value="addedDateThenScore">Added Date then by Score</option>
          </select>
        </div>

        {/* Recent Updates Button */}
        {!readOnlyMode && setShowActivityPopup && (
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔔 Community
            </label>
            <button
              onClick={() => setShowActivityPopup(true)}
              className="w-full p-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-md font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm"
            >
              <Activity size={14} />
              Recent Updates
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 
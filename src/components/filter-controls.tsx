'use client';
import { SLIDER_RATING_SCALE } from '@/lib/rating-system';
import { X, Activity, Search, Lock, Star, Clapperboard, MessageSquareText, BarChart3, Bell, ChevronDown } from 'lucide-react';

// Manually define the Category type for client-side use
export type Category = 'MOVIE' | 'SERIES' | 'DOCUMENTARY';
type FilterCategory = Category | 'ALL' | 'WATCHLIST' | 'YET_TO_RATE';
export type SortKey = 'aggregateScore' | 'currentUserRating' | 'title' | 'addedDate' | 'addedDateThenScore' | 'releaseYearThenScore' | 'mostFeedback';

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
    <div className="w-full max-w-7xl mx-auto my-8 p-4 sm:p-6 bg-white rounded-3xl border border-stone-200/70 shadow-soft">
      {readOnlyMode && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
          <Lock size={16} className="text-amber-700 mt-0.5 shrink-0" />
          <p className="text-amber-800 text-sm">
            You&apos;re viewing in read-only mode. Sign in to add movies, rate, and create your watchlist.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Filters */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-stone-600">
            Filter by Category
          </label>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map(({ id, name }) => (
              <button
                key={id}
                onClick={() => onCategoryChange(id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all inline-flex items-center gap-1.5 ${
                  activeCategory === id
                    ? 'bg-stone-900 text-white border border-stone-900 shadow-sm'
                    : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300 hover:-translate-y-px'
                }`}
              >
                {id === 'YET_TO_RATE' && (
                  <Star
                    size={14}
                    className={activeCategory === id ? 'fill-amber-300 text-amber-300' : 'text-amber-500'}
                  />
                )}
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Score Threshold Filter */}
        <div className="space-y-2">
          <label htmlFor="score-threshold" className="block text-sm font-medium text-stone-600">
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
            className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-brand"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-center gap-4 mt-4 pt-4 border-t">
        {/* Search Movies */}
        <div className="w-full">
          <label htmlFor="search-movies" className="block text-sm font-medium text-stone-600 mb-2">
            <span className="flex items-center gap-2">
              <Clapperboard size={16} />
              Search Movies
            </span>
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              id="search-movies"
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="From already available list..."
              className="input-modern w-full pl-10 pr-10"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 transition-colors"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        
        {/* Search Reviews */}
        <div className="w-full">
          <label htmlFor="search-reviews" className="block text-sm font-medium text-stone-600 mb-2">
            <span className="flex items-center gap-2">
              <MessageSquareText size={16} />
              Search in Reviews
            </span>
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              id="search-reviews"
              type="text"
              value={reviewSearchTerm}
              onChange={(e) => onReviewSearchChange(e.target.value)}
              placeholder="From added reviews..."
              className="input-modern w-full pl-10 pr-10"
            />
            {reviewSearchTerm && (
              <button
                onClick={() => onReviewSearchChange('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 transition-colors"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        
        {/* Sort by */}
        <div className="w-full">
          <label htmlFor="sort-by" className="block text-sm font-medium text-stone-600 mb-2">
            <span className="flex items-center gap-2">
              <BarChart3 size={16} />
              Sort By
            </span>
          </label>
          <div className="relative">
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortKey)}
              className="input-modern w-full appearance-none pr-10"
            >
            <option value="aggregateScore">{readOnlyMode ? 'Community Score' : 'Friend Score'}</option>
            <option value="currentUserRating">Your Rating</option>
            <option value="title">Alphabetical</option>
            <option value="addedDate">Added Date</option>
            <option value="addedDateThenScore">Added Date then by Score</option>
            <option value="releaseYearThenScore">Release Year then by Score</option>
            <option value="mostFeedback">Most feedback received</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
        </div>

        {/* Recent Updates Button */}
        {!readOnlyMode && setShowActivityPopup && (
          <div className="w-full">
            <label className="block text-sm font-medium text-stone-600 mb-2">
              <span className="flex items-center gap-2">
                <Bell size={16} />
                Community
              </span>
            </label>
            <button
              onClick={() => setShowActivityPopup(true)}
              className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
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
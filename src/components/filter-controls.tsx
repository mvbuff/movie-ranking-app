'use client';
import { SLIDER_RATING_SCALE } from '@/lib/rating-system';

// Manually define the Category type for client-side use
export type Category = 'MOVIE' | 'SERIES' | 'DOCUMENTARY';
type FilterCategory = Category | 'ALL' | 'WATCHLIST';
export type SortKey = 'aggregateScore' | 'currentUserRating' | 'title' | 'addedDate';

interface FilterControlsProps {
  activeCategory: FilterCategory;
  onCategoryChange: (category: FilterCategory) => void;
  scoreThreshold: number;
  onScoreThresholdChange: (threshold: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: SortKey;
  onSortChange: (key: SortKey) => void;
  readOnlyMode?: boolean;
}

const categories: { id: FilterCategory; name: string }[] = [
  { id: 'ALL', name: 'All' },
  { id: 'MOVIE', name: 'Movies' },
  { id: 'SERIES', name: 'Series' },
  { id: 'DOCUMENTARY', name: 'Documentaries' },
  { id: 'WATCHLIST', name: 'Watchlist' },
];

export default function FilterControls({
  activeCategory,
  onCategoryChange,
  scoreThreshold,
  onScoreThresholdChange,
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  readOnlyMode = false,
}: FilterControlsProps) {
  // Filter out watchlist for non-authenticated users
  const availableCategories = readOnlyMode 
    ? categories.filter(cat => cat.id !== 'WATCHLIST')
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
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {name}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-6 mt-4 pt-4 border-t">
        {/* Search within database */}
        <div className="w-full">
            <label htmlFor="search-db" className="block text-sm font-medium text-gray-700 mb-2">
                Search Movies
            </label>
            <input
                id="search-db"
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Type to search..."
                className="w-full p-2 border rounded-md"
            />
        </div>
        {/* Sort by */}
        <div className="w-full">
            <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
            </label>
            <select 
                id="sort-by"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as SortKey)}
                className="w-full p-2 border rounded-md bg-white"
            >
                <option value="aggregateScore">{readOnlyMode ? 'Community Score' : 'Friend Score'}</option>
                <option value="currentUserRating">Your Rating</option>
                <option value="title">Alphabetical</option>
                <option value="addedDate">Added Date</option>
            </select>
        </div>
      </div>
    </div>
  );
} 
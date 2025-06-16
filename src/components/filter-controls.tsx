'use client';

// Manually define the Category type for client-side use
export type Category = 'MOVIE' | 'SERIES' | 'DOCUMENTARY';
type FilterCategory = Category | 'ALL';
export type SortKey = 'aggregateScore' | 'currentUserRating' | 'title';

interface FilterControlsProps {
  activeCategory: FilterCategory;
  onCategoryChange: (category: FilterCategory) => void;
  scoreThreshold: number;
  onScoreThresholdChange: (threshold: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: SortKey;
  onSortChange: (key: SortKey) => void;
}

const categories: { id: FilterCategory; name: string }[] = [
  { id: 'ALL', name: 'All' },
  { id: 'MOVIE', name: 'Movies' },
  { id: 'SERIES', name: 'Series' },
  { id: 'DOCUMENTARY', name: 'Documentaries' },
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
}: FilterControlsProps) {
  return (
    <div className="w-full max-w-7xl mx-auto my-8 p-4 bg-white rounded-lg shadow-sm border">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Category Filters */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Category
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map(({ id, name }) => (
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
        <div className="flex-1">
          <label htmlFor="score-threshold" className="block text-sm font-medium text-gray-700 mb-2">
            Min. Friend Score ({scoreThreshold.toFixed(1)})
          </label>
          <input
            id="score-threshold"
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={scoreThreshold}
            onChange={(e) => onScoreThresholdChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-6 mt-4 pt-4 border-t">
        {/* Search within database */}
        <div className="flex-1 w-full">
            <label htmlFor="search-db" className="block text-sm font-medium text-gray-700 mb-2">
                Search Your Rated Movies
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
        <div className="flex-1 w-full">
            <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
            </label>
            <select 
                id="sort-by"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as SortKey)}
                className="w-full p-2 border rounded-md bg-white"
            >
                <option value="aggregateScore">Friend Score</option>
                <option value="currentUserRating">Your Rating</option>
                <option value="title">Alphabetical</option>
            </select>
        </div>
      </div>
    </div>
  );
} 
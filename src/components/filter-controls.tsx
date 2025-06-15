'use client';

// Manually define the Category type for client-side use
export type Category = 'MOVIE' | 'SERIES' | 'DOCUMENTARY';
type FilterCategory = Category | 'ALL';

interface FilterControlsProps {
  activeCategory: FilterCategory;
  onCategoryChange: (category: FilterCategory) => void;
  scoreThreshold: number;
  onScoreThresholdChange: (threshold: number) => void;
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
}: FilterControlsProps) {
  return (
    <div className="w-full max-w-7xl mx-auto my-8 p-4 bg-white rounded-lg shadow-sm border">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Category Filters */}
        <div className="flex-1">
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
    </div>
  );
} 
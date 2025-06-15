'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Category } from './filter-controls';

// Combined type for movies and TV shows from TMDb
interface SearchResult {
  id: number;
  title?: string; // For movies
  name?: string; // For TV shows
  release_date?: string; // For movies
  first_air_date?: string; // For TV shows
  poster_path: string | null;
  media_type: 'movie' | 'tv' | 'person';
  // TMDb 'multi' search can also return 'person'. We'll filter them out.
}

// Map TMDb genre IDs to our categories
// const DOCUMENTARY_GENRE_ID = 99;

// No longer need this automatic categorization logic
// function getCategory(...) { ... }

interface MovieSearchProps {
  onItemAdded: () => void;
}

export default function MovieSearch({ onItemAdded }: MovieSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedForCategorization, setSelectedForCategorization] = useState<number | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setMessage('');
    setResults([]);

    try {
      const response = await fetch(`/api/movies/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch search results');
      }
      const data: SearchResult[] = await response.json();
      const validResults = data.filter(item => item.media_type !== 'person' && item.poster_path);
      setResults(validResults);
      if (validResults.length === 0) {
        setMessage('No relevant movies or series found.');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('An unknown error occurred.');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMovie = async (item: SearchResult, category: Category) => {
    setMessage('');
    const title = item.title || item.name;
    const releaseDate = item.release_date || item.first_air_date;

    if (!title) {
        setMessage('Cannot add an item with no title.');
        return;
    }

    try {
      const response = await fetch('/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: String(item.id),
          title: title,
          year: releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : 0,
          posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
          category: category,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add item');

      setMessage(`'${title}' was added successfully as a ${category.toLowerCase()}!`);
      setSelectedForCategorization(null); // Reset the selection view
      setResults([]); // Clear search results from the UI
      onItemAdded(); // Trigger the main movie list to refresh
    } catch (error: unknown) {
      if (error instanceof Error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('An unknown error occurred while adding the item.');
      }
      console.error(error);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for movies or series..."
          className="flex-grow p-2 border rounded-l-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 disabled:bg-gray-400">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {message && <p className="text-center my-4 text-gray-600">{message}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {results.map((item) => {
            const title = item.title || item.name;
            const year = item.release_date || item.first_air_date;
            return (
              <div key={item.id} className="bg-white border rounded-lg shadow-md overflow-hidden flex flex-col justify-between">
                <div>
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                    alt={title ?? 'Movie Poster'}
                    width={500}
                    height={750}
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-bold text-lg truncate" title={title}>{title}</h3>
                    <p className="text-gray-500">{year?.substring(0, 4)}</p>
                  </div>
                </div>

                <div className="p-4 border-t">
                  {selectedForCategorization === item.id ? (
                    <div className="flex flex-col space-y-2">
                      <button onClick={() => handleAddMovie(item, 'MOVIE')} className="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">Movie</button>
                      <button onClick={() => handleAddMovie(item, 'SERIES')} className="px-3 py-2 text-sm bg-purple-500 text-white rounded hover:bg-purple-600">Series</button>
                      <button onClick={() => handleAddMovie(item, 'DOCUMENTARY')} className="px-3 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600">Documentary</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedForCategorization(item.id)}
                      className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                      Add to List
                    </button>
                  )}
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
} 
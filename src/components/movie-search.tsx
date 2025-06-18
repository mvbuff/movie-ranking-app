'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useUser } from '@/context/user-context';
import type { Category } from './filter-controls';
import { useToast } from '@/context/toast-context';

// Combined type for movies and TV shows from TMDb
interface SearchResult {
  id: number;
  title?: string; // For movies
  name?: string; // For TV shows
  release_date?: string; // For movies
  first_air_date?: string; // For TV shows
  poster_path: string | null;
  media_type: 'movie' | 'tv' | 'person';
  vote_average?: number;
  vote_count?: number;
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
  const { currentUser } = useUser();
  const { showToast } = useToast();

  // State for the two-step add process
  const [itemToReview, setItemToReview] = useState<SearchResult | null>(null);
  const [reviewText, setReviewText] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
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
        showToast('No relevant movies or series found.', 'info');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        showToast(error.message, 'error');
      } else {
        showToast('An unknown error occurred.', 'error');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (category: Category) => {
    if (!itemToReview || !currentUser) {
      showToast('Something went wrong, please try again.', 'error');
        return;
    }
    
    const title = itemToReview.title || itemToReview.name;
    const releaseDate = itemToReview.release_date || itemToReview.first_air_date;

    try {
      // Step 1: Add the movie to the global database.
      // The API handles cases where the movie already exists.
      const movieResponse = await fetch('/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: String(itemToReview.id),
          title: title,
          year: releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : 0,
          posterUrl: itemToReview.poster_path ? `https://image.tmdb.org/t/p/w500${itemToReview.poster_path}` : null,
          category: category,
          tmdbRating: itemToReview.vote_average,
          tmdbVoteCount: itemToReview.vote_count,
        }),
      });

      const movieData = await movieResponse.json();
      if (!movieResponse.ok && movieResponse.status !== 409) { // 409 Conflict is okay, means movie exists
        throw new Error(movieData.error || 'Failed to add item');
      }

      const movieId = movieData.id;

      // Step 2: If review text exists, submit it.
      if (reviewText.trim()) {
        const reviewResponse = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movieId: movieId,
            userId: currentUser.id,
            text: reviewText,
          }),
        });
        if (!reviewResponse.ok) {
          const reviewError = await reviewResponse.json();
          throw new Error(reviewError.error || 'Failed to submit review.');
        }
      }
      
      showToast(`'${title}' was added successfully!`, 'success');
      setItemToReview(null); // Reset the selection view
      setReviewText('');
      setResults([]); // Clear search results from the UI
      onItemAdded(); // Trigger the main movie list to refresh
    } catch (error: unknown) {
       if (error instanceof Error) {
        showToast(error.message, 'error');
      } else {
        showToast('An unknown error occurred while adding the item.', 'error');
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
          placeholder="Search for movies or series to add to the database..."
          className="flex-grow p-2 border rounded-l-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 disabled:bg-gray-400">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

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
                    className="w-full h-auto object-cover aspect-[2/3]"
                  />
                  <div className="p-4">
                    <h3 className="font-bold text-lg truncate" title={title}>{title}</h3>
                    <p className="text-gray-500">{year?.substring(0, 4)}</p>
                  </div>
                </div>

                <div className="p-4 border-t">
                  {itemToReview?.id === item.id ? (
                    <div className="flex flex-col space-y-2">
                       <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Add a short note (optional)..."
                        maxLength={100}
                        className="w-full p-2 border rounded-md text-sm"
                      />
                      <div className="text-right text-xs text-gray-400">{reviewText.length}/100</div>
                      <button onClick={() => handleSubmitReview('MOVIE')} className="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">As Movie</button>
                      <button onClick={() => handleSubmitReview('SERIES')} className="px-3 py-2 text-sm bg-purple-500 text-white rounded hover:bg-purple-600">As Series</button>
                      <button onClick={() => handleSubmitReview('DOCUMENTARY')} className="px-3 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600">As Documentary</button>
                      <button onClick={() => setItemToReview(null)} className="px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setItemToReview(item)}
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
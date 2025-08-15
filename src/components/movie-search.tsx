'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useUser } from '@/context/user-context';
import type { Category } from './filter-controls';
import { useToast } from '@/context/toast-context';
import CustomRatingInput from './custom-rating';
import { getScore, getGradeFromScore, LetterGrade, Modifier } from '@/lib/rating-system';
import { X } from 'lucide-react';

// TMDb Season data structure
interface TMDbSeason {
  season_number: number;
  name: string;
  air_date: string;
  episode_count: number;
  poster_path: string | null;
}

// Combined type for movies and TV shows from TMDb
interface SearchResult {
  id: number;
  title?: string; // For movies
  name?: string; // For TV shows
  release_date?: string; // For movies
  first_air_date?: string; // For TV shows
  poster_path: string | null;
  media_type: 'movie' | 'tv' | 'person' | 'season'; // Added 'season' type
  vote_average?: number;
  vote_count?: number;
  original_language?: string; // For detecting language/origin
  // Season-specific fields
  season_number?: number;
  episode_count?: number;
  air_date?: string;
  parent_show_id?: number; // Reference to the main show
  parent_show_name?: string; // Name of the parent show
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

  // State for the two-step add process //
  const [itemToReview, setItemToReview] = useState<SearchResult | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);
  // New state for the integrated rating
  const [selectedGrade, setSelectedGrade] = useState<LetterGrade | null>(null);
  const [selectedModifier, setSelectedModifier] = useState<Modifier | null>(null);

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

  const handleShowSeasons = async (item: SearchResult) => {
    if (item.media_type !== 'tv') return;
    
    setLoading(true);
    
    try {
      // Fetch season data from TMDB
      const response = await fetch(`https://api.themoviedb.org/3/tv/${item.id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY || 'bd2956b340db3fe2173a5423cc908c84'}`);
      if (!response.ok) {
        throw new Error('Failed to fetch season data');
      }
      
      const showData = await response.json();
      const showTitle = item.title || item.name || 'Unknown Show';
      
      // Convert seasons to SearchResult format
      const seasonResults: SearchResult[] = showData.seasons
        .filter((season: TMDbSeason) => season.season_number > 0) // Skip season 0 (specials)
        .map((season: TMDbSeason) => ({
          id: parseInt(`${item.id}${season.season_number.toString().padStart(2, '0')}`), // Unique ID for season
          title: `${showTitle} - ${season.name}`,
          name: `${showTitle} - ${season.name}`,
          release_date: season.air_date,
          first_air_date: season.air_date,
          poster_path: season.poster_path || item.poster_path,
          media_type: 'season' as const,
          vote_average: item.vote_average,
          vote_count: item.vote_count,
          original_language: item.original_language,
          season_number: season.season_number,
          episode_count: season.episode_count,
          air_date: season.air_date,
          parent_show_id: item.id,
          parent_show_name: showTitle
        }));
      
      // Replace search results with seasons
      setResults(seasonResults);
      setItemToReview(null); // Close any open review modal
      // Clear rating state when showing seasons
      setSelectedGrade(null);
      setSelectedModifier(null);
      
      showToast(`Found ${seasonResults.length} seasons for ${showTitle}`, 'success');
      
    } catch (error) {
      console.error('Failed to fetch seasons:', error);
      showToast('Failed to load seasons', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (category: Category) => {
    if (!itemToReview || !currentUser) {
      showToast('Something went wrong, please try again.', 'error');
        return;
    }
    
    const title = itemToReview.title || itemToReview.name;
    const releaseDate = itemToReview.release_date || itemToReview.first_air_date || itemToReview.air_date;
    const ratingScore = selectedGrade ? getScore(selectedGrade, selectedModifier) : 0;
    
    // Handle season entries differently
    const isSeasonEntry = itemToReview.media_type === 'season';
    const tmdbId = isSeasonEntry 
      ? `${itemToReview.parent_show_id}-s${itemToReview.season_number}` 
      : String(itemToReview.id);

    try {
      let movieResponse;
      
      if (isSeasonEntry) {
        // Step 1: Add season using the tv-seasons endpoint
        movieResponse = await fetch('/api/tv-seasons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentTmdbId: String(itemToReview.parent_show_id),
            seasonNumber: itemToReview.season_number,
            userId: currentUser.id,
          }),
        });
      } else {
        // Step 1: Add the movie to the global database.
        movieResponse = await fetch('/api/movies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tmdbId: tmdbId,
            title: title,
            year: releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : 0,
            posterUrl: itemToReview.poster_path ? `https://image.tmdb.org/t/p/w500${itemToReview.poster_path}` : null,
            category: category,
            tmdbRating: itemToReview.vote_average,
            tmdbVoteCount: itemToReview.vote_count,
            mediaType: itemToReview.media_type,
            userId: currentUser.id,
          }),
        });
      }

      const movieData = await movieResponse.json();
      if (!movieResponse.ok && movieResponse.status !== 409) {
        throw new Error(movieData.error || 'Failed to add item');
      }

      // Handle different response structures for seasons vs movies
      const movieId = isSeasonEntry ? movieData.season?.id || movieData.id : movieData.id;
      const isNewMovie = movieResponse.status === 201;
      
      // Log activity on client side for debugging
      if (isNewMovie) {
        console.log(`✅ Movie "${title}" added successfully! Activity should be logged.`);
      } else {
        console.log(`ℹ️ Movie "${title}" already exists in database.`);
      }

      // Step 2: If a rating was given, submit it.
      if (ratingScore > 0) {
        await fetch('/api/ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            movieId: movieId,
            score: ratingScore,
          }),
        });
      }

      // Step 3: If review text exists, submit it.
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
      // Clear rating state after successful submission
      setSelectedGrade(null);
      setSelectedModifier(null);
      setResults([]); // Clear search results from the UI
      setQuery(''); // Clear search query
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

  const handleManualAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const category = formData.get('category') as Category;
    const review = formData.get('review') as string;

    if (!title || !category) {
      showToast('Title and category are required for manual entries.', 'error');
      return;
    }

    try {
       // Step 1: Add the movie to the global database.
      const movieResponse = await fetch('/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          year: 0, // Explicitly send 0 for year
          userId: currentUser?.id,
        }),
      });

      const movieData = await movieResponse.json();
      if (!movieResponse.ok) {
        throw new Error(movieData.error || 'Failed to add item');
      }

       // Step 2: If review text exists, submit it.
      if (review.trim() && currentUser) {
        await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movieId: movieData.id,
            userId: currentUser.id,
            text: review,
          }),
        });
      }
      
      showToast(`'${title}' was added successfully!`, 'success');
      setShowManualForm(false);
      onItemAdded(); // Trigger the main movie list to refresh

    } catch (error) {
      if (error instanceof Error) {
        showToast(error.message, 'error');
      } else {
        showToast('An unknown error occurred.', 'error');
      }
    }
  };

  return (
    <div className="w-full mx-auto">
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-grow">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add movie/series to database..."
            className="w-full p-2 pr-8 border rounded-l-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 disabled:bg-gray-400">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="text-center mb-6">
        <button 
          onClick={() => setShowManualForm(!showManualForm)}
          className="text-sm text-blue-600 hover:underline"
        >
          {showManualForm ? 'Cancel Manual Add' : 'Can\'t find a movie? Add it manually.'}
        </button>
      </div>

      {showManualForm && (
        <form onSubmit={handleManualAdd} className="p-4 border rounded-lg bg-gray-50 mb-6 space-y-4">
          <h3 className="text-lg font-semibold">Manually Add an Entry</h3>
          <div>
            <label htmlFor="title" className="block text-sm font-medium">Title</label>
            <input type="text" name="title" id="title" required className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium">Category</label>
            <select name="category" id="category" required className="w-full p-2 border rounded-md bg-white">
              <option value="MOVIE">Movie</option>
              <option value="SERIES">Series</option>
              <option value="DOCUMENTARY">Documentary</option>
            </select>
          </div>
           <div>
            <label htmlFor="review" className="block text-sm font-medium">Review (Optional)</label>
            <textarea name="review" id="review" maxLength={100} className="w-full p-2 border rounded-md"></textarea>
          </div>
          <button type="submit" className="w-full px-6 py-2 bg-green-600 text-white font-semibold rounded-lg">Add Manual Entry</button>
        </form>
      )}

      {results.length > 0 && (
        <div className="mb-6 text-center">
          <button 
            onClick={() => {
              setResults([]);
              setQuery('');
              setItemToReview(null);
              setReviewText('');
              // Clear rating state when closing search results
              setSelectedGrade(null);
              setSelectedModifier(null);
            }}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close Search Results
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {results.map((item) => {
            const title = item.title || item.name;
            const year = item.release_date || item.first_air_date || item.air_date;
            const isSeasonEntry = item.media_type === 'season';
            
            return (
              <div key={item.id} className="bg-white border rounded-lg shadow-md overflow-hidden flex flex-col">
                <div className="relative h-48">
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} 
                    alt={title ?? 'Movie Poster'}
                    layout="fill"
                    objectFit="cover"
                  />
                  {/* Season indicator badge */}
                  {isSeasonEntry && (
                    <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
                      S{item.season_number}
                    </div>
                  )}
                </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg truncate" title={title}>{title}</h3>
                    <p className="text-gray-500">
                      {year?.substring(0, 4)}
                      {isSeasonEntry && item.episode_count && (
                        <span className="ml-2">• {item.episode_count} episodes</span>
                      )}
                    </p>
                  </div>

                <div className="p-4 border-t mt-auto">
                  {itemToReview?.id === item.id ? (
                    <div className="flex flex-col space-y-2 p-2">
                       <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Add a note (optional)..."
                        maxLength={200}
                        className="w-full p-2 border rounded-md text-sm"
                      />
                      <div className="text-right text-xs text-gray-400">{reviewText.length}/200</div>
                      
                      <div className="my-4">
                        <p className="text-sm font-medium text-gray-700 mb-2 text-center">Rate it (optional):</p>
                        <CustomRatingInput 
                          onRatingSubmit={(score) => {
                            const { grade, modifier } = getGradeFromScore(score);
                            setSelectedGrade(grade);
                            setSelectedModifier(modifier);
                          }} 
                          disabled={false}
                          initialScore={selectedGrade ? getScore(selectedGrade, selectedModifier) : 0}
                        />
                      </div>

                      {/* Different buttons for season entries vs regular content */}
                      {isSeasonEntry ? (
                        <button onClick={() => handleSubmit('SERIES')} className="px-3 py-2 text-sm bg-purple-500 text-white rounded-md hover:bg-purple-700">
                          Add Season {item.season_number}
                        </button>
                      ) : (
                        <>
                          <button onClick={() => handleSubmit('MOVIE')} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Add as Movie</button>
                          <button onClick={() => handleSubmit('SERIES')} className="px-3 py-2 text-sm bg-purple-500 text-white rounded-md hover:bg-purple-700">Add as Series</button>
                          <button onClick={() => handleSubmit('DOCUMENTARY')} className="px-3 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-700">Add as Documentary</button>
                          {/* Add Season Rating button for TV shows */}
                          {item.media_type === 'tv' && (
                            <button 
                              onClick={() => handleShowSeasons(item)}
                              className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                              📺 Show Individual Seasons
                            </button>
                          )}
                        </>
                      )}
                      <button onClick={() => { 
                        setItemToReview(null); 
                        setReviewText(''); 
                        // Clear rating state when canceling
                        setSelectedGrade(null);
                        setSelectedModifier(null);
                      }} className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setItemToReview(item);
                        // Clear rating state when selecting a new item
                        setSelectedGrade(null);
                        setSelectedModifier(null);
                      }}
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
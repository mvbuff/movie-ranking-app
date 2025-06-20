'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@/context/user-context';
import CustomRatingInput from './custom-rating';
import Image from 'next/image';
import { Scorecard } from './score-components';
import { Info, Star, MessageSquare, Eye, Share2 } from 'lucide-react';
import ReviewsModal from './reviews-modal';
import { getRatingDisplay } from '@/lib/rating-system';
import { useToast } from '@/context/toast-context';

// Manually define types to avoid server/client type mismatches
export type Category = 'MOVIE' | 'SERIES' | 'DOCUMENTARY';
type FilterCategory = Category | 'ALL' | 'WATCHLIST';
type SortKey = 'aggregateScore' | 'currentUserRating' | 'title' | 'addedDate';

interface Movie {
  id: string;
  title: string;
  year: number;
  posterUrl: string | null;
  tmdbId: string;
  tmdbRating: number | null;
  tmdbVoteCount: number | null;
  category: Category;
  createdAt: string;
}
interface Rating { movieId: string; score: number; }
interface AggregateScore { movieId: string; score: number; }

interface MovieWithRatingsAndScores extends Movie {
  currentUserRating: number;
  aggregateScore: number | null;
  isInWatchlist: boolean;
}

interface MovieListProps {
  calculationTimestamp: number | null;
  categoryFilter: FilterCategory;
  scoreThreshold: number;
  searchTerm: string;
  sortBy: SortKey;
  readOnlyMode?: boolean;
}

export default function MovieList({ calculationTimestamp, categoryFilter, scoreThreshold, searchTerm, sortBy, readOnlyMode = false }: MovieListProps) {
  const { currentUser } = useUser();
  const { showToast } = useToast();
  const [movies, setMovies] = useState<MovieWithRatingsAndScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReviews, setActiveReviews] = useState<{ movieId: string; movieTitle: string; } | null>(null);
  const [addingReview, setAddingReview] = useState<{ movieId: string; movieTitle: string; } | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [togglingWatchlist, setTogglingWatchlist] = useState<string | null>(null);

  const fetchMovieData = useCallback(async () => {
    setLoading(true);
    try {
      if (readOnlyMode || !currentUser) {
        // Read-only mode: fetch movies with public aggregate scores
        const [moviesRes, publicScoresRes] = await Promise.all([
          fetch('/api/movies'),
          fetch('/api/public-aggregate-scores'),
        ]);
        if (!moviesRes.ok || !publicScoresRes.ok) throw new Error('Failed to fetch data');
        
        const allMovies: Movie[] = await moviesRes.json();
        const publicScores: { movieId: string; score: number; userCount: number }[] = await publicScoresRes.json();
        
        const scoresMap = new Map(publicScores.map(s => [s.movieId, s.score]));
        
        const moviesWithData = allMovies.map(movie => ({
          ...movie,
          currentUserRating: 0,
          aggregateScore: scoresMap.get(movie.id) ?? null,
          isInWatchlist: false,
        }));

        setMovies(moviesWithData);
      } else {
        // Authenticated mode: fetch with user-specific data
        const [moviesRes, ratingsRes, scoresRes, watchlistRes] = await Promise.all([
          fetch('/api/movies'),
          fetch(`/api/ratings?userId=${currentUser.id}`),
          fetch(`/api/aggregate-scores?userId=${currentUser.id}`),
          fetch(`/api/watchlist?userId=${currentUser.id}`),
        ]);
        if (!moviesRes.ok || !ratingsRes.ok || !scoresRes.ok || !watchlistRes.ok) throw new Error('Failed to fetch data');
        
        const allMovies: Movie[] = await moviesRes.json();
        const userRatings: Rating[] = await ratingsRes.json();
        const aggregateScores: AggregateScore[] = await scoresRes.json();
        const watchlistItems: { movieId: string }[] = await watchlistRes.json();
        
        const ratingsMap = new Map(userRatings.map(r => [r.movieId, r.score]));
        const scoresMap = new Map(aggregateScores.map(s => [s.movieId, s.score]));
        const watchlistSet = new Set(watchlistItems.map(w => w.movieId));

        const moviesWithData = allMovies.map(movie => ({
          ...movie,
          currentUserRating: ratingsMap.get(movie.id) || 0,
          aggregateScore: scoresMap.get(movie.id) ?? null,
          isInWatchlist: watchlistSet.has(movie.id),
        }));

        setMovies(moviesWithData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, readOnlyMode]);

  useEffect(() => {
    fetchMovieData();
  }, [fetchMovieData, calculationTimestamp]);

  const handleRatingSubmit = async (movieId: string, score: number) => {
    if (!currentUser) return;

    try {
      if (score === 0) {
        // If score is 0, it means we're removing the rating
        await fetch('/api/ratings', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, movieId }),
        });
      } else {
        // Otherwise, we're creating or updating the rating
        await fetch('/api/ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            movieId,
            score,
          }),
        });
      }
      
      // Optimistically update the UI
      setMovies(movies.map(m => m.id === movieId ? { ...m, currentUserRating: score } : m));
    } catch (error) {
      console.error('Failed to submit rating:', error);
      fetchMovieData(); 
    }
  };

  const handleReviewSubmit = async (movieId: string, text: string) => {
    if (!currentUser || !text.trim()) return;

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          movieId,
          text: text.trim(),
        }),
      });

      if (response.ok) {
        setAddingReview(null);
        setReviewText('');
        // If reviews modal is open for this movie, it will refresh automatically
      } else {
        console.error('Failed to submit review');
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const handleWatchlistToggle = async (movieId: string, isCurrentlyInWatchlist: boolean) => {
    if (!currentUser) return;

    setTogglingWatchlist(movieId);
    try {
      const method = isCurrentlyInWatchlist ? 'DELETE' : 'POST';
      const response = await fetch('/api/watchlist', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          movieId,
        }),
      });

      if (response.ok) {
        // Optimistically update the UI
        setMovies(movies.map(m => 
          m.id === movieId 
            ? { ...m, isInWatchlist: !isCurrentlyInWatchlist }
            : m
        ));
      } else {
        console.error('Failed to toggle watchlist');
      }
    } catch (error) {
      console.error('Failed to toggle watchlist:', error);
    } finally {
      setTogglingWatchlist(null);
    }
  };

  /* Temporarily disabled - keeping for future use
  const handleDiscussionClick = (movie: MovieWithRatingsAndScores) => {
    // Navigate to forum with movie context
    const movieTitle = encodeURIComponent(`${movie.title} (${movie.year})`);
    window.open(`/forum?movie=${movie.id}&title=${movieTitle}`, '_blank');
  };
  */

  const shareToWhatsApp = async (movie: MovieWithRatingsAndScores) => {
    // Get category prefix
    const getCategoryPrefix = (category: Category) => {
      switch (category) {
        case 'MOVIE': return 'Mreco';
        case 'SERIES': return 'Sreco';
        case 'DOCUMENTARY': return 'Dreco';
        default: return 'Mreco';
      }
    };

    const categoryPrefix = getCategoryPrefix(movie.category);
    const letterRating = movie.currentUserRating > 0 ? getRatingDisplay(movie.currentUserRating) : 'NR';
    
    // Try to fetch user's review for this movie
    let userReview = '';
    if (currentUser && movie.currentUserRating > 0) {
      try {
        const reviewResponse = await fetch(`/api/reviews?movieId=${movie.id}`);
        if (reviewResponse.ok) {
          const reviews: { id: string; userId: string; text: string; movieId: string; createdAt: string; user: { name: string } }[] = await reviewResponse.json();
          const userReviewData = reviews.find((review) => review.userId === currentUser.id);
          if (userReviewData && userReviewData.text) {
            userReview = userReviewData.text.trim();
          }
        }
      } catch (error) {
        console.error('Failed to fetch user review:', error);
      }
    }
    
    // Format the message according to the specified pattern
    let message = `${categoryPrefix}: ${movie.title} (${movie.year})`;
    
    if (!readOnlyMode && currentUser && movie.currentUserRating > 0) {
      message += ` .... ${letterRating}`;
      if (userReview) {
        message += `.... ${userReview}`;
      }
    } else {
      message += ` .... NR`; // Not rated
    }
    
    try {
      await navigator.clipboard.writeText(message);
      showToast('Movie details copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const filteredAndSortedMovies = useMemo(() => {
    return movies
      .filter(movie => {
        // Handle watchlist filter
        if (categoryFilter === 'WATCHLIST') {
          return movie.isInWatchlist;
        }
        
        // Handle regular category filters
        const categoryMatch = categoryFilter === 'ALL' || movie.category === categoryFilter;
        const scoreMatch = movie.aggregateScore === null || movie.aggregateScore >= scoreThreshold;
        const searchMatch = searchTerm === '' || movie.title.toLowerCase().includes(searchTerm.toLowerCase());
        return categoryMatch && scoreMatch && searchMatch;
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'addedDate') {
          // Sort by most recent first (newest to oldest)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        const scoreA = sortBy === 'aggregateScore' ? a.aggregateScore ?? -1 : a.currentUserRating;
        const scoreB = sortBy === 'aggregateScore' ? b.aggregateScore ?? -1 : b.currentUserRating;
        return scoreB - scoreA;
      });
  }, [movies, categoryFilter, scoreThreshold, searchTerm, sortBy]);

  if (!currentUser && !readOnlyMode) return null;
  
  if (loading) return <p className="mt-12 text-center text-gray-500">Loading movie collection...</p>;

  if (movies.length === 0) {
    return (
      <div className="text-center p-8 my-10 bg-gray-50 rounded-lg border-dashed border-2 border-gray-300">
        <p className="text-gray-500">No movies have been added yet.</p>
        <p className="text-sm text-gray-400 mt-2">Use the search bar above to find and add movies to the list.</p>
      </div>
    );
  }

  return (
    <>
      {activeReviews && (
        <ReviewsModal
          movieId={activeReviews.movieId}
          movieTitle={activeReviews.movieTitle}
          currentUserId={readOnlyMode ? undefined : currentUser?.id}
          onClose={() => setActiveReviews(null)}
          onReviewDeleted={() => {
            // Optional: You could add any additional refresh logic here
          }}
        />
      )}
      <section className="w-full mx-auto mt-6">
       <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">Your Movie Rankings</h2>
       <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6">
        {filteredAndSortedMovies.map((movie) => (
          <div 
            key={movie.id} 
            className="bg-white border rounded-lg shadow-md overflow-hidden group flex flex-col"
          >
            <div className="relative h-80"> 
                <Image
                  src={movie.posterUrl || '/placeholder.png'}
                  alt={`Poster for ${movie.title}`}
                layout="fill"
                objectFit="cover"
                className="transition-transform duration-300"
              />
              {/* Watchlist toggle button - top left */}
              {readOnlyMode ? (
                <div
                  className="absolute top-2 left-2 p-2 rounded-full bg-gray-500/70 text-white cursor-not-allowed"
                  title="Sign in to add to watchlist"
                >
                  <Eye size={16} />
                </div>
              ) : (
                <button
                  onClick={() => handleWatchlistToggle(movie.id, movie.isInWatchlist)}
                  disabled={togglingWatchlist === movie.id}
                  className={`absolute top-2 left-2 p-2 rounded-full transition-all ${
                    movie.isInWatchlist 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-black/50 text-white hover:bg-black/70'
                  } ${togglingWatchlist === movie.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={movie.isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                  {togglingWatchlist === movie.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              )}
              {/* TMDb rating - top right */}
              {movie.tmdbRating && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-full">
                  <Star size={12} className="text-yellow-400" />
                  <span>{movie.tmdbRating.toFixed(1)}</span>
                </div>
              )}
            </div>
            <div className="p-4 flex flex-col flex-1">
              <div className="flex justify-between items-start">
                <a
                  href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-lg text-gray-900 flex-grow hover:text-indigo-600 transition-colors"
                  title={movie.title}
                >
                  {movie.title} ({movie.year > 0 ? movie.year : 'N/A'})
                </a>
                <div className="flex gap-1">
                  {readOnlyMode ? (
                    <div
                      className="p-1 text-gray-400 cursor-not-allowed"
                      title="Sign in to add reviews"
                    >
                      <MessageSquare size={18} />
                    </div>
                  ) : (
                    <button 
                      onClick={() => setAddingReview({ movieId: movie.id, movieTitle: movie.title })}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Add review"
                    >
                      <MessageSquare size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => setActiveReviews({ movieId: movie.id, movieTitle: movie.title })}
                    className="p-1 text-gray-400 hover:text-indigo-600"
                    title="Show user reviews"
                  >
                    <Info size={18} />
                  </button>
                  {/* Temporarily removed Users/Discussion button - keeping function for future use
                  <button 
                    onClick={() => handleDiscussionClick(movie)}
                    className="p-1 text-gray-400 hover:text-purple-600"
                    title="Discuss this movie in forum"
                  >
                    <Users size={18} />
                  </button>
                  */}
                  <button 
                    onClick={() => shareToWhatsApp(movie)}
                    className="p-1 text-gray-400 hover:text-green-600"
                    title="Copy movie details"
                  >
                    <Share2 size={18} />
                  </button>
                </div>
              </div>
              <div className="mt-auto pt-4">
                {readOnlyMode ? (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded text-center">
                    <p className="text-gray-500 text-sm mb-2">Sign in to rate this movie</p>
                    <div className="opacity-50 pointer-events-none">
                      <CustomRatingInput
                        initialScore={0}
                        onRatingSubmit={() => {}}
                        disabled={true}
                      />
                    </div>
                  </div>
                ) : (
                  <CustomRatingInput
                    initialScore={movie.currentUserRating}
                    onRatingSubmit={(score) => handleRatingSubmit(movie.id, score)}
                    disabled={!currentUser}
                  />
                )}
              </div>
              {addingReview && addingReview.movieId === movie.id && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <h5 className="text-sm font-medium text-blue-800 mb-2">Add Review</h5>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your thoughts... (max 100 characters)"
                    maxLength={100}
                    className="w-full p-2 text-sm border border-blue-300 rounded resize-none"
                    rows={3}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-blue-600">{reviewText.length}/100</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setAddingReview(null);
                          setReviewText('');
                        }}
                        className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReviewSubmit(movie.id, reviewText)}
                        disabled={!reviewText.trim()}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {activeReviews && activeReviews.movieId === movie.id && (
                <div className="mt-4 space-y-2">
                  {/* Add any additional review content here */}
              </div>
              )}
            </div>
            <div className="p-2 bg-gray-50 border-t">
              <Scorecard 
                score={movie.aggregateScore} 
                label={readOnlyMode ? "Community Score" : "Friend Score"} 
              />
            </div>
          </div>
        ))}
       </div>
       {filteredAndSortedMovies.length === 0 && movies.length > 0 && (
         <div className="text-center p-8 my-10 bg-gray-50 rounded-lg border-dashed border-2 border-gray-300">
           <p className="text-gray-500">No movies match your current filters.</p>
           <p className="text-sm text-gray-400 mt-2">Try adjusting the category or score threshold.</p>
         </div>
       )}
    </section>
    </>
  );
}
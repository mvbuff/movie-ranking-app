'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@/context/user-context';
import CustomRatingInput from './custom-rating';
import Image from 'next/image';
import { Scorecard } from './score-components';
import { Info, Star, MessageSquare, Eye, Share2, Trash2 } from 'lucide-react';
import ReviewsModal from './reviews-modal';
import AddReviewModal from './add-review-modal';
import { getRatingDisplay } from '@/lib/rating-system';
import { useToast } from '@/context/toast-context';

// Manually define types to avoid server/client type mismatches
export type Category = 'MOVIE' | 'SERIES' | 'DOCUMENTARY';
type FilterCategory = Category | 'ALL' | 'WATCHLIST' | 'YET_TO_RATE';
type SortKey = 'aggregateScore' | 'currentUserRating' | 'title' | 'addedDate' | 'addedDateThenScore';

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
  ratingsCount: number;
  reviewsCount: number;
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
  const { currentUser, isAdmin } = useUser();
  const { showToast } = useToast();
  const [movies, setMovies] = useState<MovieWithRatingsAndScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReviews, setActiveReviews] = useState<{ movieId: string; movieTitle: string; } | null>(null);
  const [addReviewModal, setAddReviewModal] = useState<{ movieId: string; movieTitle: string; } | null>(null);
  const [togglingWatchlist, setTogglingWatchlist] = useState<string | null>(null);
  const [deletingMovie, setDeletingMovie] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ movieId: string; movieTitle: string; movieYear: number } | null>(null);

  const fetchMovieData = useCallback(async () => {
    setLoading(true);
    try {
      // Add cache-busting parameter to force fresh data
      const cacheBuster = `?t=${Date.now()}`;
      
      if (readOnlyMode || !currentUser) {
        // Read-only mode: fetch movies with public aggregate scores
        const [moviesRes, publicScoresRes] = await Promise.all([
          fetch(`/api/movies${cacheBuster}`, { cache: 'no-store' }),
          fetch(`/api/public-aggregate-scores${cacheBuster}`, { cache: 'no-store' }),
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
          fetch(`/api/movies${cacheBuster}`, { cache: 'no-store' }),
          fetch(`/api/ratings?userId=${currentUser.id}&t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`/api/aggregate-scores?userId=${currentUser.id}&t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`/api/watchlist?userId=${currentUser.id}&t=${Date.now()}`, { cache: 'no-store' }),
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
        message += `.... ${userReview}\n\n--shared via https://peer-movie-rating-app.vercel.app`;
      }
    } else {
      message += ` .... NR\n\n--shared via https://peer-movie-rating-app.vercel.app`; // Not rated
    }
    
    try {
      await navigator.clipboard.writeText(message);
      showToast('Movie details copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleMovieDelete = async (movieId: string, movieTitle: string) => {
    if (!isAdmin) {
      showToast('Admin access required', 'error');
      return;
    }

    setDeletingMovie(movieId);
    try {
      const response = await fetch('/api/movies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId }),
      });

      const result = await response.json();

      if (response.ok) {
        showToast(`Successfully deleted "${movieTitle}"`, 'success');
        // Remove the movie from the UI immediately
        setMovies(movies.filter(m => m.id !== movieId));
        setDeleteConfirmation(null);
      } else {
        showToast(`Failed to delete movie: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to delete movie:', error);
      showToast('Failed to delete movie', 'error');
    } finally {
      setDeletingMovie(null);
    }
  };

  const filteredAndSortedMovies = useMemo(() => {
    return movies
      .filter(movie => {
        // Handle watchlist filter
        if (categoryFilter === 'WATCHLIST') {
          const searchMatch = searchTerm === '' || movie.title.toLowerCase().includes(searchTerm.toLowerCase());
          return movie.isInWatchlist && searchMatch;
        }
        
        // Handle yet-to-rate filter  
        if (categoryFilter === 'YET_TO_RATE') {
          const searchMatch = searchTerm === '' || movie.title.toLowerCase().includes(searchTerm.toLowerCase());
          return movie.currentUserRating === 0 && searchMatch;
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
        if (sortBy === 'addedDateThenScore') {
          // First sort by added date (newest first)
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          const dateDiff = dateB - dateA;
          
          // If dates are different, use date sorting
          if (dateDiff !== 0) {
            return dateDiff;
          }
          
          // If dates are the same, sort by aggregate score (highest first)
          const scoreA = a.aggregateScore ?? -1;
          const scoreB = b.aggregateScore ?? -1;
          return scoreB - scoreA;
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
      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-red-600 mb-4">⚠️ Delete Movie</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to permanently delete <strong>&quot;{deleteConfirmation.movieTitle}&quot; ({deleteConfirmation.movieYear})</strong>?
              <br /><br />
              This will also delete:
              <br />• All user ratings
              <br />• All reviews and review likes
              <br />• All watchlist entries
              <br />• All aggregate scores
              <br /><br />
              <strong className="text-red-600">This action cannot be undone!</strong>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                disabled={deletingMovie === deleteConfirmation.movieId}
              >
                Cancel
              </button>
              <button
                onClick={() => handleMovieDelete(deleteConfirmation.movieId, deleteConfirmation.movieTitle)}
                disabled={deletingMovie === deleteConfirmation.movieId}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deletingMovie === deleteConfirmation.movieId ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Forever
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeReviews && (
        <ReviewsModal
          movieId={activeReviews.movieId}
          movieTitle={activeReviews.movieTitle}
          currentUserId={readOnlyMode ? undefined : currentUser?.id}
          onClose={() => setActiveReviews(null)}
          onReviewDeleted={() => {
            // Refresh movie data to update review counts
            fetchMovieData();
          }}
        />
      )}
      {addReviewModal && currentUser && (
        <AddReviewModal
          movieId={addReviewModal.movieId}
          movieTitle={addReviewModal.movieTitle}
          userId={currentUser.id}
          onClose={() => setAddReviewModal(null)}
          onReviewAdded={() => {
            // Refresh movie data to show the new review
            fetchMovieData();
          }}
        />
      )}
      <section className="w-full mx-auto mt-6">
       <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">
         {categoryFilter === 'YET_TO_RATE' 
           ? '⭐ Movies You Haven\'t Rated Yet' 
           : categoryFilter === 'WATCHLIST'
           ? '👀 Your Watchlist'
           : 'Your Movie Rankings'
         }
       </h2>
       <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-6">
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
              {/* Admin delete button - top left corner */}
              {isAdmin && !readOnlyMode && (
                <button
                  onClick={() => setDeleteConfirmation({ 
                    movieId: movie.id, 
                    movieTitle: movie.title, 
                    movieYear: movie.year 
                  })}
                  disabled={deletingMovie === movie.id}
                  className="absolute top-2 left-2 p-2 rounded-full bg-red-600/90 text-white hover:bg-red-700/90 transition-all z-10 shadow-lg"
                  title="Delete movie (Admin only)"
                >
                  {deletingMovie === movie.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              )}
              
              {/* Watchlist toggle button - adjusted position for admin delete button */}
              {readOnlyMode ? (
                <div
                  className={`absolute ${isAdmin ? 'top-2 left-12' : 'top-2 left-2'} p-2 rounded-full bg-gray-500/70 text-white cursor-not-allowed`}
                  title="Sign in to add to watchlist"
                >
                  <Eye size={16} />
                </div>
              ) : (
                <button
                  onClick={() => handleWatchlistToggle(movie.id, movie.isInWatchlist)}
                  disabled={togglingWatchlist === movie.id}
                  className={`absolute ${isAdmin ? 'top-2 left-12' : 'top-2 left-2'} p-2 rounded-full transition-all ${
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
              {/* Mobile-first responsive layout for title and buttons */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                <a
                  href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-base sm:text-lg text-gray-900 hover:text-indigo-600 transition-colors line-clamp-2 sm:line-clamp-1 sm:flex-1 sm:min-w-0"
                  title={`${movie.title} (${movie.year > 0 ? movie.year : 'N/A'})`}
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    hyphens: 'auto'
                  }}
                >
                  {movie.title} ({movie.year > 0 ? movie.year : 'N/A'})
                </a>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {/* Action buttons */}
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
                        onClick={() => setAddReviewModal({ movieId: movie.id, movieTitle: movie.title })}
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
                  
                  {/* Rating and Review counts */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-yellow-500" />
                      <span>{movie.ratingsCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare size={12} className="text-blue-500" />
                      <span>{movie.reviewsCount}</span>
                    </div>
                  </div>
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
              {/* Old inline review form removed - now using modal */}
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
           <p className="text-gray-500">
             {categoryFilter === 'YET_TO_RATE' 
               ? '🎉 Great job! You\'ve rated all the movies in your collection.'
               : categoryFilter === 'WATCHLIST'
               ? 'Your watchlist is empty. Add movies to watch later!'
               : 'No movies match your current filters.'
             }
           </p>
           <p className="text-sm text-gray-400 mt-2">
             {categoryFilter === 'YET_TO_RATE' 
               ? 'Add more movies to continue rating, or check back after new movies are added.'
               : categoryFilter === 'WATCHLIST'
               ? 'Use the eye icon on movie cards to add them to your watchlist.'
               : 'Try adjusting the category or score threshold.'
             }
           </p>
         </div>
       )}
    </section>
    </>
  );
}
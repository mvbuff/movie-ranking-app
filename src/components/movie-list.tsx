'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useUser } from '@/context/user-context';
import CustomRatingInput from './custom-rating';
import Image from 'next/image';
import { Scorecard } from './score-components';
import { Info, Star, MessageSquare, Eye, Share2, Trash2, AlertTriangle, PartyPopper, Clapperboard } from 'lucide-react';
import ReviewsModal from './reviews-modal';
import AddReviewModal from './add-review-modal';
import { getRatingDisplay } from '@/lib/rating-system';
import { useToast } from '@/context/toast-context';
import MovieTitleLink from './movie-title-link';

// Manually define types to avoid server/client type mismatches
export type Category = 'MOVIE' | 'SERIES' | 'DOCUMENTARY';
type FilterCategory = Category | 'ALL' | 'WATCHLIST' | 'YET_TO_RATE';
type SortKey = 'aggregateScore' | 'currentUserRating' | 'title' | 'addedDate' | 'addedDateThenScore' | 'releaseYearThenScore' | 'mostFeedback';

interface Movie {
  id: string;
  title: string;
  year: number;
  posterUrl: string | null;
  tmdbId: string;
  tmdbUrl: string | null; // Canonical TMDB URL
  tmdbRating: number | null;
  tmdbVoteCount: number | null;
  category: Category;
  mediaType: string;
  createdAt: string;
  ratingsCount: number;
  reviewsCount: number;
  // derived: total feedback
  // ratingsCount + reviewsCount
}
interface Rating { movieId: string; score: number; }
interface AggregateScore { movieId: string; score: number; }

interface MovieWithRatingsAndScores extends Movie {
  currentUserRating: number;
  aggregateScore: number | null;
  isInWatchlist: boolean;
  currentUserReview: string | null;
  // Season-specific fields from updated Prisma schema
  seasonNumber?: number | null;
  episodeCount?: number | null;
  parentShowId?: string | null;
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

  // Add refs to prevent unnecessary fetches
  const lastFetchParams = useRef<{
    userId: string | null;
    timestamp: number | null;
  }>({ userId: null, timestamp: null });

  const fetchMovieData = useCallback(async () => {
    // Only fetch if parameters have actually changed
    const shouldFetch = 
      lastFetchParams.current.userId !== currentUser?.id ||
      (calculationTimestamp && lastFetchParams.current.timestamp !== calculationTimestamp);

    if (!shouldFetch && movies.length > 0) {
      return; // Skip fetch if data is already loaded and params haven't changed
    }

    setLoading(true);
    try {
      // Add cache-busting parameter to force fresh data when needed
      const cacheBuster = calculationTimestamp ? `?t=${calculationTimestamp}` : `?t=${Date.now()}`;
      
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
          currentUserReview: null,
        }));

        setMovies(moviesWithData);
        
        // Update last fetch params
        lastFetchParams.current = {
          userId: null,
          timestamp: calculationTimestamp
        };
      } else {
        // Authenticated mode: fetch with user-specific data
        const [moviesRes, ratingsRes, scoresRes, watchlistRes, reviewsRes] = await Promise.all([
          fetch(`/api/movies${cacheBuster}`, { cache: 'no-store' }),
          fetch(`/api/ratings?userId=${currentUser.id}&t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`/api/aggregate-scores?userId=${currentUser.id}&t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`/api/watchlist?userId=${currentUser.id}&t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`/api/reviews?userId=${currentUser.id}&t=${Date.now()}`, { cache: 'no-store' }),
        ]);
        if (!moviesRes.ok || !ratingsRes.ok || !scoresRes.ok || !watchlistRes.ok || !reviewsRes.ok) throw new Error('Failed to fetch data');
        
        const allMovies: Movie[] = await moviesRes.json();
        const userRatings: Rating[] = await ratingsRes.json();
        const aggregateScores: AggregateScore[] = await scoresRes.json();
        const watchlistItems: { movieId: string }[] = await watchlistRes.json();
        const userReviews: { movieId: string; text: string }[] = await reviewsRes.json();
        
        const ratingsMap = new Map(userRatings.map(r => [r.movieId, r.score]));
        const scoresMap = new Map(aggregateScores.map(s => [s.movieId, s.score]));
        const watchlistSet = new Set(watchlistItems.map(w => w.movieId));
        const reviewsMap = new Map(userReviews.map(r => [r.movieId, r.text]));

        const moviesWithData = allMovies.map(movie => ({
          ...movie,
          currentUserRating: ratingsMap.get(movie.id) || 0,
          aggregateScore: scoresMap.get(movie.id) ?? null,
          isInWatchlist: watchlistSet.has(movie.id),
          currentUserReview: reviewsMap.get(movie.id) || null,
        }));

        setMovies(moviesWithData);
        
        // Update last fetch params
        lastFetchParams.current = {
          userId: currentUser.id,
          timestamp: calculationTimestamp
        };
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, readOnlyMode, calculationTimestamp]); // Suppressing movies.length to prevent cascade

  useEffect(() => {
    fetchMovieData();
  }, [fetchMovieData]);

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
    
    // Create the complete message with all available data
    let message = `${categoryPrefix}: ${movie.title} (${movie.year}) .... ${letterRating}`;
    
    // Add review text if available (regardless of rating status)
    if (!readOnlyMode && currentUser && movie.currentUserReview) {
      message += `.... ${movie.currentUserReview.trim()}`;
    }
    
    message += `\n\n--shared via https://peer-movie-rating-app.vercel.app`;

    // Helper function to get preview of copied content (last 2 lines)
    const getPreview = (text: string) => {
      const lines = text.split('\n').filter(line => line.trim() !== '');
      const lastTwoLines = lines.slice(-2).join('\n');
      return lastTwoLines.length > 80 ? lastTwoLines.substring(0, 80) + '...' : lastTwoLines;
    };

    // Helper function to ensure text is properly decoded (fixes iOS URL encoding issues)
    const ensurePlainText = (text: string) => {
      try {
        // Always decode first in case the text is already encoded
        let decodedText = text;
        
        // Check if text is URL-encoded by looking for common patterns
        if (text.includes('%20') || text.includes('%3A') || text.includes('%0A')) {
          decodedText = decodeURIComponent(text);
        }
        
        // Double-check and clean any remaining encoding
        decodedText = decodedText
          .replace(/%20/g, ' ')    // spaces
          .replace(/%3A/g, ':')    // colons
          .replace(/%0A/g, '\n')   // newlines
          .replace(/%2F/g, '/')    // forward slashes
          .replace(/%2E/g, '.')    // periods
          .replace(/%2D/g, '-');   // hyphens
        
        return decodedText;
      } catch (error) {
        // If decoding fails, return original text
        console.log('Text decode failed, using original:', error);
        return text;
      }
    };

    // Ensure our message is plain text
    const plainMessage = ensurePlainText(message);

    // Helper function to send logs to server (appears in Vercel logs)
    const serverLog = async (level: 'log' | 'warn' | 'error', message: string, data?: unknown) => {
      try {
        // Also log locally for immediate debugging
        console[level](`📋 ${message}`, data);
        
        // Send to server for Vercel logs
        fetch('/api/client-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level,
            message: `📋 ${message}`,
            data,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          })
        }).catch(err => console.error('Failed to send log to server:', err));
      } catch (error) {
        console.error('Logging failed:', error);
      }
    };

    // Debug logging to see what's happening (will appear in Vercel logs)
    const debugVersion = 'v2.1-' + Date.now();
    await serverLog('log', `COPY DEBUG ${debugVersion} - Original message:`, message);
    await serverLog('log', `COPY DEBUG ${debugVersion} - Plain message:`, plainMessage);
    await serverLog('log', `COPY DEBUG ${debugVersion} - Message contains URL encoding:`, message.includes('%20') || message.includes('%3A') || message.includes('%0A'));
    await serverLog('log', `COPY DEBUG ${debugVersion} - Fix is active!`, { movieTitle: movie.title });

    // Copy to clipboard IMMEDIATELY to preserve user interaction context (iOS requirement)
    try {
      // For iOS: Clear clipboard first, then write clean text (double-write to force refresh)
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        await navigator.clipboard.writeText(''); // Clear first
        await new Promise(resolve => setTimeout(resolve, 10)); // Brief pause
        await navigator.clipboard.writeText(plainMessage); // First write
        await new Promise(resolve => setTimeout(resolve, 10)); // Another brief pause
      }
      
      await navigator.clipboard.writeText(plainMessage); // Final write (works for all browsers)
      await serverLog('log', '✅ Successfully copied to clipboard', { 
        messageLength: plainMessage.length,
        movieTitle: movie.title,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent)
      });
      const preview = getPreview(plainMessage);
      const hasReview = !readOnlyMode && currentUser && movie.currentUserReview;
      showToast(`${hasReview ? 'Copied with review!' : 'Copied to clipboard!'}\n\n${preview}`);
    } catch (error) {
      // Comprehensive debug logging for clipboard failures
      const errorInfo = error instanceof Error ? {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack
      } : {
        errorName: 'Unknown',
        errorMessage: String(error),
        errorStack: undefined
      };

      const debugInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        hasClipboardAPI: !!navigator.clipboard,
        hasClipboardWriteText: !!navigator.clipboard?.writeText,
        documentHasFocus: document.hasFocus(),
        documentVisibilityState: document.visibilityState,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
        isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
        ...errorInfo,
        movieTitle: movie.title,
        messageLength: plainMessage.length,
        timestamp: new Date().toISOString()
      };
      
      await serverLog('error', '🚨 CLIPBOARD COPY FAILED - Debug Info:', debugInfo);
      await serverLog('error', 'Original error:', error);
      
      // Fallback for iOS/Safari: Use deprecated execCommand
      try {
        await serverLog('log', '🔄 Attempting fallback copy method (execCommand)...');
        const textArea = document.createElement('textarea');
        textArea.value = plainMessage;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          await serverLog('log', '✅ Fallback copy successful using execCommand');
          const preview = getPreview(plainMessage);
          const hasReview = !readOnlyMode && currentUser && movie.currentUserReview;
          showToast(`${hasReview ? 'Copied with review!' : 'Copied to clipboard!'}\n\n${preview}`);
        } else {
          await serverLog('error', '❌ Fallback copy failed - execCommand returned false');
          await serverLog('log', '📋 Attempting manual copy dialog fallback...');
          
          // Final fallback: Show the text in a prompt
          if (confirm('Copy failed. Would you like to see the text to copy manually?')) {
            prompt('Copy this text:', plainMessage);
            await serverLog('log', '👤 Manual copy dialog shown to user');
          } else {
            showToast('Failed to copy to clipboard', 'error');
            await serverLog('log', '👤 User declined manual copy dialog');
          }
        }
      } catch (fallbackError) {
        const fallbackErrorInfo = fallbackError instanceof Error ? {
          fallbackErrorName: fallbackError.name,
          fallbackErrorMessage: fallbackError.message,
          fallbackErrorStack: fallbackError.stack
        } : {
          fallbackErrorName: 'Unknown',
          fallbackErrorMessage: String(fallbackError),
          fallbackErrorStack: undefined
        };

        await serverLog('error', '🚨 FALLBACK COPY ALSO FAILED:', {
          ...debugInfo,
          ...fallbackErrorInfo
        });
        await serverLog('error', 'Fallback error:', fallbackError);
      
        // Final fallback: Show the text in a prompt
        if (confirm('Copy failed. Would you like to see the text to copy manually?')) {
          prompt('Copy this text:', plainMessage);
          await serverLog('log', '👤 Manual copy dialog shown after all methods failed');
        } else {
          showToast('Failed to copy to clipboard', 'error');
          await serverLog('log', '👤 User declined manual copy dialog after all methods failed');
        }
      }
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
        if (sortBy === 'releaseYearThenScore') {
          // First sort by release year (newest first)
          const yearDiff = b.year - a.year;
          
          // If years are different, use year sorting
          if (yearDiff !== 0) {
            return yearDiff;
          }
          
          // If years are the same, sort by aggregate score (highest first)
          const scoreA = a.aggregateScore ?? -1;
          const scoreB = b.aggregateScore ?? -1;
          return scoreB - scoreA;
        }
        if (sortBy === 'mostFeedback') {
          const aFeedback = (a.ratingsCount || 0) + (a.reviewsCount || 0);
          const bFeedback = (b.ratingsCount || 0) + (b.reviewsCount || 0);
          if (bFeedback !== aFeedback) return bFeedback - aFeedback;
          // tie-breaker: added date desc
          const dateDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          if (dateDiff !== 0) return dateDiff;
          // final tie: title
          return a.title.localeCompare(b.title);
        }
        const scoreA = sortBy === 'aggregateScore' ? a.aggregateScore ?? -1 : a.currentUserRating;
        const scoreB = sortBy === 'aggregateScore' ? b.aggregateScore ?? -1 : b.currentUserRating;
        return scoreB - scoreA;
      });
  }, [movies, categoryFilter, scoreThreshold, searchTerm, sortBy]);

  if (!currentUser && !readOnlyMode) return null;
  
  if (loading) return (
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-8 gap-6 mt-12" aria-label="Loading movie collection">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-[1.75rem] border border-stone-200/70 p-3">
          <div className="skeleton aspect-[2/3] rounded-[1.25rem]" />
          <div className="skeleton h-4 rounded-full mt-4 w-3/4" />
          <div className="skeleton h-8 rounded-full mt-3 w-full" />
        </div>
      ))}
    </div>
  );

  if (movies.length === 0) {
    return (
      <div className="card bg-white rounded-[1.75rem] border border-stone-200/70 text-center p-10 my-10 animate-rise">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
          <Clapperboard size={24} className="text-stone-400" />
        </div>
        <p className="section-title font-display text-lg text-ink">No movies have been added yet.</p>
        <p className="text-sm text-stone-500 mt-2">Use the search bar above to find and add movies to the list.</p>
      </div>
    );
  }

  return (
    <>
      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card bg-white rounded-[1.75rem] max-w-md w-full p-6 animate-rise">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink">Delete Movie</h3>
            </div>
            <p className="text-stone-600 text-sm mb-6 leading-relaxed">
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
                className="btn-secondary rounded-full px-5 min-h-[44px] text-sm font-semibold"
                disabled={deletingMovie === deleteConfirmation.movieId}
              >
                Cancel
              </button>
              <button
                onClick={() => handleMovieDelete(deleteConfirmation.movieId, deleteConfirmation.movieTitle)}
                disabled={deletingMovie === deleteConfirmation.movieId}
                className="rounded-full px-5 min-h-[44px] bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
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
          onReviewDeleted={(userId: string) => {
            // Optimistically update the UI immediately
            setMovies(movies.map(m => 
              m.id === activeReviews.movieId 
                ? { 
                    ...m, 
                    currentUserReview: userId === currentUser?.id ? null : m.currentUserReview,
                    reviewsCount: m.reviewsCount - 1 
                  }
                : m
            ));
            
            // Refresh movie data after a short delay to ensure DB is updated
            setTimeout(() => {
              fetchMovieData();
            }, 500);
          }}
        />
      )}
      {addReviewModal && currentUser && (
        <AddReviewModal
          movieId={addReviewModal.movieId}
          movieTitle={addReviewModal.movieTitle}
          userId={currentUser.id}
          onClose={() => setAddReviewModal(null)}
          onReviewAdded={(reviewText: string) => {
            // Optimistically update the UI immediately
            setMovies(movies.map(m => 
              m.id === addReviewModal.movieId 
                ? { 
                    ...m, 
                    currentUserReview: reviewText.trim(),
                    reviewsCount: m.reviewsCount + 1 
                  }
                : m
            ));
            
            // Refresh movie data after a short delay to ensure DB is updated
            setTimeout(() => {
              fetchMovieData();
            }, 500);
          }}
        />
      )}
      <section className="w-full mx-auto mt-6">
       <h2 className="section-title font-display text-2xl sm:text-3xl font-bold mb-6 text-ink border-b border-stone-200/70 pb-3 flex items-center gap-2.5">
         {categoryFilter === 'YET_TO_RATE' ? (
           <><Star size={26} className="text-amber-500 fill-current flex-shrink-0" /> Movies You Haven&apos;t Rated Yet</>
         ) : categoryFilter === 'WATCHLIST' ? (
           <><Eye size={26} className="text-brand flex-shrink-0" /> Your Watchlist</>
         ) : (
           <><Clapperboard size={26} className="text-brand flex-shrink-0" /> Your Movie Rankings</>
         )}
       </h2>
       <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-8 gap-6">
        {filteredAndSortedMovies.map((movie, i) => (
          <div 
            key={movie.id} 
            className="card group bg-white rounded-[1.75rem] border border-stone-200/70 shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-lift transition-all duration-300 animate-rise flex flex-col"
            style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
          >
            <div className="relative aspect-[2/3] overflow-hidden rounded-[1.25rem] m-3 mb-0 bg-stone-100"> 
                <Image
                  src={movie.posterUrl || '/placeholder.png'}
                  alt={`Poster for ${movie.title}`}
                layout="fill"
                objectFit="cover"
                className="group-hover:scale-105 transition-transform duration-500"
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
                  className="absolute top-2 left-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-red-600/90 text-white hover:bg-red-700/90 transition-all z-10 shadow-lg"
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
                  className={`absolute ${isAdmin ? 'top-2 left-14' : 'top-2 left-2'} min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-stone-500/70 text-white cursor-not-allowed`}
                  title="Sign in to add to watchlist"
                >
                  <Eye size={16} />
                </div>
              ) : (
                <button
                  onClick={() => handleWatchlistToggle(movie.id, movie.isInWatchlist)}
                  disabled={togglingWatchlist === movie.id}
                  className={`absolute ${isAdmin ? 'top-2 left-14' : 'top-2 left-2'} min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full transition-all ${
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
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur">
                  <Star size={12} className="text-yellow-400 fill-current" />
                  <span>{movie.tmdbRating.toFixed(1)}</span>
                </div>
              )}

              {/* Season badge - positioned below TMDb rating or top-right if no rating */}
              {movie.seasonNumber && (
                <div className={`absolute ${movie.tmdbRating ? 'top-10' : 'top-2'} right-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full`}>
                  S{movie.seasonNumber}
                </div>
              )}

              {/* Floating friend-score pill - bottom left, color-coded by grade band (scale 3-10) */}
              {movie.aggregateScore !== null && (
                <div className={`absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white backdrop-blur ${movie.aggregateScore >= 8 ? 'bg-emerald-500/95' : movie.aggregateScore >= 5 ? 'bg-amber-500/95' : 'bg-stone-500/95'}`}>
                  <Star size={12} className="fill-current" />
                  <span>{movie.aggregateScore.toFixed(1)}</span>
                </div>
              )}
            </div>
            <div className="p-4 pt-3 flex flex-col flex-1 gap-3">
              <MovieTitleLink
                tmdbId={movie.tmdbId}
                title={movie.title}
                year={movie.year}
                mediaType={movie.mediaType}
                tmdbUrl={movie.tmdbUrl}
                className="font-display font-bold text-base text-ink hover:text-brand transition-colors line-clamp-2"
              />

              {/* Action buttons */}
              <div className="flex flex-wrap gap-1.5">
                {readOnlyMode ? (
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full px-3 min-h-[40px] text-xs font-medium text-stone-400 cursor-not-allowed"
                    title="Sign in to add reviews"
                  >
                    <MessageSquare size={14} />
                    Review
                  </div>
                ) : (
                  <button
                    onClick={() => setAddReviewModal({ movieId: movie.id, movieTitle: movie.title })}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 min-h-[40px] text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                    title="Add review"
                  >
                    <MessageSquare size={14} />
                    Review
                  </button>
                )}
                <button
                  onClick={() => setActiveReviews({ movieId: movie.id, movieTitle: movie.title })}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 min-h-[40px] text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                  title="Show user reviews"
                >
                  <Info size={14} />
                  Details
                </button>
                {/* Temporarily removed Users/Discussion button - keeping function for future use
                <button
                  onClick={() => handleDiscussionClick(movie)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 min-h-[40px] text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                  title="Discuss this movie in forum"
                >
                  <Users size={18} />
                  Discuss
                </button>
                */}
                <button
                  onClick={() => shareToWhatsApp(movie)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 min-h-[40px] text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                  title="Copy movie details"
                >
                  <Share2 size={14} />
                  Share
                </button>
              </div>

              {/* Rating and Review counts */}
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <div className="flex items-center gap-1">
                  <Star size={12} className="text-amber-400" />
                  <span>{movie.ratingsCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare size={12} className="text-sky-500" />
                  <span>{movie.reviewsCount}</span>
                </div>
              </div>

              <div className="mt-auto pt-1">
                {readOnlyMode ? (
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-center">
                    <p className="text-stone-500 text-xs mb-2">Sign in to rate this movie</p>
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
            <div className="px-4 pb-4">
              <div className="rounded-2xl bg-stone-50 border border-stone-100 p-2">
                <Scorecard
                  score={movie.aggregateScore}
                  label={readOnlyMode ? "Community Score" : "Friend Score"}
                />
              </div>
            </div>
          </div>
        ))}
       </div>
       {filteredAndSortedMovies.length === 0 && movies.length > 0 && (
         <div className="card bg-white rounded-[1.75rem] border border-stone-200/70 text-center p-10 my-10 animate-rise">
           {categoryFilter === 'YET_TO_RATE' && (
             <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
               <PartyPopper size={24} className="text-amber-600" />
             </div>
           )}
           <p className="section-title font-display text-lg text-ink">
             {categoryFilter === 'YET_TO_RATE'
               ? 'Great job! You\'ve rated all the movies in your collection.'
               : categoryFilter === 'WATCHLIST'
               ? 'Your watchlist is empty. Add movies to watch later!'
               : 'No movies match your current filters.'
             }
           </p>
           <p className="text-sm text-stone-500 mt-2">
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
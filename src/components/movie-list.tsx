'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@/context/user-context';
import CustomRatingInput from './custom-rating';
import Image from 'next/image';
import { Scorecard } from './score-components';
import { Info, MessageSquarePlus, Star } from 'lucide-react';
import ReviewsModal from './reviews-modal';
import { useToast } from '@/context/toast-context';

// Manually define types to avoid server/client type mismatches
export type Category = 'MOVIE' | 'SERIES' | 'DOCUMENTARY';
type FilterCategory = Category | 'ALL';
type SortKey = 'aggregateScore' | 'currentUserRating' | 'title';

interface Movie {
  id: string;
  title: string;
  year: number;
  posterUrl: string | null;
  tmdbId: string;
  tmdbRating: number | null;
  tmdbVoteCount: number | null;
  category: Category;
}
interface Rating { movieId: string; score: number; }
interface AggregateScore { movieId: string; score: number; }

interface MovieWithRatingsAndScores extends Movie {
  currentUserRating: number;
  aggregateScore: number | null;
}

interface MovieListProps {
  calculationTimestamp: number | null;
  categoryFilter: FilterCategory;
  scoreThreshold: number;
  searchTerm: string;
  sortBy: SortKey;
}

export default function MovieList({ calculationTimestamp, categoryFilter, scoreThreshold, searchTerm, sortBy }: MovieListProps) {
  const { currentUser } = useUser();
  const { showToast } = useToast();
  const [movies, setMovies] = useState<MovieWithRatingsAndScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReviews, setActiveReviews] = useState<{ movieId: string; movieTitle: string; } | null>(null);
  const [isReviewing, setIsReviewing] = useState<string | null>(null);
  const [reviewText, setReviewText] = useState('');

  const fetchMovieData = useCallback(async () => {
    if (!currentUser) {
      setMovies([]);
      return;
    }
    setLoading(true);
    try {
      const [moviesRes, ratingsRes, scoresRes] = await Promise.all([
        fetch('/api/movies'),
        fetch(`/api/ratings?userId=${currentUser.id}`),
        fetch(`/api/aggregate-scores?userId=${currentUser.id}`),
      ]);
      if (!moviesRes.ok || !ratingsRes.ok || !scoresRes.ok) throw new Error('Failed to fetch data');
      
      const allMovies: Movie[] = await moviesRes.json();
      const userRatings: Rating[] = await ratingsRes.json();
      const aggregateScores: AggregateScore[] = await scoresRes.json();
      
      const ratingsMap = new Map(userRatings.map(r => [r.movieId, r.score]));
      const scoresMap = new Map(aggregateScores.map(s => [s.movieId, s.score]));

      const moviesWithData = allMovies.map(movie => ({
        ...movie,
        currentUserRating: ratingsMap.get(movie.id) || 0,
        aggregateScore: scoresMap.get(movie.id) ?? null,
      })).sort((a, b) => (b.aggregateScore ?? -1) - (a.aggregateScore ?? -1)); // Sort by score descending

      setMovies(moviesWithData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchMovieData();
  }, [fetchMovieData, calculationTimestamp]);

  const filteredAndSortedMovies = useMemo(() => {
    return movies
      .filter(movie => {
        const categoryMatch = categoryFilter === 'ALL' || movie.category === categoryFilter;
        const scoreMatch = movie.aggregateScore === null || movie.aggregateScore >= scoreThreshold;
        const searchMatch = searchTerm === '' || movie.title.toLowerCase().includes(searchTerm.toLowerCase());
        return categoryMatch && scoreMatch && searchMatch;
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        // For scores, nulls are treated as -1 to sort them at the end.
        const scoreA = sortBy === 'aggregateScore' ? a.aggregateScore ?? -1 : a.currentUserRating;
        const scoreB = sortBy === 'aggregateScore' ? b.aggregateScore ?? -1 : b.currentUserRating;
        return scoreB - scoreA;
      });
  }, [movies, categoryFilter, scoreThreshold, searchTerm, sortBy]);

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
      // Optional: Revert optimistic update on error
      fetchMovieData(); 
    }
  };

  const handleReviewSubmit = async (movieId: string) => {
    if (!currentUser || !reviewText.trim()) return;

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId: movieId,
          userId: currentUser.id,
          text: reviewText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit review');
      }

      showToast('Review added successfully!', 'success');
      setReviewText('');
      setIsReviewing(null);
    } catch (error) {
      if (error instanceof Error) {
        showToast(error.message, 'error');
      }
      console.error('Failed to submit review:', error);
    }
  };

  if (!currentUser) return null;
  
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
          onClose={() => setActiveReviews(null)}
        />
      )}
      <section className="w-full max-w-7xl mx-auto mt-6">
        <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">Your Movie Rankings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
          {filteredAndSortedMovies.map((movie) => (
            <div key={movie.id} className="bg-white border rounded-lg shadow-md overflow-hidden group flex flex-col justify-between">
              <div>
                <div className="relative">
                  <Image
                    src={movie.posterUrl || '/placeholder.png'}
                    alt={`Poster for ${movie.title}`}
                    width={500}
                    height={750}
                    className="w-full h-auto object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  {movie.tmdbRating && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-full">
                      <Star size={12} className="text-yellow-400" />
                      <span>{movie.tmdbRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <a 
                      href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-base text-slate-100 flex-grow hover:text-cyan-400 transition-colors bg-transparent" 
                      title={movie.title}
                    >
                      {movie.title} ({movie.year})
                    </a>
                    <button 
                      onClick={() => setActiveReviews({ movieId: movie.id, movieTitle: movie.title })}
                      className="p-1 text-slate-400 hover:text-cyan-400 transition-colors flex-shrink-0"
                      title="Show user reviews"
                    >
                      <Info size={20} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <button 
                        onClick={() => setIsReviewing(isReviewing === movie.id ? null : movie.id)}
                        className="ml-auto p-1 text-gray-400 hover:text-indigo-600"
                        title="Add a review"
                      >
                        <MessageSquarePlus size={18} />
                      </button>
                    </div>
                    <CustomRatingInput
                      initialScore={movie.currentUserRating}
                      onRatingSubmit={(score) => handleRatingSubmit(movie.id, score)}
                      disabled={!currentUser}
                    />
                  </div>
                  {isReviewing === movie.id && (
                    <div className="mt-4 space-y-2">
                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Write a short review..."
                        maxLength={100}
                        className="w-full p-2 border rounded-md text-sm"
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-400">{reviewText.length}/100</p>
                        <button 
                          onClick={() => handleReviewSubmit(movie.id)}
                          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 bg-black/30 border-t border-slate-800">
                <Scorecard score={movie.aggregateScore} />
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
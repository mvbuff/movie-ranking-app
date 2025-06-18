'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@/context/user-context';
import CustomRatingInput from './custom-rating';
import Image from 'next/image';
import { Scorecard } from './score-components';
import { Info, Star } from 'lucide-react';
import ReviewsModal from './reviews-modal';
import MovieRatingDisplay from './movie-rating-display';

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
  const [movies, setMovies] = useState<MovieWithRatingsAndScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReviews, setActiveReviews] = useState<{ movieId: string; movieTitle: string; } | null>(null);

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
      }));

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
        const scoreA = sortBy === 'aggregateScore' ? a.aggregateScore ?? -1 : a.currentUserRating;
        const scoreB = sortBy === 'aggregateScore' ? b.aggregateScore ?? -1 : b.currentUserRating;
        return scoreB - scoreA;
      });
  }, [movies, categoryFilter, scoreThreshold, searchTerm, sortBy]);

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
      <section className="w-full mx-auto mt-6">
       <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">Your Movie Rankings</h2>
       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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
                <button 
                  onClick={() => setActiveReviews({ movieId: movie.id, movieTitle: movie.title })}
                  className="p-1 text-gray-400 hover:text-indigo-600"
                  title="Show user reviews"
                >
                  <Info size={18} />
                </button>
              </div>
              <div className="mt-auto pt-4">
                <MovieRatingDisplay score={movie.currentUserRating} />
              </div>
            </div>
            <div className="p-2 bg-gray-50 border-t">
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
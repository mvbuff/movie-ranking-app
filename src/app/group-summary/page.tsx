'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Star, Share2, ExternalLink } from 'lucide-react';
import { Suspense } from 'react';
import { getRatingDisplay } from '@/lib/rating-system';
import { useToast } from '@/context/toast-context';
import TmdbLink from '@/components/tmdb-link';

interface MovieSummary {
  id: string;
  title: string;
  year: number;
  posterUrl: string | null;
  tmdbId: string;
  tmdbUrl: string | null; // Canonical TMDB URL
  tmdbRating: number | null;
  category: string;
  ratings: Array<{
    score: number;
    userName: string;
  }>;
  aggregateScore: number | null;
  ratingCount: number;
}

function GroupSummaryContent() {
  const [movies, setMovies] = useState<MovieSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('Movie Group');
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchGroupSummary = async () => {
      try {
        const userIds = searchParams.get('userIds') || '';
        const name = searchParams.get('name') || 'Movie Group';
        setGroupName(name);
        
        const response = await fetch(`/api/group-summary?userIds=${userIds}`);
        if (response.ok) {
          const data = await response.json();
          setMovies(data);
        }
      } catch (error) {
        console.error('Failed to fetch group summary:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupSummary();
  }, [searchParams]);

  const shareGroupSummary = async () => {
    const url = window.location.href;
    const topMovies = movies
      .filter(m => m.aggregateScore && m.aggregateScore >= 7)
      .slice(0, 5)
      .map(m => {
        const categoryPrefix = m.category === 'MOVIE' ? 'Mreco' : 
                              m.category === 'SERIES' ? 'Sreco' : 'Dreco';
        return `${categoryPrefix}: ${m.title} (${getRatingDisplay(m.aggregateScore)})`;
      })
      .join('\n');
    
    const message = `🎬 ${groupName} Top Picks:\n\n${topMovies}\n\nSee full list: ${url}`;
    
    try {
      await navigator.clipboard.writeText(message);
      showToast('Group summary copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      showToast('Failed to copy link', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-gray-500">Loading group summary...</p>
        </div>
      </div>
    );
  }

  const topRatedMovies = movies
    .filter(m => m.aggregateScore !== null)
    .sort((a, b) => (b.aggregateScore || 0) - (a.aggregateScore || 0))
    .slice(0, 10);

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {groupName} Movie Rankings
          </h1>
          <p className="text-gray-600 mb-6">
            Collective movie ratings and recommendations
          </p>
          
          <div className="flex justify-center gap-4">
            <button
              onClick={shareGroupSummary}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Share2 size={18} />
              Copy for WhatsApp
            </button>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink size={18} />
              Copy Link
            </button>
          </div>
        </div>

        {movies.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-gray-500">No movies found for this group.</p>
          </div>
        ) : (
          <>
            <div className="mb-8 p-6 bg-white rounded-lg shadow-sm">
              <h2 className="text-2xl font-bold mb-4">📊 Group Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-blue-600">{movies.length}</div>
                  <div className="text-gray-600">Total Movies</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600">{topRatedMovies.length}</div>
                  <div className="text-gray-600">Rated Movies</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-600">
                    {topRatedMovies.length > 0 ? (topRatedMovies[0].aggregateScore || 0).toFixed(1) : '0.0'}
                  </div>
                  <div className="text-gray-600">Top Score</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-orange-600">
                    {topRatedMovies.length > 0 ? 
                      (topRatedMovies.reduce((sum, m) => sum + (m.aggregateScore || 0), 0) / topRatedMovies.length).toFixed(1) 
                      : '0.0'
                    }
                  </div>
                  <div className="text-gray-600">Avg Score</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-6">🏆 Top Rated Movies</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topRatedMovies.map((movie, index) => (
                  <div key={movie.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="relative h-64">
                      <Image
                        src={movie.posterUrl || '/placeholder.png'}
                        alt={`Poster for ${movie.title}`}
                        layout="fill"
                        objectFit="cover"
                      />
                      <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm font-bold">
                        #{index + 1}
                      </div>
                      {movie.tmdbRating && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                          <Star size={12} className="text-yellow-400" />
                          <span>{movie.tmdbRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-sm">{movie.title} ({movie.year})</h3>
                        <div className="text-right">
                          {movie.aggregateScore && (
                            <div className="text-lg font-bold text-indigo-600">
                              {getRatingDisplay(movie.aggregateScore)}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            {movie.ratingCount} rating{movie.ratingCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {movie.ratings.map((rating, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">{rating.userName}</span>
                            <span className="font-medium">{getRatingDisplay(rating.score)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
                        <TmdbLink tmdbId={movie.tmdbId} size={14} className="text-blue-600 hover:text-blue-800" />
                        <span>View on TMDB</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function GroupSummaryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <GroupSummaryContent />
    </Suspense>
  );
} 
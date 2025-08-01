'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useUser } from '@/context/user-context';
import { useToast } from '@/context/toast-context';
import CustomRatingInput from './custom-rating';
import { getGradeFromScore } from '@/lib/rating-system';

interface Season {
  id: string;
  title: string;
  seasonNumber: number;
  episodeCount: number;
  year: number;
  posterUrl?: string;
  ratings?: Array<{
    id: string;
    score: number;
    user: { name: string };
  }>;
}

interface ShowWithSeasons {
  id: string;
  title: string;
  tmdbId: string;
  posterUrl?: string;
  seasons: Season[];
  ratings?: Array<{
    id: string;
    score: number;
    user: { name: string };
  }>;
}

interface SeasonSelectorProps {
  tmdbId: string;
  onClose: () => void;
}

export default function SeasonSelector({ tmdbId, onClose }: SeasonSelectorProps) {
  const [show, setShow] = useState<ShowWithSeasons | null>(null);
  const [loading, setLoading] = useState(true);

  const [ratingMode, setRatingMode] = useState<'show' | 'season'>('show');
  const { currentUser } = useUser();
  const { showToast } = useToast();

  const fetchShowData = useCallback(async () => {
    try {
      const response = await fetch(`/api/tv-shows?tmdbId=${tmdbId}`);
      if (response.ok) {
        const data = await response.json();
        setShow(data);
      } else {
        showToast('Show not found in database', 'error');
      }
    } catch (error) {
      console.error('Failed to fetch show:', error);
      showToast('Failed to load show data', 'error');
    } finally {
      setLoading(false);
    }
  }, [tmdbId, showToast]);

  useEffect(() => {
    fetchShowData();
  }, [fetchShowData]);

  const addShowWithSeasons = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const response = await fetch('/api/tv-shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId,
          userId: currentUser.id,
          includeSeasons: true
        })
      });

      if (response.ok) {
        showToast('TV show and seasons added successfully!', 'success');
        await fetchShowData(); // Refresh data
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to add show', 'error');
      }
    } catch (error) {
      console.error('Failed to add show:', error);
      showToast('Failed to add show', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingWithScore = async (score: number, targetId: string) => {
    if (!currentUser) return;

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          movieId: targetId,
          score
        })
      });

      if (response.ok) {
        showToast('Rating added successfully!', 'success');
        await fetchShowData(); // Refresh to show new rating
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to add rating', 'error');
      }
    } catch (error) {
      console.error('Failed to add rating:', error);
      showToast('Failed to add rating', 'error');
    }
  };

  const getUserRating = (ratings?: Array<{ score: number; user: { name: string } }>) => {
    if (!ratings || !currentUser) return null;
    const userRating = ratings.find(r => r.user.name === currentUser.name);
    return userRating ? userRating.score : null;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-center">Loading show data...</p>
        </div>
      </div>
    );
  }

  if (!show) {
    // Show not in database - offer to add it
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-bold mb-4">Add TV Show</h3>
          <p className="text-gray-600 mb-4">
            This TV show isn&apos;t in our database yet. Would you like to add it with all its seasons?
          </p>
          <div className="flex gap-3">
            <button
              onClick={addShowWithSeasons}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Show + Seasons
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold">{show.title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        {/* Rating Mode Toggle */}
        <div className="mb-6">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setRatingMode('show')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                ratingMode === 'show' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Rate Entire Show
            </button>
            <button
              onClick={() => setRatingMode('season')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                ratingMode === 'season' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Rate Individual Seasons
            </button>
          </div>
        </div>

        {ratingMode === 'show' ? (
          /* Rate Entire Show */
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-4">Rate &quot;{show.title}&quot; as a whole</h4>
            <div className="flex items-center gap-4">
              <Image 
                src={show.posterUrl || '/placeholder.png'} 
                alt={show.title}
                width={64}
                height={96}
                className="w-16 h-24 object-cover rounded"
              />
              <div className="flex-1">
                <CustomRatingInput
                  onRatingSubmit={(score: number) => handleRatingWithScore(score, show.id)}
                  initialScore={getUserRating(show.ratings) || 0}
                  disabled={false}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Rate Individual Seasons */
          <div>
            <h4 className="text-lg font-semibold mb-4">Rate Individual Seasons</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {show.seasons.map((season) => {
                const userRating = getUserRating(season.ratings);
                const { grade } = userRating ? getGradeFromScore(userRating) : { grade: null };
                
                return (
                  <div key={season.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Image 
                        src={season.posterUrl || show.posterUrl || '/placeholder.png'} 
                        alt={season.title}
                        width={48}
                        height={64}
                        className="w-12 h-16 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm truncate">{season.title}</h5>
                        <p className="text-xs text-gray-500">
                          {season.episodeCount} episodes • {season.year}
                        </p>
                        {userRating && (
                          <p className="text-xs text-blue-600 font-medium">
                            Your rating: {grade}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <CustomRatingInput
                      onRatingSubmit={(score: number) => handleRatingWithScore(score, season.id)}
                      initialScore={userRating || 0}
                      disabled={false}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
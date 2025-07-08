import { useState, useEffect } from 'react';

/**
 * Custom hook to generate the correct TMDB URL for a given TMDB ID
 * @param tmdbId - The TMDB ID to generate a URL for
 * @returns The correct TMDB URL (defaults to movie format while loading)
 */
export function useTmdbUrl(tmdbId: string): string {
  const [url, setUrl] = useState(`https://www.themoviedb.org/movie/${tmdbId}`);

  useEffect(() => {
    // Skip API call for manual entries
    if (tmdbId.startsWith('manual_')) {
      setUrl(`https://www.themoviedb.org/movie/${tmdbId}`);
      return;
    }

    const determineMediaType = async () => {
      try {
        const response = await fetch(`/api/tmdb-media-type?tmdbId=${tmdbId}`);
        
        if (response.ok) {
          const { mediaType } = await response.json();
          setUrl(`https://www.themoviedb.org/${mediaType}/${tmdbId}`);
        }
      } catch (error) {
        console.error('Error determining TMDB media type:', error);
        // Keep default movie URL on error
      }
    };

    determineMediaType();
  }, [tmdbId]);

  return url;
} 
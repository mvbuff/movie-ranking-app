const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = 'https://api.themoviedb.org/3';

// Cache for storing media type results to avoid repeated API calls
const mediaTypeCache = new Map<string, string>();

/**
 * Caches the media type for a TMDB ID
 * @param tmdbId - The TMDB ID
 * @param mediaType - The media type ('movie' or 'tv')
 */
export function cacheMediaType(tmdbId: string, mediaType: 'movie' | 'tv'): void {
  mediaTypeCache.set(tmdbId, mediaType);
}

/**
 * Clears the cache for a specific TMDB ID (forces re-determination)
 * @param tmdbId - The TMDB ID to clear from cache
 */
export function clearMediaTypeCache(tmdbId: string): void {
  mediaTypeCache.delete(tmdbId);
}

/**
 * Forces a specific media type for a TMDB ID (overrides cache and API logic)
 * @param tmdbId - The TMDB ID
 * @param mediaType - The media type to force
 */
export function forceMediaType(tmdbId: string, mediaType: 'movie' | 'tv'): void {
  mediaTypeCache.set(tmdbId, mediaType);
  console.log(`Forced TMDB ID ${tmdbId} to be ${mediaType}`);
}

/**
 * Determines if a TMDB ID corresponds to a movie or TV show
 * @param tmdbId - The TMDB ID to check
 * @returns Promise<'movie' | 'tv' | null> - Returns the media type or null if not found
 */
export async function getTmdbMediaType(tmdbId: string): Promise<'movie' | 'tv' | null> {
  // Skip API call for manual entries
  if (tmdbId.startsWith('manual_')) {
    return 'movie'; // Default to movie for manual entries
  }

  // Check cache first
  if (mediaTypeCache.has(tmdbId)) {
    return mediaTypeCache.get(tmdbId) as 'movie' | 'tv';
  }

  if (!TMDB_API_KEY) {
    console.warn('TMDB_API_KEY not found, defaulting to movie');
    return 'movie';
  }

  try {
    // Check both endpoints simultaneously to handle ambiguous cases
    const [movieResponse, tvResponse] = await Promise.all([
      fetch(`${TMDB_API_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`),
      fetch(`${TMDB_API_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`)
    ]);

    const movieValid = movieResponse.ok;
    const tvValid = tvResponse.ok;

    if (movieValid && tvValid) {
      // Ambiguous case - both endpoints return valid results
      // We need to determine which one is more likely correct
      try {
        const [movieData, tvData] = await Promise.all([
          movieResponse.json(),
          tvResponse.json()
        ]);

        // Prefer TV shows if they have a more recent release date
        // This handles cases where the same ID exists for both types
        const movieYear = movieData.release_date ? new Date(movieData.release_date).getFullYear() : 0;
        const tvYear = tvData.first_air_date ? new Date(tvData.first_air_date).getFullYear() : 0;

        if (tvYear > movieYear) {
          mediaTypeCache.set(tmdbId, 'tv');
          console.log(`Ambiguous TMDB ID ${tmdbId}: Choosing TV (${tvYear}) over movie (${movieYear})`);
          return 'tv';
        } else if (movieYear > tvYear) {
          mediaTypeCache.set(tmdbId, 'movie');
          console.log(`Ambiguous TMDB ID ${tmdbId}: Choosing movie (${movieYear}) over TV (${tvYear})`);
          return 'movie';
        } else {
          // If same year or no dates, prefer TV (more likely to be the intended content)
          mediaTypeCache.set(tmdbId, 'tv');
          console.log(`Ambiguous TMDB ID ${tmdbId}: Defaulting to TV`);
          return 'tv';
        }
      } catch {
        // If we can't parse the response, default to TV for ambiguous cases
        mediaTypeCache.set(tmdbId, 'tv');
        return 'tv';
      }
    }

    if (movieValid) {
      mediaTypeCache.set(tmdbId, 'movie');
      return 'movie';
    }

    if (tvValid) {
      mediaTypeCache.set(tmdbId, 'tv');
      return 'tv';
    }

    // If both fail, default to movie
    console.warn(`Could not determine media type for TMDB ID: ${tmdbId}`);
    return 'movie';
  } catch (error) {
    console.error('Error determining TMDB media type:', error);
    return 'movie'; // Default to movie on error
  }
}

/**
 * Generates the correct TMDB URL for a given TMDB ID
 * @param tmdbId - The TMDB ID
 * @returns Promise<string> - The correct TMDB URL
 */
export async function generateTmdbUrl(tmdbId: string): Promise<string> {
  const mediaType = await getTmdbMediaType(tmdbId);
  return `https://www.themoviedb.org/${mediaType}/${tmdbId}`;
}

/**
 * Client-side version that uses a fallback approach
 * @param tmdbId - The TMDB ID
 * @returns Promise<string> - The correct TMDB URL
 */
export async function generateTmdbUrlClient(tmdbId: string): Promise<string> {
  try {
    // For client-side, we'll make a request to our API endpoint
    const response = await fetch(`/api/tmdb-media-type?tmdbId=${tmdbId}`);
    
    if (response.ok) {
      const { mediaType } = await response.json();
      return `https://www.themoviedb.org/${mediaType}/${tmdbId}`;
    }
    
    // Fallback to movie if API call fails
    return `https://www.themoviedb.org/movie/${tmdbId}`;
  } catch (error) {
    console.error('Error generating TMDB URL:', error);
    return `https://www.themoviedb.org/movie/${tmdbId}`;
  }
} 
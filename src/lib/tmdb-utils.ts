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
 * Extracts the parent show TMDB ID from a season TMDB ID
 * @param tmdbId - The TMDB ID (could be season format like "12345-s1")
 * @returns The parent show TMDB ID
 */
export function getParentShowTmdbId(tmdbId: string): string {
  // Check if this is a season ID format (e.g., "12345-s1")
  const seasonMatch = tmdbId.match(/^(\d+)-s\d+$/);
  if (seasonMatch) {
    return seasonMatch[1]; // Return the parent show ID
  }
  return tmdbId; // Return as-is if not a season ID
}

/**
 * Generates the canonical TMDB URL for a show/movie/season
 * @param tmdbId - The TMDB ID (can include season suffix like "12345-s2")
 * @param showName - The show/movie name  
 * @param mediaType - The media type ('movie' or 'tv')
 * @returns The canonical TMDB URL
 */
export function generateCanonicalTmdbUrl(tmdbId: string, showName: string, mediaType: string = 'tv'): string {
  const cleanId = tmdbId.includes('-s') ? tmdbId.split('-s')[0] : tmdbId;
  
  // For TV shows, always use slug format for better URLs
  if (mediaType === 'tv') {
    const slug = showName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    // Always return the main show URL (even for seasons)
    return `https://www.themoviedb.org/${mediaType}/${cleanId}-${slug}`;
  }
  
  // For movies, use numeric format (can add slug support later if needed)
  return `https://www.themoviedb.org/${mediaType}/${cleanId}`;
}

// Known shows that require slug format URLs
const SHOWS_REQUIRING_SLUG_FORMAT = new Set([
  '1421', // Modern Family
  // Add more as discovered
]);

/**
 * Generates TMDB URL with fallback for shows that need slug format
 * @param tmdbId - The TMDB ID
 * @param mediaType - The media type ('movie' or 'tv')
 * @param showTitle - Optional show title for slug format fallback
 * @returns The TMDB URL with fallback handling
 */
export function generateTmdbUrlWithFallback(tmdbId: string, mediaType: string = 'tv', showTitle?: string): string {
  const parentTmdbId = getParentShowTmdbId(tmdbId);
  
  // Check if this show is known to require slug format
  if (mediaType === 'tv' && SHOWS_REQUIRING_SLUG_FORMAT.has(parentTmdbId) && showTitle) {
    // Extract just the show name (remove season info if present)
    const cleanShowTitle = showTitle.includes(' - ') ? showTitle.split(' - ')[0] : showTitle;
    
    // Convert title to slug format (lowercase, spaces to hyphens, remove special chars)
    const slug = cleanShowTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    return `https://www.themoviedb.org/${mediaType}/${parentTmdbId}-${slug}`;
  }
  
  // Default format (works for most shows)
  return `https://www.themoviedb.org/${mediaType}/${parentTmdbId}`;
}

/**
 * Generates a proper TMDB URL, handling season IDs correctly
 * @param tmdbId - The TMDB ID (could be season format)
 * @param mediaType - The media type ('movie' or 'tv')
 * @returns The correct TMDB URL
 */
export function generateTmdbUrlForSeason(tmdbId: string, mediaType?: string): string {
  const parentTmdbId = getParentShowTmdbId(tmdbId);
  const finalMediaType = mediaType || (tmdbId.includes('-s') ? 'tv' : 'movie');
  return `https://www.themoviedb.org/${finalMediaType}/${parentTmdbId}`;
}

/**
 * Gets or creates a hidden parent show record for TMDB link resolution
 * @param parentTmdbId - The parent show TMDB ID
 * @returns Promise<Movie | null> - The parent show record or null if creation fails
 */
export async function getOrCreateHiddenParentShow(parentTmdbId: string): Promise<{
  id: string;
  title: string;
  tmdbId: string;
  year: number;
  posterUrl: string | null;
  category: string;
  mediaType: string | null;
  tmdbRating: number | null;
  tmdbVoteCount: number | null;
  isHidden: boolean;
} | null> {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    // First check if parent show already exists (hidden or visible)
    let parentShow = await prisma.movie.findUnique({
      where: { tmdbId: parentTmdbId }
    });
    
    if (parentShow) {
      return parentShow;
    }
    
    // If parent show doesn't exist, create a hidden one
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    if (!TMDB_API_KEY) {
      console.warn('TMDB_API_KEY not found, cannot create parent show');
      return null;
    }
    
    // Fetch show data from TMDB API
    const response = await fetch(`https://api.themoviedb.org/3/tv/${parentTmdbId}?api_key=${TMDB_API_KEY}`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch show data from TMDB for ID ${parentTmdbId}`);
      return null;
    }
    
    const showData = await response.json();
    
    // Create hidden parent show record
    parentShow = await prisma.movie.create({
      data: {
        tmdbId: parentTmdbId,
        title: showData.name,
        year: showData.first_air_date ? parseInt(showData.first_air_date.substring(0, 4)) : 0,
        posterUrl: showData.poster_path ? `https://image.tmdb.org/t/p/w500${showData.poster_path}` : null,
        category: 'SERIES',
        mediaType: 'tv',
        tmdbUrl: generateCanonicalTmdbUrl(parentTmdbId, showData.name, 'tv'), // Store canonical URL for parent show
        tmdbRating: showData.vote_average,
        tmdbVoteCount: showData.vote_count,
        isHidden: true, // Mark as hidden so it doesn't appear in main list
      }
    });
    
    console.log(`Created hidden parent show: ${parentShow.title} (${parentTmdbId})`);
    return parentShow;
    
  } catch (error) {
    console.error(`Error getting/creating parent show ${parentTmdbId}:`, error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Client-side version that uses a fallback approach
 * @param tmdbId - The TMDB ID
 * @returns Promise<string> - The correct TMDB URL
 */
export async function generateTmdbUrlClient(tmdbId: string): Promise<string> {
  try {
    // For season IDs, extract parent show ID and use 'tv' media type
    if (tmdbId.includes('-s')) {
      const parentTmdbId = getParentShowTmdbId(tmdbId);
      return `https://www.themoviedb.org/tv/${parentTmdbId}`;
    }

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
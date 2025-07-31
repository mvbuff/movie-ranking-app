import { NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  throw new Error("Missing TMDb API key. Please add TMDB_API_KEY to your .env file.");
}

// Indian language codes for prioritizing Indian content
const INDIAN_LANGUAGES = [
  'hi', // Hindi
  'ta', // Tamil
  'te', // Telugu
  'ml', // Malayalam
  'kn', // Kannada
  'bn', // Bengali
  'gu', // Gujarati
  'mr', // Marathi
  'pa', // Punjabi
];

// Function to check if content is Indian
function isIndianContent(item: { original_language?: string }): boolean {
  return !!item.original_language && INDIAN_LANGUAGES.includes(item.original_language);
}

// Function to get year from release date
function getYear(item: { release_date?: string; first_air_date?: string }): number {
  const date = item.release_date || item.first_air_date;
  return date ? parseInt(date.substring(0, 4), 10) : 0;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const year = searchParams.get('year'); // Optional year filter

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    // Build search URLs with optional year filter
    const movieUrl = `${TMDB_API_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}${year ? `&year=${year}` : ''}`;
    const tvUrl = `${TMDB_API_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}${year ? `&first_air_date_year=${year}` : ''}`;
    
    // Fetch both page 1 and page 2 for more comprehensive results
    const [movieRes1, tvRes1, movieRes2, tvRes2] = await Promise.all([
      fetch(`${movieUrl}&page=1`),
      fetch(`${tvUrl}&page=1`),
      fetch(`${movieUrl}&page=2`),
      fetch(`${tvUrl}&page=2`)
    ]);

    if (!movieRes1.ok || !tvRes1.ok) {
        console.error("TMDb API error:", { movieStatus: movieRes1.status, tvStatus: tvRes1.status });
        return NextResponse.json({ error: 'Failed to fetch from TMDb' }, { status: 500 });
    }

    const [movies1, tvShows1, movies2, tvShows2] = await Promise.all([
      movieRes1.json(),
      tvRes1.json(),
      movieRes2.ok ? movieRes2.json() : { results: [] },
      tvRes2.ok ? tvRes2.json() : { results: [] }
    ]);

    interface MediaItem {
        id: number;
        popularity: number;
        original_language?: string;
        release_date?: string;
        first_air_date?: string;
    }

    // Combine results from both pages and remove duplicates
    const allResults = [
        ...movies1.results.map((m: MediaItem) => ({ ...m, media_type: 'movie' })),
        ...tvShows1.results.map((t: MediaItem) => ({ ...t, media_type: 'tv' })),
        ...movies2.results.map((m: MediaItem) => ({ ...m, media_type: 'movie' })),
        ...tvShows2.results.map((t: MediaItem) => ({ ...t, media_type: 'tv' }))
    ];
    
    // Remove duplicates by ID
    const seenIds = new Set();
    const combinedResults = allResults.filter((item: MediaItem) => {
        if (seenIds.has(item.id)) {
            return false;
        }
        seenIds.add(item.id);
        return true;
    });

    // Improved sorting: Recent Indian content first, then by popularity and year
    combinedResults.sort((a: MediaItem, b: MediaItem) => {
        const aIsIndian = isIndianContent(a);
        const bIsIndian = isIndianContent(b);
        const aYear = getYear(a);
        const bYear = getYear(b);
        const currentYear = new Date().getFullYear();
        
        // Check if content is recent (within last 25 years)
        const aIsRecent = aYear >= currentYear - 25;
        const bIsRecent = bYear >= currentYear - 25;
        
        // Prioritize recent Indian content over everything
        const aIsRecentIndian = aIsIndian && aIsRecent;
        const bIsRecentIndian = bIsIndian && bIsRecent;
        
        if (aIsRecentIndian && !bIsRecentIndian) return -1;
        if (!aIsRecentIndian && bIsRecentIndian) return 1;
        
        // If both or neither are recent Indian, sort by year (descending)
        if (aYear !== bYear) return bYear - aYear;
        
        // If years are the same, sort by popularity (descending)
        return b.popularity - a.popularity;
    });

    return NextResponse.json(combinedResults);
  } catch (error) {
    console.error("Failed to fetch from TMDb:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 
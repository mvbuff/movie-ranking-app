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

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const [movieRes, tvRes] = await Promise.all([
      fetch(`${TMDB_API_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`),
      fetch(`${TMDB_API_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`)
    ]);

    if (!movieRes.ok || !tvRes.ok) {
        console.error("TMDb API error:", { movieStatus: movieRes.status, tvStatus: tvRes.status });
        return NextResponse.json({ error: 'Failed to fetch from TMDb' }, { status: 500 });
    }

    const movies = await movieRes.json();
    const tvShows = await tvRes.json();

    interface MediaItem {
        id: number;
        popularity: number;
        original_language?: string;
        release_date?: string;
        first_air_date?: string;
    }

    const combinedResults = [
        ...movies.results.map((m: MediaItem) => ({ ...m, media_type: 'movie' })),
        ...tvShows.results.map((t: MediaItem) => ({ ...t, media_type: 'tv' }))
    ];

    // Custom sorting: Indian content first, then by year (descending), then by popularity
    combinedResults.sort((a: MediaItem, b: MediaItem) => {
        const aIsIndian = isIndianContent(a);
        const bIsIndian = isIndianContent(b);
        
        // If one is Indian and the other isn't, prioritize Indian content
        if (aIsIndian && !bIsIndian) return -1;
        if (!aIsIndian && bIsIndian) return 1;
        
        // If both are Indian or both are not Indian, sort by year (descending)
        const aYear = getYear(a);
        const bYear = getYear(b);
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
import { NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  // In a real app, you'd want to handle this more gracefully,
  // but for our purposes, failing early is fine.
  throw new Error("Missing TMDb API key. Please add TMDB_API_KEY to your .env file.");
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

    const combinedResults = [
        ...movies.results.map((m: any) => ({ ...m, media_type: 'movie' })),
        ...tvShows.results.map((t: any) => ({ ...t, media_type: 'tv' }))
    ];

    // Simple sort to bring more popular items to the top
    combinedResults.sort((a, b) => b.popularity - a.popularity);

    return NextResponse.json(combinedResults);
  } catch (error) {
    console.error("Failed to fetch from TMDb:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 
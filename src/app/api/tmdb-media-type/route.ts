import { NextResponse } from 'next/server';
import { getTmdbMediaType, clearMediaTypeCache, forceMediaType } from '@/lib/tmdb-utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tmdbId = searchParams.get('tmdbId');
  const forceType = searchParams.get('force') as 'movie' | 'tv' | null;
  const clearCache = searchParams.get('clearCache') === 'true';

  if (!tmdbId) {
    return NextResponse.json({ error: 'TMDB ID is required' }, { status: 400 });
  }

  try {
    // Handle season IDs - they should always be 'tv' type
    if (tmdbId.includes('-s')) {
      return NextResponse.json({ mediaType: 'tv', isSeason: true });
    }

    // Handle force parameter
    if (forceType && (forceType === 'movie' || forceType === 'tv')) {
      forceMediaType(tmdbId, forceType);
      return NextResponse.json({ mediaType: forceType, forced: true });
    }

    // Handle clear cache parameter
    if (clearCache) {
      clearMediaTypeCache(tmdbId);
    }

    const mediaType = await getTmdbMediaType(tmdbId);
    return NextResponse.json({ mediaType });
  } catch (error) {
    console.error('Error determining media type:', error);
    return NextResponse.json({ mediaType: 'movie' }); // Default to movie on error
  }
} 
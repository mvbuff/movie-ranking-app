import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { getOrCreateHiddenParentShow, generateCanonicalTmdbUrl } from '@/lib/tmdb-utils';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = 'https://api.themoviedb.org/3';

// POST endpoint to add a TV season with hidden parent show
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { parentTmdbId, seasonNumber, userId } = await request.json();

    if (!parentTmdbId || !seasonNumber) {
      return NextResponse.json({ error: 'Parent TMDB ID and season number are required' }, { status: 400 });
    }

    // Check if this specific season already exists
    const seasonTmdbId = `${parentTmdbId}-s${seasonNumber}`;
    const existingSeason = await prisma.movie.findUnique({
      where: { tmdbId: seasonTmdbId }
    });

    if (existingSeason) {
      return NextResponse.json({ 
        message: 'Season already exists', 
        season: existingSeason 
      }, { status: 200 });
    }

    // Get or create hidden parent show
    const parentShow = await getOrCreateHiddenParentShow(parentTmdbId);
    if (!parentShow) {
      return NextResponse.json({ error: 'Failed to get/create parent show' }, { status: 500 });
    }

    // Fetch season details from TMDB
    const response = await fetch(`${TMDB_API_URL}/tv/${parentTmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch season from TMDB' }, { status: 500 });
    }

    const seasonData = await response.json();

    // Create the season entry
    const season = await prisma.movie.create({
      data: {
        tmdbId: seasonTmdbId,
        title: `${parentShow.title} - ${seasonData.name}`,
        year: seasonData.air_date ? parseInt(seasonData.air_date.substring(0, 4)) : parentShow.year,
        posterUrl: seasonData.poster_path ? `https://image.tmdb.org/t/p/w500${seasonData.poster_path}` : parentShow.posterUrl,
        category: 'SERIES',
        mediaType: 'tv',
        tmdbUrl: generateCanonicalTmdbUrl(seasonTmdbId, parentShow.title, 'tv'), // Main show URL
        seasonNumber: seasonNumber,
        episodeCount: seasonData.episodes?.length || 0,
        parentShowId: parentShow.id,
        isHidden: false, // Season itself should be visible (only parent is hidden)
        ...(userId && { addedById: userId }),
      },
    });

    return NextResponse.json({
      message: 'TV season added successfully',
      season,
      parentShow: {
        id: parentShow.id,
        title: parentShow.title,
        tmdbId: parentShow.tmdbId,
        isHidden: parentShow.isHidden
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to add TV season:', error);
    return NextResponse.json({ error: 'Failed to add TV season' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = 'https://api.themoviedb.org/3';

// POST endpoint to add a TV show with all its seasons
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { tmdbId, userId, includeSeasons = true } = await request.json();

    if (!tmdbId) {
      return NextResponse.json({ error: 'TMDB ID is required' }, { status: 400 });
    }

    // Check if the main show already exists
    const existingShow = await prisma.movie.findUnique({
      where: { tmdbId: String(tmdbId) },
      include: { seasons: true }
    });

    if (existingShow) {
      return NextResponse.json({ 
        message: 'Show already exists', 
        show: existingShow 
      }, { status: 200 });
    }

    // Fetch TV show details from TMDB
    const response = await fetch(`${TMDB_API_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch show from TMDB' }, { status: 500 });
    }

    const showData = await response.json();
    
    // Create the main TV show entry
    const mainShow = await prisma.movie.create({
      data: {
        tmdbId: String(tmdbId),
        title: showData.name,
        year: showData.first_air_date ? parseInt(showData.first_air_date.substring(0, 4)) : 0,
        posterUrl: showData.poster_path ? `https://image.tmdb.org/t/p/w500${showData.poster_path}` : null,
        category: 'SERIES',
        mediaType: 'tv',
        tmdbRating: showData.vote_average,
        tmdbVoteCount: showData.vote_count,
        ...(userId && { addedById: userId }),
      },
    });

    const createdSeasons = [];

    // If user wants seasons, create individual season entries
    if (includeSeasons && showData.seasons) {
      for (const season of showData.seasons) {
        // Skip season 0 (specials) unless explicitly requested
        if (season.season_number === 0) continue;

        const seasonEntry = await prisma.movie.create({
          data: {
            tmdbId: `${tmdbId}-s${season.season_number}`, // Unique ID for the season
            title: `${showData.name} - ${season.name}`,
            year: season.air_date ? parseInt(season.air_date.substring(0, 4)) : mainShow.year,
            posterUrl: season.poster_path ? `https://image.tmdb.org/t/p/w500${season.poster_path}` : mainShow.posterUrl,
            category: 'SERIES',
            mediaType: 'tv',
            seasonNumber: season.season_number,
            episodeCount: season.episode_count,
            parentShowId: mainShow.id,
            ...(userId && { addedById: userId }),
          },
        });

        createdSeasons.push(seasonEntry);
      }
    }

    return NextResponse.json({
      message: 'TV show added successfully',
      mainShow,
      seasons: createdSeasons,
      totalSeasons: createdSeasons.length
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to add TV show:', error);
    return NextResponse.json({ error: 'Failed to add TV show' }, { status: 500 });
  }
}

// GET endpoint to fetch TV show with seasons
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tmdbId = searchParams.get('tmdbId');

  if (!tmdbId) {
    return NextResponse.json({ error: 'TMDB ID is required' }, { status: 400 });
  }

  try {
    const show = await prisma.movie.findUnique({
      where: { tmdbId },
      include: {
        seasons: {
          orderBy: { seasonNumber: 'asc' }
        },
        ratings: {
          include: { user: { select: { name: true } } }
        }
      }
    });

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    return NextResponse.json(show);

  } catch (error) {
    console.error('Failed to fetch TV show:', error);
    return NextResponse.json({ error: 'Failed to fetch TV show' }, { status: 500 });
  }
}
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { getServerSession } from 'next-auth';
import { ActivityLogger } from '@/lib/activity-logger';
import { safeDeleteMovie } from '@/lib/safe-movie-deletion';
import { invalidateMovieCache } from '@/lib/cache';
import { cacheMediaType } from '@/lib/tmdb-utils';

// Disable static generation to ensure fresh data
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Allow read-only access to movies for everyone, excluding hidden parent shows
    const movies = await prisma.movie.findMany({
      where: {
        isHidden: false, // Exclude hidden parent shows from main list
      },
      orderBy: {
        createdAt: 'desc',
      } as any,
      select: {
        id: true,
        title: true,
        year: true,
        posterUrl: true,
        tmdbId: true,
        tmdbRating: true,
        tmdbVoteCount: true,
        category: true,
        mediaType: true,
        createdAt: true,
        // Season-specific fields
        seasonNumber: true,
        episodeCount: true,
        parentShowId: true,
        _count: {
          select: {
            ratings: true,
            reviews: true,
          },
        },
      } as any,
    });
    
    // Transform the data to flatten the counts
    const moviesWithCounts = movies.map((movie: any) => ({
      ...movie,
      ratingsCount: movie._count.ratings,
      reviewsCount: movie._count.reviews,
      _count: undefined, // Remove the nested _count object
    }));
    
    // Add cache headers for client-side caching with shorter cache time
    const response = NextResponse.json(moviesWithCounts);
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    
    return response;
  } catch (error) {
    console.error("Failed to fetch movies:", error);
    return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication for write operations
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { tmdbId, title, year, posterUrl, category, tmdbRating, tmdbVoteCount, mediaType, userId, seasonNumber, episodeCount } = await request.json();

    if (!title || !category) {
      return NextResponse.json({ error: 'Missing required movie fields' }, { status: 400 });
    }

    // Only check for duplicates if a tmdbId is provided
    if (tmdbId) {
    const existingMovie = await prisma.movie.findUnique({
      where: { tmdbId: String(tmdbId) },
    });
    if (existingMovie) {
        // Return existing movie data but indicate it's a duplicate.
        return NextResponse.json(existingMovie, { status: 200 });
      }
    }

    // If tmdbId is not provided, generate a unique one for the manual entry.
    const finalTmdbId = tmdbId ? String(tmdbId) : `manual_${randomBytes(8).toString('hex')}`;

    const movie = await prisma.movie.create({
      data: {
        tmdbId: finalTmdbId,
        title,
        year: year ? parseInt(String(year), 10) : 0,
        posterUrl,
        category,
        tmdbRating,
        tmdbVoteCount,
        mediaType: mediaType || 'movie', // Store media type or default to 'movie'
        // Season-specific fields
        ...(seasonNumber && { seasonNumber: parseInt(String(seasonNumber), 10) }),
        ...(episodeCount && { episodeCount: parseInt(String(episodeCount), 10) }),
        ...(userId && { addedById: userId }),
      },
    });

    // Cache the media type if provided
    if (mediaType && !finalTmdbId.startsWith('manual_')) {
      cacheMediaType(finalTmdbId, mediaType as 'movie' | 'tv');
    }

    // Log the activity when a new movie is added
    if (userId) {
      try {
        await ActivityLogger.movieAdded(userId, movie.id, movie.title);
      } catch (activityError) {
        console.error('Failed to log movie addition activity:', activityError);
        // Don't fail the request if activity logging fails
      }
    }

    // Invalidate movie cache
    await invalidateMovieCache();

    return NextResponse.json(movie, { status: 201 });
  } catch (error) {
    console.error("Failed to add movie:", error);
    return NextResponse.json({ error: 'Failed to add movie to database' }, { status: 500 });
  }
}

// DELETE: Admin-only movie deletion with safe foreign key handling
export async function DELETE(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { name: session.user?.name || '' },
      select: { role: true, id: true, name: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { movieId } = await request.json();

    if (!movieId) {
      return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 });
    }

    // Get movie details before deletion for logging
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      select: { title: true, year: true }
    });

    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    // Use safe deletion to handle foreign key constraints
    const deletionResult = await safeDeleteMovie(movieId);

    if (!deletionResult.success) {
      return NextResponse.json({ 
        error: 'Failed to delete movie', 
        details: deletionResult.message 
      }, { status: 500 });
    }

    console.log(`🗑️ Admin ${user.name} deleted movie: ${movie.title} (${movie.year})`);

    // Invalidate movie cache
    await invalidateMovieCache();

    return NextResponse.json({
      success: true,
      message: `Successfully deleted "${movie.title}" and all related data`
    }, { status: 200 });

  } catch (error) {
    console.error('Movie deletion error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during movie deletion' 
    }, { status: 500 });
  }
} 
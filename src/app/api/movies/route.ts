/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { getServerSession } from 'next-auth';

export async function GET() {
  try {
    // Allow read-only access to movies for everyone
    const movies = await prisma.movie.findMany({
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
        createdAt: true,
      } as any,
    });
    return NextResponse.json(movies);
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

    const { tmdbId, title, year, posterUrl, category, tmdbRating, tmdbVoteCount, userId } = await request.json();

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
        ...(userId && { addedById: userId }),
      },
    });

    return NextResponse.json(movie, { status: 201 });
  } catch (error) {
    console.error("Failed to add movie:", error);
    return NextResponse.json({ error: 'Failed to add movie to database' }, { status: 500 });
  }
} 
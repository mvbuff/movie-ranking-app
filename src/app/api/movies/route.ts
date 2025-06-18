import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const movies = await prisma.movie.findMany({
      orderBy: {
        title: 'asc',
      },
    });
    return NextResponse.json(movies);
  } catch (error) {
    console.error("Failed to fetch movies:", error);
    return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tmdbId, title, year, posterUrl, category, tmdbRating, tmdbVoteCount } = await request.json();

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

    const movie = await prisma.movie.create({
      data: {
        tmdbId: tmdbId ? String(tmdbId) : null,
        title,
        year: year ? parseInt(String(year), 10) : 0,
        posterUrl,
        category,
        tmdbRating,
        tmdbVoteCount,
      },
    });

    return NextResponse.json(movie, { status: 201 });
  } catch (error) {
    console.error("Failed to add movie:", error);
    return NextResponse.json({ error: 'Failed to add movie to database' }, { status: 500 });
  }
} 
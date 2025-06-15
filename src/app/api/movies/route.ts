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
    const { tmdbId, title, year, posterUrl, category } = await request.json();

    if (!tmdbId || !title || !year || !category) {
      return NextResponse.json({ error: 'Missing required movie fields' }, { status: 400 });
    }

    const existingMovie = await prisma.movie.findUnique({
      where: { tmdbId: String(tmdbId) },
    });

    if (existingMovie) {
      return NextResponse.json({ error: 'Movie already exists in the database' }, { status: 409 });
    }

    const movie = await prisma.movie.create({
      data: {
        tmdbId: String(tmdbId),
        title,
        year: parseInt(String(year), 10),
        posterUrl,
        category,
      },
    });

    return NextResponse.json(movie, { status: 201 });
  } catch (error) {
    console.error("Failed to add movie:", error);
    return NextResponse.json({ error: 'Failed to add movie to database' }, { status: 500 });
  }
} 
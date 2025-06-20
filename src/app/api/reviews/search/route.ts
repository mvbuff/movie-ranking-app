import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query || query.trim().length === 0) {
    return NextResponse.json([]);
  }

  try {
    const reviews = await prisma.review.findMany({
      where: {
        text: {
          contains: query,
          mode: 'insensitive', // Case-insensitive search
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        movie: {
          select: {
            id: true,
            title: true,
            year: true,
            posterUrl: true,
            tmdbId: true,
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit results to 50 most recent matches
    });

    // Simplify the response - just return what we have without complex transformations
    const result = reviews.map((review) => ({
      id: review.id,
      text: review.text,
      createdAt: review.createdAt,
      user: review.user,
      movie: review.movie,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error searching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to search reviews' },
      { status: 500 }
    );
  }
} 
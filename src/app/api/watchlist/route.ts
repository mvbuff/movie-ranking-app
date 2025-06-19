import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch all watchlist items for a user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const watchlistItems = await prisma.watchlist.findMany({
      where: { userId },
      include: {
        movie: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json(watchlistItems);
  } catch (error) {
    console.error("Failed to fetch watchlist:", error);
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}

// POST: Add a movie to user's watchlist
export async function POST(request: Request) {
  try {
    const { userId, movieId } = await request.json();

    if (!userId || !movieId) {
      return NextResponse.json({ error: 'User ID and Movie ID are required' }, { status: 400 });
    }

    // Check if the item is already in the watchlist
    const existingItem = await prisma.watchlist.findUnique({
      where: {
        userId_movieId: { userId, movieId },
      },
    });

    if (existingItem) {
      return NextResponse.json({ error: 'Movie already in watchlist' }, { status: 409 });
    }

    const watchlistItem = await prisma.watchlist.create({
      data: {
        userId,
        movieId,
      },
      include: {
        movie: true,
      },
    });

    return NextResponse.json(watchlistItem, { status: 201 });
  } catch (error) {
    console.error("Failed to add to watchlist:", error);
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 });
  }
}

// DELETE: Remove a movie from user's watchlist
export async function DELETE(request: Request) {
  try {
    const { userId, movieId } = await request.json();

    if (!userId || !movieId) {
      return NextResponse.json({ error: 'User ID and Movie ID are required' }, { status: 400 });
    }

    await prisma.watchlist.delete({
      where: {
        userId_movieId: { userId, movieId },
      },
    });

    return NextResponse.json({ message: 'Removed from watchlist' }, { status: 200 });
  } catch (error) {
    console.error("Failed to remove from watchlist:", error);
    return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 });
  }
} 
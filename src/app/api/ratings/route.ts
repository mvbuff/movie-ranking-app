import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { ActivityLogger } from '@/lib/activity-logger';
import { getRatingDisplay } from '@/lib/rating-system';

// GET: Fetch all ratings for a given user - allow read-only access
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    if (!userId) {
      // Read-only mode: return empty array for ratings
      return NextResponse.json([]);
    }

    const ratings = await prisma.rating.findMany({
      where: { userId },
    });
    return NextResponse.json(ratings);
  } catch (error) {
    console.error("Failed to fetch ratings:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create or update a rating - require authentication
const upsertRatingSchema = z.object({
  userId: z.string(),
  movieId: z.string(),
  score: z.number().min(0.5).max(10), // Allow half-star ratings
});

export async function POST(request: Request) {
  try {
    // Check authentication for write operations
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validation = upsertRatingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.formErrors }, { status: 400 });
    }

    const { userId, movieId, score } = validation.data;

    const rating = await prisma.rating.upsert({
      where: {
        userId_movieId: { userId, movieId },
      },
      update: { score },
      create: { userId, movieId, score },
    });

    // Log activity for both new ratings and updates
    try {
      // Get movie details for activity logging
      const movie = await prisma.movie.findUnique({
        where: { id: movieId },
        select: { title: true }
      });

      const customRating = getRatingDisplay(score);
      
      await ActivityLogger.movieRated(userId, movieId, movie?.title || 'Unknown Movie', score);
      console.log(`✅ Rating activity logged for movie: ${movie?.title} (${customRating})`);
    } catch (activityError) {
      console.error('❌ Failed to log rating activity:', activityError);
      // Don't fail the rating creation if activity logging fails
    }

    // After a rating is submitted, we should trigger a recalculation
    // of the aggregate score for this user and movie.
    // We'll add this logic later.

    return NextResponse.json(rating, { status: 200 });
  } catch (error) {
    console.error("Failed to upsert rating:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Remove a rating - require authentication
const deleteRatingSchema = z.object({
  userId: z.string(),
  movieId: z.string(),
});

export async function DELETE(request: Request) {
    try {
        // Check authentication for write operations
        const session = await getServerSession();
        if (!session) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const validation = deleteRatingSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.formErrors }, { status: 400 });
        }

        const { userId, movieId } = validation.data;

        await prisma.rating.delete({
            where: {
                userId_movieId: { userId, movieId },
            },
        });

        // After a rating is deleted, we should also trigger a recalculation.
        // We can add this later.

        return NextResponse.json({ message: 'Rating deleted' }, { status: 200 });
    } catch (error) {
        // Handle cases where the record doesn't exist gracefully
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return NextResponse.json({ message: 'Rating not found, nothing to delete' }, { status: 200 });
        }
        console.error("Failed to delete rating:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
} 
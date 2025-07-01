import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { ActivityLogger } from '@/lib/activity-logger';
import { invalidateMovieCache } from '@/lib/cache';

// GET all reviews for a specific movie - allow read-only access
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const movieId = searchParams.get('movieId');

  if (!movieId) {
    return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 });
  }

  try {
    // Allow read-only access to reviews for everyone
    const reviews = await prisma.review.findMany({
      where: { movieId },
      include: {
        user: {
          select: { name: true }, // Only include the user's name
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST a new review for a movie - require authentication
export async function POST(request: Request) {
  try {
    // Check authentication for write operations
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { movieId, userId, text } = await request.json();

    if (!movieId || !userId || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (text.length > 100) {
      return NextResponse.json({ error: 'Review text must be 100 characters or less' }, { status: 400 });
    }

    // Get movie details for activity logging
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      select: { title: true }
    });

    const newReview = await prisma.review.create({
      data: {
        movieId,
        userId,
        text,
      },
    });

    // Log the review activity
    try {
      await ActivityLogger.reviewAdded(userId, newReview.id, movieId, movie?.title || 'Unknown Movie');
      console.log(`✅ Review activity logged for movie: ${movie?.title}`);
    } catch (activityError) {
      console.error('❌ Failed to log review activity:', activityError);
      // Don't fail the review creation if activity logging fails
    }

    // Invalidate movie cache
    await invalidateMovieCache(movieId);

    return NextResponse.json(newReview, { status: 201 });
  } catch (error) {
    console.error("Failed to create review:", error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}

// DELETE a review - require authentication
export async function DELETE(request: Request) {
  try {
    // Check authentication for write operations
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { reviewId, userId } = await request.json();

    if (!reviewId || !userId) {
      return NextResponse.json({ error: 'Review ID and User ID are required' }, { status: 400 });
    }

    // First, check if the review exists and belongs to the user
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.userId !== userId) {
      return NextResponse.json({ error: 'You can only delete your own reviews' }, { status: 403 });
    }

    // Delete the review
    await prisma.review.delete({
      where: { id: reviewId },
    });

    // Invalidate movie cache
    await invalidateMovieCache(review.movieId);

    return NextResponse.json({ message: 'Review deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete review:", error);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
} 
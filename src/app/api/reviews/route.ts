import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all reviews for a specific movie
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const movieId = searchParams.get('movieId');

  if (!movieId) {
    return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 });
  }

  try {
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

// POST a new review for a movie
export async function POST(request: Request) {
  try {
    const { movieId, userId, text } = await request.json();

    if (!movieId || !userId || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (text.length > 100) {
      return NextResponse.json({ error: 'Review text must be 100 characters or less' }, { status: 400 });
    }

    const newReview = await prisma.review.create({
      data: {
        movieId,
        userId,
        text,
      },
    });

    return NextResponse.json(newReview, { status: 201 });
  } catch (error) {
    console.error("Failed to create review:", error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}

// DELETE a review
export async function DELETE(request: Request) {
  try {
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

    return NextResponse.json({ message: 'Review deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete review:", error);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
} 
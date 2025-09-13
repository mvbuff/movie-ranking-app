import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { ActivityLogger } from '@/lib/activity-logger';

// GET likes for a specific review
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reviewId = searchParams.get('reviewId');

  if (!reviewId) {
    return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
  }

  try {
    const likes = await prisma.reviewLike.findMany({
      where: { reviewId },
      include: {
        user: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({
      count: likes.length,
      likes: likes.map(like => ({
        id: like.id,
        userId: like.userId,
        userName: like.user.name,
        createdAt: like.createdAt
      }))
    });
  } catch (error) {
    console.error('Failed to fetch review likes:', error);
    return NextResponse.json({ error: 'Failed to fetch likes' }, { status: 500 });
  }
}

// POST to like a review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { reviewId, userId } = await request.json();

    if (!reviewId || !userId) {
      return NextResponse.json({ error: 'Review ID and User ID are required' }, { status: 400 });
    }

    // Check if review exists and get review author + movie info
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: { select: { name: true } },
        movie: { select: { id: true, title: true } }
      }
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check if user already liked this review
    const existingLike = await prisma.reviewLike.findUnique({
      where: {
        userId_reviewId: {
          userId,
          reviewId
        }
      }
    });

    if (existingLike) {
      return NextResponse.json({ error: 'Review already liked' }, { status: 400 });
    }

    // Create the like
    const like = await prisma.reviewLike.create({
      data: {
        userId,
        reviewId
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });

    // Log the review like activity (with movie details)
    try {
      await ActivityLogger.reviewLiked(
        userId,
        reviewId,
        review.user.name || 'Unknown User',
        review.movieId,
        review.movie?.title || 'Unknown Title'
      );
      console.log(`✅ Review like activity logged: ${like.user.name} liked ${review.user.name}'s review of ${review.movie?.title}`);
    } catch (activityError) {
      console.error('❌ Failed to log review like activity:', activityError);
      // Don't fail the like creation if activity logging fails
    }

    return NextResponse.json({
      id: like.id,
      userId: like.userId,
      userName: like.user.name,
      createdAt: like.createdAt
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to like review:', error);
    return NextResponse.json({ error: 'Failed to like review' }, { status: 500 });
  }
}

// DELETE to unlike a review
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { reviewId, userId } = await request.json();

    if (!reviewId || !userId) {
      return NextResponse.json({ error: 'Review ID and User ID are required' }, { status: 400 });
    }

    // Find and delete the like
    const deletedLike = await prisma.reviewLike.deleteMany({
      where: {
        userId,
        reviewId
      }
    });

    if (deletedLike.count === 0) {
      return NextResponse.json({ error: 'Like not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Review unliked successfully' }, { status: 200 });

  } catch (error) {
    console.error('Failed to unlike review:', error);
    return NextResponse.json({ error: 'Failed to unlike review' }, { status: 500 });
  }
} 
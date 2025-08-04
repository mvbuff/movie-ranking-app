import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { ActivityLogger } from '@/lib/activity-logger';

// POST: Like or unlike a restaurant review - require authentication
const likeRestaurantReviewSchema = z.object({
  reviewId: z.string(),
  userId: z.string(),
});

export async function POST(request: Request) {
  try {
    // Check authentication for write operations
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validation = likeRestaurantReviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.formErrors }, { status: 400 });
    }

    const { reviewId, userId } = validation.data;

    // Check if like already exists
    const existingLike = await prisma.restaurantReviewLike.findUnique({
      where: {
        userId_reviewId: { userId, reviewId },
      },
    });

    if (existingLike) {
      // Unlike: Remove the like
      await prisma.restaurantReviewLike.delete({
        where: {
          userId_reviewId: { userId, reviewId },
        },
      });

      console.log('👎 Restaurant review unliked');
      return NextResponse.json({ action: 'unliked' }, { status: 200 });
    } else {
      // Like: Create a new like
      const like = await prisma.restaurantReviewLike.create({
        data: {
          userId,
          reviewId,
        },
      });

      // Log activity for new likes
      try {
        // Get review and restaurant details for activity logging
        const reviewDetails = await prisma.restaurantReview.findUnique({
          where: { id: reviewId },
          include: {
            user: { select: { name: true } },
            restaurant: { select: { name: true } }
          }
        });

        if (reviewDetails) {
          await ActivityLogger.restaurantReviewLiked(
            userId, 
            reviewId, 
            reviewDetails.user.name, 
            reviewDetails.restaurant.name
          );
          console.log(`✅ Restaurant review like activity logged`);
        }
      } catch (activityError) {
        console.error('❌ Failed to log restaurant review like activity:', activityError);
        // Don't fail the like creation if activity logging fails
      }

      console.log('👍 Restaurant review liked');
      return NextResponse.json({ action: 'liked', like }, { status: 201 });
    }
  } catch (error) {
    console.error("Failed to toggle restaurant review like:", error);
    return NextResponse.json({ error: 'Failed to toggle restaurant review like' }, { status: 500 });
  }
}

// GET: Get likes for a specific restaurant review
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reviewId = searchParams.get('reviewId');

  if (!reviewId) {
    return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
  }

  try {
    const likes = await prisma.restaurantReviewLike.findMany({
      where: { reviewId },
      include: {
        user: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(likes);
  } catch (error) {
    console.error("Failed to fetch restaurant review likes:", error);
    return NextResponse.json({ error: 'Failed to fetch restaurant review likes' }, { status: 500 });
  }
}
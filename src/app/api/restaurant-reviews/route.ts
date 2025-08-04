import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { ActivityLogger } from '@/lib/activity-logger';

// GET: Fetch reviews with restaurant information - allow read-only access
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');
  const userId = searchParams.get('userId');
  const searchTerm = searchParams.get('search');

  try {
    // Build where clause
    const whereClause: {
      restaurantId?: string;
      userId?: string;
      text?: { contains: string; mode: 'insensitive' };
    } = {};
    
    if (restaurantId) {
      whereClause.restaurantId = restaurantId;
    }
    
    if (userId) {
      whereClause.userId = userId;
    }
    
    if (searchTerm) {
      whereClause.text = {
        contains: searchTerm,
        mode: 'insensitive'
      };
    }

    const reviews = await prisma.restaurantReview.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true }
        },
        restaurant: {
          select: { id: true, name: true, location: true, cuisine: true }
        },
        likes: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Failed to fetch restaurant reviews:", error);
    return NextResponse.json({ error: 'Failed to fetch restaurant reviews' }, { status: 500 });
  }
}

// POST: Create a new restaurant review - require authentication
const createRestaurantReviewSchema = z.object({
  text: z.string().min(1).max(500),
  userId: z.string(),
  restaurantId: z.string(),
});

export async function POST(request: Request) {
  try {
    // Check authentication for write operations
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createRestaurantReviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.formErrors }, { status: 400 });
    }

    const { text, userId, restaurantId } = validation.data;

    const review = await prisma.restaurantReview.create({
      data: {
        text,
        userId,
        restaurantId,
      },
      include: {
        user: {
          select: { id: true, name: true }
        },
        restaurant: {
          select: { id: true, name: true, location: true, cuisine: true }
        },
        likes: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    // Log activity
    try {
      await ActivityLogger.restaurantReviewAdded(userId, review.id, restaurantId, review.restaurant.name);
      console.log(`✅ Restaurant review activity logged for: ${review.restaurant.name}`);
    } catch (activityError) {
      console.error('❌ Failed to log restaurant review activity:', activityError);
    }

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("Failed to create restaurant review:", error);
    return NextResponse.json({ error: 'Failed to create restaurant review' }, { status: 500 });
  }
}

// DELETE: Remove a restaurant review - require authentication and ownership or admin
export async function DELETE(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { reviewId } = await request.json();

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }

    // Get current user info
    const currentUser = await prisma.user.findUnique({
      where: { name: session.user?.name || '' },
      select: { id: true, role: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get review details
    const review = await prisma.restaurantReview.findUnique({
      where: { id: reviewId },
      select: { userId: true, restaurant: { select: { name: true } } }
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check if user owns the review or is admin
    if (review.userId !== currentUser.id && currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: You can only delete your own reviews' }, { status: 403 });
    }

    await prisma.restaurantReview.delete({
      where: { id: reviewId }
    });

    console.log(`🗑️ Restaurant review deleted for: ${review.restaurant.name}`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete restaurant review:", error);
    return NextResponse.json({ error: 'Failed to delete restaurant review' }, { status: 500 });
  }
}
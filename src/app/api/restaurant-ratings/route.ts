import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { ActivityLogger } from '@/lib/activity-logger';
import { getRatingDisplay } from '@/lib/rating-system';

// GET: Fetch all ratings for a given user - allow read-only access
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const restaurantId = searchParams.get('restaurantId');

  try {
    if (!userId) {
      // Read-only mode: return empty array for ratings
      return NextResponse.json([]);
    }

    const whereClause: { userId: string; restaurantId?: string } = { userId };
    if (restaurantId) {
      whereClause.restaurantId = restaurantId;
    }

    const ratings = await prisma.restaurantRating.findMany({
      where: whereClause,
      include: {
        restaurant: {
          select: { id: true, name: true }
        }
      }
    });
    return NextResponse.json(ratings);
  } catch (error) {
    console.error("Failed to fetch restaurant ratings:", error);
    return NextResponse.json({ error: 'Failed to fetch restaurant ratings' }, { status: 500 });
  }
}

// POST: Create or update a restaurant rating - require authentication
const upsertRestaurantRatingSchema = z.object({
  userId: z.string(),
  restaurantId: z.string(),
  score: z.number().min(0.5).max(10).optional(), // Allow half-star ratings, optional for NA
  ratingType: z.enum(['VEG', 'NON_VEG']),
  availability: z.enum(['AVAILABLE', 'NOT_AVAILABLE']).default('AVAILABLE'),
});

export async function POST(request: Request) {
  try {
    // Check authentication for write operations
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validation = upsertRestaurantRatingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.formErrors }, { status: 400 });
    }

    const { userId, restaurantId, score, ratingType, availability } = validation.data;

    // If marking as not available, score should be null
    const finalScore = availability === 'NOT_AVAILABLE' ? null : score;

    const rating = await prisma.restaurantRating.upsert({
      where: {
        userId_restaurantId_ratingType: { userId, restaurantId, ratingType },
      },
      update: { score: finalScore, availability },
      create: { userId, restaurantId, score: finalScore, ratingType, availability },
    });

    // Log activity for both new ratings and updates
    try {
      // Get restaurant details for activity logging
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { name: true }
      });

      if (availability === 'NOT_AVAILABLE') {
        // Don't log activity for "not available" selections
        console.log(`📝 Restaurant marked as ${ratingType} not available: ${restaurant?.name}`);
      } else if (finalScore) {
        const customRating = getRatingDisplay(finalScore);
        await ActivityLogger.restaurantRated(userId, restaurantId, restaurant?.name || 'Unknown Restaurant', finalScore, ratingType);
        console.log(`✅ Restaurant rating activity logged: ${restaurant?.name} (${customRating} for ${ratingType})`);
      }
    } catch (activityError) {
      console.error('❌ Failed to log restaurant rating activity:', activityError);
      // Don't fail the rating creation if activity logging fails
    }

    return NextResponse.json(rating, { status: 200 });
  } catch (error) {
    console.error("Failed to upsert restaurant rating:", error);
    return NextResponse.json({ error: 'Failed to save restaurant rating' }, { status: 500 });
  }
}

// DELETE: Remove a restaurant rating
export async function DELETE(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId, restaurantId, ratingType } = await request.json();

    if (!userId || !restaurantId || !ratingType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await prisma.restaurantRating.delete({
      where: {
        userId_restaurantId_ratingType: { userId, restaurantId, ratingType },
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete restaurant rating:", error);
    return NextResponse.json({ error: 'Failed to delete restaurant rating' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

export const dynamic = 'force-dynamic';

// GET restaurant aggregate scores for a specific user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    if (!userId) {
      return NextResponse.json([]);
    }

    const aggregateScores = await prisma.restaurantAggregateScore.findMany({
      where: { userId },
      select: {
        restaurantId: true,
        vegScore: true,
        nonVegScore: true,
        vegCount: true,
        nonVegCount: true,
        confidence: true
      }
    });

    return NextResponse.json(aggregateScores);
  } catch (error) {
    console.error("Failed to fetch restaurant aggregate scores:", error);
    return NextResponse.json({ error: 'Failed to fetch restaurant aggregate scores' }, { status: 500 });
  }
}

// POST: Calculate and store restaurant aggregate scores for a user
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user's weight preferences (friends and their weights)
    const weightPreferences = await prisma.weightPreference.findMany({
      where: { userId },
      include: {
        friend: {
          select: { id: true, name: true, status: true }
        }
      }
    });

    // Get all restaurants
    const restaurants = await prisma.restaurant.findMany({
      select: { id: true }
    });

    const results = [];

    for (const restaurant of restaurants) {
      // Get all ratings for this restaurant from user's friends
      const friendIds = weightPreferences
        .filter(wp => wp.friend.status === 'ACTIVE')
        .map(wp => wp.friend.id);
      
      // Include the user themselves
      friendIds.push(userId);

      const allRatings = await prisma.restaurantRating.findMany({
        where: {
          restaurantId: restaurant.id,
          userId: { in: friendIds },
          availability: 'AVAILABLE'
        },
        include: {
          user: { select: { id: true } }
        }
      });

      // Separate veg and non-veg ratings
      const vegRatings = allRatings.filter(r => r.ratingType === 'VEG' && r.score !== null);
      const nonVegRatings = allRatings.filter(r => r.ratingType === 'NON_VEG' && r.score !== null);

      // Calculate weighted scores
      let vegScore = null;
      let nonVegScore = null;
      let vegCount = 0;
      let nonVegCount = 0;

      if (vegRatings.length > 0) {
        // Check if there are any friend ratings (excluding user's own rating)
        const friendVegRatings = vegRatings.filter(r => r.userId !== userId);
        const userVegRating = vegRatings.find(r => r.userId === userId);

        if (friendVegRatings.length === 0 && userVegRating) {
          // No friends rated, use user's rating with 100% weightage as friend score
          vegScore = userVegRating.score!;
          vegCount = 1;
        } else {
          // Friends have rated, use weighted calculation
          let totalVegWeight = 0;
          let weightedVegSum = 0;

          vegRatings.forEach(rating => {
            const weight = rating.userId === userId ? 1.0 : 
              (weightPreferences.find(wp => wp.friendId === rating.userId)?.weight || 1.0);
            
            weightedVegSum += (rating.score! * weight);
            totalVegWeight += weight;
            vegCount++;
          });

          vegScore = totalVegWeight > 0 ? weightedVegSum / totalVegWeight : null;
        }
      }

      if (nonVegRatings.length > 0) {
        // Check if there are any friend ratings (excluding user's own rating)
        const friendNonVegRatings = nonVegRatings.filter(r => r.userId !== userId);
        const userNonVegRating = nonVegRatings.find(r => r.userId === userId);

        if (friendNonVegRatings.length === 0 && userNonVegRating) {
          // No friends rated, use user's rating with 100% weightage as friend score
          nonVegScore = userNonVegRating.score!;
          nonVegCount = 1;
        } else {
          // Friends have rated, use weighted calculation
          let totalNonVegWeight = 0;
          let weightedNonVegSum = 0;

          nonVegRatings.forEach(rating => {
            const weight = rating.userId === userId ? 1.0 : 
              (weightPreferences.find(wp => wp.friendId === rating.userId)?.weight || 1.0);
            
            weightedNonVegSum += (rating.score! * weight);
            totalNonVegWeight += weight;
            nonVegCount++;
          });

          nonVegScore = totalNonVegWeight > 0 ? weightedNonVegSum / totalNonVegWeight : null;
        }
      }

      // Calculate confidence based on number of ratings
      const totalRatings = vegCount + nonVegCount;
      const confidence = Math.min(totalRatings / 5, 1.0); // Max confidence at 5+ ratings

      // Only create/update if we have some scores
      if (vegScore !== null || nonVegScore !== null) {
        const aggregateScore = await prisma.restaurantAggregateScore.upsert({
          where: {
            userId_restaurantId: { userId, restaurantId: restaurant.id }
          },
          update: {
            vegScore: vegScore ? Math.round(vegScore * 100) / 100 : null,
            nonVegScore: nonVegScore ? Math.round(nonVegScore * 100) / 100 : null,
            vegCount,
            nonVegCount,
            confidence: Math.round(confidence * 100) / 100
          },
          create: {
            userId,
            restaurantId: restaurant.id,
            vegScore: vegScore ? Math.round(vegScore * 100) / 100 : null,
            nonVegScore: nonVegScore ? Math.round(nonVegScore * 100) / 100 : null,
            vegCount,
            nonVegCount,
            confidence: Math.round(confidence * 100) / 100
          }
        });

        results.push(aggregateScore);
      }
    }

    console.log(`🧮 Calculated restaurant aggregate scores for user ${userId}: ${results.length} restaurants processed`);

    return NextResponse.json({ 
      success: true, 
      calculatedScores: results.length,
      message: `Calculated aggregate scores for ${results.length} restaurants`
    });

  } catch (error) {
    console.error("Failed to calculate restaurant aggregate scores:", error);
    return NextResponse.json({ error: 'Failed to calculate restaurant aggregate scores' }, { status: 500 });
  }
}
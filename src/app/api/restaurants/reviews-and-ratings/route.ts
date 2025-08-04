import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all reviews and ratings for a specific restaurant from all users - allow read-only access
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');

  if (!restaurantId) {
    return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
  }

  try {
    // Allow read-only access for everyone to view reviews and ratings
    // Get all users who have either reviewed or rated this restaurant, plus restaurant info
    const [restaurantResult, reviews, ratings] = await Promise.all([
      // Fetch restaurant information including who added it
      prisma.restaurant.findUnique({
        where: { id: restaurantId },
        include: {
          addedBy: {
            select: { id: true, name: true },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      }),
      // Fetch all reviews for this restaurant
      prisma.restaurantReview.findMany({
        where: { restaurantId },
        include: {
          user: {
            select: { id: true, name: true },
          },
          likes: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      // Fetch all ratings for this restaurant (both veg and non-veg)
      prisma.restaurantRating.findMany({
        where: { restaurantId },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    if (!restaurantResult) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Type the restaurant result to include the relations
    const restaurant = restaurantResult as typeof restaurantResult & {
      addedBy: { id: string; name: string } | null;
      createdAt: Date;
    };

    // Create maps for veg and non-veg ratings for quick lookup
    const vegRatingsMap = new Map();
    const nonVegRatingsMap = new Map();
    
    ratings.forEach(rating => {
      if (rating.ratingType === 'VEG') {
        vegRatingsMap.set(rating.userId, rating);
      } else if (rating.ratingType === 'NON_VEG') {
        nonVegRatingsMap.set(rating.userId, rating);
      }
    });

    // Create an entry for each review (allowing multiple reviews per user)
    const reviewEntries = reviews.map(review => {
      const vegRating = vegRatingsMap.get(review.userId);
      const nonVegRating = nonVegRatingsMap.get(review.userId);
      
      return {
        type: 'review' as const,
        userId: review.userId,
        user: review.user,
        review: {
          id: review.id,
          text: review.text,
          createdAt: review.createdAt,
          likes: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            count: (review as any).likes.length,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            users: (review as any).likes.map((like: any) => ({
              id: like.user.id,
              name: like.user.name
            }))
          }
        },
        vegRating: vegRating ? {
          id: vegRating.id,
          score: vegRating.score,
          availability: vegRating.availability,
        } : null,
        nonVegRating: nonVegRating ? {
          id: nonVegRating.id,
          score: nonVegRating.score,
          availability: nonVegRating.availability,
        } : null,
      };
    });

    // Create entries for users who only have ratings (no reviews)
    const usersWithReviews = new Set(reviews.map(r => r.userId));
    const usersWithRatings = new Set(ratings.map(r => r.userId));
    const usersWithOnlyRatings = new Set([...usersWithRatings].filter(userId => !usersWithReviews.has(userId)));

    const ratingOnlyEntries = Array.from(usersWithOnlyRatings).map(userId => {
      const vegRating = vegRatingsMap.get(userId);
      const nonVegRating = nonVegRatingsMap.get(userId);
      
      // Use the user data from any rating
      const user = vegRating?.user || nonVegRating?.user;
      
      return {
        type: 'rating-only' as const,
        userId,
        user,
        review: null,
        vegRating: vegRating ? {
          id: vegRating.id,
          score: vegRating.score,
          availability: vegRating.availability,
        } : null,
        nonVegRating: nonVegRating ? {
          id: nonVegRating.id,
          score: nonVegRating.score,
          availability: nonVegRating.availability,
        } : null,
      };
    });

    // Combine review entries and rating-only entries
    const combinedData = [...reviewEntries, ...ratingOnlyEntries];

    // Sort by review creation date (newest first), then by user name
    combinedData.sort((a, b) => {
      if (a.review && b.review) {
        return new Date(b.review.createdAt).getTime() - new Date(a.review.createdAt).getTime();
      }
      if (a.review && !b.review) return -1;
      if (!a.review && b.review) return 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((a.user as any)?.name || '').localeCompare(((b.user as any)?.name || ''));
    });

    const responseData = {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        location: restaurant.location,
        cuisine: restaurant.cuisine,
        addedBy: restaurant.addedBy ? {
          id: restaurant.addedBy.id,
          name: restaurant.addedBy.name,
        } : null,
        createdAt: restaurant.createdAt,
      },
      userEntries: combinedData,
    };

    // Disable cache for dynamic review data to ensure fresh updates
    const response = NextResponse.json(responseData);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error("Failed to fetch restaurant reviews and ratings:", error);
    return NextResponse.json({ error: 'Failed to fetch restaurant reviews and ratings' }, { status: 500 });
  }
}
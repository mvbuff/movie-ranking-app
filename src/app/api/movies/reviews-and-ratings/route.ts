import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all reviews and ratings for a specific movie from all users - allow read-only access
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const movieId = searchParams.get('movieId');

  if (!movieId) {
    return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 });
  }

  try {
    // Allow read-only access for everyone to view reviews and ratings
    // Get all users who have either reviewed or rated this movie, plus movie info
    const [movieResult, reviews, ratings, ratingActivities] = await Promise.all([
      // Fetch movie information including who added it
      prisma.movie.findUnique({
        where: { id: movieId },
        include: {
          addedBy: {
            select: { id: true, name: true },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      }),
      // Fetch all reviews for this movie
      prisma.review.findMany({
        where: { movieId },
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
      // Fetch all ratings for this movie
      prisma.rating.findMany({
        where: { movieId },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      }),
      // Fetch rating activities to infer rating dates per user
      prisma.activity.findMany({
        where: { movieId, type: 'MOVIE_RATED' },
        select: { userId: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      }),
    ]);

    if (!movieResult) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    // Type the movie result to include the relations
    const movie = movieResult as typeof movieResult & {
      addedBy: { id: string; name: string } | null;
      createdAt: Date;
    };

    // Create a map of userId to review for quick lookup
    const reviewsMap = new Map(reviews.map(review => [review.userId, review]));
    
    // Create a map of userId to rating for quick lookup
    const ratingsMap = new Map(ratings.map(rating => [rating.userId, rating]));
    // Create a map of userId to latest rating activity date
    const ratingDateMap = new Map<string, Date>();
    for (const act of ratingActivities) {
      if (!ratingDateMap.has(act.userId)) {
        ratingDateMap.set(act.userId, act.createdAt as unknown as Date);
      }
    }

    // Get all unique user IDs who have either reviewed or rated this movie
    const allUserIds = new Set([
      ...reviews.map(r => r.userId),
      ...ratings.map(r => r.userId)
    ]);

    // Combine the data for each user
    const combinedData = Array.from(allUserIds).map(userId => {
      const review = reviewsMap.get(userId);
      const rating = ratingsMap.get(userId);
      
      // Use the user data from either review or rating (they should be the same)
      const user = review?.user || rating?.user;
      
      return {
        userId,
        user,
        review: review ? {
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
        } : null,
        rating: rating ? {
          id: rating.id,
          score: rating.score,
          createdAt: ratingDateMap.get(userId) || null,
        } : null,
      };
    });

    // Sort order:
    // 1) Entries with reviews first, by review date desc
    // 2) Then by rating score desc
    // 3) Tie-breaker: rating date desc, then name asc
    combinedData.sort((a, b) => {
      const aHasReview = !!a.review;
      const bHasReview = !!b.review;

      if (aHasReview && bHasReview) {
        const diff = new Date(b.review!.createdAt).getTime() - new Date(a.review!.createdAt).getTime();
        if (diff !== 0) return diff;
        // If same review date, compare rating score if both have ratings
        if (a.rating && b.rating) {
          const scoreDiff = (b.rating.score || 0) - (a.rating.score || 0);
          if (scoreDiff !== 0) return scoreDiff;
        }
      } else if (aHasReview !== bHasReview) {
        return aHasReview ? -1 : 1;
      } else {
        // Neither has review → sort by rating score desc
        if (a.rating && b.rating) {
          const scoreDiff = (b.rating.score || 0) - (a.rating.score || 0);
          if (scoreDiff !== 0) return scoreDiff;
        } else if (a.rating && !b.rating) {
          return -1;
        } else if (!a.rating && b.rating) {
          return 1;
        }
      }

      // Next tie-breaker: rating date desc if available
      const aDate = a.rating?.createdAt ? new Date(a.rating.createdAt).getTime() : 0;
      const bDate = b.rating?.createdAt ? new Date(b.rating.createdAt).getTime() : 0;
      if (bDate - aDate !== 0) return bDate - aDate;

      // Final tie-breaker: name asc
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((a.user as any)?.name || '').localeCompare(((b.user as any)?.name || ''));
    });

    const responseData = {
      movie: {
        id: movie.id,
        title: movie.title,
        addedBy: movie.addedBy ? {
          id: movie.addedBy.id,
          name: movie.addedBy.name,
        } : null,
        createdAt: movie.createdAt,
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
    console.error("Failed to fetch reviews and ratings:", error);
    return NextResponse.json({ error: 'Failed to fetch reviews and ratings' }, { status: 500 });
  }
} 
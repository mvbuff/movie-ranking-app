import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { appCache, CacheKeys } from '@/lib/cache';

// Enable static generation with revalidation - shorter for dynamic scores
export const revalidate = 180; // 3 minutes

// GET public aggregate scores - calculate friend scores with equal weights for all users
export async function GET() {
  try {
    // Try to get from cache first
    const cacheKey = CacheKeys.publicAggregateScores;
    const cached = appCache.get(cacheKey);
    
    if (cached) {
      console.log('📦 Serving aggregate scores from cache');
      const response = NextResponse.json(cached);
      response.headers.set('Cache-Control', 'public, s-maxage=180, stale-while-revalidate=360');
      response.headers.set('X-Cache', 'HIT');
      return response;
    }

    console.log('🔄 Calculating aggregate scores (cache miss)');

    // Fetch all ratings for all movies
    const allRatings = await prisma.rating.findMany({
      include: {
        movie: {
          select: { id: true }
        },
        user: {
          select: { id: true, status: true }
        }
      }
    });

    // Filter only ratings from active users
    const activeUserRatings = allRatings.filter(rating => rating.user.status === 'ACTIVE');

    // Group ratings by movie
    const ratingsByMovie = new Map<string, number[]>();
    
    activeUserRatings.forEach(rating => {
      const movieId = rating.movie.id;
      if (!ratingsByMovie.has(movieId)) {
        ratingsByMovie.set(movieId, []);
      }
      ratingsByMovie.get(movieId)!.push(rating.score);
    });

    // Calculate aggregate scores (average of all ratings with equal weight)
    const publicAggregateScores = Array.from(ratingsByMovie.entries()).map(([movieId, scores]) => {
      // Calculate simple average - all users have equal 100% weight
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      return {
        movieId,
        score: Math.round(averageScore * 100) / 100, // Round to 2 decimal places
        userCount: scores.length
      };
    });

    // Cache the result for 3 minutes
    appCache.set(cacheKey, publicAggregateScores, 180);

    // Add cache headers for client-side caching
    const response = NextResponse.json(publicAggregateScores);
    response.headers.set('Cache-Control', 'public, s-maxage=180, stale-while-revalidate=360');
    response.headers.set('X-Cache', 'MISS');
    
    return response;
  } catch (error) {
    console.error("Failed to fetch public aggregate scores:", error);
    return NextResponse.json({ error: 'Failed to fetch public aggregate scores' }, { status: 500 });
  }
} 
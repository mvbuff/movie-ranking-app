import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET public aggregate scores - calculate friend scores with equal weights for all users
export async function GET() {
  try {
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

    return NextResponse.json(publicAggregateScores);
  } catch (error) {
    console.error("Failed to fetch public aggregate scores:", error);
    return NextResponse.json({ error: 'Failed to fetch public aggregate scores' }, { status: 500 });
  }
} 
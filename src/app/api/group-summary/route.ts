import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userIds = searchParams.get('userIds')?.split(',') || [];
    
    // Get all movies with their ratings and aggregate scores, excluding hidden parent shows
    const movies = await prisma.movie.findMany({
      where: {
        isHidden: false, // Exclude hidden parent shows from group summary
      },
      include: {
        ratings: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          },
          where: userIds.length > 0 ? { userId: { in: userIds } } : undefined
        }
      }
    });

    // Calculate aggregate scores for each movie
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const moviesWithScores = movies.map((movie: any) => {
      const ratings = movie.ratings;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalScore = ratings.reduce((sum: number, rating: any) => sum + rating.score, 0);
      const avgScore = ratings.length > 0 ? totalScore / ratings.length : null;
      
      return {
        id: movie.id,
        title: movie.title,
        year: movie.year,
        posterUrl: movie.posterUrl,
        tmdbId: movie.tmdbId,
        tmdbUrl: movie.tmdbUrl, // Include stored canonical URL
        tmdbRating: movie.tmdbRating,
        category: movie.category,
        createdAt: movie.createdAt,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ratings: ratings.map((r: any) => ({
          score: r.score,
          userName: r.user.name
        })),
        aggregateScore: avgScore ? parseFloat(avgScore.toFixed(1)) : null,
        ratingCount: ratings.length
      };
    });

    // Filter out movies with no ratings if userIds were specified
    const filteredMovies = userIds.length > 0 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? moviesWithScores.filter((movie: any) => movie.ratingCount > 0)
      : moviesWithScores;

    // Add cache headers
    const response = Response.json(filteredMovies);
    response.headers.set('Cache-Control', 'public, s-maxage=240, stale-while-revalidate=480');
    
    return response;
  } catch (error) {
    console.error('Failed to fetch group summary:', error);
    return Response.json({ error: 'Failed to fetch group summary' }, { status: 500 });
  }
} 
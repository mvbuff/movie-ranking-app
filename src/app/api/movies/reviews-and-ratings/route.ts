import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all reviews and ratings for a specific movie from all users
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const movieId = searchParams.get('movieId');

  if (!movieId) {
    return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 });
  }

  try {
    // Get all users who have either reviewed or rated this movie, plus movie info
    const [movieResult, reviews, ratings] = await Promise.all([
      // Fetch movie information 
      prisma.movie.findUnique({
        where: { id: movieId },
      }),
      // Fetch all reviews for this movie
      prisma.review.findMany({
        where: { movieId },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
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
    ]);

    if (!movieResult) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    // Fetch the user who added the movie if addedById exists
    const movieWithFields = movieResult as typeof movieResult & { addedById?: string; createdAt: Date };
    const addedByUser = movieWithFields.addedById ? await prisma.user.findUnique({
      where: { id: movieWithFields.addedById },
      select: { id: true, name: true },
    }) : null;

    // Type the movie result to include the relations
    const movie = {
      ...movieResult,
      addedBy: addedByUser,
      createdAt: movieWithFields.createdAt,
    };

    // Create a map of userId to review for quick lookup
    const reviewsMap = new Map(reviews.map(review => [review.userId, review]));
    
    // Create a map of userId to rating for quick lookup
    const ratingsMap = new Map(ratings.map(rating => [rating.userId, rating]));

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
        } : null,
        rating: rating ? {
          id: rating.id,
          score: rating.score,
        } : null,
      };
    });

    // Sort by review creation date (newest first), then by user name
    combinedData.sort((a, b) => {
      if (a.review && b.review) {
        return new Date(b.review.createdAt).getTime() - new Date(a.review.createdAt).getTime();
      }
      if (a.review && !b.review) return -1;
      if (!a.review && b.review) return 1;
      return (a.user?.name || '').localeCompare(b.user?.name || '');
    });

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Failed to fetch reviews and ratings:", error);
    return NextResponse.json({ error: 'Failed to fetch reviews and ratings' }, { status: 500 });
  }
} 
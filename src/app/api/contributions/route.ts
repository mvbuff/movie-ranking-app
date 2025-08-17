import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Get database statistics
    const [movieCount, seriesCount, documentaryCount, restaurantCount] = await Promise.all([
      prisma.movie.count({
        where: { 
          category: 'MOVIE',
          isHidden: false 
        }
      }),
      prisma.movie.count({
        where: { 
          category: 'SERIES',
          isHidden: false 
        }
      }),
      prisma.movie.count({
        where: { 
          category: 'DOCUMENTARY',
          isHidden: false 
        }
      }),
      prisma.restaurant.count()
    ]);

    // Get all users with their contribution statistics
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        // Count movie additions
        addedMovies: {
          select: {
            id: true
          }
        },
        // Count ratings
        ratings: {
          select: {
            id: true
          }
        },
        // Count reviews
        reviews: {
          select: {
            id: true
          }
        },
        // Count review likes
        reviewLikes: {
          select: {
            id: true
          }
        },
        // Count restaurant additions
        addedRestaurants: {
          select: {
            id: true
          }
        },
        // Count restaurant ratings
        restaurantRatings: {
          select: {
            id: true
          }
        },
        // Count restaurant reviews
        restaurantReviews: {
          select: {
            id: true
          }
        },
        // Count restaurant review likes
        restaurantReviewLikes: {
          select: {
            id: true
          }
        },
        // Count forum threads
        forumThreads: {
          select: {
            id: true
          }
        },
        // Count forum posts
        forumPosts: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Transform the data to include totals
    const contributionStats = users.map((user: {
      id: string;
      name: string;
      createdAt: Date;
      addedMovies: { id: string }[];
      ratings: { id: string }[];
      reviews: { id: string }[];
      reviewLikes: { id: string }[];
      addedRestaurants: { id: string }[];
      restaurantRatings: { id: string }[];
      restaurantReviews: { id: string }[];
      restaurantReviewLikes: { id: string }[];
      forumThreads: { id: string }[];
      forumPosts: { id: string }[];
    }) => {
      const movieAdditions = user.addedMovies.length;
      const restaurantAdditions = user.addedRestaurants.length;
      const totalAdditions = movieAdditions + restaurantAdditions;
      
      const movieRatings = user.ratings.length;
      const restaurantRatings = user.restaurantRatings.length;
      const totalRatings = movieRatings + restaurantRatings;
      
      const movieReviews = user.reviews.length;
      const restaurantReviews = user.restaurantReviews.length;
      const totalReviews = movieReviews + restaurantReviews;
      
      const reviewLikes = user.reviewLikes.length;
      const restaurantReviewLikes = user.restaurantReviewLikes.length;
      const totalLikes = reviewLikes + restaurantReviewLikes;
      
      const forumThreads = user.forumThreads.length;
      const forumPosts = user.forumPosts.length;
      const totalForumActivity = forumThreads + forumPosts;

      return {
        id: user.id,
        name: user.name,
        joinedDate: user.createdAt,
        statistics: {
          additions: totalAdditions,
          ratings: totalRatings,
          reviews: totalReviews,
          likes: totalLikes,
          forumActivity: totalForumActivity
        },
        breakdown: {
          movies: {
            additions: movieAdditions,
            ratings: movieRatings,
            reviews: movieReviews
          },
          restaurants: {
            additions: restaurantAdditions,
            ratings: restaurantRatings,
            reviews: restaurantReviews
          },
          forum: {
            threads: forumThreads,
            posts: forumPosts
          },
          likes: {
            reviewLikes: reviewLikes,
            restaurantReviewLikes: restaurantReviewLikes
          }
        }
      };
    });

    const response = {
      databaseStats: {
        movies: movieCount,
        series: seriesCount,
        documentaries: documentaryCount,
        restaurants: restaurantCount,
        total: movieCount + seriesCount + documentaryCount + restaurantCount
      },
      contributors: contributionStats
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching contribution statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contribution statistics' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
// import prisma from '@/lib/prisma';
import { ACTIVITY_FEED_LIMIT } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam), 50) : ACTIVITY_FEED_LIMIT; // Cap at 50 for performance

    // TODO: Replace with real database query once Prisma types are available
    // const activities = await prisma.activity.findMany({
    //   take: limit,
    //   orderBy: {
    //     createdAt: 'desc'
    //   },
    //   include: {
    //     user: {
    //       select: {
    //         id: true,
    //         name: true,
    //         image: true
    //       }
    //     },
    //     movie: {
    //       select: {
    //         id: true,
    //         title: true,
    //         year: true,
    //         posterUrl: true,
    //         tmdbId: true,
    //         category: true
    //       }
    //     }
    //   }
    // });

    // Mock data for development (privacy-focused - no watchlist activities)
    const mockActivities = [
      {
        id: 'activity-1',
        type: 'MOVIE_ADDED',
        description: 'Added "The Matrix" to the database',
        createdAt: new Date().toISOString(),
        user: {
          id: 'user-1',
          name: 'Demo User',
          image: null
        },
        movie: {
          id: 'movie-1',
          title: 'The Matrix',
          year: 1999,
          posterUrl: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
          tmdbId: '603',
          category: 'Movie'
        },
        metadata: { movieTitle: 'The Matrix' }
      },
      {
        id: 'activity-2',
        type: 'MOVIE_RATED',
        description: 'Rated "Inception" with score 8.5',
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        user: {
          id: 'user-2',
          name: 'Another User',
          image: null
        },
        movie: {
          id: 'movie-2',
          title: 'Inception',
          year: 2010,
          posterUrl: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
          tmdbId: '27205',
          category: 'Movie'
        },
        metadata: { movieTitle: 'Inception', score: 8.5 }
      },
      {
        id: 'activity-3',
        type: 'REVIEW_ADDED',
        description: 'Added a review for "Interstellar"',
        createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        user: {
          id: 'user-3',
          name: 'Movie Critic',
          image: null
        },
        movie: {
          id: 'movie-3',
          title: 'Interstellar',
          year: 2014,
          posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
          tmdbId: '157336',
          category: 'Movie'
        },
        metadata: { movieTitle: 'Interstellar' }
      },
      {
        id: 'activity-4',
        type: 'REVIEW_LIKED',
        description: 'Liked John Doe\'s review',
        createdAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        user: {
          id: 'user-4',
          name: 'Film Fan',
          image: null
        },
        metadata: { reviewAuthor: 'John Doe' }
      },
      {
        id: 'activity-5',
        type: 'FORUM_THREAD_CREATED',
        description: 'Created forum thread "Best Movies of 2023"',
        createdAt: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
        user: {
          id: 'user-5',
          name: 'Forum User',
          image: null
        },
        metadata: { threadTitle: 'Best Movies of 2023' }
      },
      {
        id: 'activity-6',
        type: 'FORUM_POST_ADDED',
        description: 'Replied to "Favorite Directors"',
        createdAt: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
        user: {
          id: 'user-6',
          name: 'Discussion Lover',
          image: null
        },
        metadata: { threadTitle: 'Favorite Directors' }
      },
      {
        id: 'activity-7',
        type: 'USER_REGISTERED',
        description: 'NewUser joined Movie Ranking!',
        createdAt: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
        user: {
          id: 'user-7',
          name: 'NewUser',
          image: null
        },
        metadata: { userName: 'NewUser' }
      },
      {
        id: 'activity-8',
        type: 'MOVIE_RATED',
        description: 'Rated "Pulp Fiction" with score 9.2',
        createdAt: new Date(Date.now() - 25200000).toISOString(), // 7 hours ago
        user: {
          id: 'user-8',
          name: 'Classic Movie Lover',
          image: null
        },
        movie: {
          id: 'movie-4',
          title: 'Pulp Fiction',
          year: 1994,
          posterUrl: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
          tmdbId: '680',
          category: 'Movie'
        },
        metadata: { movieTitle: 'Pulp Fiction', score: 9.2 }
      },
      {
        id: 'activity-9',
        type: 'REVIEW_ADDED',
        description: 'Added a review for "The Dark Knight"',
        createdAt: new Date(Date.now() - 28800000).toISOString(), // 8 hours ago
        user: {
          id: 'user-9',
          name: 'Batman Fan',
          image: null
        },
        movie: {
          id: 'movie-5',
          title: 'The Dark Knight',
          year: 2008,
          posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
          tmdbId: '155',
          category: 'Movie'
        },
        metadata: { movieTitle: 'The Dark Knight' }
      },
      {
        id: 'activity-10',
        type: 'MOVIE_ADDED',
        description: 'Added "Goodfellas" to the database',
        createdAt: new Date(Date.now() - 32400000).toISOString(), // 9 hours ago
        user: {
          id: 'user-10',
          name: 'Crime Film Enthusiast',
          image: null
        },
        movie: {
          id: 'movie-6',
          title: 'Goodfellas',
          year: 1990,
          posterUrl: 'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg',
          tmdbId: '769',
          category: 'Movie'
        },
        metadata: { movieTitle: 'Goodfellas' }
      }
    ];

    // Return the first 'limit' activities
    const activities = mockActivities.slice(0, limit);

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
} 
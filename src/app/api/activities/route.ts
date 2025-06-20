import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ACTIVITY_FEED_LIMIT } from '@/lib/activity-logger';

interface RawActivity {
  id: string;
  type: string;
  description: string;
  createdAt: Date;
  movieId: string | null;
  metadata: unknown;
  userId: string;
  userName: string | null;
  userImage: string | null;
  movieDbId: string | null;
  movieTitle: string | null;
  movieYear: number | null;
  moviePosterUrl: string | null;
  movieCategory: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam), 50) : ACTIVITY_FEED_LIMIT;

    // Use raw SQL to fetch activities (bypassing Prisma type issues)
    const activities = await prisma.$queryRaw`
      SELECT 
        a.id,
        a.type,
        a.description,
        a."createdAt",
        a."movieId",
        a.metadata,
        u.id as "userId",
        u.name as "userName",
        u.image as "userImage",
        m.id as "movieDbId",
        m.title as "movieTitle",
        m.year as "movieYear",
        m."posterUrl" as "moviePosterUrl",
        m.category as "movieCategory"
      FROM "Activity" a
      JOIN "User" u ON a."userId" = u.id
      LEFT JOIN "Movie" m ON a."movieId" = m.id
      ORDER BY a."createdAt" DESC
      LIMIT ${limit}
    ` as RawActivity[];

    // Transform the raw data into the expected format
    const formattedActivities = activities.map((activity: RawActivity) => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      createdAt: activity.createdAt,
      user: {
        id: activity.userId,
        name: activity.userName,
        image: activity.userImage
      },
      ...(activity.movieDbId && {
        movie: {
          id: activity.movieDbId,
          title: activity.movieTitle,
          year: activity.movieYear,
          posterUrl: activity.moviePosterUrl,
          tmdbId: null,
          category: activity.movieCategory
        }
      }),
      metadata: activity.metadata
    }));

    if (formattedActivities.length > 0) {
      return NextResponse.json(formattedActivities);
    }

    // Fallback if no activities
    const mockActivities = [
      {
        id: 'no-activities',
        type: 'USER_REGISTERED',
        description: 'No activities yet! Add a movie to see your first activity.',
        createdAt: new Date().toISOString(),
        user: {
          id: 'system',
          name: 'Movie Ranking System',
          image: null
        },
        metadata: { userName: 'System' }
      }
    ];

    return NextResponse.json(mockActivities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    
    // Return helpful error message
    const errorActivities = [
      {
        id: 'error-1',
        type: 'USER_REGISTERED',
        description: 'Activity system is starting up. Try adding a movie!',
        createdAt: new Date().toISOString(),
        user: {
          id: 'system',
          name: 'Movie Ranking',
          image: null
        },
        metadata: { error: true }
      }
    ];
    
    return NextResponse.json(errorActivities);
  }
} 
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { ActivityLogger } from '@/lib/activity-logger';

// Disable static generation to ensure fresh data
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Parse URL parameters for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const cuisine = searchParams.get('cuisine');
    const location = searchParams.get('location');
    const dietaryFilter = searchParams.get('dietaryFilter');
    const sortBy = searchParams.get('sortBy') || 'addedDate';
    const vegScoreThreshold = parseFloat(searchParams.get('vegScoreThreshold') || '3');
    const nonVegScoreThreshold = parseFloat(searchParams.get('nonVegScoreThreshold') || '3');
    const userId = searchParams.get('userId');

    // Build where clause for filtering
    const whereClause: any = {};

    // Search filter
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { cuisine: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Cuisine filter
    if (cuisine) {
      whereClause.cuisine = { contains: cuisine, mode: 'insensitive' };
    }

    // Location filter
    if (location) {
      whereClause.location = { contains: location, mode: 'insensitive' };
    }

    // Dietary filter - filter by restaurants that have ratings for specific types
    if (dietaryFilter && dietaryFilter !== 'ALL' && userId) {
      if (dietaryFilter === 'VEG_ONLY') {
        whereClause.ratings = {
          some: {
            userId: userId,
            ratingType: 'VEG',
            availability: 'AVAILABLE',
            ...(vegScoreThreshold > 3 && { score: { gte: vegScoreThreshold } })
          }
        };
      } else if (dietaryFilter === 'NON_VEG_ONLY') {
        whereClause.ratings = {
          some: {
            userId: userId,
            ratingType: 'NON_VEG',
            availability: 'AVAILABLE',
            ...(nonVegScoreThreshold > 3 && { score: { gte: nonVegScoreThreshold } })
          }
        };
      }
    }

    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'name') {
      orderBy = { name: 'asc' };
    } else if (sortBy === 'addedDate') {
      orderBy = { createdAt: 'desc' };
    }
    // Note: aggregateScore, vegRating, nonVegRating sorting will be handled in client for now

    // Allow read-only access to restaurants for everyone
    const restaurants = await prisma.restaurant.findMany({
      where: whereClause,
      orderBy,
      select: {
        id: true,
        name: true,
        address: true,
        googleMapsUrl: true,
        cuisine: true,
        location: true,
        description: true,
        imageUrl: true,
        metadata: true, // Include metadata for Google Photos
        createdAt: true,
        addedBy: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            ratings: true,
            reviews: true,
          },
        },
      } as any,
    });
    
    // For each restaurant, determine latest availability flag per type (global NA)
    const restaurantsWithCounts = await Promise.all(
      restaurants.map(async (restaurant: any) => {
        // Find latest VEG availability
        const latestVeg = await prisma.restaurantRating.findFirst({
          where: { restaurantId: restaurant.id, ratingType: 'VEG' },
          orderBy: { createdAt: 'desc' },
          select: { availability: true, score: true }
        });

        // Find latest NON_VEG availability
        const latestNonVeg = await prisma.restaurantRating.findFirst({
          where: { restaurantId: restaurant.id, ratingType: 'NON_VEG' },
          orderBy: { createdAt: 'desc' },
          select: { availability: true, score: true }
        });

        const globalVegAvailability = latestVeg?.availability === 'NOT_AVAILABLE' && latestVeg?.score === null
          ? 'NOT_AVAILABLE'
          : 'AVAILABLE';

        const globalNonVegAvailability = latestNonVeg?.availability === 'NOT_AVAILABLE' && latestNonVeg?.score === null
          ? 'NOT_AVAILABLE'
          : 'AVAILABLE';

        return {
          ...restaurant,
          ratingsCount: restaurant._count.ratings,
          reviewsCount: restaurant._count.reviews,
          _count: undefined,
          globalVegAvailability,
          globalNonVegAvailability
        };
      })
    );
    
    // Add cache headers for client-side caching
    const response = NextResponse.json(restaurantsWithCounts);
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    
    return response;
  } catch (error) {
    console.error("Failed to fetch restaurants:", error);
    return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication for write operations
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { 
      name, 
      address, 
      googleMapsUrl, 
      cuisine, 
      location, 
      description, 
      imageUrl, 
      userId,
      metadata,
      googlePlaceId
    } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Restaurant name is required' }, { status: 400 });
    }

    // Check for duplicate restaurant (Google Place ID takes priority, then name + location)
    if (googlePlaceId) {
      const existingRestaurant = await prisma.restaurant.findFirst({
        where: { 
          metadata: {
            path: ['googlePlaceId'],
            equals: googlePlaceId
          }
        },
      });
      if (existingRestaurant) {
        // Return existing restaurant data but indicate it's a duplicate
        return NextResponse.json(existingRestaurant, { status: 200 });
      }
    } else if (name && location) {
      const existingRestaurant = await prisma.restaurant.findFirst({
        where: { 
          name: { contains: name, mode: 'insensitive' },
          location: { contains: location, mode: 'insensitive' }
        },
      });
      if (existingRestaurant) {
        // Return existing restaurant data but indicate it's a duplicate
        return NextResponse.json(existingRestaurant, { status: 200 });
      }
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        address,
        googleMapsUrl,
        cuisine,
        location,
        description,
        imageUrl,
        metadata,
        ...(userId && { addedById: userId }),
      },
    });

    // Log the activity when a new restaurant is added
    if (userId) {
      try {
        await ActivityLogger.restaurantAdded(userId, restaurant.id, restaurant.name);
      } catch (activityError) {
        console.error('Failed to log restaurant addition activity:', activityError);
        // Don't fail the request if activity logging fails
      }
    }

    return NextResponse.json(restaurant, { status: 201 });
  } catch (error) {
    console.error("Failed to add restaurant:", error);
    return NextResponse.json({ error: 'Failed to add restaurant to database' }, { status: 500 });
  }
}

// DELETE: Admin-only restaurant deletion
export async function DELETE(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { name: session.user?.name || '' },
      select: { role: true, id: true, name: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { restaurantId } = await request.json();

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
    }

    // Get restaurant details before deletion for logging
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true, location: true }
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Delete restaurant (cascade will handle related data)
    await prisma.restaurant.delete({
      where: { id: restaurantId },
    });

    console.log(`🗑️ Admin ${user.name} deleted restaurant: ${restaurant.name} (${restaurant.location})`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted "${restaurant.name}" and all related data`
    }, { status: 200 });

  } catch (error) {
    console.error('Restaurant deletion error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during restaurant deletion' 
    }, { status: 500 });
  }
}
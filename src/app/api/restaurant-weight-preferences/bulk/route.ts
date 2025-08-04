import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST: Bulk update restaurant weight preferences
export async function POST(request: Request) {
  try {
    const { userId, friendIds, isFriend, weight = 1.0 } = await request.json();

    if (!userId || !Array.isArray(friendIds)) {
      return NextResponse.json({ error: 'User ID and friend IDs array are required' }, { status: 400 });
    }

    if (isFriend) {
      // Create or update preferences for selected friends
      const operations = friendIds.map(friendId => 
        prisma.restaurantWeightPreference.upsert({
          where: {
            userId_friendId: { userId, friendId }
          },
          update: { weight },
          create: { userId, friendId, weight }
        })
      );

      await Promise.all(operations);
    } else {
      // Remove preferences for unselected friends
      await prisma.restaurantWeightPreference.deleteMany({
        where: {
          userId,
          friendId: { in: friendIds }
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to bulk update restaurant weight preferences:", error);
    return NextResponse.json({ error: 'Failed to bulk update restaurant weight preferences' }, { status: 500 });
  }
}
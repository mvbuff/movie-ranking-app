import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { userId, friendIds, isFriend } = await request.json();

    if (!userId || !Array.isArray(friendIds)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (isFriend) {
      // Bulk add friendships
      const dataToInsert = friendIds.map(friendId => ({
        userId,
        friendId,
        weight: 1.0, // Default weight
      }));
      
      await prisma.weightPreference.createMany({
        data: dataToInsert,
        skipDuplicates: true, // Ignore if a friendship already exists
      });

    } else {
      // Bulk delete friendships
      await prisma.weightPreference.deleteMany({
        where: {
          userId: userId,
          friendId: {
            in: friendIds,
          },
        },
      });
    }

    return NextResponse.json({ message: 'Bulk update successful' }, { status: 200 });

  } catch (error) {
    console.error("Bulk update of weight preferences failed:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 
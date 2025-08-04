import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET restaurant weight preferences for a specific user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const preferences = await prisma.restaurantWeightPreference.findMany({
      where: { userId },
      include: {
        friend: {
          select: { id: true, name: true, status: true }
        }
      }
    });

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Failed to fetch restaurant weight preferences:", error);
    return NextResponse.json({ error: 'Failed to fetch restaurant weight preferences' }, { status: 500 });
  }
}

// POST: Create or update restaurant weight preference
export async function POST(request: Request) {
  try {
    const { userId, friendId, weight } = await request.json();

    if (!userId || !friendId || weight === undefined) {
      return NextResponse.json({ error: 'User ID, friend ID, and weight are required' }, { status: 400 });
    }

    const preference = await prisma.restaurantWeightPreference.upsert({
      where: {
        userId_friendId: { userId, friendId }
      },
      update: { weight },
      create: { userId, friendId, weight }
    });

    return NextResponse.json(preference);
  } catch (error) {
    console.error("Failed to save restaurant weight preference:", error);
    return NextResponse.json({ error: 'Failed to save restaurant weight preference' }, { status: 500 });
  }
}

// DELETE: Remove restaurant weight preference
export async function DELETE(request: Request) {
  try {
    const { userId, friendId } = await request.json();

    if (!userId || !friendId) {
      return NextResponse.json({ error: 'User ID and friend ID are required' }, { status: 400 });
    }

    await prisma.restaurantWeightPreference.delete({
      where: {
        userId_friendId: { userId, friendId }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete restaurant weight preference:", error);
    return NextResponse.json({ error: 'Failed to delete restaurant weight preference' }, { status: 500 });
  }
}
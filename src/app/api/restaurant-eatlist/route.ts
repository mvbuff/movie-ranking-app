import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// GET: Fetch all eatlist items for a user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  try {
    if (!userId) {
      return NextResponse.json([]);
    }
    const items = await prisma.restaurantEatlist.findMany({
      where: { userId },
      select: { restaurantId: true }
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error('Failed to fetch eatlist:', error);
    return NextResponse.json({ error: 'Failed to fetch eatlist' }, { status: 500 });
  }
}

// POST: Add a restaurant to user's eatlist
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { userId, restaurantId } = await request.json();
    if (!userId || !restaurantId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const existing = await prisma.restaurantEatlist.findUnique({
      where: { userId_restaurantId: { userId, restaurantId } }
    });
    if (existing) return NextResponse.json({ error: 'Already in eatlist' }, { status: 409 });

    const item = await prisma.restaurantEatlist.create({ data: { userId, restaurantId } });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Failed to add to eatlist:', error);
    return NextResponse.json({ error: 'Failed to add to eatlist' }, { status: 500 });
  }
}

// DELETE: Remove from eatlist
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { userId, restaurantId } = await request.json();
    if (!userId || !restaurantId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    await prisma.restaurantEatlist.delete({
      where: { userId_restaurantId: { userId, restaurantId } }
    });
    return NextResponse.json({ message: 'Removed from eatlist' }, { status: 200 });
  } catch (error) {
    console.error('Failed to remove from eatlist:', error);
    return NextResponse.json({ error: 'Failed to remove from eatlist' }, { status: 500 });
  }
}



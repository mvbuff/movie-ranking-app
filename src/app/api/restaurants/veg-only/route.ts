import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { name: session.user?.name || '' },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { restaurantId, vegOnly } = await request.json();

    if (!restaurantId || typeof vegOnly !== 'boolean') {
      return NextResponse.json({ error: 'restaurantId and vegOnly(boolean) are required' }, { status: 400 });
    }

    // Read current metadata, update vegOnly flag
    const current = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { metadata: true } });
    if (!current) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const baseMeta = (current.metadata && typeof current.metadata === 'object') ? current.metadata : {};
    const newMetadata = { ...baseMeta, vegOnly } as unknown as Prisma.InputJsonValue;

    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { metadata: newMetadata },
      select: { id: true, metadata: true }
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Failed to update veg-only flag:', error);
    return NextResponse.json({ error: 'Failed to update veg-only flag' }, { status: 500 });
  }
}



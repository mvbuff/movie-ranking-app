import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    if (!userId) {
      // Read-only mode: return empty array for aggregate scores
      return NextResponse.json([]);
    }

    const aggregateScores = await prisma.aggregateScore.findMany({
      where: { userId },
    });
    return NextResponse.json(aggregateScores);
  } catch (error) {
    console.error("Failed to fetch aggregate scores:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 
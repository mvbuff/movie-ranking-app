import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { appCache } from '@/lib/cache';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Check if user is admin (optional - you can remove this for development)
    const session = await getServerSession();
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { name: session.user.name },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get cache statistics
    const stats = appCache.getStats();
    
    return NextResponse.json({
      cacheStats: stats,
      timestamp: new Date().toISOString(),
      message: 'Cache statistics retrieved successfully'
    });
    
  } catch (error) {
    console.error('Cache stats error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch cache stats' 
    }, { status: 500 });
  }
} 
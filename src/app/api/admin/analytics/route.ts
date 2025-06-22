import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

// GET: Fetch user analytics for admin dashboard
export async function GET() {
  try {
    // Check if user is admin
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

    // Fetch users with their login sessions and page analytics
    const usersWithAnalytics = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        userSessions: {
          orderBy: { loginAt: 'desc' },
          take: 3, // Last 3 login sessions
          select: {
            id: true,
            loginAt: true,
            logoutAt: true,
            duration: true,
            ipAddress: true,
            userAgent: true
          }
        },
        pageSessions: {
          orderBy: { startTime: 'desc' },
          take: 10, // Recent page sessions for time analysis
          select: {
            id: true,
            page: true,
            startTime: true,
            endTime: true,
            duration: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate summary statistics for each user
    const analyticsData = await Promise.all(
      usersWithAnalytics.map(async (user) => {
        // Calculate total time spent (sum of all page sessions)
        const totalPageSessions = await prisma.pageSession.count({
          where: { userId: user.id }
        });

        const totalTimeSpent = await prisma.pageSession.aggregate({
          where: { 
            userId: user.id,
            duration: { not: null }
          },
          _sum: { duration: true },
          _avg: { duration: true }
        });

        // Calculate login frequency (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentLogins = await prisma.userSession.count({
          where: {
            userId: user.id,
            loginAt: { gte: thirtyDaysAgo }
          }
        });

        // Calculate average session duration
        const avgSessionDuration = await prisma.userSession.aggregate({
          where: {
            userId: user.id,
            duration: { not: null }
          },
          _avg: { duration: true }
        });

        return {
          ...user,
          analytics: {
            totalPageSessions,
            totalTimeSpent: totalTimeSpent._sum.duration || 0,
            avgTimePerSession: Math.round(totalTimeSpent._avg.duration || 0),
            recentLogins, // Last 30 days
            avgSessionDuration: Math.round(avgSessionDuration._avg.duration || 0),
            lastLoginSessions: user.userSessions,
            recentPageSessions: user.pageSessions
          }
        };
      })
    );

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch analytics data' 
    }, { status: 500 });
  }
} 
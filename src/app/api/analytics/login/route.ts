import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

// POST: Track user login
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.name) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { name: session.user.name },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get request details
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     undefined;

    // Create login session
    const loginSession = await prisma.userSession.create({
      data: {
        userId: user.id,
        ipAddress,
        userAgent
      }
    });

    return NextResponse.json({ 
      success: true, 
      sessionId: loginSession.id 
    });

  } catch (error) {
    console.error('Login tracking error:', error);
    return NextResponse.json({ 
      error: 'Failed to track login' 
    }, { status: 500 });
  }
}

// PATCH: Update login session on logout
export async function PATCH(request: Request) {
  try {
    const { sessionId, duration } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const updatedSession = await prisma.userSession.update({
      where: { id: sessionId },
      data: {
        logoutAt: new Date(),
        duration: duration || undefined
      }
    });

    return NextResponse.json({ 
      success: true, 
      sessionId: updatedSession.id 
    });

  } catch (error) {
    console.error('Logout tracking error:', error);
    return NextResponse.json({ 
      error: 'Failed to track logout' 
    }, { status: 500 });
  }
} 
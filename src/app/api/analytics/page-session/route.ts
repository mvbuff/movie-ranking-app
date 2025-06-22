import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

// POST: Start page session tracking
export async function POST(request: Request) {
  try {
    const { sessionId, page } = await request.json();

    if (!sessionId || !page) {
      return NextResponse.json({ error: 'Session ID and page are required' }, { status: 400 });
    }

    // Get user details if authenticated
    const session = await getServerSession();
    let userId = null;
    
    if (session?.user?.name) {
      const user = await prisma.user.findUnique({
        where: { name: session.user.name },
        select: { id: true }
      });
      userId = user?.id || null;
    }

    // Get request details
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     undefined;

    // Create page session
    const pageSession = await prisma.pageSession.create({
      data: {
        userId,
        sessionId,
        page,
        ipAddress,
        userAgent
      }
    });

    return NextResponse.json({ 
      success: true, 
      pageSessionId: pageSession.id 
    });

  } catch (error) {
    console.error('Page session start error:', error);
    return NextResponse.json({ 
      error: 'Failed to start page session tracking' 
    }, { status: 500 });
  }
}

// PATCH: End page session and calculate duration
export async function PATCH(request: Request) {
  try {
    const { pageSessionId, duration } = await request.json();

    if (!pageSessionId) {
      return NextResponse.json({ error: 'Page session ID required' }, { status: 400 });
    }

    const updatedSession = await prisma.pageSession.update({
      where: { id: pageSessionId },
      data: {
        endTime: new Date(),
        duration: duration || undefined
      }
    });

    return NextResponse.json({ 
      success: true, 
      pageSessionId: updatedSession.id 
    });

  } catch (error) {
    console.error('Page session end error:', error);
    return NextResponse.json({ 
      error: 'Failed to end page session tracking' 
    }, { status: 500 });
  }
} 
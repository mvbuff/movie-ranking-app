import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { level, message, data, timestamp, userAgent } = await request.json();
    
    // Log to server console (appears in Vercel logs)
    const logMessage = `[CLIENT-${level.toUpperCase()}] ${message}`;
    
    if (level === 'error') {
      console.error(logMessage, data);
    } else if (level === 'warn') {
      console.warn(logMessage, data);
    } else {
      console.log(logMessage, data);
    }
    
    // Also log additional context
    console.log(`Client Info: ${userAgent} at ${timestamp}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log client message:', error);
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
} 
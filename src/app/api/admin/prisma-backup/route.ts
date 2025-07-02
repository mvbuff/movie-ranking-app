import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBackupScheduler } from '@/lib/prisma-backup-scheduler';

// GET - Get backup scheduler status
export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get scheduler status
    const status = prismaBackupScheduler.getStatus();
    
    // Format next backup time if available
    let nextBackupFormatted = null;
    if (status.nextBackupIn) {
      const days = Math.floor(status.nextBackupIn / (24 * 60 * 60 * 1000));
      const hours = Math.floor((status.nextBackupIn % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((status.nextBackupIn % (60 * 60 * 1000)) / (60 * 1000));
      
      if (days > 0) {
        nextBackupFormatted = `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        nextBackupFormatted = `${hours}h ${minutes}m`;
      } else {
        nextBackupFormatted = `${minutes}m`;
      }
    }

    return NextResponse.json({
      success: true,
      status: {
        ...status,
        nextBackupFormatted,
        lastBackupFormatted: status.lastBackupTime 
          ? status.lastBackupTime.toLocaleString()
          : null
      }
    });

  } catch (error) {
    console.error('Error getting backup status:', error);
    return NextResponse.json(
      { error: 'Failed to get backup status' },
      { status: 500 }
    );
  }
}

// POST - Trigger manual backup or control scheduler
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'trigger':
        // Manually trigger a backup
        console.log(`🔄 Manual backup triggered by admin: ${session.user.name}`);
        
        // Trigger backup in background
        prismaBackupScheduler.triggerBackup().catch(error => {
          console.error('Manual backup failed:', error);
        });
        
        return NextResponse.json({
          success: true,
          message: 'Backup triggered successfully'
        });

      case 'start':
        // Start the scheduler
        prismaBackupScheduler.start();
        return NextResponse.json({
          success: true,
          message: 'Backup scheduler started'
        });

      case 'stop':
        // Stop the scheduler
        prismaBackupScheduler.stop();
        return NextResponse.json({
          success: true,
          message: 'Backup scheduler stopped'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: trigger, start, or stop' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error handling backup request:', error);
    return NextResponse.json(
      { error: 'Failed to handle backup request' },
      { status: 500 }
    );
  }
} 
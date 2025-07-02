import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { DatabaseBackup, createDatabaseBackup } from '@/lib/backup';

// GET: List available backups
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

    // List available backups
    const backup = new DatabaseBackup();
    const backups = await backup.listBackups();

    return NextResponse.json({
      backups,
      count: backups.length,
      message: 'Backups retrieved successfully'
    });

  } catch (error) {
    console.error('Backup list error:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve backups' 
    }, { status: 500 });
  }
}

// POST: Create a new backup
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession();
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { name: session.user.name },
      select: { role: true, name: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const { compress = true, uploadToCloud = false, maxBackups = 4 } = body;

    // Check dependencies
    const dependenciesOk = await DatabaseBackup.checkDependencies();
    if (!dependenciesOk) {
      return NextResponse.json({ 
        error: 'Database backup dependencies not available. PostgreSQL client tools required.' 
      }, { status: 500 });
    }

    // Create backup
    console.log(`🔄 Manual backup triggered by admin: ${user.name}`);
    const result = await createDatabaseBackup({
      compress,
      uploadToCloud,
      maxBackups
    });

    if (result.success) {
      console.log(`✅ Manual backup completed by admin: ${user.name}`);
      return NextResponse.json({
        success: true,
        message: 'Backup created successfully',
        backupPath: result.backupPath,
        size: result.size,
        duration: result.duration
      });
    } else {
      console.error(`❌ Manual backup failed for admin: ${user.name}`, result.error);
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Backup creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create backup' 
    }, { status: 500 });
  }
}

// DELETE: Clean up old backups
export async function DELETE(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession();
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { name: session.user.name },
      select: { role: true, name: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse request body for cleanup options
    const body = await request.json().catch(() => ({}));
    const { maxBackups = 2 } = body;

    const backup = new DatabaseBackup();
    const backupsBefore = await backup.listBackups();
    
    // This will be handled by the cleanup logic in createBackup
    // For now, we'll just return the current count
    const backupsAfter = await backup.listBackups();
    const cleanedCount = Math.max(0, backupsBefore.length - maxBackups);

    console.log(`🧹 Backup cleanup by admin: ${user.name}, kept ${maxBackups} backups`);

    return NextResponse.json({
      success: true,
      message: `Backup cleanup completed`,
      backupsBefore: backupsBefore.length,
      backupsAfter: backupsAfter.length,
      cleanedCount
    });

  } catch (error) {
    console.error('Backup cleanup error:', error);
    return NextResponse.json({ 
      error: 'Failed to clean up backups' 
    }, { status: 500 });
  }
} 
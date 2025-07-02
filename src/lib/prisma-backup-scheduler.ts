import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface BackupSchedulerConfig {
  enabled: boolean;
  intervalDays: number;
  autoStart: boolean;
  compress: boolean;
  maxBackups: number;
  format: 'json' | 'sql';
}

class PrismaBackupScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private config: BackupSchedulerConfig;
  private lastBackupTime: Date | null = null;

  constructor(config: Partial<BackupSchedulerConfig> = {}) {
    this.config = {
      enabled: process.env.AUTO_BACKUP_ENABLED === 'true',
      intervalDays: parseInt(process.env.AUTO_BACKUP_INTERVAL_DAYS || '7'),
      autoStart: process.env.AUTO_BACKUP_AUTO_START === 'true',
      compress: process.env.AUTO_BACKUP_COMPRESS !== 'false', // Default to true
      maxBackups: parseInt(process.env.AUTO_BACKUP_MAX_BACKUPS || '4'),
      format: (process.env.AUTO_BACKUP_FORMAT || 'json') as 'json' | 'sql',
      ...config
    };

    if (this.config.autoStart && this.config.enabled) {
      this.start();
    }
  }

  /**
   * Start the backup scheduler
   */
  public start(): void {
    if (!this.config.enabled) {
      console.log('🔄 Prisma Backup Scheduler: Disabled via configuration');
      return;
    }

    if (this.intervalId) {
      console.log('🔄 Prisma Backup Scheduler: Already running');
      return;
    }

    const intervalMs = this.config.intervalDays * 24 * 60 * 60 * 1000;
    
    console.log(`🔄 Prisma Backup Scheduler: Starting with ${this.config.intervalDays}-day interval`);
    console.log(`📅 Next backup in: ${this.config.intervalDays} days`);
    console.log(`🗜️ Compression: ${this.config.compress ? 'Enabled' : 'Disabled'}`);
    console.log(`📊 Format: ${this.config.format.toUpperCase()}`);
    console.log(`📚 Max backups: ${this.config.maxBackups}`);

    // Schedule the backup to run at intervals
    this.intervalId = setInterval(() => {
      this.runBackup();
    }, intervalMs);

    // Also run an initial backup after a short delay (10 seconds)
    setTimeout(() => {
      this.runBackup();
    }, 10000);
  }

  /**
   * Stop the backup scheduler
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Prisma Backup Scheduler: Stopped');
    }
  }

  /**
   * Run a single backup
   */
  private async runBackup(): Promise<void> {
    try {
      console.log('🔄 Prisma Backup Scheduler: Starting scheduled backup...');
      
      // Build the backup command
      let command = 'node scripts/prisma-backup.js';
      
      if (!this.config.compress) {
        command += ' --no-compress';
      }
      
      if (this.config.format === 'sql') {
        command += ' --sql';
      }
      
      command += ` --max-backups ${this.config.maxBackups}`;

      // Run the backup
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('dotenv')) {
        console.error('⚠️ Prisma Backup Scheduler: Warning:', stderr);
      }
      
      console.log('✅ Prisma Backup Scheduler: Backup completed successfully');
      this.lastBackupTime = new Date();
      
      // Log key information from the backup output
      const lines = stdout.split('\n');
      const sizeMatch = lines.find(line => line.includes('📊 Size:'));
      const tablesMatch = lines.find(line => line.includes('📋 Tables exported:'));
      
      if (sizeMatch) console.log(`📊 ${sizeMatch.trim()}`);
      if (tablesMatch) console.log(`📋 ${tablesMatch.trim()}`);
      
    } catch (error) {
      console.error('❌ Prisma Backup Scheduler: Backup failed:', error);
    }
  }

  /**
   * Get scheduler status
   */
  public getStatus(): {
    enabled: boolean;
    running: boolean;
    config: BackupSchedulerConfig;
    lastBackupTime: Date | null;
    nextBackupIn?: number;
  } {
    const status = {
      enabled: this.config.enabled,
      running: this.intervalId !== null,
      config: this.config,
      lastBackupTime: this.lastBackupTime
    };

    if (this.intervalId && this.lastBackupTime) {
      const intervalMs = this.config.intervalDays * 24 * 60 * 60 * 1000;
      const nextBackupTime = this.lastBackupTime.getTime() + intervalMs;
      const nextBackupIn = Math.max(0, nextBackupTime - Date.now());
      return { ...status, nextBackupIn };
    }

    return status;
  }

  /**
   * Manually trigger a backup
   */
  public async triggerBackup(): Promise<void> {
    await this.runBackup();
  }
}

// Export a singleton instance
export const prismaBackupScheduler = new PrismaBackupScheduler();

// Export the class for custom instances
export { PrismaBackupScheduler };

// Auto-start if configured
if (process.env.NODE_ENV !== 'test') {
  prismaBackupScheduler.start();
} 
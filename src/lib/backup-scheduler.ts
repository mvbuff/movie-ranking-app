import { scheduleBackups, createDatabaseBackup } from './backup';

let backupTimer: NodeJS.Timeout | null = null;

interface SchedulerConfig {
  enabled: boolean;
  intervalDays: number;
  autoStart: boolean;
  compress: boolean;
  maxBackups: number;
}

// Default configuration
const defaultConfig: SchedulerConfig = {
  enabled: process.env.AUTO_BACKUP_ENABLED === 'true',
  intervalDays: parseInt(process.env.AUTO_BACKUP_INTERVAL_DAYS || '7'),
  autoStart: process.env.AUTO_BACKUP_AUTO_START === 'true',
  compress: process.env.AUTO_BACKUP_COMPRESS !== 'false',
  maxBackups: parseInt(process.env.AUTO_BACKUP_MAX_BACKUPS || '4')
};

export class BackupScheduler {
  private config: SchedulerConfig;
  private isRunning = false;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    
    console.log('🗂️ Backup Scheduler initialized:');
    console.log('   ⚙️ Enabled:', this.config.enabled);
    console.log('   📅 Interval:', `${this.config.intervalDays} days`);
    console.log('   🚀 Auto-start:', this.config.autoStart);
    console.log('   🗜️ Compress:', this.config.compress);
    console.log('   📊 Max backups:', this.config.maxBackups);

    // Auto-start if configured
    if (this.config.enabled && this.config.autoStart) {
      this.start();
    }
  }

  start(): boolean {
    if (!this.config.enabled) {
      console.log('⏸️ Backup scheduler is disabled');
      return false;
    }

    if (this.isRunning) {
      console.log('⚠️ Backup scheduler is already running');
      return false;
    }

    try {
      console.log(`🚀 Starting automatic backups every ${this.config.intervalDays} days`);
      
      backupTimer = scheduleBackups(this.config.intervalDays);
      this.isRunning = true;

      // Create initial backup if none exist
      this.createInitialBackupIfNeeded();

      console.log('✅ Backup scheduler started successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to start backup scheduler:', error);
      return false;
    }
  }

  stop(): boolean {
    if (!this.isRunning || !backupTimer) {
      console.log('⚠️ Backup scheduler is not running');
      return false;
    }

    try {
      clearInterval(backupTimer);
      backupTimer = null;
      this.isRunning = false;
      
      console.log('⏹️ Backup scheduler stopped');
      return true;

    } catch (error) {
      console.error('❌ Failed to stop backup scheduler:', error);
      return false;
    }
  }

  restart(): boolean {
    console.log('🔄 Restarting backup scheduler...');
    this.stop();
    return this.start();
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      nextBackup: this.isRunning 
        ? new Date(Date.now() + (this.config.intervalDays * 24 * 60 * 60 * 1000)).toISOString()
        : null
    };
  }

  updateConfig(newConfig: Partial<SchedulerConfig>): boolean {
    try {
      this.config = { ...this.config, ...newConfig };
      
      console.log('⚙️ Backup scheduler config updated:', newConfig);
      
      // Restart if running to apply new config
      if (this.isRunning) {
        this.restart();
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to update backup scheduler config:', error);
      return false;
    }
  }

  private async createInitialBackupIfNeeded(): Promise<void> {
    try {
      // Check if any backups exist
      const { DatabaseBackup } = await import('./backup');
      const backup = new DatabaseBackup();
      const existingBackups = await backup.listBackups();

      if (existingBackups.length === 0) {
        console.log('📦 No existing backups found, creating initial backup...');
        
        const result = await createDatabaseBackup({
          compress: this.config.compress,
          maxBackups: this.config.maxBackups
        });

        if (result.success) {
          console.log('✅ Initial backup created successfully');
        } else {
          console.error('❌ Failed to create initial backup:', result.error);
        }
      } else {
        console.log(`📦 Found ${existingBackups.length} existing backups`);
      }

    } catch (error) {
      console.error('❌ Error checking for initial backup:', error);
    }
  }
}

// Global scheduler instance
let globalScheduler: BackupScheduler | null = null;

// Initialize scheduler (call this from your app startup)
export function initializeBackupScheduler(config?: Partial<SchedulerConfig>): BackupScheduler {
  if (globalScheduler) {
    console.log('⚠️ Backup scheduler already initialized');
    return globalScheduler;
  }

  globalScheduler = new BackupScheduler(config);
  return globalScheduler;
}

// Get the global scheduler instance
export function getBackupScheduler(): BackupScheduler | null {
  return globalScheduler;
}

// Graceful shutdown
export function shutdownBackupScheduler(): void {
  if (globalScheduler) {
    globalScheduler.stop();
    globalScheduler = null;
    console.log('🔄 Backup scheduler shutdown completed');
  }
}

// Handle process termination
if (typeof process !== 'undefined') {
  process.on('SIGINT', shutdownBackupScheduler);
  process.on('SIGTERM', shutdownBackupScheduler);
  process.on('exit', shutdownBackupScheduler);
} 
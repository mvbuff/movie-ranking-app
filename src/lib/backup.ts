import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface BackupOptions {
  outputDir?: string;
  maxBackups?: number;
  compress?: boolean;
  uploadToCloud?: boolean;
}

interface BackupResult {
  success: boolean;
  backupPath?: string;
  error?: string;
  size?: string;
  duration?: number;
}

export class DatabaseBackup {
  private databaseUrl: string;
  private backupDir: string;

  constructor(databaseUrl?: string, backupDir = 'backups') {
    this.databaseUrl = databaseUrl || process.env.DATABASE_URL || '';
    this.backupDir = backupDir;

    if (!this.databaseUrl) {
      throw new Error('DATABASE_URL is required for backup operations');
    }
  }

  async createBackup(options: BackupOptions = {}): Promise<BackupResult> {
    const startTime = Date.now();
    const {
      outputDir = this.backupDir,
      maxBackups = 4,
      compress = true,
      uploadToCloud = false
    } = options;

    try {
      // Ensure backup directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupFileName = `movie_ranking_backup_${timestamp}.sql`;
      const backupPath = path.join(outputDir, backupFileName);

      console.log('🔄 Starting database backup...');
      console.log('📅 Timestamp:', new Date().toISOString());
      console.log('📁 Backup path:', backupPath);

      // Create database backup using pg_dump
      const pgDumpCommand = `pg_dump "${this.databaseUrl}"`;
      const { stdout } = await execAsync(pgDumpCommand);

      // Write backup to file
      await fs.writeFile(backupPath, stdout);

      // Get file size
      const stats = await fs.stat(backupPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      let finalBackupPath = backupPath;

      // Compress if requested
      if (compress) {
        const compressedPath = `${backupPath}.gz`;
        await execAsync(`gzip "${backupPath}"`);
        finalBackupPath = compressedPath;
        console.log('🗜️ Backup compressed');
      }

      // Clean up old backups
      await this.cleanupOldBackups(outputDir, maxBackups);

      // Upload to cloud if requested
      if (uploadToCloud) {
        await this.uploadToCloud(finalBackupPath);
      }

      const duration = Date.now() - startTime;

      console.log('✅ Backup completed successfully!');
      console.log('📊 Backup size:', `${sizeInMB} MB`);
      console.log('⏱️ Duration:', `${duration}ms`);

      return {
        success: true,
        backupPath: finalBackupPath,
        size: `${sizeInMB} MB`,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ Backup failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      };
    }
  }

  async listBackups(outputDir = this.backupDir): Promise<string[]> {
    try {
      const files = await fs.readdir(outputDir);
      return files
        .filter(file => file.startsWith('movie_ranking_backup_'))
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  async restoreBackup(backupPath: string): Promise<BackupResult> {
    const startTime = Date.now();

    try {
      console.log('🔄 Starting database restore...');
      console.log('📁 Backup path:', backupPath);

      // Check if backup file exists
      await fs.access(backupPath);

      // Decompress if needed
      let sqlFilePath = backupPath;
      if (backupPath.endsWith('.gz')) {
        console.log('🗜️ Decompressing backup...');
        const decompressedPath = backupPath.replace('.gz', '');
        await execAsync(`gunzip -c "${backupPath}" > "${decompressedPath}"`);
        sqlFilePath = decompressedPath;
      }

      // Restore database
      const psqlCommand = `psql "${this.databaseUrl}" -f "${sqlFilePath}"`;
      await execAsync(psqlCommand);

      // Clean up decompressed file if we created it
      if (sqlFilePath !== backupPath) {
        await fs.unlink(sqlFilePath);
      }

      const duration = Date.now() - startTime;
      console.log('✅ Database restored successfully!');
      console.log('⏱️ Duration:', `${duration}ms`);

      return {
        success: true,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ Restore failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      };
    }
  }

  private async cleanupOldBackups(outputDir: string, maxBackups: number): Promise<void> {
    try {
      const backups = await this.listBackups(outputDir);
      
      if (backups.length > maxBackups) {
        const backupsToDelete = backups.slice(maxBackups);
        
        console.log(`🧹 Cleaning up ${backupsToDelete.length} old backups...`);
        
        for (const backup of backupsToDelete) {
          const backupPath = path.join(outputDir, backup);
          await fs.unlink(backupPath);
          console.log(`🗑️ Deleted: ${backup}`);
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  private async uploadToCloud(backupPath: string): Promise<void> {
    try {
      // This is a placeholder for cloud upload functionality
      // You can implement AWS S3, Google Cloud Storage, etc. here
      
      console.log('☁️ Cloud upload functionality not implemented yet');
      console.log('📁 Backup ready for upload:', backupPath);
      
      // Example AWS S3 upload (uncomment and configure):
      /*
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3();
      
      const fileStream = createReadStream(backupPath);
      const uploadParams = {
        Bucket: 'your-backup-bucket',
        Key: `database-backups/${path.basename(backupPath)}`,
        Body: fileStream
      };
      
      await s3.upload(uploadParams).promise();
      console.log('✅ Uploaded to S3');
      */
      
    } catch (error) {
      console.error('Cloud upload failed:', error);
      throw error;
    }
  }

  // Utility method to check if pg_dump is available
  static async checkDependencies(): Promise<boolean> {
    try {
      await execAsync('pg_dump --version');
      return true;
    } catch {
      console.error('❌ pg_dump not found. Please install PostgreSQL client tools.');
      return false;
    }
  }
}

// Utility function for easy backup creation
export async function createDatabaseBackup(options?: BackupOptions): Promise<BackupResult> {
  const backup = new DatabaseBackup();
  return backup.createBackup(options);
}

// Utility function to schedule regular backups
export function scheduleBackups(intervalDays = 7): NodeJS.Timeout {
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
  
  console.log(`📅 Scheduled automatic backups every ${intervalDays} days`);
  
  return setInterval(async () => {
    console.log('⏰ Automatic backup triggered');
    const result = await createDatabaseBackup();
    
    if (result.success) {
      console.log('✅ Scheduled backup completed successfully');
    } else {
      console.error('❌ Scheduled backup failed:', result.error);
    }
  }, intervalMs);
} 
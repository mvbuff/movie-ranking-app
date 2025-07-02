#!/usr/bin/env node

// Standalone backup script for Movie Ranking App
// Usage: node scripts/backup-runner.js [options]

// Load environment variables from .env files
try {
  require('dotenv').config({ path: '.env.local' });
  require('dotenv').config({ path: '.env' });
} catch (error) {
  // dotenv not available, continue without it
  console.log('⚠️ dotenv not available, using system environment variables only');
}

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  compress: !args.includes('--no-compress'),
  uploadToCloud: args.includes('--upload'),
  maxBackups: 4,
  outputDir: 'backups'
};

// Parse custom options
args.forEach((arg, index) => {
  if (arg === '--max-backups' && args[index + 1]) {
    options.maxBackups = parseInt(args[index + 1]) || 4;
  }
  if (arg === '--output-dir' && args[index + 1]) {
    options.outputDir = args[index + 1];
  }
});

// Check if pg_dump is available
async function checkDependencies() {
  try {
    await execAsync('pg_dump --version');
    return true;
  } catch (error) {
    console.error('❌ pg_dump not found. Please install PostgreSQL client tools.');
    return false;
  }
}

// Create database backup
async function createBackup() {
  const startTime = Date.now();
  
  try {
    // Ensure backup directory exists
    await fs.mkdir(options.outputDir, { recursive: true });

    // Generate backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFileName = `movie_ranking_backup_${timestamp}.sql`;
    const backupPath = path.join(options.outputDir, backupFileName);

    console.log('🔄 Starting database backup...');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('📁 Backup path:', backupPath);

    // Get DATABASE_URL from environment
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Check for alternative backup database URL first
    const backupDatabaseUrl = process.env.BACKUP_DATABASE_URL || databaseUrl;
    
    if (backupDatabaseUrl !== databaseUrl) {
      console.log('📊 Using BACKUP_DATABASE_URL for direct database access');
    }

    // Check if using Prisma Accelerate (only check this for the URL we're actually using)
    if (!process.env.BACKUP_DATABASE_URL && (databaseUrl.includes('accelerate.prisma-data.net') || databaseUrl.startsWith('prisma+'))) {
      console.log('🚨 PRISMA ACCELERATE DETECTED!');
      console.log('');
      console.log('❌ Cannot backup directly through Prisma Accelerate proxy.');
      console.log('');
      console.log('✅ SOLUTIONS:');
      console.log('');
      console.log('1️⃣ GET YOUR DIRECT DATABASE URL:');
      console.log('   • Check your database provider dashboard');
      console.log('   • Look for "Direct Connection" or "Connection String"');
      console.log('   • Should look like: postgresql://user:pass@host:port/db');
      console.log('');
      console.log('2️⃣ CREATE BACKUP_DATABASE_URL:');
      console.log('   • Add to your .env file: BACKUP_DATABASE_URL="postgresql://..."');
      console.log('   • Run: npm run backup');
      console.log('');
      console.log('3️⃣ USE PROVIDER BACKUP TOOLS:');
      console.log('   • Vercel: Dashboard → Storage → Postgres → Backups');
      console.log('   • Neon: Dashboard → Branches → Backup');
      console.log('   • Railway: Dashboard → Database → Backups');
      console.log('   • Supabase: Dashboard → Settings → Database → Backups');
      console.log('');
      console.log('4️⃣ ALTERNATIVE - USE PRISMA BACKUP:');
      console.log('   npx prisma db execute --file backup.sql --schema prisma/schema.prisma');
      console.log('');
      
      throw new Error('Prisma Accelerate URL detected - direct database URL required for pg_dump backups');
    }

    // Create database backup using pg_dump
    const pgDumpCommand = `pg_dump "${backupDatabaseUrl}"`;
    console.log('⚙️ Running pg_dump...');
    
    const { stdout } = await execAsync(pgDumpCommand);

    // Write backup to file
    await fs.writeFile(backupPath, stdout);

    // Get file size
    const stats = await fs.stat(backupPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    let finalBackupPath = backupPath;

    // Compress if requested
    if (options.compress) {
      console.log('🗜️ Compressing backup...');
      await execAsync(`gzip "${backupPath}"`);
      finalBackupPath = `${backupPath}.gz`;
    }

    // Clean up old backups
    await cleanupOldBackups();

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
    console.error('❌ Backup failed:', error.message);

    return {
      success: false,
      error: error.message,
      duration
    };
  }
}

// List existing backups
async function listBackups() {
  try {
    const files = await fs.readdir(options.outputDir);
    return files
      .filter(file => file.startsWith('movie_ranking_backup_'))
      .sort()
      .reverse(); // Most recent first
  } catch (error) {
    return [];
  }
}

// Clean up old backups
async function cleanupOldBackups() {
  try {
    const backups = await listBackups();
    
    if (backups.length > options.maxBackups) {
      const backupsToDelete = backups.slice(options.maxBackups);
      
      console.log(`🧹 Cleaning up ${backupsToDelete.length} old backups...`);
      
      for (const backup of backupsToDelete) {
        const backupPath = path.join(options.outputDir, backup);
        await fs.unlink(backupPath);
        console.log(`🗑️ Deleted: ${backup}`);
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }
}

async function runBackup() {
  try {
    console.log('🚀 Starting backup process...');
    console.log('⚙️ Options:', options);
    
    // Check if we're in the right directory
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    try {
      require(packageJsonPath);
    } catch (error) {
      console.error('❌ Error: Must run from project root directory');
      process.exit(1);
    }

    // Check dependencies
    const dependenciesOk = await checkDependencies();
    if (!dependenciesOk) {
      console.error('❌ Error: PostgreSQL client tools not available');
      console.error('   Install with: apt-get install postgresql-client (Ubuntu/Debian)');
      console.error('   Or: brew install postgresql (macOS)');
      process.exit(1);
    }

    // Create backup
    const result = await createBackup();

    if (result.success) {
      console.log('\n🎉 Backup completed successfully!');
      console.log('📁 Backup file:', result.backupPath);
      console.log('📊 Size:', result.size);
      console.log('⏱️ Duration:', `${result.duration}ms`);
      
      // List all backups
      const allBackups = await listBackups();
      console.log(`\n📋 Total backups: ${allBackups.length}`);
      allBackups.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`);
      });
      
      process.exit(0);
    } else {
      console.error('\n❌ Backup failed!');
      console.error('Error:', result.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⏹️ Backup process interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️ Backup process terminated');
  process.exit(1);
});

// Show help message
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📋 Movie Ranking App - Database Backup Tool

Usage: node scripts/backup-runner.js [options]

Options:
  --help, -h          Show this help message
  --no-compress       Don't compress the backup file
  --upload            Upload backup to cloud storage (if configured)
  --max-backups N     Keep maximum N backups (default: 4)
  --output-dir DIR    Output directory for backups (default: backups)

Examples:
  node scripts/backup-runner.js                    # Standard backup
  node scripts/backup-runner.js --no-compress     # Uncompressed backup
  node scripts/backup-runner.js --max-backups 10  # Keep 10 backups
  node scripts/backup-runner.js --upload          # Upload to cloud

Environment Variables:
  DATABASE_URL        PostgreSQL connection string (required)

Dependencies:
  - PostgreSQL client tools (pg_dump, psql)
  - Node.js and npm
`);
  process.exit(0);
}

// Run the backup
runBackup(); 
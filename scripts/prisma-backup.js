#!/usr/bin/env node

// Prisma-based backup script for Movie Ranking App
// Usage: node scripts/prisma-backup.js [options]

// Load environment variables from .env files
try {
  require('dotenv').config({ path: '.env.local' });
  require('dotenv').config({ path: '.env' });
} catch (error) {
  console.log('⚠️ dotenv not available, using system environment variables only');
}

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  compress: !args.includes('--no-compress'),
  maxBackups: 20,
  outputDir: 'backups',
  format: args.includes('--sql') ? 'sql' : 'json'
};

// Parse custom options
args.forEach((arg, index) => {
  if (arg === '--max-backups' && args[index + 1]) {
    options.maxBackups = parseInt(args[index + 1]) || 20;
  }
  if (arg === '--output-dir' && args[index + 1]) {
    options.outputDir = args[index + 1];
  }
});

// Import Prisma Client dynamically
async function getPrismaClient() {
  try {
    const { PrismaClient } = require('@prisma/client');
    return new PrismaClient();
  } catch (error) {
    throw new Error('Prisma Client not found. Run: npm install @prisma/client');
  }
}

// Export data using Prisma Client
async function exportDataWithPrisma() {
  const startTime = Date.now();
  
  try {
    // Ensure backup directory exists
    await fs.mkdir(options.outputDir, { recursive: true });

    // Generate backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFileName = `movie_ranking_prisma_backup_${timestamp}.${options.format}`;
    const backupPath = path.join(options.outputDir, backupFileName);

    console.log('🔄 Starting Prisma data export...');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('📁 Backup path:', backupPath);
    console.log('📊 Format:', options.format.toUpperCase());

    const prisma = await getPrismaClient();

    // Get all data from your tables
    console.log('📊 Exporting data from tables...');
    
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        format: options.format,
        tables: []
      },
      data: {}
    };

    // Export Users
    console.log('   └── Users...');
    const users = await prisma.user.findMany({
      include: {
        ratings: true,
        reviews: true,
        watchlist: true,
        weightPreferences: true
      }
    });
    exportData.data.users = users;
    exportData.metadata.tables.push(`users (${users.length} records)`);

    // Export Movies
    console.log('   └── Movies...');
    const movies = await prisma.movie.findMany({
      include: {
        ratings: true,
        reviews: true,
        watchlist: true
      }
    });
    exportData.data.movies = movies;
    exportData.metadata.tables.push(`movies (${movies.length} records)`);

    // Export Ratings
    console.log('   └── Ratings...');
    const ratings = await prisma.rating.findMany();
    exportData.data.ratings = ratings;
    exportData.metadata.tables.push(`ratings (${ratings.length} records)`);

    // Export Reviews
    console.log('   └── Reviews...');
    const reviews = await prisma.review.findMany();
    exportData.data.reviews = reviews;
    exportData.metadata.tables.push(`reviews (${reviews.length} records)`);

    // Export WeightPreferences
    console.log('   └── WeightPreferences...');
    const weightPreferences = await prisma.weightPreference.findMany();
    exportData.data.weightPreferences = weightPreferences;
    exportData.metadata.tables.push(`weightPreferences (${weightPreferences.length} records)`);

    // Export AggregateScores
    console.log('   └── AggregateScores...');
    const aggregateScores = await prisma.aggregateScore.findMany();
    exportData.data.aggregateScores = aggregateScores;
    exportData.metadata.tables.push(`aggregateScores (${aggregateScores.length} records)`);

    // Export Watchlists
    console.log('   └── Watchlists...');
    const watchlists = await prisma.watchlist.findMany();
    exportData.data.watchlists = watchlists;
    exportData.metadata.tables.push(`watchlists (${watchlists.length} records)`);

    // Export Activities
    console.log('   └── Activities...');
    const activities = await prisma.activity.findMany();
    exportData.data.activities = activities;
    exportData.metadata.tables.push(`activities (${activities.length} records)`);

    // Export Forum data
    console.log('   └── Forum Categories...');
    const forumCategories = await prisma.forumCategory.findMany();
    exportData.data.forumCategories = forumCategories;
    exportData.metadata.tables.push(`forumCategories (${forumCategories.length} records)`);

    console.log('   └── Forum Threads...');
    const forumThreads = await prisma.forumThread.findMany();
    exportData.data.forumThreads = forumThreads;
    exportData.metadata.tables.push(`forumThreads (${forumThreads.length} records)`);

    console.log('   └── Forum Posts...');
    const forumPosts = await prisma.forumPost.findMany();
    exportData.data.forumPosts = forumPosts;
    exportData.metadata.tables.push(`forumPosts (${forumPosts.length} records)`);

    // Export Forum Post Likes
    console.log('   └── Forum Post Likes...');
    const forumPostLikes = await prisma.forumPostLike.findMany();
    exportData.data.forumPostLikes = forumPostLikes;
    exportData.metadata.tables.push(`forumPostLikes (${forumPostLikes.length} records)`);

    // Export Review Likes
    console.log('   └── Review Likes...');
    const reviewLikes = await prisma.reviewLike.findMany();
    exportData.data.reviewLikes = reviewLikes;
    exportData.metadata.tables.push(`reviewLikes (${reviewLikes.length} records)`);

    // Export Restaurant data
    console.log('   └── Restaurants...');
    const restaurants = await prisma.restaurant.findMany({
      include: {
        ratings: true,
        reviews: true,
        aggregateScores: true
      }
    });
    exportData.data.restaurants = restaurants;
    exportData.metadata.tables.push(`restaurants (${restaurants.length} records)`);

    // Export Restaurant Ratings
    console.log('   └── Restaurant Ratings...');
    const restaurantRatings = await prisma.restaurantRating.findMany();
    exportData.data.restaurantRatings = restaurantRatings;
    exportData.metadata.tables.push(`restaurantRatings (${restaurantRatings.length} records)`);

    // Export Restaurant Reviews
    console.log('   └── Restaurant Reviews...');
    const restaurantReviews = await prisma.restaurantReview.findMany();
    exportData.data.restaurantReviews = restaurantReviews;
    exportData.metadata.tables.push(`restaurantReviews (${restaurantReviews.length} records)`);

    // Export Restaurant Review Likes
    console.log('   └── Restaurant Review Likes...');
    const restaurantReviewLikes = await prisma.restaurantReviewLike.findMany();
    exportData.data.restaurantReviewLikes = restaurantReviewLikes;
    exportData.metadata.tables.push(`restaurantReviewLikes (${restaurantReviewLikes.length} records)`);

    // Export Restaurant Aggregate Scores
    console.log('   └── Restaurant Aggregate Scores...');
    const restaurantAggregateScores = await prisma.restaurantAggregateScore.findMany();
    exportData.data.restaurantAggregateScores = restaurantAggregateScores;
    exportData.metadata.tables.push(`restaurantAggregateScores (${restaurantAggregateScores.length} records)`);

    // Export Restaurant Weight Preferences
    console.log('   └── Restaurant Weight Preferences...');
    const restaurantWeightPreferences = await prisma.restaurantWeightPreference.findMany();
    exportData.data.restaurantWeightPreferences = restaurantWeightPreferences;
    exportData.metadata.tables.push(`restaurantWeightPreferences (${restaurantWeightPreferences.length} records)`);

    // Export User Sessions (Analytics)
    console.log('   └── User Sessions...');
    const userSessions = await prisma.userSession.findMany();
    exportData.data.userSessions = userSessions;
    exportData.metadata.tables.push(`userSessions (${userSessions.length} records)`);

    // Export Page Sessions (Analytics)
    console.log('   └── Page Sessions...');
    const pageSessions = await prisma.pageSession.findMany();
    exportData.data.pageSessions = pageSessions;
    exportData.metadata.tables.push(`pageSessions (${pageSessions.length} records)`);

    // Export Friend Groups
    console.log('   └── Friend Groups...');
    const friendGroups = await prisma.friendGroup.findMany({
      include: {
        members: true
      }
    });
    exportData.data.friendGroups = friendGroups;
    exportData.metadata.tables.push(`friendGroups (${friendGroups.length} records)`);

    // Export Friend Group Members
    console.log('   └── Friend Group Members...');
    const friendGroupMembers = await prisma.friendGroupMember.findMany();
    exportData.data.friendGroupMembers = friendGroupMembers;
    exportData.metadata.tables.push(`friendGroupMembers (${friendGroupMembers.length} records)`);

    await prisma.$disconnect();

    // Write backup to file
    let fileContent;
    if (options.format === 'sql') {
      // Generate SQL INSERT statements
      fileContent = generateSQLExport(exportData);
    } else {
      // JSON format
      fileContent = JSON.stringify(exportData, null, 2);
    }

    await fs.writeFile(backupPath, fileContent);

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

    console.log('✅ Prisma backup completed successfully!');
    console.log('📊 Backup size:', `${sizeInMB} MB`);
    console.log('⏱️ Duration:', `${duration}ms`);
    console.log('📋 Tables exported:', exportData.metadata.tables.length);
    
    exportData.metadata.tables.forEach(table => {
      console.log(`   └── ${table}`);
    });

    return {
      success: true,
      backupPath: finalBackupPath,
      size: `${sizeInMB} MB`,
      duration,
      tablesExported: exportData.metadata.tables.length
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Prisma backup failed:', error.message);

    return {
      success: false,
      error: error.message,
      duration
    };
  }
}

// Generate SQL INSERT statements from exported data
function generateSQLExport(exportData) {
  let sql = `-- Movie Ranking App Database Export\n`;
  sql += `-- Exported at: ${exportData.metadata.exportedAt}\n`;
  sql += `-- Format: SQL\n\n`;

  sql += `-- Disable foreign key checks for import\n`;
  sql += `SET session_replication_role = replica;\n\n`;

  // Add your SQL generation logic here based on your schema
  // This is a simplified version - you might want to enhance it
  
  sql += `-- Users\n`;
  if (exportData.data.users) {
    exportData.data.users.forEach(user => {
      sql += `INSERT INTO "User" ("id", "name", "email", "password", "role", "status", "createdAt", "updatedAt") VALUES `;
      sql += `(${user.id}, '${escapeSqlString(user.name)}', '${escapeSqlString(user.email)}', '${escapeSqlString(user.password)}', '${user.role}', '${user.status}', '${user.createdAt}', '${user.updatedAt}');\n`;
    });
  }

  sql += `\n-- Movies\n`;
  if (exportData.data.movies) {
    exportData.data.movies.forEach(movie => {
      sql += `INSERT INTO "Movie" ("id", "title", "year", "posterUrl", "tmdbId", "tmdbRating", "tmdbVoteCount", "category", "createdAt", "updatedAt") VALUES `;
      sql += `(${movie.id}, '${escapeSqlString(movie.title)}', ${movie.year}, '${escapeSqlString(movie.posterUrl)}', ${movie.tmdbId}, ${movie.tmdbRating}, ${movie.tmdbVoteCount}, '${movie.category}', '${movie.createdAt}', '${movie.updatedAt}');\n`;
    });
  }

  sql += `\n-- Re-enable foreign key checks\n`;
  sql += `SET session_replication_role = DEFAULT;\n`;

  return sql;
}

// Helper function to escape SQL strings
function escapeSqlString(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

// List existing backups
async function listBackups() {
  try {
    const files = await fs.readdir(options.outputDir);
    return files
      .filter(file => file.startsWith('movie_ranking_prisma_backup_'))
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

async function runPrismaBackup() {
  try {
    console.log('🚀 Starting Prisma backup process...');
    console.log('⚙️ Options:', options);

    // Check if we're in the right directory
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    try {
      require(packageJsonPath);
    } catch (error) {
      console.error('❌ Error: Must run from project root directory');
      process.exit(1);
    }

    // Create backup
    const result = await exportDataWithPrisma();

    if (result.success) {
      console.log('\n🎉 Prisma backup completed successfully!');
      console.log('📁 Backup file:', result.backupPath);
      console.log('📊 Size:', result.size);
      console.log('⏱️ Duration:', `${result.duration}ms`);
      console.log('📋 Tables exported:', result.tablesExported);
      
      // List all backups
      const allBackups = await listBackups();
      console.log(`\n📋 Total Prisma backups: ${allBackups.length}`);
      allBackups.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`);
      });
      
      process.exit(0);
    } else {
      console.error('\n❌ Prisma backup failed!');
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
  console.log('\n⏹️ Prisma backup process interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️ Prisma backup process terminated');
  process.exit(1);
});

// Show help message
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📋 Movie Ranking App - Prisma Database Backup Tool

Usage: node scripts/prisma-backup.js [options]

Options:
  --help, -h          Show this help message
  --no-compress       Don't compress the backup file
  --sql               Export as SQL instead of JSON
  --max-backups N     Keep maximum N backups (default: 20)
  --output-dir DIR    Output directory for backups (default: backups)

Examples:
  node scripts/prisma-backup.js                    # Standard JSON backup
  node scripts/prisma-backup.js --sql             # SQL format backup
  node scripts/prisma-backup.js --no-compress     # Uncompressed backup
  node scripts/prisma-backup.js --max-backups 10  # Keep 10 backups

Note: This script uses Prisma Client to export data, working with any
      database provider including Prisma Postgres, Vercel, Neon, etc.

Dependencies:
  - @prisma/client
  - Node.js and npm
`);
  process.exit(0);
}

// Run the backup
runPrismaBackup(); 
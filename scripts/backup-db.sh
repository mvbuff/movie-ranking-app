#!/bin/bash

# Database Backup Script for Movie Ranking App
# Usage: ./scripts/backup-db.sh

# Load environment variables
source .env.local 2>/dev/null || source .env 2>/dev/null || true

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not found in environment variables"
    echo "Make sure you have .env or .env.local file with DATABASE_URL"
    exit 1
fi

# Create backups directory if it doesn't exist
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/movie_ranking_backup_$TIMESTAMP.sql"

# Perform database backup
echo "🔄 Starting database backup..."
echo "📅 Timestamp: $(date)"
echo "📁 Backup file: $BACKUP_FILE"

# Use pg_dump to create backup
if pg_dump "$DATABASE_URL" > "$BACKUP_FILE"; then
    echo "✅ Backup completed successfully!"
    echo "📊 Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
    
    # Optional: Compress the backup
    if command -v gzip &> /dev/null; then
        gzip "$BACKUP_FILE"
        echo "🗜️ Backup compressed: ${BACKUP_FILE}.gz"
        BACKUP_FILE="${BACKUP_FILE}.gz"
    fi
    
    # Clean up old backups (keep last 4 weeks = 4 backups)
    echo "🧹 Cleaning up old backups (keeping last 4)..."
    ls -t "$BACKUP_DIR"/movie_ranking_backup_*.sql* | tail -n +5 | xargs -r rm
    
    echo "🎉 Backup process completed!"
    
else
    echo "❌ Backup failed!"
    rm -f "$BACKUP_FILE" 2>/dev/null
    exit 1
fi

# Optional: Upload to cloud storage (uncomment and configure as needed)
# echo "☁️ Uploading to cloud storage..."
# aws s3 cp "$BACKUP_FILE" s3://your-backup-bucket/database-backups/
# echo "✅ Uploaded to S3" 
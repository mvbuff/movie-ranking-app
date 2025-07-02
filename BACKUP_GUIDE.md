# 📦 Database Backup System Guide

## Overview

Your Movie Ranking App now includes a comprehensive database backup system that provides:

- ✅ **Manual backups on demand**
- ✅ **Automated scheduled backups every 7 days**
- ✅ **Multiple backup methods** (Shell script, Node.js, API endpoints)
- ✅ **Automatic compression and cleanup**
- ✅ **Admin dashboard integration**
- ✅ **Cloud storage ready** (AWS S3 support)

---

## 🚀 Quick Start

### 1. Enable Automatic Backups

Add these to your `.env` or `.env.local` file:

```bash
# Enable automatic backups every 7 days
AUTO_BACKUP_ENABLED=true
AUTO_BACKUP_INTERVAL_DAYS=7
AUTO_BACKUP_AUTO_START=true
AUTO_BACKUP_COMPRESS=true
AUTO_BACKUP_MAX_BACKUPS=4
```

### 2. Install PostgreSQL Client Tools

**macOS:**
```bash
brew install postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql-client
```

**Docker/Vercel:** Tools are usually pre-installed

### 3. Create Your First Backup

```bash
npm run backup
```

---

## 📋 Available Commands

### NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run backup` | Create a standard compressed backup |
| `npm run backup:help` | Show detailed help information |
| `npm run backup:uncompressed` | Create backup without compression |
| `npm run backup:quick` | Quick backup (keeps only 2 backups) |
| `npm run backup:shell` | Use the shell script version |
| `npm run backup:list` | List all existing backups |
| `npm run backup:clean` | Remove backups older than 30 days |

### Shell Script (Alternative)

```bash
# Direct shell script usage
./scripts/backup-db.sh

# With options
./scripts/backup-db.sh --help
```

### API Endpoints (Admin Only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/backup` | GET | List all backups |
| `/api/admin/backup` | POST | Create new backup |
| `/api/admin/backup` | DELETE | Clean up old backups |

---

## ⚙️ Configuration Options

### Environment Variables

```bash
# Core Configuration
AUTO_BACKUP_ENABLED=true              # Enable/disable automatic backups
AUTO_BACKUP_INTERVAL_DAYS=7           # Backup frequency (days)
AUTO_BACKUP_AUTO_START=true           # Start on app launch
AUTO_BACKUP_COMPRESS=true             # Compress backup files
AUTO_BACKUP_MAX_BACKUPS=4             # Number of backups to keep

# Cloud Storage (Optional)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
BACKUP_S3_BUCKET=your-backup-bucket
```

### Programmatic Configuration

```typescript
import { initializeBackupScheduler } from '@/lib/backup-scheduler';

// Initialize with custom settings
const scheduler = initializeBackupScheduler({
  enabled: true,
  intervalDays: 3,        // Backup every 3 days
  autoStart: true,
  compress: true,
  maxBackups: 10          // Keep 10 backups
});
```

---

## 🗂️ Backup File Structure

Backups are stored in the `backups/` directory:

```
backups/
├── movie_ranking_backup_2024-12-20T14-30-00.sql.gz
├── movie_ranking_backup_2024-12-13T14-30-00.sql.gz
├── movie_ranking_backup_2024-12-06T14-30-00.sql.gz
└── movie_ranking_backup_2024-11-29T14-30-00.sql.gz
```

**Filename Format:** `movie_ranking_backup_YYYY-MM-DDTHH-MM-SS.sql[.gz]`

---

## 🔄 Automatic Backup System

### How It Works

1. **App Startup:** Scheduler initializes based on environment variables
2. **Initial Check:** Creates first backup if none exist
3. **Scheduled Runs:** Automatically creates backups every N days
4. **Cleanup:** Automatically removes old backups (keeps last 4 by default)
5. **Logging:** All operations are logged to console

### Monitoring

Check backup status through the admin API:

```bash
curl -X GET "http://localhost:3000/api/admin/backup" \
  -H "Cookie: your-auth-cookie"
```

---

## 🛠️ Manual Backup Operations

### Create Backup with Options

```bash
# Standard backup
npm run backup

# Uncompressed backup
node scripts/backup-runner.js --no-compress

# Keep more backups
node scripts/backup-runner.js --max-backups 10

# Custom output directory
node scripts/backup-runner.js --output-dir /path/to/backups

# Upload to cloud (if configured)
node scripts/backup-runner.js --upload
```

### Restore from Backup

```typescript
import { DatabaseBackup } from '@/lib/backup';

const backup = new DatabaseBackup();
const result = await backup.restoreBackup('backups/movie_ranking_backup_2024-12-20T14-30-00.sql.gz');

if (result.success) {
  console.log('✅ Database restored successfully');
}
```

---

## ☁️ Cloud Storage Integration

### AWS S3 Setup

1. **Install AWS SDK:**
```bash
npm install aws-sdk
```

2. **Configure Environment:**
```bash
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
BACKUP_S3_BUCKET=your-backup-bucket
```

3. **Enable Cloud Upload:**
```bash
node scripts/backup-runner.js --upload
```

### Other Cloud Providers

Modify the `uploadToCloud` method in `/src/lib/backup.ts` to support:
- Google Cloud Storage
- Azure Blob Storage
- DigitalOcean Spaces
- Any S3-compatible service

---

## 🔧 Troubleshooting

### Common Issues

**❌ "pg_dump: command not found"**
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client
```

**❌ "DATABASE_URL not found"**
- Ensure your `.env` file contains `DATABASE_URL`
- Check that the file is in the correct directory

**❌ "Permission denied"**
```bash
chmod +x scripts/backup-db.sh
```

**❌ "Failed to create backup directory"**
- Check disk space
- Verify write permissions for the app directory

### Debug Mode

Enable verbose logging:

```bash
DEBUG=backup* npm run backup
```

---

## 📊 Monitoring & Alerts

### Backup Status Endpoint

```bash
# Check scheduler status
GET /api/admin/backup/status

Response:
{
  "isRunning": true,
  "config": {
    "enabled": true,
    "intervalDays": 7,
    "maxBackups": 4
  },
  "nextBackup": "2024-12-27T14:30:00.000Z",
  "lastBackup": "2024-12-20T14:30:00.000Z"
}
```

### Log Monitoring

Monitor application logs for backup events:

```
🚀 Starting automatic backups every 7 days
✅ Backup completed successfully
📊 Backup size: 2.5 MB
⏱️ Duration: 1240ms
🧹 Cleaning up 1 old backups...
```

---

## 🚀 Production Deployment

### Vercel Deployment

Add environment variables in Vercel dashboard:

```bash
AUTO_BACKUP_ENABLED=true
AUTO_BACKUP_INTERVAL_DAYS=7
AUTO_BACKUP_AUTO_START=true
```

### Docker Deployment

Ensure PostgreSQL client tools are available:

```dockerfile
RUN apt-get update && apt-get install -y postgresql-client
```

### Cron Jobs (Alternative)

If you prefer external cron jobs:

```bash
# Add to crontab for weekly backups
0 2 * * 0 cd /path/to/app && npm run backup
```

---

## 📋 Best Practices

### Security
- ✅ Store backups in encrypted storage
- ✅ Use secure database credentials
- ✅ Restrict admin API access
- ✅ Regularly test backup restoration

### Performance
- ✅ Schedule backups during low-traffic periods
- ✅ Enable compression to save storage
- ✅ Monitor backup duration and size
- ✅ Clean up old backups automatically

### Reliability
- ✅ Test backup restoration regularly
- ✅ Monitor backup success/failure
- ✅ Keep backups in multiple locations
- ✅ Document restoration procedures

---

## 🆘 Support

### Getting Help

1. **Check logs** for detailed error messages
2. **Run diagnostics:** `npm run backup:help`
3. **Test manually:** `npm run backup`
4. **Verify dependencies:** Check if `pg_dump` is available

### Reporting Issues

Include in your report:
- Environment (OS, Node version, PostgreSQL version)
- Full error message
- Configuration (remove sensitive data)
- Steps to reproduce

---

**✨ Your database is now protected with automated backups every 7 days!** 
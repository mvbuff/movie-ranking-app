# Restaurant Image Backfill Guide

This guide explains how to backfill missing restaurant images using Google Places API data.

## Overview

The restaurant image backfill functionality helps you automatically add images to existing restaurants that don't have any photos. It uses the Google Places API to search for each restaurant and match it with the best possible result, then extracts photos from Google Places data.

## Methods to Run Backfill

### 1. Admin Panel (Recommended)

The easiest way to run the backfill is through the admin panel:

1. **Access Admin Panel**: Navigate to `/admin` (requires admin role)
2. **Go to Restaurant Images Tab**: Click on the "Restaurant Images" tab
3. **Check Status**: The panel shows:
   - Total restaurants in database
   - How many have images
   - How many are missing images
   - List of restaurants needing images
4. **Preview First (Dry Run)**: Click "Preview Backfill (Dry Run)" to see what would be processed
5. **Run Backfill**: Click "Run Backfill" to actually update the restaurants

### 2. Command Line Script

You can also run the backfill script directly from the command line:

```bash
# Navigate to the app directory
cd movie-ranking-app

# Dry run to see what would be processed
node scripts/backfill-restaurant-images.js --dry-run

# Run the actual backfill
node scripts/backfill-restaurant-images.js
```

## How It Works

### 1. Restaurant Detection
- Finds restaurants that don't have images (no `imageUrl` and no `metadata.photos`)
- Only processes restaurants that are missing images

### 2. Google Places Search
- For each restaurant, searches Google Places API using restaurant name and location
- Uses fuzzy matching to find the best matching restaurant

### 3. Similarity Matching
- Calculates similarity scores based on:
  - Restaurant name (70% weight)
  - Location/address (30% weight)
- Only accepts matches with >60% similarity

### 4. Image Extraction
- Extracts up to 3 photos from the matched Google Places restaurant
- Stores photos in the restaurant's `metadata.photos` array
- Also sets the first photo as the main `imageUrl` if it doesn't exist

### 5. Data Update
- Updates restaurant metadata with Google Places data including:
  - Photos
  - Google Place ID
  - Coordinates
  - Phone number
  - Website
  - Business status
  - Rating and review count

## Requirements

### Environment Variables
```bash
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
```

### Google Places API Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the "Places API"
4. Create credentials (API Key)
5. Set usage restrictions for security

## Sample Output

### Dry Run
```
🔍 DRY RUN - Restaurants that would be updated:
1. Pizza Palace (New York, NY)
2. Burger Junction (Los Angeles, CA)
3. Sushi Express (San Francisco, CA)
```

### Actual Run
```
[1/10] Processing: Pizza Palace
  ✅ Found match: Pizza Palace NYC (3 photos)
  💾 Updated restaurant with 3 photos

[2/10] Processing: Burger Junction
  ⚠️  No good matches found (similarity < 60%)

📊 Backfill Summary:
✅ Successfully updated: 8 restaurants
⚠️  Skipped (no matches/photos): 2 restaurants
❌ Errors: 0 restaurants
```

## API Endpoints

### GET `/api/admin/backfill-restaurant-images`
Returns status of restaurants with/without images

### POST `/api/admin/backfill-restaurant-images`
Runs the backfill process
- `dryRun: boolean` - Whether to run in preview mode
- `restaurantIds: string[]` - Optional: Specific restaurant IDs to process

## Error Handling

The backfill process includes robust error handling:

- **API Rate Limits**: Includes delays between requests
- **Similarity Threshold**: Only processes matches with >60% similarity
- **Photo Validation**: Skips restaurants where no photos are found
- **Individual Failures**: One restaurant failure doesn't stop the entire process

## Best Practices

1. **Always run a dry run first** to preview what will be processed
2. **Check Google Places API quotas** before running large backfills
3. **Monitor the results** in the admin panel
4. **Run during off-peak hours** to avoid affecting users
5. **Backup your database** before running large operations

## Troubleshooting

### Common Issues

1. **"No Google Places results found"**
   - Restaurant name might be too generic
   - Location information might be missing or incorrect

2. **"No good matches found (similarity < 60%)"**
   - Restaurant name in database doesn't match Google Places data
   - Consider manually updating restaurant names for better matching

3. **"Best match has no photos"**
   - Google Places entry exists but has no photos available
   - This is normal for some smaller establishments

### Manual Fixes

For restaurants that can't be automatically matched:
1. Search Google Places manually
2. Update the restaurant's metadata directly in the database
3. Use the Google Places restaurant search in the food section

## Performance Notes

- Process runs with 200ms delays between API calls
- Typical processing time: ~30-60 seconds per 100 restaurants
- Memory usage is minimal as restaurants are processed sequentially
- Progress is logged in real-time

## Data Storage

Updated restaurant data includes:
- `metadata.photos[]` - Array of photo URLs
- `metadata.googlePlaceId` - Google Place ID for future reference
- `metadata.rating` - Google Places rating
- `metadata.coordinates` - Latitude/longitude
- `metadata.phone` - Phone number
- `metadata.website` - Restaurant website
- `imageUrl` - Main image URL (first photo)

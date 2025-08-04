# Google Places API Setup Guide

This guide will help you set up the Google Places API for restaurant search functionality in the Movie Ranking App.

## Prerequisites

- A Google Cloud Platform (GCP) account
- A GCP project with billing enabled (Google Places API requires billing)
- Basic knowledge of API keys and environment variables

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown and select "New Project"
3. Enter a project name (e.g., "movie-ranking-app")
4. Click "Create"

## Step 2: Enable the Places API

1. In the Google Cloud Console, navigate to **APIs & Services > Library**
2. Search for "Places API" 
3. Click on **"Places API (New)"** (make sure it's the new version, not legacy)
4. Click **"Enable"**

### Additional APIs to Enable (Recommended)

For better functionality, also enable these APIs:
- **Maps JavaScript API** - For enhanced map integration
- **Geocoding API** - For address validation and conversion
- **Places API** - For additional place details

## Step 3: Create API Credentials

1. Go to **APIs & Services > Credentials**
2. Click **"+ CREATE CREDENTIALS"**
3. Select **"API key"**
4. Copy the generated API key immediately

### Secure Your API Key (Important!)

1. Click on the created API key to edit it
2. Under **"API restrictions"**, select **"Restrict key"**
3. Choose the following APIs:
   - Places API (New)
   - Maps JavaScript API (if enabled)
   - Geocoding API (if enabled)

### Set Application Restrictions (Recommended)

For production:
1. Under **"Application restrictions"**, select **"HTTP referrers (web sites)"**
2. Add your domain(s):
   - `https://yourdomain.com/*`
   - `https://www.yourdomain.com/*`

For development:
1. Select **"HTTP referrers (web sites)"**
2. Add:
   - `http://localhost:3000/*`
   - `https://localhost:3000/*`

## Step 4: Set Up Billing

**Important:** Google Places API requires billing to be enabled, even for the free tier.

1. Go to **Billing** in the Google Cloud Console
2. Link a billing account or create a new one
3. Add a payment method

### Free Tier Limits

Google provides generous free tier limits:
- **Places API (New)**: $200 free credit per month
- **Text Search**: $32 per 1000 requests (after free credit)
- **Nearby Search**: $32 per 1000 requests (after free credit)
- **Place Details**: $17 per 1000 requests (after free credit)

## Step 5: Configure Your Application

### Add API Key to Environment Variables

1. Open your `.env` file in the project root
2. Add your Google Places API key:

```bash
# Google Places API (for restaurant search)
GOOGLE_PLACES_API_KEY="your_actual_api_key_here"
```

### Update Environment File Example

Your `.env` file should include:

```bash
# Database
DATABASE_URL="your_database_url_here"

# TMDB API for movie data
TMDB_API_KEY="your_tmdb_api_key_here"

# NextAuth.js
NEXTAUTH_SECRET="your_nextauth_secret_here"
GITHUB_CLIENT_ID="your_github_client_id_here"
GITHUB_CLIENT_SECRET="your_github_client_secret_here"

# Google Places API (for restaurant search)
GOOGLE_PLACES_API_KEY="your_actual_api_key_here"

# Prisma Backup Scheduler Settings
AUTO_BACKUP_ENABLED=false
AUTO_BACKUP_INTERVAL_DAYS=7
AUTO_BACKUP_AUTO_START=true
AUTO_BACKUP_COMPRESS=true
```

## Step 6: Test Your Setup

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/food`

3. Click on the **"🔍 Search (Google Places)"** tab

4. Try searching for restaurants:
   - Enter a query like "pizza" or "sushi"
   - Enter a location like "New York, NY"
   - Click "Search Restaurants"

5. If configured correctly, you should see restaurant results with:
   - Restaurant names and addresses
   - Ratings and price levels
   - Photos (if available)
   - Google Maps links

## Step 7: Monitor Usage

1. In Google Cloud Console, go to **APIs & Services > Dashboard**
2. Click on **"Places API (New)"**
3. Monitor your usage to ensure you stay within budget

### Set Up Billing Alerts (Recommended)

1. Go to **Billing > Budgets & alerts**
2. Create a budget (e.g., $50/month)
3. Set alerts at 50%, 90%, and 100% of budget

## Troubleshooting

### Common Issues

1. **"This API project is not authorized to use this API"**
   - Make sure you enabled the Places API (New)
   - Check that billing is enabled

2. **"API key not valid"**
   - Verify the API key is correctly copied
   - Check API restrictions in Google Cloud Console
   - Ensure the key has access to Places API

3. **"REQUEST_DENIED"**
   - Enable billing on your Google Cloud project
   - Check that the referring URL is allowed

4. **"ZERO_RESULTS"**
   - Try different search terms
   - Check that location parameter is valid
   - Verify the area has restaurants

### Testing API Key Directly

You can test your API key directly with curl:

```bash
curl "https://maps.googleapis.com/maps/api/place/textsearch/json?query=restaurant&location=40.7128,-74.0060&key=YOUR_API_KEY"
```

## API Limits and Optimization

### Rate Limits
- 1000 requests per 100 seconds per user
- 100 requests per 100 seconds per user for some endpoints

### Cost Optimization Tips
1. **Cache Results**: Store frequently requested data
2. **Use Specific Queries**: More specific searches return better, more relevant results
3. **Limit Photo Requests**: Photos count as separate requests
4. **Use Autocomplete Sparingly**: It's useful but each keystroke can trigger a request

### Fields Optimization
The API allows you to specify which fields to return to reduce costs:
- Basic fields: place_id, name, formatted_address, geometry
- Contact fields: formatted_phone_number, website
- Atmosphere fields: rating, price_level, user_ratings_total

## Security Best Practices

1. **Never expose API keys in client-side code**
2. **Use server-side proxy** (already implemented in this app)
3. **Restrict API key usage** to specific domains/IPs
4. **Monitor usage regularly** for unexpected spikes
5. **Rotate API keys periodically**

## Support and Documentation

- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Google Cloud Support](https://cloud.google.com/support)
- [Places API Pricing](https://developers.google.com/maps/documentation/places/web-service/pricing)
- [API Key Best Practices](https://developers.google.com/maps/api-key-best-practices)

## Migration from Foursquare

This app previously used Foursquare API. The Google Places integration provides:

### Advantages
- ✅ More comprehensive restaurant data
- ✅ Better global coverage  
- ✅ Higher quality photos
- ✅ Direct Google Maps integration
- ✅ More reliable service
- ✅ Better search accuracy

### Differences
- **Data Format**: Different JSON structure (handled automatically)
- **Rate Limits**: Different limits and pricing structure
- **Features**: Some Foursquare-specific features are not available

The migration is complete and transparent to users - all existing restaurant data remains intact.
#!/usr/bin/env node

/**
 * Script to backfill missing restaurant images using Google Places API
 * This script will:
 * 1. Find restaurants that don't have images (no metadata.photos or imageUrl)
 * 2. Search Google Places for each restaurant
 * 3. Update the restaurant with found images
 */

const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

// Google Places API configuration
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

if (!GOOGLE_PLACES_API_KEY) {
  console.error('❌ GOOGLE_PLACES_API_KEY environment variable is required');
  process.exit(1);
}

class GooglePlacesAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async makeRequest(endpoint, params = {}) {
    const url = new URL(`${GOOGLE_PLACES_BASE_URL}${endpoint}`);
    
    // Add API key
    url.searchParams.append('key', this.apiKey);
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    return data;
  }

  // Search for restaurants by name and location
  async searchRestaurant(name, location) {
    try {
      const query = location ? `${name} restaurant ${location}` : `${name} restaurant`;
      
      const response = await this.makeRequest('/textsearch/json', {
        query: query.trim()
      });

      return response.results || [];
    } catch (error) {
      console.error(`Error searching for ${name}:`, error.message);
      return [];
    }
  }

  // Get photo URL from photo reference
  getPhotoUrl(photoReference, maxWidth = 400) {
    return `${GOOGLE_PLACES_BASE_URL}/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${this.apiKey}`;
  }

  // Extract cuisine from Google Places types
  extractCuisineFromTypes(types) {
    const cuisineTypes = types.filter(type => 
      type.includes('food') || 
      type.includes('restaurant') || 
      type.includes('meal') ||
      ['bakery', 'cafe', 'bar', 'night_club'].includes(type)
    );
    
    return cuisineTypes.length > 0 
      ? cuisineTypes[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      : 'Restaurant';
  }

  // Format restaurant data from Google Places
  formatRestaurantData(place) {
    return {
      googlePlaceId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      cuisine: this.extractCuisineFromTypes(place.types),
      rating: place.rating || null,
      priceLevel: place.price_level || null,
      coordinates: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      },
      isOpen: place.opening_hours?.open_now || null,
      website: place.website || null,
      phone: place.formatted_phone_number || place.international_phone_number || null,
      description: `${place.name} - ${this.extractCuisineFromTypes(place.types)}`,
      photos: place.photos?.slice(0, 3).map(photo => 
        this.getPhotoUrl(photo.photo_reference, 400)
      ) || [],
      businessStatus: place.business_status,
      userRatingsTotal: place.user_ratings_total,
      googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
    };
  }
}

// Initialize Google Places API
const googlePlacesAPI = new GooglePlacesAPI(GOOGLE_PLACES_API_KEY);

// Helper function to check if restaurant has images
function hasImages(restaurant) {
  // Check if has imageUrl
  if (restaurant.imageUrl) return true;
  
  // Check if has photos in metadata
  if (restaurant.metadata && restaurant.metadata.photos && restaurant.metadata.photos.length > 0) {
    return true;
  }
  
  return false;
}

// Helper function to calculate similarity between two strings
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Find the best matching restaurant from Google Places results
function findBestMatch(restaurant, googleResults) {
  if (googleResults.length === 0) return null;
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const result of googleResults) {
    // Calculate name similarity
    const nameSimilarity = calculateSimilarity(
      restaurant.name.toLowerCase(),
      result.name.toLowerCase()
    );
    
    // Calculate location similarity if available
    let locationSimilarity = 0;
    if (restaurant.location && result.formatted_address) {
      locationSimilarity = calculateSimilarity(
        restaurant.location.toLowerCase(),
        result.formatted_address.toLowerCase()
      );
    }
    
    // Weighted score (name is more important than location)
    const score = (nameSimilarity * 0.7) + (locationSimilarity * 0.3);
    
    if (score > bestScore && score > 0.6) { // Minimum threshold of 60% similarity
      bestScore = score;
      bestMatch = result;
    }
  }
  
  return bestMatch;
}

async function backfillRestaurantImages(dryRun = false) {
  try {
    console.log('🔍 Finding restaurants without images...');
    
    // Find all restaurants
    const allRestaurants = await prisma.restaurant.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        location: true,
        cuisine: true,
        imageUrl: true,
        metadata: true,
        createdAt: true
      }
    });
    
    // Filter restaurants without images
    const restaurantsWithoutImages = allRestaurants.filter(restaurant => !hasImages(restaurant));
    
    console.log(`📊 Total restaurants: ${allRestaurants.length}`);
    console.log(`📷 Restaurants with images: ${allRestaurants.length - restaurantsWithoutImages.length}`);
    console.log(`❌ Restaurants without images: ${restaurantsWithoutImages.length}`);
    
    if (restaurantsWithoutImages.length === 0) {
      console.log('✅ All restaurants already have images!');
      return;
    }
    
    if (dryRun) {
      console.log('\n🔍 DRY RUN - Restaurants that would be updated:');
      restaurantsWithoutImages.forEach((restaurant, index) => {
        console.log(`${index + 1}. ${restaurant.name} (${restaurant.location || 'No location'})`);
      });
      return;
    }
    
    console.log(`\n🚀 Starting image backfill for ${restaurantsWithoutImages.length} restaurants...`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const [index, restaurant] of restaurantsWithoutImages.entries()) {
      console.log(`\n[${index + 1}/${restaurantsWithoutImages.length}] Processing: ${restaurant.name}`);
      
      try {
        // Search Google Places for this restaurant
        const searchResults = await googlePlacesAPI.searchRestaurant(
          restaurant.name,
          restaurant.location || restaurant.address
        );
        
        if (searchResults.length === 0) {
          console.log(`  ⚠️  No Google Places results found`);
          skipCount++;
          continue;
        }
        
        // Find the best matching restaurant
        const bestMatch = findBestMatch(restaurant, searchResults);
        
        if (!bestMatch) {
          console.log(`  ⚠️  No good matches found (similarity < 60%)`);
          skipCount++;
          continue;
        }
        
        // Format the Google Places data
        const formattedData = googlePlacesAPI.formatRestaurantData(bestMatch);
        
        if (formattedData.photos.length === 0) {
          console.log(`  ⚠️  Best match has no photos`);
          skipCount++;
          continue;
        }
        
        console.log(`  ✅ Found match: ${bestMatch.name} (${formattedData.photos.length} photos)`);
        
        // Update the restaurant with the new metadata
        const updatedMetadata = {
          ...(restaurant.metadata || {}),
          ...formattedData,
          // Keep existing data but add/update with Google Places data
          photos: formattedData.photos,
          googlePlaceId: formattedData.googlePlaceId,
          rating: formattedData.rating,
          priceLevel: formattedData.priceLevel,
          coordinates: formattedData.coordinates,
          website: formattedData.website,
          phone: formattedData.phone,
          businessStatus: formattedData.businessStatus,
          userRatingsTotal: formattedData.userRatingsTotal
        };
        
        await prisma.restaurant.update({
          where: { id: restaurant.id },
          data: {
            metadata: updatedMetadata,
            // Also update imageUrl with the first photo if it doesn't exist
            ...((!restaurant.imageUrl && formattedData.photos.length > 0) && { 
              imageUrl: formattedData.photos[0] 
            })
          }
        });
        
        console.log(`  💾 Updated restaurant with ${formattedData.photos.length} photos`);
        successCount++;
        
        // Add a small delay to avoid hitting API rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`  ❌ Error processing ${restaurant.name}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Backfill Summary:');
    console.log(`✅ Successfully updated: ${successCount} restaurants`);
    console.log(`⚠️  Skipped (no matches/photos): ${skipCount} restaurants`);
    console.log(`❌ Errors: ${errorCount} restaurants`);
    console.log(`🎉 Backfill completed!`);
    
  } catch (error) {
    console.error('❌ Fatal error during backfill:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  
  console.log('🏪 Restaurant Image Backfill Script');
  console.log('=====================================');
  
  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made\n');
  } else {
    console.log('⚠️  Running in LIVE mode - restaurants will be updated\n');
  }
  
  await backfillRestaurantImages(dryRun);
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { backfillRestaurantImages };

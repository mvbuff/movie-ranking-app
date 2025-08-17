import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { googlePlacesAPI } from '@/lib/google-places-api';

export const dynamic = 'force-dynamic';

// Helper function to check if restaurant has images
function hasImages(restaurant: {
  imageUrl: string | null;
  metadata: unknown;
}) {
  // Check if has imageUrl
  if (restaurant.imageUrl) return true;
  
  // Check if has photos in metadata
  if (restaurant.metadata && 
      typeof restaurant.metadata === 'object' && 
      restaurant.metadata !== null &&
      'photos' in restaurant.metadata) {
    const metadata = restaurant.metadata as { photos?: unknown[] };
    if (metadata.photos && Array.isArray(metadata.photos) && metadata.photos.length > 0) {
      return true;
    }
  }
  
  return false;
}

// Helper function to calculate similarity between two strings
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
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

interface GooglePlaceResult {
  name: string;
  formatted_address: string;
  place_id: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
}

// Find the best matching restaurant from Google Places results
function findBestMatch(restaurant: {
  name: string;
  address: string | null;
  location: string | null;
}, googleResults: unknown[]): GooglePlaceResult | null {
  if (googleResults.length === 0) return null;
  
  let bestMatch: GooglePlaceResult | null = null;
  let bestScore = 0;
  
  for (const result of googleResults) {
    // Type guard to ensure result has required properties
    if (typeof result !== 'object' || result === null || 
        !('name' in result) || typeof result.name !== 'string' ||
        !('formatted_address' in result) || typeof result.formatted_address !== 'string') {
      continue;
    }
    
    const typedResult = result as GooglePlaceResult;
    
    // Calculate name similarity
    const nameSimilarity = calculateSimilarity(
      restaurant.name.toLowerCase(),
      typedResult.name.toLowerCase()
    );
    
    // Calculate location similarity if available
    let locationSimilarity = 0;
    if (restaurant.location && typedResult.formatted_address) {
      locationSimilarity = calculateSimilarity(
        restaurant.location.toLowerCase(),
        typedResult.formatted_address.toLowerCase()
      );
    }
    
    // Weighted score (name is more important than location)
    const score = (nameSimilarity * 0.7) + (locationSimilarity * 0.3);
    
    if (score > bestScore && score > 0.6) { // Minimum threshold of 60% similarity
      bestScore = score;
      bestMatch = typedResult;
    }
  }
  
  return bestMatch;
}

// GET: Check status of restaurants without images
export async function GET() {
  try {
    // Check authentication and admin role
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { name: session.user?.name || '' },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

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
    
    return NextResponse.json({
      total: allRestaurants.length,
      withImages: allRestaurants.length - restaurantsWithoutImages.length,
      withoutImages: restaurantsWithoutImages.length,
      restaurantsNeedingImages: restaurantsWithoutImages.map(r => ({
        id: r.id,
        name: r.name,
        location: r.location,
        createdAt: r.createdAt
      }))
    });

  } catch (error) {
    console.error('Error checking restaurant images:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Backfill missing restaurant images
export async function POST(request: Request) {
  try {
    // Check authentication and admin role
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { name: session.user?.name || '' },
      select: { role: true, name: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { dryRun = false, restaurantIds } = await request.json();

    // Find restaurants to process
    const whereClause: Record<string, unknown> = {};
    if (restaurantIds && restaurantIds.length > 0) {
      whereClause.id = { in: restaurantIds };
    }

    const allRestaurants = await prisma.restaurant.findMany({
      where: whereClause,
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

    if (restaurantsWithoutImages.length === 0) {
      return NextResponse.json({
        message: 'No restaurants without images found',
        processed: 0,
        success: 0,
        skipped: 0,
        errors: 0
      });
    }

    if (dryRun) {
      return NextResponse.json({
        message: 'Dry run completed',
        wouldProcess: restaurantsWithoutImages.length,
        restaurants: restaurantsWithoutImages.map(r => ({
          id: r.id,
          name: r.name,
          location: r.location
        }))
      });
    }

    console.log(`🚀 Admin ${user.name} started backfill for ${restaurantsWithoutImages.length} restaurants`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const results: {
      restaurant: { id: string; name: string };
      status: 'success' | 'error' | 'skipped';
      photosAdded?: number;
      matchedWith?: string;
      reason?: string;
      error?: string;
    }[] = [];

    // Process each restaurant
    for (const restaurant of restaurantsWithoutImages) {
      try {
        // Search Google Places for this restaurant
        const searchResults = await googlePlacesAPI.searchRestaurants({
          query: restaurant.name,
          location: restaurant.location || restaurant.address || undefined
        });
        
        if (searchResults.length === 0) {
          skipCount++;
          results.push({
            restaurant: { id: restaurant.id, name: restaurant.name },
            status: 'skipped',
            reason: 'No Google Places results found'
          });
          continue;
        }
        
        // Find the best matching restaurant
        const bestMatch = findBestMatch(restaurant, searchResults);
        
        if (!bestMatch) {
          skipCount++;
          results.push({
            restaurant: { id: restaurant.id, name: restaurant.name },
            status: 'skipped',
            reason: 'No good matches found (similarity < 60%)'
          });
          continue;
        }
        
        // Format the Google Places data
        const formattedData = googlePlacesAPI.formatRestaurantData(bestMatch as GooglePlaceResult);
        
        if (formattedData.photos.length === 0) {
          skipCount++;
          results.push({
            restaurant: { id: restaurant.id, name: restaurant.name },
            status: 'skipped',
            reason: 'Best match has no photos'
          });
          continue;
        }
        
        // Update the restaurant with the new metadata
        const updatedMetadata = {
          ...(typeof restaurant.metadata === 'object' && restaurant.metadata !== null ? restaurant.metadata : {}),
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
        
        successCount++;
        results.push({
          restaurant: { id: restaurant.id, name: restaurant.name },
          status: 'success',
          photosAdded: formattedData.photos.length,
          matchedWith: (bestMatch as GooglePlaceResult).name
        });
        
        // Add a small delay to avoid hitting API rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        errorCount++;
        results.push({
          restaurant: { id: restaurant.id, name: restaurant.name },
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`Error processing ${restaurant.name}:`, error);
      }
    }

    console.log(`✅ Backfill completed: ${successCount} success, ${skipCount} skipped, ${errorCount} errors`);

    return NextResponse.json({
      message: 'Backfill completed',
      processed: restaurantsWithoutImages.length,
      success: successCount,
      skipped: skipCount,
      errors: errorCount,
      results
    });

  } catch (error) {
    console.error('Error during backfill:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

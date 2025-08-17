import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { googlePlacesAPI } from '@/lib/google-places-api';
import { type Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

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

interface RestaurantInput {
  name: string;
  location?: string | null;
  address?: string | null;
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

interface RestaurantMetadata {
  photos?: string[];
  imageUrl?: string;
  googlePlaceId?: string;
  rating?: number;
  priceLevel?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
  website?: string;
  phone?: string;
  businessStatus?: string;
  userRatingsTotal?: number;
  vicinity?: string;
  formatted_address?: string;
}

// Find the best matching restaurant from Google Places results
function findBestMatch(restaurant: RestaurantInput, googleResults: unknown[]): GooglePlaceResult | null {
  if (googleResults.length === 0) return null;
  
  let bestMatch = null;
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

// GET: Fetch available images for a specific restaurant
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
    }

    // Fetch restaurant details
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        address: true,
        location: true,
        imageUrl: true,
        metadata: true
      }
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Get existing images from metadata
    const metadata = restaurant.metadata as RestaurantMetadata | null;
    const existingImages = metadata?.photos || [];
    
    // Search Google Places for fresh images
    let freshImages: string[] = [];
    try {
      const searchResults = await googlePlacesAPI.searchRestaurants({
        query: restaurant.name,
        location: restaurant.location || restaurant.address || undefined
      });
      
      if (searchResults.length > 0) {
        const bestMatch = findBestMatch(restaurant, searchResults);
        if (bestMatch) {
          const formattedData = googlePlacesAPI.formatRestaurantData(bestMatch);
          freshImages = formattedData.photos || [];
        }
      }
    } catch (error) {
      console.error('Failed to fetch fresh images from Google Places:', error);
    }

    // Combine and deduplicate images
    const allImages = [...new Set([...existingImages, ...freshImages])];

    return NextResponse.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        location: restaurant.location,
        currentImageUrl: restaurant.imageUrl
      },
      images: {
        existing: existingImages,
        fresh: freshImages,
        all: allImages,
        currentImageUrl: restaurant.imageUrl
      }
    });

  } catch (error) {
    console.error('Error fetching restaurant images:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Update restaurant images or set main image
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

    const { restaurantId, action, imageUrl, selectedImages } = await request.json();

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true, metadata: true }
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const updateData: { 
      imageUrl?: string | null; 
      metadata?: Prisma.InputJsonValue; 
    } = {};

    switch (action) {
      case 'setMainImage':
        if (!imageUrl) {
          return NextResponse.json({ error: 'Image URL is required for setMainImage action' }, { status: 400 });
        }
        updateData.imageUrl = imageUrl;
        console.log(`🖼️ Admin ${user.name} set main image for restaurant: ${restaurant.name}`);
        break;

      case 'updateImages':
        if (!selectedImages || !Array.isArray(selectedImages)) {
          return NextResponse.json({ error: 'Selected images array is required for updateImages action' }, { status: 400 });
        }
        
        const currentMetadata = restaurant.metadata as RestaurantMetadata | null;
        const updatedMetadata = {
          ...(currentMetadata || {}),
          photos: selectedImages
        };
        updateData.metadata = updatedMetadata;
        
        // If there are selected images but no main image, set the first one as main
        if (selectedImages.length > 0 && !currentMetadata?.imageUrl) {
          updateData.imageUrl = selectedImages[0];
        }
        
        console.log(`📸 Admin ${user.name} updated images for restaurant: ${restaurant.name} (${selectedImages.length} images)`);
        break;

      case 'clearImages':
        updateData.imageUrl = null;
        const clearMetadata = restaurant.metadata as RestaurantMetadata | null;
        updateData.metadata = {
          ...(clearMetadata || {}),
          photos: []
        };
        console.log(`🗑️ Admin ${user.name} cleared all images for restaurant: ${restaurant.name}`);
        break;

      case 'refreshImages':
        // Search Google Places for fresh images and update
        try {
          const refreshMetadata = restaurant.metadata as RestaurantMetadata | null;
          const searchResults = await googlePlacesAPI.searchRestaurants({
            query: restaurant.name,
            location: refreshMetadata?.vicinity || refreshMetadata?.formatted_address || undefined
          });
          
          if (searchResults.length > 0) {
            const bestMatch = findBestMatch(restaurant, searchResults);
            if (bestMatch) {
              const formattedData = googlePlacesAPI.formatRestaurantData(bestMatch);
              
              updateData.metadata = {
                ...(refreshMetadata || {}),
                ...formattedData,
                photos: formattedData.photos || []
              };
              
              // Set first photo as main image if no main image exists
              if (formattedData.photos && formattedData.photos.length > 0 && !refreshMetadata?.imageUrl) {
                updateData.imageUrl = formattedData.photos[0];
              }
            }
          }
          
          console.log(`🔄 Admin ${user.name} refreshed images for restaurant: ${restaurant.name}`);
        } catch (error) {
          console.error('Failed to refresh images:', error);
          return NextResponse.json({ error: 'Failed to refresh images from Google Places' }, { status: 500 });
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update the restaurant
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: updateData,
      select: {
        id: true,
        name: true,
        imageUrl: true,
        metadata: true
      }
    });

    const response = NextResponse.json({
      success: true,
      restaurant: updatedRestaurant,
      message: `Successfully ${action.replace(/([A-Z])/g, ' $1').toLowerCase()}`
    });
    
    // Add cache invalidation headers to ensure fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;

  } catch (error) {
    console.error('Error updating restaurant images:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

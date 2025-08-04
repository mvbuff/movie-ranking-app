import { NextResponse } from 'next/server';
import { googlePlacesAPI } from '@/lib/google-places-api';

export const dynamic = 'force-dynamic';

// GET: Search restaurants using Google Places API
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  try {
    const query = searchParams.get('query') || '';
    const location = searchParams.get('location') || '';
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = parseInt(searchParams.get('radius') || '5000'); // 5km default
    const minPrice = searchParams.get('minprice') ? parseInt(searchParams.get('minprice')!) : undefined;
    const maxPrice = searchParams.get('maxprice') ? parseInt(searchParams.get('maxprice')!) : undefined;
    const openNow = searchParams.get('open_now') === 'true';

    // Prepare location parameter
    let locationParam = '';
    if (lat && lng) {
      locationParam = `${lat},${lng}`;
    } else if (location) {
      locationParam = location;
    } else {
      return NextResponse.json(
        { error: 'Location parameter required (either lat/lng or location name)' },
        { status: 400 }
      );
    }

    // Search using Google Places API
    const restaurants = await googlePlacesAPI.searchRestaurants({
      query: query || undefined,
      location: locationParam,
      radius,
      minprice: minPrice,
      maxprice: maxPrice,
      opennow: openNow || undefined,
    });

    // Format results for frontend
    const formattedResults = restaurants.map(restaurant => googlePlacesAPI.formatRestaurantData(restaurant));

    return NextResponse.json({
      results: formattedResults,
      total: formattedResults.length,
      source: 'google_places'
    });

  } catch (error) {
    console.error('Google Places search error:', error);
    return NextResponse.json(
      { error: 'Failed to search restaurants', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST: Get detailed information about a specific Google Places restaurant
export async function POST(request: Request) {
  try {
    const { googlePlaceId } = await request.json();

    if (!googlePlaceId) {
      return NextResponse.json(
        { error: 'Google Place ID is required' },
        { status: 400 }
      );
    }

    const details = await googlePlacesAPI.getPlaceDetails(googlePlaceId);
    
    if (!details) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const formattedDetails = googlePlacesAPI.formatRestaurantData(details);

    return NextResponse.json({
      ...formattedDetails,
      reviews: details.reviews?.slice(0, 5) || [],
      userRatingsTotal: details.user_ratings_total || 0,
      businessStatus: details.business_status || 'OPERATIONAL'
    });

  } catch (error) {
    console.error('Google Places details error:', error);
    return NextResponse.json(
      { error: 'Failed to get restaurant details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
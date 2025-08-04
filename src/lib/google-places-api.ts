// Google Places API Integration
// Documentation: https://developers.google.com/maps/documentation/places/web-service/overview

interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  rating?: number;
  price_level?: number; // 0-4 (Free to Very Expensive)
  opening_hours?: {
    open_now?: boolean;
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
    html_attributions: string[];
  }>;
  vicinity?: string;
  website?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  business_status?: string;
  user_ratings_total?: number;
  reviews?: Array<{
    author_name: string;
    author_url?: string;
    language: string;
    profile_photo_url?: string;
    rating: number;
    relative_time_description: string;
    text: string;
    time: number;
  }>;
}

interface GooglePlacesSearchResponse {
  results: GooglePlace[];
  status: string;
  error_message?: string;
  next_page_token?: string;
}

interface GooglePlaceDetailsResponse {
  result: GooglePlace;
  status: string;
  error_message?: string;
}

class GooglePlacesAPI {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Google Places API key not found. Please set GOOGLE_PLACES_API_KEY in your environment variables.');
    }
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add API key
    url.searchParams.append('key', this.apiKey);
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    return data;
  }

  // Search for restaurants by location and query
  async searchRestaurants(params: {
    query?: string;
    location?: string; // "New York, NY" or "lat,lng"
    radius?: number; // meters (max 50000)
    type?: string; // restaurant, food, etc.
    minprice?: number; // 0-4
    maxprice?: number; // 0-4
    opennow?: boolean;
  }): Promise<GooglePlace[]> {
    try {
      // Use Text Search for query-based searches
      if (params.query) {
        const searchParams: Record<string, string> = {
          query: `${params.query} restaurant ${params.location || ''}`.trim()
        };

        if (params.minprice !== undefined) searchParams.minprice = params.minprice.toString();
        if (params.maxprice !== undefined) searchParams.maxprice = params.maxprice.toString();
        if (params.opennow) searchParams.opennow = 'true';

        const response: GooglePlacesSearchResponse = await this.makeRequest('/textsearch/json', searchParams);
        return response.results || [];
      }

      // Use Nearby Search for location-based searches
      if (params.location) {
        const searchParams: Record<string, string> = {
          location: params.location,
          radius: (params.radius || 5000).toString(),
          type: 'restaurant'
        };

        if (params.minprice !== undefined) searchParams.minprice = params.minprice.toString();
        if (params.maxprice !== undefined) searchParams.maxprice = params.maxprice.toString();
        if (params.opennow) searchParams.opennow = 'true';

        const response: GooglePlacesSearchResponse = await this.makeRequest('/nearbysearch/json', searchParams);
        return response.results || [];
      }

      throw new Error('Either query or location parameter is required');
    } catch (error) {
      console.error('Error searching restaurants:', error);
      return [];
    }
  }

  // Get detailed information about a specific place
  async getPlaceDetails(placeId: string): Promise<GooglePlace | null> {
    try {
      const response: GooglePlaceDetailsResponse = await this.makeRequest('/details/json', {
        place_id: placeId,
        fields: 'place_id,name,formatted_address,geometry,types,rating,price_level,opening_hours,photos,website,formatted_phone_number,business_status,user_ratings_total,reviews'
      });
      return response.result || null;
    } catch (error) {
      console.error(`Error fetching place details for ${placeId}:`, error);
      return null;
    }
  }

  // Get photo URL from photo reference
  getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    return `${this.baseUrl}/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${this.apiKey}`;
  }

  // Search for places by text query
  async textSearch(query: string, location?: string): Promise<GooglePlace[]> {
    return this.searchRestaurants({
      query: location ? `${query} in ${location}` : query
    });
  }

  // Find nearby restaurants
  async findNearbyRestaurants(lat: number, lng: number, radius: number = 1000): Promise<GooglePlace[]> {
    return this.searchRestaurants({
      location: `${lat},${lng}`,
      radius,
      type: 'restaurant'
    });
  }

  // Convert Google Place to our restaurant format
  formatRestaurantData(place: GooglePlace) {
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
      // Generate Google Maps URL
      googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
    };
  }

  private extractCuisineFromTypes(types: string[]): string {
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
}

// Export singleton instance
export const googlePlacesAPI = new GooglePlacesAPI();

// Export types for use in other modules
export type { GooglePlace, GooglePlacesSearchResponse, GooglePlaceDetailsResponse };
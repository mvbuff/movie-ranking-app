/**
 * Utility functions for address formatting and manipulation
 */

/**
 * Trims country information from the end of an address string
 * Common patterns: ", United States", ", USA", ", US"
 */
export function trimCountryFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  
  // Common country patterns to remove from the end of addresses
  const countryPatterns = [
    ', United States',
    ', USA',
    ', US',
    ', United Kingdom',
    ', UK',
    ', Canada',
    ', Australia',
    ', India',
    ', Germany',
    ', France',
    ', Italy',
    ', Spain',
    ', Japan',
    ', China',
    ', Brazil',
    ', Mexico',
    // Add more countries as needed
  ];
  
  let trimmedAddress = address;
  
  // Remove country patterns from the end
  for (const pattern of countryPatterns) {
    if (trimmedAddress.endsWith(pattern)) {
      trimmedAddress = trimmedAddress.slice(0, -pattern.length);
      break; // Only remove one pattern
    }
  }
  
  return trimmedAddress.trim();
}

/**
 * Gets the best available address from restaurant data and trims country info
 */
export function getDisplayAddress(restaurant: {
  location?: string | null;
  address?: string | null;
  metadata?: {
    vicinity?: string;
    formatted_address?: string;
  } | null;
}): string | null {
  const address = restaurant.location || 
                  restaurant.address || 
                  restaurant.metadata?.vicinity || 
                  restaurant.metadata?.formatted_address;
  
  return trimCountryFromAddress(address);
}
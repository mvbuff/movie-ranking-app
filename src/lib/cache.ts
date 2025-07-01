interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheItem<unknown>>();
  private maxSize = 1000; // Prevent memory leaks

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    // Clean up cache if it's getting too large
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000, // Convert to milliseconds
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    // If we didn't clean enough, remove oldest items
    if (cleaned < this.maxSize * 0.1) { // Remove 10% if not much expired
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = Math.floor(this.maxSize * 0.1);
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  // Helper method for cache-or-fetch pattern
  async getOrFetch<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFunction();
    this.set(key, data, ttlSeconds);
    return data;
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    for (const item of this.cache.values()) {
      if (now - item.timestamp > item.ttl) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
      maxSize: this.maxSize,
    };
  }
}

// Export a singleton instance
export const appCache = new SimpleCache();

// Helper functions for common cache keys
export const CacheKeys = {
  movies: 'movies:all',
  publicAggregateScores: 'aggregate:public',
  movieReviews: (movieId: string) => `reviews:movie:${movieId}`,
  userRatings: (userId: string) => `ratings:user:${userId}`,
  groupSummary: (userIds: string[]) => `group:${userIds.sort().join(',')}`,
  movieSearch: (query: string) => `search:movie:${encodeURIComponent(query)}`,
};

// Cache invalidation helpers
export const invalidateMovieCache = async (movieId?: string): Promise<void> => {
  appCache.invalidate(CacheKeys.movies);
  appCache.invalidate(CacheKeys.publicAggregateScores);
  
  if (movieId) {
    appCache.invalidate(CacheKeys.movieReviews(movieId));
  }
  
  // Invalidate group summaries (they depend on ratings)
  appCache.invalidatePattern('^group:');
};

export const invalidateUserCache = async (userId: string): Promise<void> => {
  appCache.invalidate(CacheKeys.userRatings(userId));
  appCache.invalidate(CacheKeys.publicAggregateScores);
  
  // Invalidate group summaries that might include this user
  appCache.invalidatePattern('^group:.*' + userId);
}; 
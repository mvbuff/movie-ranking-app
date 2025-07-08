'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { MessageSquare, Calendar, User } from 'lucide-react';
import MovieTitleLink from './movie-title-link';

interface ReviewSearchItem {
  id: string;
  text: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
  };
  movie: {
    id: string;
    title: string;
    year: number;
    posterUrl: string | null;
    tmdbId: string | null;
    category: string;
  };
}

interface ReviewSearchResultsProps {
  searchTerm: string;
}

export default function ReviewSearchResults({ searchTerm }: ReviewSearchResultsProps) {
  const [results, setResults] = useState<ReviewSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchReviews = async () => {
      if (!searchTerm.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/reviews/search?query=${encodeURIComponent(searchTerm)}`);
        if (!response.ok) {
          throw new Error('Failed to search reviews');
        }
        const data = await response.json();
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(searchReviews, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  if (!searchTerm.trim()) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="text-green-600" size={20} />
        <h3 className="text-lg font-semibold text-gray-800">
          Review Search Results
          {results.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({results.length} {results.length === 1 ? 'result' : 'results'})
            </span>
          )}
        </h3>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          <span className="ml-2 text-gray-600">Searching reviews...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          Error: {error}
        </div>
      )}

      {!loading && results.length === 0 && searchTerm.trim() && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-dashed border-2 border-gray-300">
          <MessageSquare size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No reviews found matching &quot;{searchTerm}&quot;</p>
          <p className="text-sm text-gray-400 mt-2">Try different keywords or check your spelling</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((review) => (
            <div key={review.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
              {/* Movie Header */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-start gap-3">
                  {review.movie.posterUrl && (
                    <div className="relative w-12 h-16 flex-shrink-0">
                      <Image
                        src={review.movie.posterUrl}
                        alt={`${review.movie.title} poster`}
                        layout="fill"
                        objectFit="cover"
                        className="rounded"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {review.movie.tmdbId ? (
                      <MovieTitleLink
                        tmdbId={review.movie.tmdbId}
                        title={review.movie.title}
                        year={review.movie.year}
                        className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors block truncate"
                      />
                    ) : (
                      <span className="font-semibold text-gray-900 block truncate">
                        {review.movie.title}
                      </span>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span>{review.movie.year > 0 ? review.movie.year : 'N/A'}</span>
                      <span>•</span>
                      <span className="capitalize">{review.movie.category.toLowerCase()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Content */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900 text-sm">
                        {review.user.name || 'Anonymous'}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar size={12} />
                        <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {highlightSearchTerm(review.text, searchTerm)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to highlight search term in review text
function highlightSearchTerm(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm.trim()) {
    return text;
  }

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (regex.test(part)) {
      return (
        <span key={index} className="bg-yellow-200 font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
} 
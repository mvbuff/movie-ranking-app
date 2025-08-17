'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, ChevronUp, ChevronDown, Users } from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';

interface ContributionStats {
  id: string;
  name: string;
  joinedDate: string;
  statistics: {
    additions: number;
    ratings: number;
    reviews: number;
    likes: number;
    forumActivity: number;
  };
  breakdown: {
    movies: {
      additions: number;
      ratings: number;
      reviews: number;
    };
    restaurants: {
      additions: number;
      ratings: number;
      reviews: number;
    };
    forum: {
      threads: number;
      posts: number;
    };
    likes: {
      reviewLikes: number;
      restaurantReviewLikes: number;
    };
  };
}

interface DatabaseStats {
  movies: number;
  series: number;
  documentaries: number;
  restaurants: number;
  total: number;
}

interface ContributionPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type SortField = 'name' | 'additions' | 'ratings' | 'reviews' | 'likes';
type SortOrder = 'asc' | 'desc';

export default function ContributionPopup({ isOpen, onClose }: ContributionPopupProps) {
  const [contributors, setContributors] = useState<ContributionStats[]>([]);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('additions');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Click outside to close functionality
  const modalContentRef = useClickOutside<HTMLDivElement>({
    onClickOutside: onClose,
    enabled: isOpen
  });

  useEffect(() => {
    if (isOpen) {
      fetchContributors();
    }
  }, [isOpen]);

  const fetchContributors = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/contributions');
      if (!response.ok) {
        throw new Error('Failed to fetch contribution statistics');
      }
      const data = await response.json();
      setDatabaseStats(data.databaseStats);
      setContributors(data.contributors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filter out users with zero contributions
  const activeContributors = contributors.filter(contributor => {
    const stats = contributor.statistics;
    return stats.additions > 0 || stats.ratings > 0 || stats.reviews > 0 || stats.likes > 0;
  });

  const sortedContributors = [...activeContributors].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      default:
        aValue = a.statistics[sortField];
        bValue = b.statistics[sortField];
        break;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const toggleUserExpansion = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-backdrop"
      data-modal-backdrop="true"
    >
      <div 
        ref={modalContentRef}
        className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col animate-fade-in-up mx-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg flex-shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-gray-600" size={18} />
            <h2 className="text-lg font-semibold text-gray-800">User Contributions</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4">
          {loading && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <Users className="mx-auto text-gray-400 mb-2" size={24} />
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Database Statistics */}
          {!loading && !error && databaseStats && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                📊 Database Overview
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-sm">
                <div className="bg-white p-3 rounded border text-center">
                  <div className="text-xl font-bold text-blue-600">{databaseStats.movies}</div>
                  <div className="text-gray-600 text-xs">Movies</div>
                </div>
                <div className="bg-white p-3 rounded border text-center">
                  <div className="text-xl font-bold text-green-600">{databaseStats.series}</div>
                  <div className="text-gray-600 text-xs">Series</div>
                </div>
                <div className="bg-white p-3 rounded border text-center">
                  <div className="text-xl font-bold text-purple-600">{databaseStats.documentaries}</div>
                  <div className="text-gray-600 text-xs">Documentaries</div>
                </div>
                <div className="bg-white p-3 rounded border text-center">
                  <div className="text-xl font-bold text-orange-600">{databaseStats.restaurants}</div>
                  <div className="text-gray-600 text-xs">Restaurants</div>
                </div>
                <div className="bg-white p-3 rounded border text-center col-span-2 sm:col-span-1">
                  <div className="text-xl font-bold text-gray-800">{databaseStats.total}</div>
                  <div className="text-gray-600 text-xs">Total Items</div>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-auto h-full max-h-[50vh]">
              <div className="min-w-full overflow-x-auto">
                <table className="w-full border-collapse min-w-[500px]">
                  <thead className="sticky top-0 bg-gray-50 border-b">
                    <tr>
                      <th 
                        className="text-left p-2 sm:p-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors min-w-[120px]"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          <span className="hidden sm:inline">User</span>
                          <span className="sm:hidden">Name</span>
                          {getSortIcon('name')}
                        </div>
                      </th>
                      <th 
                        className="text-center p-2 sm:p-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors min-w-[80px]"
                        onClick={() => handleSort('additions')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="hidden sm:inline">Additions</span>
                          <span className="sm:hidden">Add</span>
                          {getSortIcon('additions')}
                        </div>
                      </th>
                      <th 
                        className="text-center p-2 sm:p-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors min-w-[80px]"
                        onClick={() => handleSort('ratings')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="hidden sm:inline">Ratings</span>
                          <span className="sm:hidden">Rate</span>
                          {getSortIcon('ratings')}
                        </div>
                      </th>
                      <th 
                        className="text-center p-2 sm:p-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors min-w-[80px]"
                        onClick={() => handleSort('reviews')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="hidden sm:inline">Reviews</span>
                          <span className="sm:hidden">Rev</span>
                          {getSortIcon('reviews')}
                        </div>
                      </th>
                      <th 
                        className="text-center p-2 sm:p-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors min-w-[70px]"
                        onClick={() => handleSort('likes')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="hidden sm:inline">Likes</span>
                          <span className="sm:hidden">♥</span>
                          {getSortIcon('likes')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedContributors.map((contributor) => (
                      <>
                        <tr 
                          key={contributor.id}
                          className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => toggleUserExpansion(contributor.id)}
                        >
                          <td className="p-2 sm:p-3">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <div className="flex-shrink-0">
                                {expandedUser === contributor.id ? (
                                  <ChevronUp size={14} className="text-gray-400" />
                                ) : (
                                  <ChevronDown size={14} className="text-gray-400" />
                                )}
                              </div>
                              <span className="font-medium text-gray-900 text-sm sm:text-base truncate">{contributor.name}</span>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 text-center text-gray-600 font-medium">
                            {contributor.statistics.additions}
                          </td>
                          <td className="p-2 sm:p-3 text-center text-gray-600 font-medium">
                            {contributor.statistics.ratings}
                          </td>
                          <td className="p-2 sm:p-3 text-center text-gray-600 font-medium">
                            {contributor.statistics.reviews}
                          </td>
                          <td className="p-2 sm:p-3 text-center text-gray-600 font-medium">
                            {contributor.statistics.likes}
                          </td>
                        </tr>
                        {expandedUser === contributor.id && (
                          <tr className="bg-gray-50">
                            <td colSpan={5} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div className="bg-white p-3 rounded border">
                                  <h4 className="font-medium text-gray-700 mb-2">Movies</h4>
                                  <div className="space-y-1 text-gray-600">
                                    <div>Added: {contributor.breakdown.movies.additions}</div>
                                    <div>Rated: {contributor.breakdown.movies.ratings}</div>
                                    <div>Reviewed: {contributor.breakdown.movies.reviews}</div>
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                  <h4 className="font-medium text-gray-700 mb-2">Restaurants</h4>
                                  <div className="space-y-1 text-gray-600">
                                    <div>Added: {contributor.breakdown.restaurants.additions}</div>
                                    <div>Rated: {contributor.breakdown.restaurants.ratings}</div>
                                    <div>Reviewed: {contributor.breakdown.restaurants.reviews}</div>
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                  <h4 className="font-medium text-gray-700 mb-2">Community</h4>
                                  <div className="space-y-1 text-gray-600">
                                    <div>Forum Threads: {contributor.breakdown.forum.threads}</div>
                                    <div>Forum Posts: {contributor.breakdown.forum.posts}</div>
                                    <div>Review Likes: {contributor.breakdown.likes.reviewLikes + contributor.breakdown.likes.restaurantReviewLikes}</div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
                
                {sortedContributors.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="mx-auto text-gray-400 mb-2" size={24} />
                    <p className="text-gray-500">No contribution data available</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with summary */}
        {!loading && !error && sortedContributors.length > 0 && (
          <div className="border-t bg-gray-50 p-3 sm:p-4 rounded-b-lg flex-shrink-0">
            <div className="text-xs sm:text-sm text-gray-600 text-center">
              Showing {sortedContributors.length} active contributor{sortedContributors.length !== 1 ? 's' : ''} (users with contributions)
              <br className="sm:hidden" />
              <span className="hidden sm:inline"> • </span>
              <span className="text-xs sm:text-sm">Click any row for detailed breakdown</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

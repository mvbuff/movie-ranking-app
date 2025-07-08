'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Activity,
  Film, 
  Star, 
  MessageSquare, 
  Heart, 
  Plus, 
  Minus,
  Users,
  UserPlus,
  Calendar
} from 'lucide-react';
import TmdbLink from './tmdb-link';

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  metadata?: Record<string, unknown>;
  movie?: {
    id: string;
    title: string;
    year: number;
    posterUrl: string | null;
    tmdbId: string | null;
    category: string;
  };
  review?: {
    id: string;
    text: string;
    movie: {
      id: string;
      title: string;
    };
  };
  thread?: {
    id: string;
    title: string;
    category: {
      name: string;
    };
  };
}

interface ActivityFeedProps {
  limit?: number;
}

export default function ActivityFeed({ limit }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const url = `/api/activities${limit ? `?limit=${limit}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch activities');
        }
        const data = await response.json();
        setActivities(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [limit]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'MOVIE_ADDED':
        return <Film className="text-blue-500" size={16} />;
      case 'MOVIE_RATED':
        return <Star className="text-yellow-500" size={16} />;
      case 'REVIEW_ADDED':
        return <MessageSquare className="text-green-500" size={16} />;
      case 'REVIEW_LIKED':
        return <Heart className="text-red-500" size={16} />;
      case 'WATCHLIST_ADDED':
        return <Plus className="text-indigo-500" size={16} />;
      case 'WATCHLIST_REMOVED':
        return <Minus className="text-gray-500" size={16} />;
      case 'FORUM_THREAD_CREATED':
        return <Users className="text-purple-500" size={16} />;
      case 'FORUM_POST_ADDED':
        return <MessageSquare className="text-purple-400" size={16} />;
      case 'USER_REGISTERED':
        return <UserPlus className="text-emerald-500" size={16} />;
      default:
        return <Activity className="text-gray-400" size={16} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'MOVIE_ADDED':
        return 'border-l-blue-500 bg-blue-50';
      case 'MOVIE_RATED':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'REVIEW_ADDED':
        return 'border-l-green-500 bg-green-50';
      case 'REVIEW_LIKED':
        return 'border-l-red-500 bg-red-50';
      case 'WATCHLIST_ADDED':
        return 'border-l-indigo-500 bg-indigo-50';
      case 'WATCHLIST_REMOVED':
        return 'border-l-gray-500 bg-gray-50';
      case 'FORUM_THREAD_CREATED':
        return 'border-l-purple-500 bg-purple-50';
      case 'FORUM_POST_ADDED':
        return 'border-l-purple-400 bg-purple-50';
      case 'USER_REGISTERED':
        return 'border-l-emerald-500 bg-emerald-50';
      default:
        return 'border-l-gray-400 bg-gray-50';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="text-gray-600" size={20} />
          <h2 className="text-lg font-semibold text-gray-800">Recent Updates</h2>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="text-gray-600" size={20} />
          <h2 className="text-lg font-semibold text-gray-800">Recent Updates</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-red-600">Error loading activities: {error}</p>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="text-gray-600" size={20} />
          <h2 className="text-lg font-semibold text-gray-800">Recent Updates</h2>
        </div>
        <div className="text-center py-8">
          <Activity className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-500">No recent activities</p>
          <p className="text-sm text-gray-400 mt-2">Activities will appear here as users interact with the app</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="text-gray-600" size={20} />
          <h2 className="text-lg font-semibold text-gray-800">Recent Updates</h2>
        </div>
        <span className="text-sm text-gray-500">{activities.length} activities</span>
      </div>
      
      <div className="space-y-3">
        {activities.map((activity) => (
          <div 
            key={activity.id} 
            className={`border-l-4 pl-4 py-3 rounded-r-lg transition-all duration-200 hover:shadow-sm ${getActivityColor(activity.type)}`}
          >
            <div className="flex items-start gap-3">
              {/* User Avatar */}
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {activity.user.image ? (
                  <Image
                    src={activity.user.image}
                    alt={activity.user.name || 'User'}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-600">
                    {(activity.user.name || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <div className="mt-1">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{activity.user.name || 'Someone'}</span>{' '}
                      {activity.description}
                    </p>
                    
                    {/* Movie Info */}
                    {activity.movie && (
                      <div className="mt-2 flex items-center gap-2">
                        {activity.movie.posterUrl && (
                          <div className="w-8 h-10 relative flex-shrink-0">
                            <Image
                              src={activity.movie.posterUrl}
                              alt={activity.movie.title}
                              fill
                              className="object-cover rounded"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">
                            {activity.movie.title} ({activity.movie.year})
                          </p>
                          <span className="text-xs text-gray-500 capitalize">
                            {activity.movie.category.toLowerCase()}
                          </span>
                        </div>
                        {activity.movie.tmdbId && (
                          <TmdbLink tmdbId={activity.movie.tmdbId} />
                        )}
                      </div>
                    )}
                    
                    {/* Forum Thread Info */}
                    {activity.thread && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {activity.thread.title}
                        </p>
                        <span className="text-xs text-gray-500">
                          in {activity.thread.category.name}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(activity.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
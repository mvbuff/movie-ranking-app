'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Activity,
  Film, 
  Star, 
  MessageSquare, 
  Heart, 
  Users,
  UserPlus,
  Calendar,
  X
} from 'lucide-react';

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
}

interface ActivityFeedPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ActivityFeedPopup({ isOpen, onClose }: ActivityFeedPopupProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen]);

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/activities?limit=10');
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'MOVIE_ADDED':
        return <Film className="text-blue-500" size={14} />;
      case 'MOVIE_RATED':
        return <Star className="text-yellow-500" size={14} />;
      case 'REVIEW_ADDED':
        return <MessageSquare className="text-green-500" size={14} />;
      case 'REVIEW_LIKED':
        return <Heart className="text-red-500" size={14} />;
      case 'FORUM_THREAD_CREATED':
        return <Users className="text-purple-500" size={14} />;
      case 'FORUM_POST_ADDED':
        return <MessageSquare className="text-purple-400" size={14} />;
      case 'USER_REGISTERED':
        return <UserPlus className="text-emerald-500" size={14} />;
      default:
        return <Activity className="text-gray-400" size={14} />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Activity className="text-gray-600" size={18} />
            <h2 className="text-lg font-semibold text-gray-800">Recent Updates</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                      <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 text-sm">Error: {error}</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="mx-auto mb-2 text-gray-400" size={32} />
              <p className="text-gray-500 text-sm">No recent activities</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  {/* User Avatar */}
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {activity.user.image ? (
                      <Image
                        src={activity.user.image}
                        alt={activity.user.name || 'User'}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    ) : (
                      <span className="text-xs font-medium text-gray-600">
                        {(activity.user.name || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1">
                      <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-800 leading-relaxed">
                          <span className="font-medium">{activity.user.name || 'Someone'}</span>{' '}
                          {activity.description}
                        </p>
                        
                        {/* Movie Info - Compact */}
                        {activity.movie && (
                          <div className="mt-1 flex items-center gap-1">
                            {activity.movie.posterUrl && (
                              <div className="w-4 h-5 relative flex-shrink-0">
                                <Image
                                  src={activity.movie.posterUrl}
                                  alt={activity.movie.title}
                                  fill
                                  className="object-cover rounded-sm"
                                />
                              </div>
                            )}
                            <p className="text-xs text-gray-600 truncate">
                              {activity.movie.title} ({activity.movie.year})
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar size={10} className="text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(activity.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-gray-50 text-center">
          <p className="text-xs text-gray-500">Latest community activities</p>
        </div>
      </div>
    </div>
  );
} 
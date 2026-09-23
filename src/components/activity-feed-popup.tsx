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
  X,
  Trash2
} from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useUser } from '@/context/user-context';
import { useToast } from '@/context/toast-context';

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
  const [deletingActivity, setDeletingActivity] = useState<string | null>(null);
  
  const { isAdmin } = useUser();
  const { showToast } = useToast();

  // Click outside to close functionality
  const modalContentRef = useClickOutside<HTMLDivElement>({
    onClickOutside: onClose,
    enabled: isOpen
  });

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen]);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/activities?limit=25');
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

  const handleDeleteActivity = async (activityId: string) => {
    if (!isAdmin) {
      showToast('Admin access required', 'error');
      return;
    }

    setDeletingActivity(activityId);

    // Optimistically remove from UI
    const previousActivities = [...activities];
    setActivities(activities.filter(a => a.id !== activityId));

    try {
      const response = await fetch('/api/activities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId }),
      });

      if (response.ok) {
        showToast('Activity deleted successfully', 'success');
      } else {
        // Revert optimistic update on failure
        setActivities(previousActivities);
        const result = await response.json();
        showToast(`Failed to delete activity: ${result.error}`, 'error');
      }
    } catch (error) {
      // Revert optimistic update on error
      setActivities(previousActivities);
      console.error('Failed to delete activity:', error);
      showToast('Failed to delete activity', 'error');
    } finally {
      setDeletingActivity(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-sm flex items-center justify-center p-4"
      data-modal-backdrop="true"
    >
      <div 
        ref={modalContentRef}
        className="bg-white rounded-[1.75rem] shadow-lift w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
        style={{ animation: 'scaleIn .25s cubic-bezier(.22,1,.36,1) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center">
              <Activity className="text-brand" size={18} />
            </span>
            <h2 className="font-display font-bold tracking-tight text-lg text-ink">Recent Updates</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full hover:bg-stone-100 p-2 text-stone-500 hover:text-stone-700 transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-2 min-h-0">
          {loading ? (
            <div className="space-y-3 py-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-stone-200 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="h-3 bg-stone-200 rounded w-3/4 mb-2"></div>
                      <div className="h-2 bg-stone-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <Activity className="mx-auto mb-3 text-stone-300" size={32} />
              <p className="text-red-600 text-sm mb-2">Error loading activities</p>
              <p className="text-xs text-stone-400">{error}</p>
              <button
                onClick={fetchActivities}
                className="btn-primary mt-4 text-sm"
              >
                Retry
              </button>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="mx-auto mb-3 text-stone-300" size={32} />
              <p className="text-stone-500 text-sm">No recent activities</p>
              <p className="text-xs text-stone-400 mt-1">Check back later for community updates</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {activities.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-start gap-3 py-4 group"
                >
                  {/* User Avatar */}
                  <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {activity.user.image ? (
                      <Image
                        src={activity.user.image}
                        alt={activity.user.name || 'User'}
                        width={36}
                        height={36}
                        className="rounded-full"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-stone-500">
                        {(activity.user.name || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-700 leading-relaxed">
                          <span className="font-semibold text-ink">{activity.user.name || 'Someone'}</span>{' '}
                          {activity.description}
                        </p>
                        
                        {/* Movie Info */}
                        {activity.movie && (
                          <div className="mt-2 flex items-center gap-2 p-2 bg-stone-50 rounded-xl border border-stone-100">
                            {activity.movie.posterUrl && (
                              <div className="w-6 h-8 relative flex-shrink-0">
                                <Image
                                  src={activity.movie.posterUrl}
                                  alt={activity.movie.title}
                                  fill
                                  className="object-cover rounded-sm"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-stone-700 truncate">
                                {activity.movie.title}
                              </p>
                              <p className="text-xs text-stone-400">
                                {activity.movie.year} • {activity.movie.category}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <Calendar size={10} className="text-stone-400 flex-shrink-0" />
                            <span className="text-xs text-stone-400">
                              {formatTimeAgo(activity.createdAt)}
                            </span>
                          </div>
                          
                          {/* Admin Delete Button */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteActivity(activity.id)}
                              disabled={deletingActivity === activity.id}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                              title="Delete activity (Admin only)"
                            >
                              {deletingActivity === activity.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500"></div>
                              ) : (
                                <Trash2 size={12} />
                              )}
                            </button>
                          )}
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
        <div className="p-4 border-t border-stone-100 text-center flex-shrink-0">
          <p className="text-xs text-stone-400">Latest community activities • Tap outside to close</p>
        </div>
      </div>
    </div>
  );
}

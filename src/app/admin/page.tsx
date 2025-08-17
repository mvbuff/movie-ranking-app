'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UserSwitcher from '@/components/user-switcher';
import type { User, UserStatus } from '@prisma/client';

interface UserAnalytics {
  totalPageSessions: number;
  totalTimeSpent: number;
  avgTimePerSession: number;
  recentLogins: number;
  avgSessionDuration: number;
  lastLoginSessions: Array<{
    id: string;
    loginAt: string;
    logoutAt: string | null;
    duration: number | null;
    ipAddress: string | null;
    userAgent: string | null;
  }>;
  recentPageSessions: Array<{
    id: string;
    page: string;
    startTime: string;
    endTime: string | null;
    duration: number | null;
  }>;
}

interface UserWithAnalytics extends User {
  analytics: UserAnalytics;
}

type SortOption = 'name' | 'lastLogin' | 'totalTime' | 'avgSession' | 'recentLogins' | 'avgLoginDuration';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [analyticsData, setAnalyticsData] = useState<UserWithAnalytics[]>([]);
  const [sortedAnalyticsData, setSortedAnalyticsData] = useState<UserWithAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'analytics' | 'restaurants'>('users');
  const [sortBy, setSortBy] = useState<SortOption>('lastLogin');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [refreshTimestamp, setRefreshTimestamp] = useState<number>(Date.now());
  
  // Restaurant image backfill state
  const [restaurantImageStatus, setRestaurantImageStatus] = useState<{
    total: number;
    withImages: number;
    withoutImages: number;
    restaurantsNeedingImages: {
      id: string;
      name: string;
      address: string | null;
      location?: string | null;
      createdAt?: string;
    }[];
  } | null>(null);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResults, setBackfillResults] = useState<{
    processed: number;
    updated: number;
    failed: number;
    skipped?: number;
    success?: number;
    wouldProcess?: number;
    message?: string;
    errors?: string[];
    restaurants?: {
      id: string;
      name: string;
      location?: string | null;
    }[];
    results?: {
      restaurant: { id: string; name: string };
      status: 'success' | 'error' | 'skipped';
      photosAdded?: number;
      matchedWith?: string;
      reason?: string;
      error?: string;
    }[];
  } | null>(null);

  const triggerDataRefresh = () => {
    setRefreshTimestamp(Date.now());
  };

  const fetchUsers = async () => {
    setLoading(true);
    const response = await fetch('/api/admin/users');
    if (response.ok) {
      const data = await response.json();
      setUsers(data);
    } else {
      console.error('Failed to fetch users');
    }
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      } else {
        console.error('Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
    }
    setLoading(false);
  };

  const fetchRestaurantImageStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/backfill-restaurant-images');
      if (response.ok) {
        const data = await response.json();
        setRestaurantImageStatus(data);
      } else {
        console.error('Failed to fetch restaurant image status');
      }
    } catch (error) {
      console.error('Restaurant image status fetch error:', error);
    }
    setLoading(false);
  };

  // Sort analytics data
  const sortAnalyticsData = (data: UserWithAnalytics[], sortBy: SortOption, order: 'asc' | 'desc') => {
    const sorted = [...data].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'lastLogin':
          // Get the most recent login timestamp
          aValue = a.analytics.lastLoginSessions.length > 0 
            ? new Date(a.analytics.lastLoginSessions[0].loginAt).getTime()
            : 0;
          bValue = b.analytics.lastLoginSessions.length > 0 
            ? new Date(b.analytics.lastLoginSessions[0].loginAt).getTime()
            : 0;
          break;
        case 'totalTime':
          aValue = a.analytics.totalTimeSpent;
          bValue = b.analytics.totalTimeSpent;
          break;
        case 'avgSession':
          aValue = a.analytics.avgTimePerSession;
          bValue = b.analytics.avgTimePerSession;
          break;
        case 'recentLogins':
          aValue = a.analytics.recentLogins;
          bValue = b.analytics.recentLogins;
          break;
        case 'avgLoginDuration':
          aValue = a.analytics.avgSessionDuration;
          bValue = b.analytics.avgSessionDuration;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  // Update sorted data when analytics data or sort options change
  useEffect(() => {
    if (analyticsData.length > 0) {
      const sorted = sortAnalyticsData(analyticsData, sortBy, sortOrder);
      setSortedAnalyticsData(sorted);
    }
  }, [analyticsData, sortBy, sortOrder]);

  const handleSortChange = (newSortBy: SortOption) => {
    if (sortBy === newSortBy) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to desc for most metrics, asc for name
      setSortBy(newSortBy);
      setSortOrder(newSortBy === 'name' ? 'asc' : 'desc');
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      if (session.user.role !== 'ADMIN') {
        router.push('/'); // Redirect if not an admin
      } else {
        if (activeTab === 'users') {
          fetchUsers();
        } else if (activeTab === 'analytics') {
          fetchAnalytics();
        } else if (activeTab === 'restaurants') {
          fetchRestaurantImageStatus();
        }
      }
    } else if (status === 'unauthenticated') {
      router.push('/login'); // Redirect if not logged in
    }
  }, [session, status, router, activeTab]);
  
  const handleUpdateStatus = async (userId: string, newStatus: UserStatus) => {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status: newStatus }),
    });
    fetchUsers(); // Refresh user list
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This cannot be undone.')) {
        await fetch(`/api/admin/users?userId=${userId}`, {
            method: 'DELETE',
        });
        fetchUsers(); // Refresh user list
    }
  };

  const handleResetPassword = async (userId: string) => {
    const response = await fetch('/api/account/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIdForAdminReset: userId }),
    });
    const data = await response.json();
    if (response.ok) {
      alert(`Password reset successfully. Temporary password is: ${data.temporaryPassword}`);
    } else {
      alert(`Failed to reset password: ${data.error}`);
    }
  };

  const handleBackfillImages = async (dryRun = false) => {
    if (!dryRun && !window.confirm('Are you sure you want to backfill restaurant images? This will search Google Places for each restaurant without images.')) {
      return;
    }

    setBackfillLoading(true);
    setBackfillResults(null);

    try {
      const response = await fetch('/api/admin/backfill-restaurant-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });

      if (response.ok) {
        const data = await response.json();
        setBackfillResults(data);
        if (!dryRun) {
          // Refresh the status after backfill
          setTimeout(fetchRestaurantImageStatus, 1000);
        }
      } else {
        const error = await response.json();
        alert(`Failed to ${dryRun ? 'preview' : 'run'} backfill: ${error.error}`);
      }
    } catch (error) {
      console.error('Backfill error:', error);
      alert('Failed to run backfill process');
    }

    setBackfillLoading(false);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getLastLoginText = (user: UserWithAnalytics) => {
    if (user.analytics.lastLoginSessions.length === 0) {
      return 'Never logged in';
    }
    const lastLogin = new Date(user.analytics.lastLoginSessions[0].loginAt);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const getSortIcon = (field: SortOption) => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (loading || status === 'loading') {
    return <main className="p-8"><p>Loading...</p></main>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-600 mt-2">Manage users and view system analytics</p>
            </div>
            <Link 
              href="/" 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium w-fit"
            >
              ← Back to Main
            </Link>
          </div>
        </div>

        {/* User Switcher Section */}
        <div className="mb-8 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Switch User Context</h2>
          <div className="max-w-md">
            <UserSwitcher 
              refreshTimestamp={refreshTimestamp} 
              onUserChange={triggerDataRefresh} 
            />
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Change which user&apos;s data you&apos;re viewing throughout the application. 
            Use this to test features from different user perspectives or assist with user issues.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Analytics
            </button>
            <button
              onClick={() => setActiveTab('restaurants')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'restaurants'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Restaurant Images
            </button>
          </nav>
        </div>

        {activeTab === 'users' && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {user.status === 'PENDING' && (
                        <button onClick={() => handleUpdateStatus(user.id, 'ACTIVE')} className="text-indigo-600 hover:text-indigo-900 mr-4">Approve</button>
                      )}
                      <button onClick={() => handleResetPassword(user.id)} className="text-indigo-600 hover:text-indigo-900 mr-4">Reset Password</button>
                      <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Sorting Controls */}
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-medium mb-3">Sort Users By:</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSortChange('lastLogin')}
                  className={`px-3 py-2 text-sm rounded-md ${
                    sortBy === 'lastLogin'
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Last Login {getSortIcon('lastLogin')}
                </button>
                <button
                  onClick={() => handleSortChange('totalTime')}
                  className={`px-3 py-2 text-sm rounded-md ${
                    sortBy === 'totalTime'
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Total Time {getSortIcon('totalTime')}
                </button>
                <button
                  onClick={() => handleSortChange('avgSession')}
                  className={`px-3 py-2 text-sm rounded-md ${
                    sortBy === 'avgSession'
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Avg Session {getSortIcon('avgSession')}
                </button>
                <button
                  onClick={() => handleSortChange('recentLogins')}
                  className={`px-3 py-2 text-sm rounded-md ${
                    sortBy === 'recentLogins'
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Recent Logins {getSortIcon('recentLogins')}
                </button>
                <button
                  onClick={() => handleSortChange('avgLoginDuration')}
                  className={`px-3 py-2 text-sm rounded-md ${
                    sortBy === 'avgLoginDuration'
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Avg Login Duration {getSortIcon('avgLoginDuration')}
                </button>
                <button
                  onClick={() => handleSortChange('name')}
                  className={`px-3 py-2 text-sm rounded-md ${
                    sortBy === 'name'
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Name {getSortIcon('name')}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Showing {sortedAnalyticsData.length} users sorted by {sortBy} ({sortOrder === 'desc' ? 'highest first' : 'lowest first'})
              </p>
            </div>

            {/* Analytics Data */}
            {sortedAnalyticsData.map((user) => (
              <div key={user.id} className="bg-white p-6 rounded-lg shadow-md">
                <div className="mb-4 flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-500">{user.email || 'No email'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">Last Login</p>
                    <p className="text-sm text-gray-500">{getLastLoginText(user)}</p>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-xs text-blue-600 font-medium">Total Sessions</p>
                    <p className="text-lg font-bold text-blue-900">{user.analytics.totalPageSessions}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs text-green-600 font-medium">Total Time</p>
                    <p className="text-lg font-bold text-green-900">{formatDuration(user.analytics.totalTimeSpent)}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <p className="text-xs text-purple-600 font-medium">Avg Session</p>
                    <p className="text-lg font-bold text-purple-900">{formatDuration(user.analytics.avgTimePerSession)}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded">
                    <p className="text-xs text-orange-600 font-medium">Logins (30d)</p>
                    <p className="text-lg font-bold text-orange-900">{user.analytics.recentLogins}</p>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded">
                    <p className="text-xs text-indigo-600 font-medium">Avg Login Duration</p>
                    <p className="text-lg font-bold text-indigo-900">{formatDuration(user.analytics.avgSessionDuration)}</p>
                  </div>
                </div>

                {/* Last 3 Login Sessions */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-3">Last 3 Login Sessions</h4>
                  {user.analytics.lastLoginSessions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Login Time</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Logout Time</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {user.analytics.lastLoginSessions.map((session) => (
                            <tr key={session.id}>
                              <td className="px-4 py-2 text-sm text-gray-900">{formatDate(session.loginAt)}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {session.logoutAt ? formatDate(session.logoutAt) : 'Still active'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">{formatDuration(session.duration)}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{session.ipAddress || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No login sessions recorded</p>
                  )}
                </div>

                {/* Recent Page Sessions */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">Recent Page Sessions</h4>
                  {user.analytics.recentPageSessions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {user.analytics.recentPageSessions.slice(0, 5).map((session) => (
                            <tr key={session.id}>
                              <td className="px-4 py-2 text-sm text-gray-900 font-mono">{session.page}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{formatDate(session.startTime)}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{formatDuration(session.duration)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No page sessions recorded</p>
                  )}
                </div>
              </div>
            ))}
            
            {sortedAnalyticsData.length === 0 && (
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <p className="text-gray-500">No analytics data available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'restaurants' && (
          <div className="space-y-6">
            {/* Restaurant Image Status */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Restaurant Image Status</h2>
              
              {restaurantImageStatus ? (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-blue-800">Total Restaurants</h3>
                      <p className="text-2xl font-bold text-blue-900">{restaurantImageStatus.total}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-green-800">With Images</h3>
                      <p className="text-2xl font-bold text-green-900">{restaurantImageStatus.withImages}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-red-800">Missing Images</h3>
                      <p className="text-2xl font-bold text-red-900">{restaurantImageStatus.withoutImages}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleBackfillImages(true)}
                      disabled={backfillLoading || restaurantImageStatus.withoutImages === 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {backfillLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        '🔍'
                      )}
                      Preview Backfill (Dry Run)
                    </button>
                    <button
                      onClick={() => handleBackfillImages(false)}
                      disabled={backfillLoading || restaurantImageStatus.withoutImages === 0}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {backfillLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        '🚀'
                      )}
                      Run Backfill
                    </button>
                    <button
                      onClick={fetchRestaurantImageStatus}
                      disabled={backfillLoading}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🔄 Refresh Status
                    </button>
                  </div>

                  {/* Restaurants needing images */}
                  {restaurantImageStatus.restaurantsNeedingImages.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-3">Restaurants Missing Images</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {restaurantImageStatus.restaurantsNeedingImages.map((restaurant: {
                        id: string;
                        name: string;
                        address: string | null;
                        location?: string | null;
                        createdAt?: string;
                      }) => (
                          <div key={restaurant.id} className="p-3 border border-gray-200 rounded-lg">
                            <h4 className="font-medium text-gray-900">{restaurant.name}</h4>
                            <p className="text-sm text-gray-600">{restaurant.location || restaurant.address || 'No location'}</p>
                            {restaurant.createdAt && (
                              <p className="text-xs text-gray-500">Added {new Date(restaurant.createdAt).toLocaleDateString()}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading restaurant image status...</p>
                </div>
              )}
            </div>

            {/* Backfill Results */}
            {backfillResults && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-4">
                  {backfillResults.wouldProcess ? 'Backfill Preview Results' : 'Backfill Results'}
                </h3>
                
                <div className="mb-4">
                  <p className="text-gray-700">{backfillResults.message}</p>
                  {backfillResults.processed !== undefined && (
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Processed</p>
                        <p className="text-lg font-bold">{backfillResults.processed || backfillResults.wouldProcess}</p>
                      </div>
                      {backfillResults.success !== undefined && (
                        <div className="text-center">
                          <p className="text-sm text-green-600">Success</p>
                          <p className="text-lg font-bold text-green-700">{backfillResults.success}</p>
                        </div>
                      )}
                      {backfillResults.skipped !== undefined && (
                        <div className="text-center">
                          <p className="text-sm text-yellow-600">Skipped</p>
                          <p className="text-lg font-bold text-yellow-700">{backfillResults.skipped}</p>
                        </div>
                      )}
                      {backfillResults.errors !== undefined && (
                        <div className="text-center">
                          <p className="text-sm text-red-600">Errors</p>
                          <p className="text-lg font-bold text-red-700">{backfillResults.errors}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Detailed Results */}
                {backfillResults.results && backfillResults.results.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <h4 className="font-medium text-gray-800">Detailed Results:</h4>
                    {backfillResults.results.map((result: {
                      restaurant: { id: string; name: string };
                      status: 'success' | 'error' | 'skipped';
                      photosAdded?: number;
                      matchedWith?: string;
                      reason?: string;
                      error?: string;
                    }, index: number) => (
                      <div key={index} className={`p-2 rounded text-sm ${
                        result.status === 'success' ? 'bg-green-50 text-green-800' :
                        result.status === 'skipped' ? 'bg-yellow-50 text-yellow-800' :
                        'bg-red-50 text-red-800'
                      }`}>
                        <span className="font-medium">{result.restaurant.name}</span>
                        {result.status === 'success' && result.photosAdded && (
                          <span> - Added {result.photosAdded} photos (matched with {result.matchedWith})</span>
                        )}
                        {result.status === 'skipped' && result.reason && (
                          <span> - {result.reason}</span>
                        )}
                        {result.status === 'error' && result.error && (
                          <span> - Error: {result.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview Results for Dry Run */}
                {backfillResults.restaurants && backfillResults.restaurants.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <h4 className="font-medium text-gray-800">Would Process These Restaurants:</h4>
                    {backfillResults.restaurants.map((restaurant: {
                      id: string;
                      name: string;
                      location?: string | null;
                    }, index: number) => (
                      <div key={index} className="p-2 bg-blue-50 text-blue-800 rounded text-sm">
                        <span className="font-medium">{restaurant.name}</span>
                        <span className="text-blue-600"> - {restaurant.location || 'No location'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
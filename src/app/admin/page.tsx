'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [analyticsData, setAnalyticsData] = useState<UserWithAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'analytics'>('users');

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

  useEffect(() => {
    if (status === 'authenticated') {
      if (session.user.role !== 'ADMIN') {
        router.push('/'); // Redirect if not an admin
      } else {
        if (activeTab === 'users') {
          fetchUsers();
        } else {
          fetchAnalytics();
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

  if (loading || status === 'loading') {
    return <main className="p-8"><p>Loading...</p></main>;
  }

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Link href="/" className="text-blue-600 hover:underline">
            &larr; Return to Dashboard
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
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
          </nav>
        </div>
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
          {analyticsData.map((user) => (
            <div key={user.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                <p className="text-sm text-gray-500">{user.email || 'No email'}</p>
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
          
          {analyticsData.length === 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <p className="text-gray-500">No analytics data available</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
} 
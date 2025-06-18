'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User, UserStatus } from '@prisma/client';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (status === 'authenticated') {
      if (session.user.role !== 'ADMIN') {
        router.push('/'); // Redirect if not an admin
      } else {
        fetchUsers();
      }
    } else if (status === 'unauthenticated') {
      router.push('/login'); // Redirect if not logged in
    }
  }, [session, status, router]);
  
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

  if (loading || status === 'loading') {
    return <main className="p-8"><p>Loading...</p></main>;
  }

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin - User Management</h1>
        <Link href="/" className="text-blue-600 hover:underline">
            &larr; Return to Dashboard
        </Link>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
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
    </main>
  );
} 
'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isForcedReset = session?.user?.passwordResetRequired;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!newPassword) {
      setError('New password cannot be empty.');
      return;
    }
    if (!isForcedReset && !currentPassword) {
      setError('Current password is required.');
      return;
    }

    try {
      const response = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password.');
      }
      
      // Automatically sign the user in with their new password
      const signInResult = await signIn('credentials', {
        redirect: false,
        name: data.userName,
        password: newPassword,
      });

      if (signInResult?.ok) {
        router.push('/'); // Redirect to dashboard on success
      } else {
        // If auto-login fails, redirect to login page for manual entry
        router.push('/login');
      }

    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-6">
            {isForcedReset ? 'Create a New Password' : 'Change Your Password'}
        </h1>
        {isForcedReset && (
            <p className="text-center text-sm text-yellow-700 bg-yellow-100 p-3 rounded-md mb-4">
                For your security, you must create a new password before proceeding.
            </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isForcedReset && (
            <div>
                <label htmlFor="currentPassword">Current Password</label>
                <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full p-2 border rounded-md"
                />
            </div>
          )}
          <div>
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full p-2 border rounded-md"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg"
          >
            {isForcedReset ? 'Set New Password' : 'Change Password'}
          </button>
        </form>
      </div>
    </main>
  );
} 
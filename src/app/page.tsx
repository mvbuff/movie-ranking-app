'use client';

import { useState } from 'react';
import MovieSearch from "@/components/movie-search";
import MovieList from "@/components/movie-list";
import UserSwitcher from "@/components/user-switcher";
import FriendList from "@/components/friend-list";
import FilterControls from '@/components/filter-controls';
import type { Category } from '@/components/filter-controls';

type FilterCategory = Category | 'ALL';

function AddUserForm({ onUserAdded }: { onUserAdded: () => void }) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add user.');
      }
      
      onUserAdded(); // Trigger a refresh
      setName(''); // Clear input
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold text-lg mb-2">Add New User</h3>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter new user's name"
          className="flex-grow p-2 border rounded-md"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSubmitting ? 'Adding...' : 'Add User'}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </form>
  );
}

export default function Home() {
  const [refreshTimestamp, setRefreshTimestamp] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');
  const [scoreThreshold, setScoreThreshold] = useState<number>(0);
  const [isAddingUser, setIsAddingUser] = useState(false);

  const triggerDataRefresh = () => {
    setRefreshTimestamp(new Date().getTime());
    // Also close the add user form on refresh
    setIsAddingUser(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 sm:p-12">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900">
            Movie Ranking
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            Your personalized movie and series leaderboard.
          </p>
        </div>
        <div className="flex justify-between items-center">
          <UserSwitcher />
          <button
            onClick={() => setIsAddingUser(!isAddingUser)}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
          >
            {isAddingUser ? 'Cancel' : 'Add User'}
          </button>
        </div>
        {isAddingUser && <AddUserForm onUserAdded={triggerDataRefresh} />}
        <FriendList onCalculationComplete={triggerDataRefresh} />
        <MovieSearch onItemAdded={triggerDataRefresh} />
      </div>
      <FilterControls 
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        scoreThreshold={scoreThreshold}
        onScoreThresholdChange={setScoreThreshold}
      />
      <MovieList
        calculationTimestamp={refreshTimestamp}
        categoryFilter={activeCategory}
        scoreThreshold={scoreThreshold}
      />
    </main>
  );
}

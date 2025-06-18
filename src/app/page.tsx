'use client';

import { useState, useCallback } from 'react';
import MovieSearch from "@/components/movie-search";
import MovieList from "@/components/movie-list";
import UserSwitcher from "@/components/user-switcher";
import FriendList from "@/components/friend-list";
import FilterControls from '@/components/filter-controls';
import type { Category, SortKey } from '@/components/filter-controls';
import { useUser } from '@/context/user-context';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

type FilterCategory = Category | 'ALL';

export default function Home() {
  const [refreshTimestamp, setRefreshTimestamp] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');
  const [scoreThreshold, setScoreThreshold] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('aggregateScore');
  const { isAdmin, currentUser } = useUser();

  const triggerDataRefresh = useCallback(() => {
    setRefreshTimestamp(new Date().getTime());
  }, []);

  return (
    <main className="min-h-screen p-8 sm:p-12">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900">
          Movie Ranking
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
          Your personalized movie and series leaderboard.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column */}
        <div className="md:col-span-2 space-y-8">
          <FriendList onCalculationComplete={triggerDataRefresh} />
          <MovieSearch onItemAdded={triggerDataRefresh} />
          <FilterControls 
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            scoreThreshold={scoreThreshold}
            onScoreThresholdChange={setScoreThreshold}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-lg shadow-sm border">
              <div className="flex justify-between items-center mb-4">
                <div className="flex-grow">
                  {isAdmin && <UserSwitcher refreshTimestamp={refreshTimestamp} />}
                  {currentUser && <p className="text-sm text-gray-500 mt-2">Now acting as: <span className="font-bold">{currentUser.name}</span></p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                    {isAdmin && (
                        <Link href="/admin" className="px-3 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 w-full text-center">
                            Admin Panel
                        </Link>
                    )}
                    <button
                        onClick={() => signOut()}
                        className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 w-full text-center"
                    >
                        Logout
                    </button>
                </div>
            </div>
          </div>
        </div>
      </div>

      {currentUser && (
          <MovieList
            calculationTimestamp={refreshTimestamp}
            categoryFilter={activeCategory}
            scoreThreshold={scoreThreshold}
            searchTerm={searchTerm}
            sortBy={sortBy}
          />
        )}
    </main>
  );
}

'use client';

import { useState, useCallback } from 'react';
import MovieSearch from "@/components/movie-search";
import MovieList from "@/components/movie-list";
import UserSwitcher from "@/components/user-switcher";
import FriendList from "@/components/friend-list";
import FilterControls from '@/components/filter-controls';
import type { Category, SortKey } from '@/components/filter-controls';
import { useUser } from '@/context/user-context';
import { signOut, signIn } from 'next-auth/react';
import Link from 'next/link';

type FilterCategory = Category | 'ALL' | 'WATCHLIST';

export default function Home() {
  const [refreshTimestamp, setRefreshTimestamp] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');
  const [scoreThreshold, setScoreThreshold] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('addedDate');
  const { isAdmin, currentUser, sessionStatus } = useUser();

  const triggerDataRefresh = useCallback(() => {
    setRefreshTimestamp(new Date().getTime());
  }, []);

  const isAuthenticated = sessionStatus === 'authenticated';
  const isLoading = sessionStatus === 'loading';

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
          Movie Ranking
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-500">
          Your personalized movie and series leaderboard.
        </p>
        <div className="mt-4">
          <Link 
            href="/forum"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            💬 Discussion Forum
          </Link>
          {isAuthenticated && (
            <button
              onClick={async () => {
                // Create a shareable group summary link
                const currentUrl = window.location.origin;
                const groupName = currentUser?.name ? `${currentUser.name}'s Group` : 'Movie Group';
                const shareUrl = `${currentUrl}/group-summary?name=${encodeURIComponent(groupName)}`;
                
                // Copy message to clipboard
                const message = `🎬 Check out our movie rankings!\n\n${shareUrl}`;
                
                try {
                  await navigator.clipboard.writeText(message);
                  alert('Group summary link copied to clipboard!');
                } catch (error) {
                  console.error('Failed to copy to clipboard:', error);
                  alert('Failed to copy to clipboard');
                }
              }}
              className="ml-3 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              📊 Copy Group Summary
            </button>
          )}
        </div>
        {!isAuthenticated && !isLoading && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
            <p className="text-blue-800 mb-3">
              You&apos;re viewing in read-only mode. 
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => signIn()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Sign In
              </button>
              <Link
                href="/register"
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {isAuthenticated && (
            <>
              <FriendList onCalculationComplete={triggerDataRefresh} />
              <MovieSearch onItemAdded={triggerDataRefresh} />
            </>
          )}
          
          <FilterControls 
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            scoreThreshold={scoreThreshold}
            onScoreThresholdChange={setScoreThreshold}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            onSortChange={setSortBy}
            readOnlyMode={!isAuthenticated}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {isAuthenticated && (
            <div className="p-4 bg-gray-50 rounded-lg shadow-sm border">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex-grow">
                  {isAdmin && <UserSwitcher refreshTimestamp={refreshTimestamp} />}
                  {currentUser && <p className="text-sm text-gray-500 mt-2">Now acting as: <span className="font-bold">{currentUser.name}</span></p>}
                </div>
                <div className="flex flex-col items-stretch gap-2 flex-shrink-0">
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
          )}
        </div>
      </div>

      {/* Movie List - show for everyone */}
      <MovieList
        calculationTimestamp={refreshTimestamp}
        categoryFilter={activeCategory}
        scoreThreshold={scoreThreshold}
        searchTerm={searchTerm}
        sortBy={sortBy}
        readOnlyMode={!isAuthenticated}
      />
    </main>
  );
}

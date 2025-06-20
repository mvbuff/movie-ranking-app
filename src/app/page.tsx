'use client';

import { useState, useCallback, useEffect } from 'react';
import MovieSearch from "@/components/movie-search";
import MovieList from "@/components/movie-list";
import UserSwitcher from "@/components/user-switcher";
import FriendList from "@/components/friend-list";
import FilterControls from '@/components/filter-controls';
import type { Category, SortKey } from '@/components/filter-controls';
import { useUser } from '@/context/user-context';
import { signOut, signIn } from 'next-auth/react';
import Link from 'next/link';
import { calculateUserAggregateScores } from '@/app/actions';

type FilterCategory = Category | 'ALL' | 'WATCHLIST';

export default function Home() {
  const [refreshTimestamp, setRefreshTimestamp] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');
  const [scoreThreshold, setScoreThreshold] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('addedDate');
  const { isAdmin, currentUser, sessionStatus } = useUser();

  const isAuthenticated = sessionStatus === 'authenticated';
  const isLoading = sessionStatus === 'loading';

  // Auto-calculate friend scores
  const autoCalculateScores = useCallback(async () => {
    if (!currentUser || sessionStatus !== 'authenticated') return;
    
    try {
      await calculateUserAggregateScores(currentUser.id);
      console.log('✨ Friend scores updated for:', currentUser.name);
      
      // Update timestamp to trigger MovieList refresh
      setRefreshTimestamp(new Date().getTime());
    } catch (error) {
      console.error('❌ Auto-calculation failed:', error);
    }
  }, [currentUser, sessionStatus]);

  // Auto-calculate when page loads or user changes
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      // Add small delay to ensure user context is fully updated
      const timer = setTimeout(() => {
        autoCalculateScores();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, currentUser, autoCalculateScores]);

  const triggerDataRefresh = useCallback(async () => {
    // Auto-calculate scores when new movies are added or data is refreshed
    if (currentUser && sessionStatus === 'authenticated') {
      await autoCalculateScores();
    } else {
      // If no user or not authenticated, just trigger a basic refresh
      setRefreshTimestamp(new Date().getTime());
    }
  }, [currentUser, sessionStatus, autoCalculateScores]);

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
            <>
              <div className="p-4 bg-gray-50 rounded-lg shadow-sm border">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex-grow">
                    {isAdmin && <UserSwitcher refreshTimestamp={refreshTimestamp} onUserChange={triggerDataRefresh} />}
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
              <FriendList onCalculationComplete={triggerDataRefresh} />
            </>
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
